"""Ayurveda knowledge engine.

A source-cited, evidence-tiered knowledge base of Ayurvedic herbs, formulations
and health concerns, plus a reasoning layer that turns a concern into
recommendations *with their full provenance chain*.

Educational use only. This engine does not diagnose, treat, or cure disease.
"""

from .models import (
    Citation,
    Condition,
    EvidenceTier,
    Formulation,
    Herb,
    Indication,
    Source,
)
from .knowledge_base import KnowledgeBase
from .reasoning import Engine

__all__ = [
    "Citation",
    "Condition",
    "EvidenceTier",
    "Formulation",
    "Herb",
    "Indication",
    "Source",
    "KnowledgeBase",
    "Engine",
]

__version__ = "0.1.0"
