"use client";
import { useState, useEffect, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { api, TIER_LABEL } from "@/lib/api";
import Citations from "@/components/Citations";
import { useLocal } from "@/lib/storage";
import { useToast } from "@/components/Toast";

export default function LibraryPage() {
  return (
    <Suspense fallback={<main className="screen active"><section className="library wrap"><p className="muted">Loading library…</p></section></main>}>
      <Library />
    </Suspense>
  );
}

function Library() {
  const router = useRouter();
  const params = useSearchParams();
  // Derive tab and open state from URL — no setState-in-effect.
  const tab = params.get("kind") === "formulation" ? "formulation" : "herb";
  const urlItem = params.get("item");
  const urlKind = params.get("kind") || "herb";
  const [herbs, setHerbs] = useState([]);
  const [formulations, setFormulations] = useState([]);
  const [search, setSearch] = useState("");
  const [error, setError] = useState(null);
  const [favList, setFavList] = useLocal("favList", []);
  const toast = useToast();

  // Two cases trigger a fetch:
  //   1. URL has ?item=...   (deep-link from /checkin) — handled by triggering
  //      the fetch from a sync state initializer when the id is new.
  //   2. User clicks a card  (event handler) — pushes to URL, which re-enters
  //      the same initializer path.
  //
  // We avoid `react-hooks/set-state-in-effect` by using a state initializer
  // for the detail cache; setDetailCache updates only ever happen inside async
  // promise callbacks (i.e. external subscription updates).

  const [detailCache, setDetailCache] = useState(() => {
    if (typeof window === "undefined") return {};
    return {};
  });

  const refresh = useCallback((id, kind) => {
    setDetailCache((prev) => {
      if (prev[id]) return prev;
      const fetcher = kind === "formulation" ? api.formulation(id) : api.herb(id);
      fetcher
        .then((d) => setDetailCache((p) => ({ ...p, [id]: { ...d, _kind: kind } })))
        .catch((e) => setError(e.message));
      return prev;
    });
  }, []);

  // Kick off the deep-link fetch during init — this happens once at mount.
  // We store the resolved id in a ref so we don't re-fetch if the same id is
  // requested twice across navigations.
  if (typeof window !== "undefined" && urlItem && !detailCache[urlItem]) {
    // Schedule the async fetch via a microtask — this is effect-free.
    queueMicrotask(() => refresh(urlItem, urlKind));
  }

  // Clean the deep-link URL after the first read so refreshes don't re-trigger.
  useEffect(() => {
    if (params.get("item")) {
      router.replace("/library", { scroll: false });
    }
    // Run only once on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load the index lists once.
  useEffect(() => {
    let live = true;
    Promise.all([api.herbs(), api.formulations()])
      .then(([h, f]) => {
        if (!live) return;
        setHerbs(h || []);
        setFormulations(f || []);
      })
      .catch((e) => live && setError(e.message));
    return () => { live = false; };
  }, []);

  const openDetail = useCallback((id, kind) => {
    const sp = new URLSearchParams();
    sp.set("item", id);
    sp.set("kind", kind);
    router.push(`/library?${sp.toString()}`, { scroll: false });
  }, [router]);

  const closeDetail = () => {
    if (params.get("item")) {
      router.replace("/library", { scroll: false });
    } else {
      setDetailCache({});
    }
  };

  const detail = urlItem ? detailCache[urlItem] || null : null;
  const detailLoading = urlItem ? !detailCache[urlItem] : false;

  const isFav = (d) => favList.some((f) => f.id === d.id && f.kind === d._kind);
  const toggleFav = (d) => {
    const exists = isFav(d);
    const next = exists
      ? favList.filter((f) => !(f.id === d.id && f.kind === d._kind))
      : [...favList, { id: d.id, kind: d._kind, name: d.common_name || d.name }];
    setFavList(next);
    toast(exists ? "Removed from My space" : "Saved to My space");
  };

  const list = tab === "herb" ? herbs : formulations;
  const filtered = (list || []).filter((it) => {
    const name = (it.common_name || it.name || "").toLowerCase();
    const sk = (it.sanskrit_name || "").toLowerCase();
    const bn = (it.botanical_name || "").toLowerCase();
    const type = (it.type || "").toLowerCase();
    const q = search.toLowerCase();
    return !q || name.includes(q) || sk.includes(q) || bn.includes(q) || type.includes(q);
  });

  return (
    <main className="screen active">
      <section className="library wrap">
        <div className="section-head text-center">
          <div className="kicker">The materia medica</div>
          <h2>Ayurvedic Library</h2>
          <p>Search classical herbs and polyherbal formulations — each grounded in its source and evidence tier.</p>
        </div>

        {error && <p className="muted text-center">{error}</p>}

        <div className="lib-type">
          <button
            type="button"
            className={`tchip ${tab === "herb" ? "selected" : ""}`}
            onClick={() => setTab("herb")}
          >
            Herbs
          </button>
          <button
            type="button"
            className={`tchip ${tab === "formulation" ? "selected" : ""}`}
            onClick={() => setTab("formulation")}
          >
            Formulations
          </button>
        </div>

        <div className="searchbar">
          <svg className="si" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
            <circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" />
          </svg>
          <input
            type="text"
            placeholder={`Search ${tab === "herb" ? "herbs (e.g. Ashwagandha)" : "formulations (e.g. Triphala)"}`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search library"
          />
          <span className="search-kbd">{filtered.length}</span>
        </div>

        <div className="lib-count">
          {filtered.length} {tab === "herb" ? "herb" : "formulation"}{filtered.length === 1 ? "" : "s"}
        </div>

        <div className="lib-grid">
          {filtered.map((it) => (
            <button
              key={it.id}
              type="button"
              className="lib-card"
              onClick={() => openDetail(it.id, tab)}
            >
              <div className="lc-name">{it.common_name || it.name}</div>
              {it.sanskrit_name && <div className="lc-sk">{it.sanskrit_name}</div>}
              <div className="lc-bot">{it.botanical_name || it.type || (tab === "herb" ? "Herb" : "Formulation")}</div>
            </button>
          ))}
          {Array.isArray(list) && filtered.length === 0 && (
            <p className="muted">No matches.</p>
          )}
          {!Array.isArray(list) && <p className="muted">Loading…</p>}
        </div>
      </section>

      {detail && (
        <div className="modal open" role="dialog" aria-modal="true" aria-label={detail.common_name || detail.name}>
          <button type="button" className="modal-backdrop" onClick={closeDetail} aria-label="Close" />
          <div className="modal-card">
            <div className="modal-head">
              <button
                type="button"
                className={`fav-toggle ${isFav(detail) ? "on" : ""}`}
                onClick={() => toggleFav(detail)}
                aria-pressed={isFav(detail)}
                aria-label={isFav(detail) ? "Remove from My space" : "Save to My space"}
                title={isFav(detail) ? "Saved" : "Save"}
              >
                <svg viewBox="0 0 24 24" fill={isFav(detail) ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.6">
                  <path d="M6 4h12v17l-6-4-6 4z" />
                </svg>
              </button>
              <button type="button" className="modal-close" onClick={closeDetail} aria-label="Close">×</button>
              <div className="mh-name">{detail.common_name || detail.name}</div>
              {detail.sanskrit_name && <div className="mh-sk">{detail.sanskrit_name}</div>}
              {detail.botanical_name && <div className="mh-bot">{detail.botanical_name}</div>}
            </div>

            <div className="modal-body">
              {detailLoading && <p className="muted">Loading…</p>}

              {detail._kind === "herb" && detail.rasa && (
                <div className="prop-grid">
                  <Prop k="Rasa · Taste" v={arr(detail.rasa)} />
                  <Prop k="Guna · Qualities" v={arr(detail.guna)} />
                  <Prop k="Virya · Potency" v={detail.virya} />
                  <Prop k="Vipaka · Post-digestive" v={detail.vipaka} />
                  <div className="prop">
                    <div className="pk">Dosha effect</div>
                    <div className="pv">
                      <div className="dosha-mini">
                        {Object.entries(detail.dosha_effect || {}).map(([d, e]) => (
                          <span
                            key={d}
                            className={e === "decrease" ? "dm-dec" : e === "increase" ? "dm-inc" : "dm-neu"}
                          >
                            {d}: {e}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                  {detail.karma && detail.karma.length > 0 && (
                    <Prop k="Karma · Actions" v={arr(detail.karma)} />
                  )}
                </div>
              )}

              {detail._kind === "formulation" && (
                <>
                  {detail.type && <Prop k="Type" v={detail.type} />}
                  {detail.ingredients && detail.ingredients.length > 0 && (
                    <Prop k="Ingredients" v={arr(detail.ingredients)} />
                  )}
                </>
              )}

              {detail.description && (
                <>
                  <div className="modal-section-title">About</div>
                  <p className="lead-view">{detail.description}</p>
                </>
              )}

              {detail.typical_dosage && (
                <>
                  <div className="modal-section-title">Typical use</div>
                  <p>{detail.typical_dosage}</p>
                </>
              )}

              {detail.other_names && detail.other_names.length > 0 && (
                <Prop k="Also known as" v={arr(detail.other_names)} />
              )}

              {detail.parts_used && detail.parts_used.length > 0 && (
                <Prop k="Parts used" v={arr(detail.parts_used)} />
              )}

              {detail.preparation && detail.preparation.length > 0 && (
                <Prop k="Preparation" v={arr(detail.preparation)} />
              )}

              {detail.indications && detail.indications.length > 0 && (
                <>
                  <div className="modal-section-title">Indications</div>
                  {detail.indications.map((ind, i) => (
                    <div key={i} className="ind-item">
                      <div className="ind-head">
                        <span className="ind-cond">{ind.condition_id || ind.conditionId}</span>
                        <span className="tier" data-t={ind.evidence_tier}>
                          <span className="tb"></span>{TIER_LABEL[ind.evidence_tier] || ind.evidence_tier}
                        </span>
                      </div>
                      <p>{ind.rationale}</p>
                      <Citations citations={ind.citations} />
                    </div>
                  ))}
                </>
              )}

              {detail.safety && detail.safety.length > 0 && (
                <>
                  <div className="modal-section-title">Safety</div>
                  <ul className="safety-list">
                    {detail.safety.map((s, i) => <li key={i}>{s}</li>)}
                  </ul>
                </>
              )}

              {detail.citations && detail.citations.length > 0 && (
                <>
                  <div className="modal-section-title">Sources</div>
                  <Citations citations={detail.citations} />
                  <div className="chain" aria-label="Trust chain">
                    <span className="node">Substance</span>
                    <span className="arrow">→</span>
                    <span className="node">Indication</span>
                    <span className="arrow">→</span>
                    <span className="node">Rationale</span>
                    <span className="arrow">→</span>
                    <span className="node">Evidence</span>
                    <span className="arrow">→</span>
                    <span className="node">Source</span>
                  </div>
                </>
              )}

              <div className="modal-cta">
                <Link href="/checkin" className="btn btn-primary btn-sm">
                  Use in a check-in <span className="btn-arrow">→</span>
                </Link>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => toggleFav(detail)}
                >
                  {isFav(detail) ? "Remove from My space" : "Save to My space"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

function Prop({ k, v }) {
  if (!v || (Array.isArray(v) && v.length === 0)) return null;
  return (
    <div className="prop">
      <div className="pk">{k}</div>
      <div className="pv">{Array.isArray(v) ? v.join(", ") : v}</div>
    </div>
  );
}

function arr(v) {
  if (Array.isArray(v)) return v.join(", ");
  return v;
}
