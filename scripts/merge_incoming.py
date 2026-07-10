"""Merge a verified batch (data/_incoming.json) into the knowledge base.

The expansion workflow produces verified entries; this script merges them into the
canonical JSON files. It is defensive and roughly idempotent:

- new conditions / herbs / formulations are appended only if their id is not present
- augmentations add an indication to an existing herb/formulation only if that
  (target, condition_id) pair is not already there

_incoming.json shape:
{
  "conditions":     [ <condition>, ... ],
  "herbs":          [ <herb>, ... ],
  "formulations":   [ <formulation>, ... ],
  "augmentations":  [ {"target": "<id>", "target_kind": "herb"|"formulation",
                       "indication": { ... }}, ... ]
}

After merging, ALWAYS run:  python scripts/validate_data.py
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

DATA = Path(__file__).resolve().parent.parent / "data"

# Fields the engine actually reads, per entity. Anything else an agent invented is
# dropped on merge so the canonical files stay clean.
HERB_FIELDS = {
    "id", "common_name", "sanskrit_name", "botanical_name", "other_names",
    "rasa", "guna", "virya", "vipaka", "dosha_effect", "karma", "parts_used",
    "preparation", "typical_dosage", "indications", "safety", "citations",
}
CONDITION_FIELDS = {
    "id", "name", "also_known_as", "description", "ayurvedic_view",
    "primary_dosha", "lifestyle", "diet", "red_flags", "citations",
}
FORMULATION_FIELDS = {
    "id", "name", "sanskrit_name", "type", "ingredients", "description",
    "indications", "typical_dosage", "safety", "citations",
}


def _load(name: str) -> list[dict]:
    with (DATA / name).open(encoding="utf-8") as fh:
        return json.load(fh)


def _save(name: str, obj: list[dict]) -> None:
    with (DATA / name).open("w", encoding="utf-8") as fh:
        json.dump(obj, fh, ensure_ascii=False, indent=2)
        fh.write("\n")


def _clean(entry: dict, allowed: set[str]) -> dict:
    return {k: v for k, v in entry.items() if k in allowed}


def main() -> int:
    incoming_path = DATA / "_incoming.json"
    if not incoming_path.exists():
        print("No data/_incoming.json found. Nothing to merge.")
        return 1
    with incoming_path.open(encoding="utf-8") as fh:
        inc = json.load(fh)

    herbs = _load("herbs.json")
    conditions = _load("conditions.json")
    formulations = _load("formulations.json")

    hidx = {h["id"]: h for h in herbs}
    cidx = {c["id"]: c for c in conditions}
    fidx = {f["id"]: f for f in formulations}

    added = {"conditions": 0, "herbs": 0, "formulations": 0, "augmentations": 0}
    skipped: list[str] = []

    for c in inc.get("conditions", []):
        if c["id"] in cidx:
            skipped.append(f"condition '{c['id']}' already exists")
            continue
        c = _clean(c, CONDITION_FIELDS)
        conditions.append(c)
        cidx[c["id"]] = c
        added["conditions"] += 1

    for h in inc.get("herbs", []):
        if h["id"] in hidx:
            skipped.append(f"herb '{h['id']}' already exists")
            continue
        h = _clean(h, HERB_FIELDS)
        herbs.append(h)
        hidx[h["id"]] = h
        added["herbs"] += 1

    for f in inc.get("formulations", []):
        if f["id"] in fidx:
            skipped.append(f"formulation '{f['id']}' already exists")
            continue
        f = _clean(f, FORMULATION_FIELDS)
        formulations.append(f)
        fidx[f["id"]] = f
        added["formulations"] += 1

    for a in inc.get("augmentations", []):
        tid = a.get("target")
        ind = a.get("indication")
        if not tid or not ind:
            skipped.append(f"malformed augmentation: {a!r}")
            continue
        target = hidx.get(tid) or fidx.get(tid)
        if target is None:
            skipped.append(f"augmentation target '{tid}' not found")
            continue
        cond = ind.get("condition_id")
        if any(i.get("condition_id") == cond for i in target.get("indications", [])):
            skipped.append(f"augmentation '{tid}' -> '{cond}' already present")
            continue
        target.setdefault("indications", []).append(ind)
        added["augmentations"] += 1

    _save("conditions.json", conditions)
    _save("herbs.json", herbs)
    _save("formulations.json", formulations)

    print("Merged into knowledge base:")
    for k, v in added.items():
        print(f"  +{v:3} {k}")
    if skipped:
        print("\nSkipped:")
        for s in skipped:
            print(f"  - {s}")
    print("\nNow run: python scripts/validate_data.py")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
