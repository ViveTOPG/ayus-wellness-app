"""Core data model for the Ayurveda knowledge engine.

Design principle ("first-principles trust"): every recommendation the engine
can make must be reconstructable from these objects into a transparent chain:

    concern  ->  herb/formulation  ->  WHY (rationale)  ->  evidence tier  ->  cited source

Nothing the engine outputs is allowed to exist without that chain. If a claim
has no source and no rationale, it does not belong in the knowledge base.

The core engine uses only the Python standard library (dataclasses), so it runs
with nothing installed beyond Python itself. The optional API layer adds FastAPI.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum
from typing import Optional


class EvidenceTier(str, Enum):
    """Honest labelling of *how well supported* a specific claim is.

    We never blur traditional use with clinical proof. A herb can be CLINICAL
    for one use (e.g. ashwagandha for stress) and only CLASSICAL for another.
    Tiers are therefore attached per-indication, not per-herb.
    """

    CLASSICAL = "classical"        # Documented in a classical text. Traditional use only.
    TRADITIONAL = "traditional"    # Widespread, long-standing traditional use across lineages.
    PRELIMINARY = "preliminary"    # In-vitro / animal / small or uncontrolled human studies.
    CLINICAL = "clinical"          # Supported by one or more controlled human trials (RCTs).

    @property
    def rank(self) -> int:
        return {"classical": 0, "traditional": 1, "preliminary": 2, "clinical": 3}[self.value]

    @property
    def label(self) -> str:
        return {
            "classical": "Classical text only (traditional use)",
            "traditional": "Established traditional use",
            "preliminary": "Preliminary modern research",
            "clinical": "Supported by clinical trials",
        }[self.value]


@dataclass
class Source:
    """A citable source. Classical texts are public-domain; modern research
    entries are placeholders until an exact reference is attached."""

    id: str
    title: str
    kind: str                       # "classical" | "materia_medica" | "modern_research"
    author: Optional[str] = None
    translation: Optional[str] = None
    public_domain: bool = False
    note: Optional[str] = None
    url: Optional[str] = None


@dataclass
class Citation:
    """A pointer from a claim back into a Source."""

    source_id: str
    locator: Optional[str] = None           # e.g. "Sūtrasthāna 27" or "Haritakyadi varga"
    requires_verification: bool = False     # True = exact verse/study ref still to be confirmed
    note: Optional[str] = None


@dataclass
class Indication:
    """A single 'this helps with that' claim — the atom of the trust chain."""

    condition_id: str
    rationale: str                          # WHY, in dravyaguṇa / dosha terms
    evidence_tier: EvidenceTier
    citations: list[Citation] = field(default_factory=list)
    note: Optional[str] = None


@dataclass
class Herb:
    """A single medicinal substance (dravya) with its Ayurvedic properties."""

    id: str
    common_name: str
    sanskrit_name: Optional[str] = None
    botanical_name: Optional[str] = None
    other_names: list[str] = field(default_factory=list)

    # Dravyaguṇa — the classical "first principles" by which a substance acts.
    rasa: list[str] = field(default_factory=list)        # taste(s)
    guna: list[str] = field(default_factory=list)        # qualities
    virya: Optional[str] = None                          # potency: heating / cooling
    vipaka: Optional[str] = None                         # post-digestive effect
    dosha_effect: dict[str, str] = field(default_factory=dict)  # {"vata": "decrease", ...}
    karma: list[str] = field(default_factory=list)       # actions

    parts_used: list[str] = field(default_factory=list)
    preparation: list[str] = field(default_factory=list)
    typical_dosage: Optional[str] = None

    indications: list[Indication] = field(default_factory=list)
    safety: list[str] = field(default_factory=list)      # cautions / contraindications
    citations: list[Citation] = field(default_factory=list)  # general source for the herb


@dataclass
class Formulation:
    """A classical multi-herb preparation (yoga), e.g. Triphala."""

    id: str
    name: str
    sanskrit_name: Optional[str] = None
    type: Optional[str] = None              # churna / rasayana / avaleha / ...
    ingredients: list[str] = field(default_factory=list)   # herb ids where known, else names
    description: str = ""
    indications: list[Indication] = field(default_factory=list)
    typical_dosage: Optional[str] = None
    safety: list[str] = field(default_factory=list)
    citations: list[Citation] = field(default_factory=list)


@dataclass
class Condition:
    """A health concern, framed educationally (not as a diagnosis)."""

    id: str
    name: str
    also_known_as: list[str] = field(default_factory=list)
    description: str = ""
    ayurvedic_view: str = ""               # dosha framing
    primary_dosha: list[str] = field(default_factory=list)
    lifestyle: list[str] = field(default_factory=list)
    diet: list[str] = field(default_factory=list)
    red_flags: list[str] = field(default_factory=list)     # when to seek professional care
    citations: list[Citation] = field(default_factory=list)
