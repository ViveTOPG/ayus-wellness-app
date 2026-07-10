# Ayurveda Wellness Engine

A source-cited, evidence-tiered knowledge engine for Ayurvedic herbs, classical
formulations, and everyday health concerns — plus a reasoning layer that turns a
concern into recommendations **with their full provenance chain**.

The engine is built first and is deliberately decoupled from any app. A future
native application (and a web prototype) will consume it through the API.

> **Educational use only.** This project presents traditional Ayurvedic knowledge
> alongside, where it exists, modern research. It does **not** diagnose, treat, or
> cure any disease, and is not a substitute for professional medical care.

---

## Why you can trust it (the design principle)

Every single recommendation can be reconstructed into a transparent chain:

```
concern  →  herb / formulation  →  WHY (dravyaguṇa rationale)  →  evidence tier  →  cited source
```

Nothing is allowed into the knowledge base without that chain. This is enforced
by code (`scripts/validate_data.py` and the test suite), not by convention.

**Evidence tiers** keep us honest about *how strongly* each claim is supported —
and they attach **per indication**, because a herb can be well-studied for one use
and traditional-only for another:

| Tier | Meaning |
|------|---------|
| `classical` | Documented in a classical text. Traditional use only. |
| `traditional` | Widespread, long-standing traditional use across lineages. |
| `preliminary` | In-vitro / animal / small or uncontrolled human studies. |
| `clinical` | Supported by one or more controlled human trials (RCTs). |

Where a claim cites modern research, the citation currently carries
`requires_verification: true` — a deliberate flag meaning *"the exact study
(journal, year, DOI) still needs to be attached."* The engine never pretends the
evidence is stronger than what is actually cited.

---

## What's in the seed knowledge base

Run `python scripts/validate_data.py` to see live counts. Current corpus:

- **66 herbs** (Ashwagandha, Turmeric, Brahmi, Triphala's three fruits, Boswellia, Arjuna, Gurmar, Kutki, Vasaka, Kapikacchu, Ashoka, Guggul…)
- **28 health concerns** (digestion, sleep, stress, immunity, joints, skin, urinary, menstrual, heart, liver, hair, headache, diarrhea, IBS, nausea, respiratory, weight, eye, oral, vitality, allergic rhinitis, hemorrhoids…)
- **11 classical formulations** (Triphala, Trikatu, Sitopaladi, Chyawanprash, Hingvashtak, Avipattikar, Triphala Guggulu, Dashamoola, Talisadi, Mahasudarshan, Nishamalaki)
- **6 sources** (Charaka, Suśruta, Aṣṭāṅga Hṛdaya, Bhāvaprakāśa, API, + a modern-research slot)
- **191 cited indications**

The latest expansion was produced by a multi-agent workflow (generate → adversarial
verify → completeness critic); see `scripts/merge_incoming.py` and `scripts/clean_notes.py`.

This is a high-quality *seed*, not the finished corpus. It exists to prove the
model end-to-end; the data is designed to grow (see Roadmap).

---

## Project layout

```
ayurveda_engine/        Core engine — ZERO dependencies (Python stdlib only)
  models.py             The data model (the trust chain lives here)
  knowledge_base.py     Loads + indexes the JSON data
  reasoning.py          Turns a concern into recommendations w/ provenance
  cli.py                Explore it from the terminal
data/                   The knowledge base (single source of truth)
  sources.json          Citable sources (classical texts + research slot)
  herbs.json            Materia medica with properties + cited indications
  conditions.json       Concerns, dosha view, lifestyle/diet, red flags
  formulations.json     Classical multi-herb preparations
api/                    Optional FastAPI layer (the app's contract)
scripts/validate_data.py  Integrity checker — fails if any citation chain breaks
tests/                  Standard-library unit tests
```

---

## Quick start

The **core engine and CLI need nothing installed** beyond Python 3.10+:

```bash
# Validate the knowledge base
python scripts/validate_data.py

# Run the tests
python -m unittest discover -s tests -v

# Explore from the terminal
python -m ayurveda_engine.cli stats
python -m ayurveda_engine.cli search "digestion"
python -m ayurveda_engine.cli condition agnimandya
python -m ayurveda_engine.cli explain ashwagandha stress
python -m ayurveda_engine.cli herb turmeric
```

### Optional API (the future app's backend)

```bash
pip install -r requirements.txt
uvicorn api.main:app --reload
# open http://127.0.0.1:8000/docs
```

Endpoints: `/health`, `/conditions`, `/conditions/{id}`, `/herbs`, `/herbs/{id}`,
`/formulations`, `/search?q=`, `/explain?herb=&condition=`.

### The app — an animated web experience (`app/`)

A self-contained, offline single-page app that consumes the engine. No framework,
no server needed. Features:

- **Guided check-in** (concern → a couple of questions) → animated "what's happening"
  dosha reveal → cited herb/formula cards with evidence tier + full trust chain →
  a personalised daily routine (dinacharya) you can **share, save, or print**.
- **Apothecary** — browse all herbs *and* formulations, search, filter by evidence
  tier, open a detail modal (full dravyaguṇa, every cited use, safety; formulation
  ingredients cross-link to their herb).
- **Prakriti quiz** — a 7-question constitution assessment → your doṣa balance + tailored guidance.
- **My space** — favourite herbs, recently viewed, and saved routines, remembered on-device (localStorage).
- **Heritage** — Vedic history timeline, first-principles concepts, the evidence-tier model, and the source library.
- **Polish** — light/dark theme (system-default + persisted), keyboard accessibility,
  responsive mobile layout, a daily rasāyana ritual tip, and motion throughout.

```bash
python scripts/build_web_app.py        # bundle the corpus -> app/data.js (re-run after data changes)
# then just open app/index.html in a browser, or serve it:
python -m http.server 5500 --directory app   # http://localhost:5500
```

The app mirrors the engine's reasoning (strongest-evidence-first, per-indication
tiers, resolved citations) entirely client-side from `app/data.js`. It is built to
be wrapped to a true native app later (e.g. Capacitor) reusing the same data/API.

---

## How to grow the knowledge base

1. Add a `Source` to `data/sources.json` (give it a stable `id`).
2. Add herbs to `data/herbs.json` with their dravyaguṇa properties.
3. For each use, add an `Indication` with a `rationale`, an `evidence_tier`, and at
   least one `citation`. **Uncited indications fail validation.**
4. Run `python scripts/validate_data.py` until it reports `0 errors`.

When attaching modern research, replace the placeholder citation's `locator` with
the real reference and set `requires_verification: false`.

---

## Roadmap

- [x] **Phase 1 — Engine** (this): data model, seed corpus, reasoning, API, validation.
- [ ] **Phase 2 — Ingestion pipeline**: parse public-domain classical texts into
      structured candidate entries for human review (keeps citations honest).
- [ ] **Phase 3 — Corpus expansion**: scale herbs/conditions; attach exact
      verse-level and study-level citations; expert review.
- [ ] **Phase 4 — Search/intelligence**: symptom → concern matching, dosha profiling.
- [ ] **Phase 5 — Native app**: consumes the API; built on the same trust chain UI.

---

## A note on sourcing and safety

- Classical texts cited here (Charaka, Suśruta, etc.) have **public-domain English
  translations**; locators are given at section level and should be confirmed to a
  specific edition during Phase 3.
- Botanical names and properties follow standard materia medica; **authentication
  of plant species matters** (several entries note look-alike/adulterant risks).
- Every concern carries **red-flag warnings** for when to seek professional care,
  and every herb carries **safety/contraindication notes**. These are first-class
  data, not afterthoughts.
