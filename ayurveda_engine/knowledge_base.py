"""Loads the JSON knowledge base into typed objects and indexes it.

The JSON files under data/ are the single source of truth. This module is the
only place that knows their on-disk shape, so the ingestion pipeline (future)
and the reasoning layer never duplicate parsing logic.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Optional

from .models import (
    Citation,
    Condition,
    EvidenceTier,
    Formulation,
    Herb,
    Indication,
    Source,
)

DATA_DIR = Path(__file__).resolve().parent.parent / "data"


def _citation(raw: dict) -> Citation:
    return Citation(
        source_id=raw["source_id"],
        locator=raw.get("locator"),
        requires_verification=raw.get("requires_verification", False),
        note=raw.get("note"),
    )


def _indication(raw: dict) -> Indication:
    return Indication(
        condition_id=raw["condition_id"],
        rationale=raw["rationale"],
        evidence_tier=EvidenceTier(raw["evidence_tier"]),
        citations=[_citation(c) for c in raw.get("citations", [])],
        note=raw.get("note"),
    )


class KnowledgeBase:
    """In-memory, indexed view of the data/ JSON files."""

    def __init__(
        self,
        sources: dict[str, Source],
        herbs: dict[str, Herb],
        conditions: dict[str, Condition],
        formulations: dict[str, Formulation],
    ) -> None:
        self.sources = sources
        self.herbs = herbs
        self.conditions = conditions
        self.formulations = formulations

    # ---- loading -----------------------------------------------------------

    @classmethod
    def load(cls, data_dir: Path | str = DATA_DIR) -> "KnowledgeBase":
        data_dir = Path(data_dir)
        db_path = data_dir / "ayurveda.db"
        
        # If DB doesn't exist, we can fallback to JSON or error out.
        # But we assume the migration script was run.
        from sqlmodel import Session, create_engine, select
        from .db_models import Source as DBSource, Condition as DBCondition, Herb as DBHerb, Formulation as DBFormulation, Indication as DBIndication
        
        engine = create_engine(f"sqlite:///{db_path}")
        
        with Session(engine) as session:
            db_sources = session.exec(select(DBSource)).all()
            sources = {s.id: Source(**s.model_dump()) for s in db_sources}
            
            # Fetch indications
            db_inds = session.exec(select(DBIndication)).all()
            herb_inds = {}
            form_inds = {}
            for ind in db_inds:
                d = ind.model_dump()
                d["evidence_tier"] = EvidenceTier(d["evidence_tier"])
                d["citations"] = [_citation(c) for c in d.get("citations", [])]
                d.pop("id")
                herb_id = d.pop("herb_id")
                formulation_id = d.pop("formulation_id")
                
                i_obj = Indication(**d)
                if herb_id:
                    herb_inds.setdefault(herb_id, []).append(i_obj)
                if formulation_id:
                    form_inds.setdefault(formulation_id, []).append(i_obj)
            
            db_herbs = session.exec(select(DBHerb)).all()
            herbs = {}
            for h in db_herbs:
                d = h.model_dump()
                d["citations"] = [_citation(c) for c in d.get("citations", [])]
                d["indications"] = herb_inds.get(h.id, [])
                herbs[h.id] = Herb(**d)
                
            db_conditions = session.exec(select(DBCondition)).all()
            conditions = {}
            for c in db_conditions:
                d = c.model_dump()
                d["citations"] = [_citation(cit) for cit in d.get("citations", [])]
                conditions[c.id] = Condition(**d)
                
            db_forms = session.exec(select(DBFormulation)).all()
            formulations = {}
            for f in db_forms:
                d = f.model_dump()
                d["citations"] = [_citation(c) for c in d.get("citations", [])]
                d["indications"] = form_inds.get(f.id, [])
                formulations[f.id] = Formulation(**d)
                
        return cls(sources, herbs, conditions, formulations)

    # ---- lookups -----------------------------------------------------------

    def herbs_for_condition(self, condition_id: str) -> list[tuple[Herb, Indication]]:
        """All (herb, indication) pairs that address a condition, best evidence first."""
        out: list[tuple[Herb, Indication]] = []
        for herb in self.herbs.values():
            for ind in herb.indications:
                if ind.condition_id == condition_id:
                    out.append((herb, ind))
        out.sort(key=lambda pair: pair[1].evidence_tier.rank, reverse=True)
        return out

    def formulations_for_condition(
        self, condition_id: str
    ) -> list[tuple[Formulation, Indication]]:
        out: list[tuple[Formulation, Indication]] = []
        for f in self.formulations.values():
            for ind in f.indications:
                if ind.condition_id == condition_id:
                    out.append((f, ind))
        out.sort(key=lambda pair: pair[1].evidence_tier.rank, reverse=True)
        return out

    def resolve_source(self, source_id: str) -> Optional[Source]:
        return self.sources.get(source_id)

    # ---- stats -------------------------------------------------------------

    def stats(self) -> dict[str, int]:
        return {
            "sources": len(self.sources),
            "herbs": len(self.herbs),
            "conditions": len(self.conditions),
            "formulations": len(self.formulations),
            "indications": sum(len(h.indications) for h in self.herbs.values())
            + sum(len(f.indications) for f in self.formulations.values()),
        }


def _read(path: Path) -> list[dict]:
    with path.open(encoding="utf-8") as fh:
        return json.load(fh)
