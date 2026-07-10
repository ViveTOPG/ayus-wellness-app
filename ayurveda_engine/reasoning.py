"""The reasoning layer.

Given a health concern, this assembles recommendations together with the
complete, human-readable provenance chain so the app (and the user) can see
exactly *why* something is suggested and *how strongly* it is supported.

This is deliberately a transparent rule-based join, not a black box. Trust comes
from being able to read every step.
"""

from __future__ import annotations

from dataclasses import asdict, dataclass, field
from typing import Optional

from .knowledge_base import KnowledgeBase, DATA_DIR
from .models import Citation, Condition, EvidenceTier

DISCLAIMER = (
    "Educational information drawn from traditional Ayurvedic sources and, where "
    "noted, modern research. This is not medical advice and does not diagnose, "
    "treat, or cure any disease. Consult a qualified healthcare professional "
    "before acting, especially if you are pregnant, nursing, taking medication, "
    "or managing a medical condition."
)


@dataclass
class ResolvedCitation:
    """A citation with its source details filled in, ready to display."""

    source_title: str
    source_kind: str
    locator: Optional[str]
    public_domain: bool
    requires_verification: bool
    note: Optional[str]


@dataclass
class Recommendation:
    """One suggestion plus the full chain that justifies it."""

    kind: str                       # "herb" | "formulation"
    id: str
    name: str
    rationale: str                  # WHY — the first-principles explanation
    evidence_tier: str              # machine value
    evidence_label: str             # human label
    citations: list[ResolvedCitation]
    typical_dosage: Optional[str]
    safety: list[str]
    properties: dict = field(default_factory=dict)   # dravyaguṇa summary, herbs only


@dataclass
class ConditionReport:
    """Everything the app shows for one concern."""

    condition: dict
    recommendations: list[Recommendation]
    red_flags: list[str]
    disclaimer: str = DISCLAIMER


