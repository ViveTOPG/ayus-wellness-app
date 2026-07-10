# Project: Ayurveda Wellness Engine

A source-cited, evidence-tiered Ayurvedic wellness knowledge engine. The **engine
is being built first**; a native app will consume it via the API later.

## Non-negotiable principles
- **Educational only.** Never frame output as diagnosis/treatment/cure. Every
  concern keeps `red_flags`; every herb keeps `safety`; output keeps the disclaimer.
- **First-principles trust = the provenance chain.** Every recommendation must
  reconstruct as: concern → herb/formulation → rationale → evidence tier → citation.
  Uncited indications are a bug and fail `scripts/validate_data.py`.
- **Honesty over hype on evidence.** Tiers are `classical < traditional <
  preliminary < clinical` and attach *per indication*. Modern-research citations
  use `requires_verification: true` until an exact study reference is attached.

## Architecture
- `ayurveda_engine/` — core, **stdlib only** (dataclasses). `models.py` defines the
  trust chain; `knowledge_base.py` loads `data/*.json`; `reasoning.py` is the
  `Engine` facade used by both CLI and API.
- `data/` — JSON is the single source of truth (sources, herbs, conditions, formulations).
- `api/main.py` — optional FastAPI layer (needs `pip install -r requirements.txt`).
- `app/` — self-contained animated web app (index.html + styles.css + app.js +
  generated data.js). Offline, no framework; mirrors the engine's reasoning in JS.
  Regenerate the bundle with `python scripts/build_web_app.py` after any data change.
  Preview via `.claude/launch.json` (server name `ayus-web`, port 5500).
- `scripts/validate_data.py` — run after any data change; must report `0 errors`.

## Commands
```
python scripts/validate_data.py                  # integrity check
python -m unittest discover -s tests -v          # tests (stdlib)
python -m ayurveda_engine.cli condition <id>     # demo a report
uvicorn api.main:app --reload                     # API + /docs
```

## Notes / gotchas
- Sanskrit diacritics (e.g. "ā") require UTF-8; `cli.py` reconfigures stdout for
  Windows consoles. Keep `ensure_ascii=False` when writing JSON.
- The corpus (currently 66 herbs / 28 conditions / 11 formulations / 191 cited
  indications) is still a proof of the model, not the final dataset. Grow it via
  the steps in README "How to grow…". Run validate_data.py for live counts.
- Expansion tooling: `scripts/merge_incoming.py` folds a verified batch
  (data/_incoming.json) into the KB; `scripts/clean_notes.py` strips build
  scaffolding from note fields. The last batch came from a generate→verify→critic
  workflow. Next suggested additions (from the critic): shilajit (with heavy-metal
  cautions), plus exact study/verse citations to replace requires_verification flags.
- Next planned phase: an ingestion pipeline for public-domain classical texts.
