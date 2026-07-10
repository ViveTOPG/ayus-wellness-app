"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { api, DOSHA_LABEL } from "@/lib/api";
import Citations from "@/components/Citations";
import { useLocal } from "@/lib/storage";
import { useToast } from "@/components/Toast";

const DURATIONS = [
  { v: "new", label: "Just started" },
  { v: "days", label: "A few days" },
  { v: "weeks", label: "A few weeks" },
  { v: "long", label: "Months or longer" },
];
const INTENSITIES = [
  { v: "mild", label: "Mild — just noticeable" },
  { v: "moderate", label: "Moderate — bothersome" },
  { v: "strong", label: "Strong — hard to ignore" },
];

export default function Checkin() {
  const [step, setStep] = useState(1);
  const [conditions, setConditions] = useState([]);
  const [search, setSearch] = useState("");
  const [selectedCondition, setSelectedCondition] = useState(null);
  const [duration, setDuration] = useState(null);
  const [intensity, setIntensity] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [loadErr, setLoadErr] = useState(null);
  const [report, setReport] = useState(null);

  const [routines, setRoutines] = useLocal("routines", []);
  const toast = useToast();

  useEffect(() => {
    let live = true;
    api
      .conditions()
      .then((d) => live && setConditions(d))
      .catch((e) => live && setLoadErr(e.message));
    return () => { live = false; };
  }, []);

  const filtered = (conditions || []).filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      (c.also_known_as || []).some((a) => a.toLowerCase().includes(search.toLowerCase()))
  );

  const handleAnalyze = () => {
    setAnalyzing(true);
    setStep(4);
    api
      .condition(selectedCondition.id)
      .then((data) => {
        setReport(data);
        setAnalyzing(false);
      })
      .catch((e) => {
        setAnalyzing(false);
        setLoadErr(e.message);
      });
  };

  const saveRoutine = () => {
    if (!report) return;
    const entry = {
      id: `${report.condition.id}-${Date.now()}`,
      conditionId: report.condition.id,
      conditionName: report.condition.name,
      duration,
      intensity,
      savedAt: new Date().toISOString(),
      top: (report.recommendations || []).slice(0, 4).map((r) => r.name),
    };
    const next = [entry, ...routines].slice(0, 30);
    setRoutines(next);
    toast("Saved to My space");
  };

  const reset = () => {
    setStep(1); setReport(null); setSelectedCondition(null);
    setDuration(null); setIntensity(null); setSearch("");
  };

  return (
    <main className="screen active">
      {step < 4 && (
        <section className="intake wrap">
          <div className="progress">
            <span className={`dot ${step >= 1 ? "on" : ""}`}></span>
            <span className={`dot ${step >= 2 ? "on" : ""}`}></span>
            <span className={`dot ${step >= 3 ? "on" : ""}`}></span>
          </div>

          {step === 1 && (
            <div className="q-step active">
              <h2 className="q-title">Where shall we look?</h2>
              <p className="q-sub">Choose the area of your concern — or search for it directly.</p>
              <div className="searchbar">
                <svg className="si" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                  <circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" />
                </svg>
                <input
                  type="text"
                  placeholder="Search a concern (e.g. digestion, sleep, stress)…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  aria-label="Search concerns"
                />
              </div>
              {loadErr && <p className="text-center muted">{loadErr}</p>}
              <div className="grid-cards mt-18">
                {filtered.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    className={`tile ${selectedCondition?.id === c.id ? "selected" : ""}`}
                    onClick={() => { setSelectedCondition(c); setStep(2); }}
                  >
                    <h4>{c.name}</h4>
                    <div className="meta">{(c.also_known_as || []).slice(0, 2).join(", ")}</div>
                  </button>
                ))}
                {conditions.length && !filtered.length ? (
                  <p className="muted">No concern matches “{search}”.</p>
                ) : null}
                {!conditions.length && !loadErr ? (
                  <p className="muted">Loading concerns…</p>
                ) : null}
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="q-step active">
              <h2 className="q-title">How long has this been with you?</h2>
              <p className="q-sub">This helps us flag when something deserves a professional’s eye.</p>
              <div className="chips">
                {DURATIONS.map((d) => (
                  <button
                    key={d.v}
                    type="button"
                    className={`chip ${duration === d.v ? "selected" : ""}`}
                    onClick={() => setDuration(d.v)}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
              <div className="q-nav">
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => setStep(1)}>
                  <span className="btn-arrow">←</span> Back
                </button>
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={() => setStep(3)}
                  disabled={!duration}
                >
                  Continue <span className="btn-arrow">→</span>
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="q-step active">
              <h2 className="q-title">How much is it affecting you?</h2>
              <p className="q-sub">Be honest — strong or worsening symptoms change our advice.</p>
              <div className="chips">
                {INTENSITIES.map((d) => (
                  <button
                    key={d.v}
                    type="button"
                    className={`chip ${intensity === d.v ? "selected" : ""}`}
                    onClick={() => setIntensity(d.v)}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
              <div className="q-nav">
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => setStep(2)}>
                  <span className="btn-arrow">←</span> Back
                </button>
                <button
                  type="button"
                  className="btn btn-gold btn-sm"
                  onClick={handleAnalyze}
                  disabled={!intensity}
                >
                  Reveal what is happening ✦
                </button>
              </div>
            </div>
          )}
        </section>
      )}

      {step === 4 && analyzing && (
        <section className="analyzing">
          <div>
            <div className="pulse-wrap">
              <span className="pulse-ring"></span>
              <span className="pulse-ring"></span>
              <span className="pulse-ring"></span>
              <span className="pulse-core">ॐ</span>
            </div>
            <p className="amsg">Consulting the classics…</p>
          </div>
        </section>
      )}

      {step === 4 && !analyzing && report && (
        <section className="result wrap">
          <div className="result-hero">
            <div className="kicker">What is happening</div>
            <h2>{report.condition.name}</h2>
            <div className="dosha-row">
              {(report.condition.primary_dosha || []).map((d) => (
                <span key={d} className="dosha" data-d={d}>
                  <span className="ddot"></span>
                  <b>{DOSHA_LABEL[d] || d}</b>
                </span>
              ))}
            </div>
          </div>

          {report.red_flags && report.red_flags.length > 0 && (
            <div className="redflags">
              <div className="panel-label">When to seek a professional</div>
              <h3>Red flags — don’t self-manage these</h3>
              <ul>
                {report.red_flags.map((f, i) => (
                  <li key={i}>
                    <span className="rf-i">!</span>
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="panel">
            <div className="panel-label">The Ayurvedic view</div>
            <p className="lead-view">{report.condition.ayurvedic_view}</p>
            {report.condition.description && (
              <p className="mt-14">{report.condition.description}</p>
            )}
          </div>

          {report.condition.lifestyle && report.condition.lifestyle.length > 0 && (
            <div className="panel">
              <div className="panel-label">Daily routine · Dinacharya</div>
              <h3>Lifestyle</h3>
              <ul className="safety-list" style={{ listStyle: "none" }}>
                {report.condition.lifestyle.map((l, i) => <li key={i}>{l}</li>)}
              </ul>
            </div>
          )}

          {report.condition.diet && report.condition.diet.length > 0 && (
            <div className="panel">
              <div className="panel-label">Ahara · Diet</div>
              <h3>Eat with intention</h3>
              <ul className="safety-list" style={{ listStyle: "none" }}>
                {report.condition.diet.map((l, i) => <li key={i}>{l}</li>)}
              </ul>
            </div>
          )}

          <div className="section-head" style={{ margin: "50px auto 24px" }}>
            <div className="kicker">Your supportive solutions</div>
            <h2 style={{ fontSize: "clamp(28px,5vw,44px)" }}>Cited herbs & formulas</h2>
          </div>

          {(report.recommendations || []).length === 0 && (
            <p className="muted text-center">
              No herbs or formulations are recorded for this concern yet.
            </p>
          )}

          <div className="sol-grid">
            {(report.recommendations || []).map((r) => (
              <div key={`${r.kind}-${r.id}`} className="sol-card">
                <span className={`kind-pill ${r.kind}`} title={r.evidence_label}>
                  {r.kind}
                </span>
                <div className="sc-top">
                  <Link
                    href={`/library?item=${encodeURIComponent(r.id)}&kind=${encodeURIComponent(r.kind)}`}
                    className="sc-name sc-link"
                  >
                    {r.name}
                    <span className="sc-arrow" aria-hidden="true">→</span>
                  </Link>
                </div>
                {r.properties && r.properties.botanical_name && (
                  <span className="sc-bot">{r.properties.botanical_name}</span>
                )}
                {r.properties && r.properties.sanskrit_name && (
                  <span className="sc-bot">{r.properties.sanskrit_name}</span>
                )}
                <span className="tier" data-t={r.evidence_tier} title={r.evidence_label}>
                  <span className="tb"></span>{r.evidence_tier}
                </span>
                <p className="sc-why">{r.rationale}</p>
                <div className="sc-foot">
                  {r.typical_dosage && (
                    <div className="sc-dose"><b>Typical use: </b>{r.typical_dosage}</div>
                  )}
                  {r.safety && r.safety.length > 0 && (
                    <div className="mt-14">
                      <button
                        type="button"
                        className="disclose"
                        aria-expanded="false"
                        onClick={(e) => {
                          const b = e.currentTarget;
                          const body = b.nextElementSibling;
                          const open = body.classList.toggle("open");
                          b.setAttribute("aria-expanded", open ? "true" : "false");
                          b.textContent = open ? "− Safety notes" : "+ Safety notes";
                        }}
                      >
                        + Safety notes
                      </button>
                      <div className="disclose-body">
                        <ul className="safety-list">
                          {r.safety.map((s, i) => <li key={i}>{s}</li>)}
                        </ul>
                      </div>
                    </div>
                  )}
                  <div className="mt-14">
                    <button
                      type="button"
                      className="disclose"
                      aria-expanded="false"
                      onClick={(e) => {
                        const b = e.currentTarget;
                        const body = b.nextElementSibling;
                        const open = body.classList.toggle("open");
                        b.setAttribute("aria-expanded", open ? "true" : "false");
                        b.textContent = open ? "− Sources & evidence" : "+ Sources & evidence";
                      }}
                    >
                      + Sources & evidence
                    </button>
                    <div className="disclose-body">
                      <Citations citations={r.citations} />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="chain" aria-label="Trust chain">
            <span className="node">Concern</span>
            <span className="arrow">→</span>
            <span className="node">Substance</span>
            <span className="arrow">→</span>
            <span className="node">Rationale</span>
            <span className="arrow">→</span>
            <span className="node">Evidence</span>
            <span className="arrow">→</span>
            <span className="node">Cited source</span>
          </div>

          <div className="share-row">
            <button type="button" className="btn btn-primary" onClick={saveRoutine}>
              Save this routine
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={async () => {
                try {
                  await navigator.share({
                    title: `Ayus — ${report.condition.name}`,
                    text: report.condition.ayurvedic_view,
                    url: window.location.href,
                  });
                } catch {
                  toast("Sharing is not available here — use Save instead.");
                }
              }}
            >
              Share <span className="btn-arrow">→</span>
            </button>
            <button type="button" className="btn btn-ghost" onClick={reset}>
              Check another concern
            </button>
          </div>

          <p className="disclaimer">
            <span className="disclaimer-text">{report.disclaimer}</span>
          </p>

          <p style={{ textAlign: "center", marginTop: 20 }}>
            <Link href="/library" className="btn btn-ghost btn-sm">
              Browse all herbs & formulas <span className="btn-arrow">→</span>
            </Link>
          </p>
        </section>
      )}
    </main>
  );
}