class Engine:
    """High-level facade the API and CLI both use."""

    def __init__(self, kb: KnowledgeBase) -> None:
        self.kb = kb
        self.chroma_client = None
        try:
            import chromadb
            chroma_path = DATA_DIR / "chroma_db"
            if chroma_path.exists():
                self.chroma_client = chromadb.PersistentClient(path=str(chroma_path))
                self.chroma_conditions = self.chroma_client.get_collection("conditions")
                self.chroma_herbs = self.chroma_client.get_collection("herbs")
        except Exception as e:
            print(f"Failed to load ChromaDB: {e}")

    @classmethod
    def load(cls, *args, **kwargs) -> "Engine":
        return cls(KnowledgeBase.load(*args, **kwargs))

    # ---- search ------------------------------------------------------------

    def search(self, query: str) -> dict:
        """Loose, case-insensitive match across concerns and herbs, with semantic fallback."""
        q = query.strip().lower()
        
        cond_scores = {}  # id -> score (lower is better, 0 for exact match)
        herb_scores = {}
        
        # 1. Exact / Substring matches (Score = 0)
        for c in self.kb.conditions.values():
            if (q in c.name.lower() or 
                any(q in a.lower() for a in c.also_known_as) or 
                q in c.description.lower()):
                cond_scores[c.id] = 0.0
                
        for h in self.kb.herbs.values():
            if (q in h.common_name.lower() or 
                (h.sanskrit_name and q in h.sanskrit_name.lower()) or 
                (h.botanical_name and q in h.botanical_name.lower()) or 
                any(q in n.lower() for n in h.other_names)):
                herb_scores[h.id] = 0.0
                
        # 2. Semantic matches (Score = distance > 0)
        if self.chroma_client and q:
            try:
                c_res = self.chroma_conditions.query(query_texts=[query], n_results=5)
                if c_res["ids"] and len(c_res["ids"]) > 0:
                    for i, cid in enumerate(c_res["ids"][0]):
                        dist = c_res["distances"][0][i]
                        if dist < 1.5 and cid not in cond_scores:
                            cond_scores[cid] = dist
                            
                h_res = self.chroma_herbs.query(query_texts=[query], n_results=5)
                if h_res["ids"] and len(h_res["ids"]) > 0:
                    for i, hid in enumerate(h_res["ids"][0]):
                        dist = h_res["distances"][0][i]
                        if dist < 1.5 and hid not in herb_scores:
                            herb_scores[hid] = dist
            except Exception as e:
                print(f"Semantic search failed: {e}")
                
        # Sort by score
        sorted_cids = sorted(cond_scores.keys(), key=lambda k: cond_scores[k])
        sorted_hids = sorted(herb_scores.keys(), key=lambda k: herb_scores[k])

        conditions = [
            {"id": cid, "name": self.kb.conditions[cid].name}
            for cid in sorted_cids
        ]
        herbs = [
            {"id": hid, "name": self.kb.herbs[hid].common_name, "botanical_name": self.kb.herbs[hid].botanical_name}
            for hid in sorted_hids
        ]
        return {"query": query, "conditions": conditions, "herbs": herbs}

    # ---- the core report ---------------------------------------------------

    def report_for_condition(self, condition_id: str) -> Optional[ConditionReport]:
        condition = self.kb.conditions.get(condition_id)
        if condition is None:
            return None

        recs: list[Recommendation] = []

        for herb, ind in self.kb.herbs_for_condition(condition_id):
            recs.append(
                Recommendation(
                    kind="herb",
                    id=herb.id,
                    name=herb.common_name,
                    rationale=ind.rationale,
                    evidence_tier=ind.evidence_tier.value,
                    evidence_label=ind.evidence_tier.label,
                    citations=self._resolve(ind.citations),
                    typical_dosage=herb.typical_dosage,
                    safety=herb.safety,
                    properties={
                        "sanskrit_name": herb.sanskrit_name,
                        "botanical_name": herb.botanical_name,
                        "rasa": herb.rasa,
                        "virya": herb.virya,
                        "vipaka": herb.vipaka,
                        "dosha_effect": herb.dosha_effect,
                        "karma": herb.karma,
                    },
                )
            )

        for f, ind in self.kb.formulations_for_condition(condition_id):
            recs.append(
                Recommendation(
                    kind="formulation",
                    id=f.id,
                    name=f.name,
                    rationale=ind.rationale,
                    evidence_tier=ind.evidence_tier.value,
                    evidence_label=ind.evidence_tier.label,
                    citations=self._resolve(ind.citations),
                    typical_dosage=f.typical_dosage,
                    safety=f.safety,
                    properties={"ingredients": f.ingredients, "type": f.type},
                )
            )

        # Strongest evidence first; the app can re-sort, but this is the safe default.
        recs.sort(key=lambda r: EvidenceTier(r.evidence_tier).rank, reverse=True)

        return ConditionReport(
            condition=asdict(condition),
            recommendations=recs,
            red_flags=condition.red_flags,
        )

    def explain(self, herb_id: str, condition_id: str) -> Optional[dict]:
        """The single trust chain for one herb against one concern."""
        herb = self.kb.herbs.get(herb_id)
        condition = self.kb.conditions.get(condition_id)
        if herb is None or condition is None:
            return None
        for ind in herb.indications:
            if ind.condition_id == condition_id:
                return {
                    "herb": herb.common_name,
                    "condition": condition.name,
                    "chain": {
                        "1_concern": condition.name,
                        "2_substance": f"{herb.common_name} ({herb.botanical_name})",
                        "3_why": ind.rationale,
                        "4_properties": {
                            "rasa": herb.rasa,
                            "virya": herb.virya,
                            "dosha_effect": herb.dosha_effect,
                        },
                        "5_evidence": ind.evidence_tier.label,
                        "6_sources": [asdict(c) for c in self._resolve(ind.citations)],
                    },
                    "safety": herb.safety,
                    "disclaimer": DISCLAIMER,
                }
        return None

    # ---- helpers -----------------------------------------------------------

    def _resolve(self, citations: list[Citation]) -> list[ResolvedCitation]:
        resolved: list[ResolvedCitation] = []
        for c in citations:
            src = self.kb.resolve_source(c.source_id)
            resolved.append(
                ResolvedCitation(
                    source_title=src.title if src else f"<unknown:{c.source_id}>",
                    source_kind=src.kind if src else "unknown",
                    locator=c.locator,
                    public_domain=src.public_domain if src else False,
                    requires_verification=c.requires_verification,
                    note=c.note,
                )
            )
        return resolved
