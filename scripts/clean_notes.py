"""One-off cleanup: strip build-process scaffolding that verifier agents left in
`note` fields during the expansion workflow.

We KEEP substantive provenance/evidence notes (e.g. "RCTs report reduced plaque…",
"confirm exact verse against a specific edition") and REMOVE notes that talk about
the build pipeline, schema validation, or tiering decisions — meta-commentary that
has no place in a user-facing knowledge base and is now stale.
"""

from __future__ import annotations

import json
import re
from pathlib import Path

DATA = Path(__file__).resolve().parent.parent / "data"

SCAFFOLD = re.compile(
    r"validate_data|scripts/|conditions\.json|schema enum|\bblocker\b|"
    r"will fail|will pass|to pass\b|must be added|must first be added|"
    r"not yet present|does not yet exist|not present in (the )?data|"
    r"current corpus|current conditions|current data|"
    r"do ?not upgrade|don.t upgrade|placeholder only|"
    r"tier set to|tiered ['\"]|\breviewer|this would add|already exists as|"
    r"before this indication|before it will|unknown condition|"
    r"emits? error|would emit|\blines? \d|herb-side check|herb:[a-z_]+\b|"
    r"not ['\"]clinical['\"]|below [a-z_]+->|reviewer-confirmed",
    re.I,
)


def _scrub(obj: dict) -> int:
    note = obj.get("note")
    if note and SCAFFOLD.search(note):
        del obj["note"]
        return 1
    return 0


def main() -> int:
    removed = 0
    for fname in ("herbs.json", "formulations.json", "conditions.json"):
        path = DATA / fname
        data = json.loads(path.read_text(encoding="utf-8"))
        for entry in data:
            for ind in entry.get("indications", []):
                removed += _scrub(ind)
                for c in ind.get("citations", []):
                    removed += _scrub(c)
            for c in entry.get("citations", []):
                removed += _scrub(c)
        with path.open("w", encoding="utf-8") as fh:
            json.dump(data, fh, ensure_ascii=False, indent=2)
            fh.write("\n")
    print(f"Removed {removed} scaffolding note(s).")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
