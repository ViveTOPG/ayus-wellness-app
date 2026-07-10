"""Validate the knowledge base's integrity.

Trust depends on every claim resolving to a real source and a real concern.
This script fails loudly if any link is broken. Run it before shipping data.

    python scripts/validate_data.py
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from ayurveda_engine.knowledge_base import DATA_DIR, KnowledgeBase  # noqa: E402
from ayurveda_engine.models import EvidenceTier  # noqa: E402

VALID_TIERS = {t.value for t in EvidenceTier}


def _read_raw(fname: str) -> list[dict]:
    with (DATA_DIR / fname).open(encoding="utf-8") as fh:
        return json.load(fh)


def main() -> int:
    kb = KnowledgeBase.load()
    errors: list[str] = []
    warnings: list[str] = []

    # Duplicate-id check on the RAW files. KnowledgeBase loads entries into
    # id-keyed dicts, so a duplicate id would silently overwrite rather than fail —
    # this catches it before that happens.
    for fname in ("herbs.json", "conditions.json", "formulations.json"):
        seen: set[str] = set()
        for entry in _read_raw(fname):
            eid = entry.get("id")
            if eid in seen:
                errors.append(f"{fname}: duplicate id '{eid}'")
            seen.add(eid)

    def check_citations(owner: str, citations) -> None:
        for c in citations:
            if c.source_id not in kb.sources:
                errors.append(f"{owner}: citation points to unknown source '{c.source_id}'")

    # Herbs
    for hid, herb in kb.herbs.items():
        if hid != herb.id:
            errors.append(f"herb key '{hid}' != id '{herb.id}'")
        check_citations(f"herb:{hid}", herb.citations)
        if not herb.indications:
            warnings.append(f"herb:{hid} has no indications")
        for ind in herb.indications:
            if ind.condition_id not in kb.conditions:
                errors.append(
                    f"herb:{hid} indicates unknown condition '{ind.condition_id}'"
                )
            if ind.evidence_tier.value not in VALID_TIERS:
                errors.append(f"herb:{hid} has invalid evidence tier '{ind.evidence_tier}'")
            if not ind.rationale.strip():
                errors.append(f"herb:{hid}->{ind.condition_id} has empty rationale")
            if not ind.citations:
                errors.append(f"herb:{hid}->{ind.condition_id} has NO citation (trust chain broken)")
            check_citations(f"herb:{hid}->{ind.condition_id}", ind.citations)

    # Formulations
    for fid, f in kb.formulations.items():
        check_citations(f"formulation:{fid}", f.citations)
        for ind in f.indications:
            if ind.condition_id not in kb.conditions:
                errors.append(
                    f"formulation:{fid} indicates unknown condition '{ind.condition_id}'"
                )
            if not ind.citations:
                errors.append(f"formulation:{fid}->{ind.condition_id} has NO citation")
            check_citations(f"formulation:{fid}->{ind.condition_id}", ind.citations)
        # Ingredients that look like herb ids should resolve; free-text names are allowed.
        for ing in f.ingredients:
            if ing.islower() and " " not in ing and ing not in kb.herbs:
                warnings.append(
                    f"formulation:{fid} ingredient '{ing}' looks like a herb id but is not in herbs.json"
                )

    # Conditions
    for cid, cond in kb.conditions.items():
        check_citations(f"condition:{cid}", cond.citations)
        if not cond.red_flags:
            warnings.append(f"condition:{cid} has no red_flags (safety gap)")
        covered = kb.herbs_for_condition(cid) + kb.formulations_for_condition(cid)
        if not covered:
            warnings.append(f"condition:{cid} has no herbs or formulations addressing it")

    # Report
    print("Knowledge base stats:")
    for k, v in kb.stats().items():
        print(f"  {k:14} {v}")
    print()

    for w in warnings:
        print(f"  WARNING  {w}")
    for e in errors:
        print(f"  ERROR    {e}")

    print()
    if errors:
        print(f"FAILED: {len(errors)} error(s), {len(warnings)} warning(s).")
        return 1
    print(f"OK: 0 errors, {len(warnings)} warning(s).")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
