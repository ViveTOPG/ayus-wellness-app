"""Bundle the engine's knowledge base into a single JS file the web app loads.

The web app (app/) is a self-contained, offline, no-server experience. It can't
fetch data/*.json over file://, so we emit app/data.js with the whole corpus on
`window.AYUR`. Re-run this whenever the data changes:

    python scripts/build_web_app.py
"""

from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data"
OUT = ROOT / "app" / "data.js"

# Friendly groupings for the 28 concerns, used to build the intake "where shall
# we look?" categories. Anything unmapped falls into "Everyday wellness".
CATEGORY = {
    "agnimandya": "Digestion & gut",
    "constipation": "Digestion & gut",
    "acidity": "Digestion & gut",
    "diarrhea": "Digestion & gut",
    "ibs": "Digestion & gut",
    "nausea": "Digestion & gut",
    "liver_wellness": "Digestion & gut",
    "hemorrhoids": "Digestion & gut",
    "stress": "Mind & emotions",
    "sleep": "Mind & emotions",
    "memory_focus": "Mind & emotions",
    "headache": "Mind & emotions",
    "fatigue": "Energy & immunity",
    "vitality": "Energy & immunity",
    "low_immunity": "Energy & immunity",
    "skin_health": "Skin & hair",
    "hair_health": "Skin & hair",
    "joint_discomfort": "Joints & body",
    "cold_cough": "Breath & allergy",
    "respiratory_support": "Breath & allergy",
    "allergic_rhinitis": "Breath & allergy",
    "heart_wellness": "Heart & metabolic",
    "blood_sugar": "Heart & metabolic",
    "weight_management": "Heart & metabolic",
    "menstrual_wellness": "Women's wellness",
    "urinary_health": "Urinary care",
    "eye_health": "Eyes & mouth",
    "oral_health": "Eyes & mouth",
}

# A Tabler-ish icon hint + accent per category (the app maps these to inline SVG).
CATEGORY_META = {
    "Digestion & gut": {"icon": "bowl", "accent": "saffron"},
    "Mind & emotions": {"icon": "lotus", "accent": "indigo"},
    "Energy & immunity": {"icon": "flame", "accent": "terracotta"},
    "Skin & hair": {"icon": "leaf", "accent": "rose"},
    "Joints & body": {"icon": "bone", "accent": "green"},
    "Breath & allergy": {"icon": "wind", "accent": "sky"},
    "Heart & metabolic": {"icon": "heart", "accent": "terracotta"},
    "Women's wellness": {"icon": "moon", "accent": "rose"},
    "Urinary care": {"icon": "drop", "accent": "sky"},
    "Eyes & mouth": {"icon": "eye", "accent": "gold"},
}


def _load(name: str):
    with (DATA / name).open(encoding="utf-8") as fh:
        return json.load(fh)


def main() -> int:
    sources = _load("sources.json")
    herbs = _load("herbs.json")
    conditions = _load("conditions.json")
    formulations = _load("formulations.json")

    # attach category to each condition
    for c in conditions:
        c["category"] = CATEGORY.get(c["id"], "Everyday wellness")

    citation_count = 0
    for coll in (herbs, conditions, formulations):
        for e in coll:
            citation_count += len(e.get("citations", []))
            for ind in e.get("indications", []):
                citation_count += len(ind.get("citations", []))

    indication_count = sum(len(h.get("indications", [])) for h in herbs) + sum(
        len(f.get("indications", [])) for f in formulations
    )

    bundle = {
        "meta": {
            "herbs": len(herbs),
            "conditions": len(conditions),
            "formulations": len(formulations),
            "indications": indication_count,
            "citations": citation_count,
            "sources": len(sources),
        },
        "sources": {s["id"]: s for s in sources},
        "conditions": conditions,
        "herbs": herbs,
        "formulations": formulations,
        "categoryMeta": CATEGORY_META,
    }

    OUT.parent.mkdir(exist_ok=True)
    payload = json.dumps(bundle, ensure_ascii=False, separators=(",", ":"))
    OUT.write_text("window.AYUR = " + payload + ";\n", encoding="utf-8")
    kb = bundle["meta"]
    print(f"Wrote {OUT.relative_to(ROOT)}  ({OUT.stat().st_size // 1024} KB)")
    print(
        f"  {kb['herbs']} herbs · {kb['conditions']} conditions · "
        f"{kb['formulations']} formulations · {kb['citations']} citations"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
