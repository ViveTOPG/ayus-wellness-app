# Āyus app — build progress (self-paced /loop)

Goal: a complete, polished, customer-ready Ayurveda wellness app. This file is the
source of truth for the loop — each iteration reads it, does the next items, updates it.

## Done (v1)
- [x] Hero + mandala, how-it-works, heritage teaser
- [x] Intake: category/search → concern → duration → intensity
- [x] Analyzing animation
- [x] Result: dosha view, Ayurvedic view, red flags, cited solution cards (trust chain), dinacharya routine, share
- [x] Heritage: history timeline, first-principles concepts, evidence tiers, sources

## Backlog (prioritised)
### Iteration 1 — Herb library + detail  ✅ DONE
- [x] Herbs nav + screen: browse all 66 herbs, search, filter by evidence tier
- [x] Herb detail modal: full dravyaguṇa, all indications (tier + citations), safety
- [x] Reusable accessible modal (focus trap, Esc, backdrop, body lock, focus restore)
- [x] Result herb names link into the modal
- Verified via eval: 66 cards, clinical filter→7, search "withania"→Ashwagandha, modal 9 props/4 indications/5 safety, close unlocks body. (Screenshot service was timing out — visual recheck pending next pass.)

### Iteration 2 — Personalisation & memory  ✅ DONE
- [x] Prakriti (dosha constitution) quiz: 7 questions → dosha bars + dominant type + tailored balancing tips, saved to device
- [x] localStorage Store; favourite herbs (bookmark in modal), recently-viewed tracking, saved routines
- [x] "My space" screen: constitution + saved routines + favourites + recently viewed, with remove actions
- Verified via eval: quiz → Vāta 71%; fav toggle persists; My space shows prakriti + 1 routine + favs + 2 recent; localStorage correct; no console errors.

### Iteration 3 — Polish & reach  ◑ PARTIAL (a11y/mobile/print done; dark+motion → 3b)
- [x] Accessibility: skip link, global :focus-visible rings, aria-current nav, input aria-labels, nav aria-label
- [x] Mobile responsiveness: responsive scrollable nav, single-col grids, modal/stat/q-nav/share tweaks @560px
- [x] Print / export routine (print stylesheet hides chrome, expands sources; Print/PDF button on result)
- [x] Dark mode toggle: full variable theme + theme-aware surfaces; system-pref default + persisted; no-flash head script
- [x] Dark-mode contrast audited via eval — all key text/badges 7.7–13.8 (WCAG AA+), zero failures
- [x] Fixed a real bug: page background froze on theme toggle (var() in `background` shorthand + `background-attachment: fixed` not re-resolving) → split to longhands + inline ROOT_BG pin
- [x] Motion polish: staggered reveal delays; context note converted to themeable class
- [ ] Verify mobile layout with a resize tool  → final QA (iter 5)
- Verified via eval: a11y wiring, dark contrast, theme persist; inline bg pin set correctly per theme; no console errors.

NOTE: preview screenshot service has timed out the whole loop. Page-background render in the *headless* preview is unconfirmable via getComputedStyle (canvas-bg quirk), but the inline pin is correct for real browsers. Final visual pass pending screenshot recovery.

### Iteration 4 — Depth  ✅ DONE
- [x] Library now browses Herbs AND Formulas (type toggle); formulation detail modal with ingredients (cross-linked to herbs), uses, safety, sources
- [x] Result formulation cards open the formulation modal; search works across ingredient names
- [x] Daily rasāyana ritual tip on home (14 tips, rotates by day-of-year)
- [x] Footer quick-links (Check-in / Know yourself / Herbs / Heritage / My space)
- [~] Glossary: covered in-context (dravyaguṇa glosses in herb modals + heritage concepts grid) — no standalone page needed
- [x] Edge/empty states present (library no-match, My space empties, concern with no herbs)
- Verified via eval: 66 herbs / 11 formulas toggle; Triphala modal 3 ingredient chips→herb links, 5 uses, 3 safety; daily tip renders; footer links; no console errors.

### Iteration 5 — Final QA  ✅ DONE → loop converged
- [x] Eval sweep: all 28 concerns render (recs + red flags), all 66 herbs open, all 11 formulas open, theme toggles, quiz completes — ZERO errors
- [x] Engine still green: validate_data 0/0, 7 tests pass, data.js rebuilt in sync (66/28/11/609)
- [x] No console errors across the whole sweep
- [~] Visual/mobile screenshots: BLOCKED — preview screenshot service timed out the entire loop (not an app issue). Dark mode verified via WCAG contrast audit instead; layout is standard responsive CSS. Recommend a manual visual glance when convenient.

## STATUS: feature-complete & verified (functional). Loop stopped.
The app covers: hero, guided check-in, dosha "what's happening", cited solutions + trust chain,
dinacharya routine (share/save/print), herb+formula library with detail & cross-links,
Prakriti quiz, My space (favourites/recent/saved, on-device), heritage + sources,
dark mode, accessibility, mobile, daily tip, footer. Engine remains the single source of truth.

## Notes
- Vanilla HTML/CSS/JS, offline, data from app/data.js (regen: python scripts/build_web_app.py)
- Preview: launch.json server name `ayus-web`, port 5500
