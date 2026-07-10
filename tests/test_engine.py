"""Engine tests using only the standard library (unittest).

    python -m unittest discover -s tests -v
"""

from __future__ import annotations

import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from ayurveda_engine.knowledge_base import KnowledgeBase  # noqa: E402
from ayurveda_engine.models import EvidenceTier  # noqa: E402
from ayurveda_engine.reasoning import Engine  # noqa: E402


class TestKnowledgeBase(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.kb = KnowledgeBase.load()
        cls.engine = Engine(cls.kb)

    def test_loads_nonempty(self):
        s = self.kb.stats()
        self.assertGreater(s["herbs"], 0)
        self.assertGreater(s["conditions"], 0)
        self.assertGreater(s["formulations"], 0)

    def test_every_indication_resolves_and_is_cited(self):
        """The core trust invariant: no claim without a real concern + real source."""
        for herb in self.kb.herbs.values():
            for ind in herb.indications:
                self.assertIn(ind.condition_id, self.kb.conditions,
                              f"{herb.id} -> unknown condition {ind.condition_id}")
                self.assertTrue(ind.citations, f"{herb.id} -> {ind.condition_id} uncited")
                for c in ind.citations:
                    self.assertIn(c.source_id, self.kb.sources,
                                  f"{herb.id} cites unknown source {c.source_id}")
                self.assertTrue(ind.rationale.strip())

    def test_recommendations_sorted_by_evidence(self):
        report = self.engine.report_for_condition("stress")
        self.assertIsNotNone(report)
        ranks = [EvidenceTier(r.evidence_tier).rank for r in report.recommendations]
        self.assertEqual(ranks, sorted(ranks, reverse=True),
                         "recommendations must be strongest-evidence-first")

    def test_report_has_safety_and_disclaimer(self):
        report = self.engine.report_for_condition("blood_sugar")
        self.assertTrue(report.red_flags, "every concern must carry red flags")
        self.assertIn("not medical advice", report.disclaimer.lower())

    def test_explain_builds_full_chain(self):
        res = self.engine.explain("ashwagandha", "stress")
        self.assertIsNotNone(res)
        chain = res["chain"]
        self.assertIn("3_why", chain)
        self.assertIn("5_evidence", chain)
        self.assertTrue(chain["6_sources"])

    def test_search_finds_by_alias(self):
        res = self.engine.search("digestion")
        ids = {c["id"] for c in res["conditions"]}
        self.assertIn("agnimandya", ids)

    def test_unknown_condition_returns_none(self):
        self.assertIsNone(self.engine.report_for_condition("does_not_exist"))


if __name__ == "__main__":
    unittest.main(verbosity=2)
