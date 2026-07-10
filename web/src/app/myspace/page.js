"use client";
import { useState } from "react";
import Link from "next/link";
import { useLocal } from "@/lib/storage";
import { useToast } from "@/components/Toast";
import { DOSHA_LABEL } from "@/lib/api";

const MOODS = ["😔", "😕", "😐", "🙂", "😄"];

export default function MySpace() {
  const [routines, setRoutines] = useLocal("routines", []);
  const [favList, setFavList] = useLocal("favList", []);
  const [prakriti, setPrakriti] = useLocal("prakriti", null);
  const [journal, setJournal] = useLocal("journal", []);

  const [mood, setMood] = useState(null);
  const [energy, setEnergy] = useState(5);
  const [notes, setNotes] = useState("");
  const toast = useToast();

  const addEntry = (e) => {
    e.preventDefault();
    if (mood == null) {
      toast("Pick a mood first");
      return;
    }
    const entry = {
      id: `j-${Date.now()}`,
      mood,
      energy,
      notes: notes.trim(),
      at: new Date().toISOString(),
    };
    setJournal([entry, ...journal].slice(0, 100));
    setMood(null); setEnergy(5); setNotes("");
    toast("Journal entry saved");
  };

  const deleteEntry = (id) => setJournal((j) => j.filter((e) => e.id !== id));
  const removeRoutine = (id) => setRoutines((r) => r.filter((e) => e.id !== id));
  const removeFav = (id, kind) =>
    setFavList((f) => f.filter((x) => !(x.id === id && x.kind === kind)));

  const hasAnything = routines.length || favList.length || prakriti || journal.length;

  return (
    <main className="screen active">
      <section className="band band-top">
        <div className="wrap">
          <div className="section-head text-center">
            <div className="kicker">Saved on this device</div>
            <h2>My space</h2>
            <p>Your constitution, the routines you keep, the herbs you’ve saved, and a private journal — all in this browser. Nothing leaves your device.</p>
          </div>

          {!hasAnything && (
            <div style={{ marginTop: 60, padding: 40, border: "1px dashed var(--line)", borderRadius: 16, textAlign: "center" }}>
              <h3 style={{ color: "var(--ink-faint)" }}>Nothing saved yet.</h3>
              <p className="muted mt-14">
                Complete a <Link href="/checkin">check-in</Link>, take the{" "}
                <Link href="/quiz">prakriti quiz</Link>, or{" "}
                <Link href="/library">save herbs</Link> from the library — they’ll appear here.
              </p>
            </div>
          )}

          {prakriti && (
            <div className="ms-section">
              <h3>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                  <circle cx="12" cy="12" r="9" /><path d="M12 3a9 9 0 0 0 0 18M3 12h18" />
                </svg>
                Your prakriti
              </h3>
              <div className="ms-prakriti">
                <div className="mp-name">{prakriti.primary || "—"}</div>
                <div className="mp-bars">
                  {["vata", "pitta", "kapha"].map((d) => {
                    const t = prakriti[d] || 0;
                    const total = (prakriti.vata || 0) + (prakriti.pitta || 0) + (prakriti.kapha || 0) || 1;
                    const w = Math.round((t / total) * 100);
                    const fill =
                      d === "vata" ? "var(--sky)" :
                      d === "pitta" ? "var(--terracotta)" : "var(--green-2)";
                    return (
                      <div key={d} className="mp-seg" style={{ width: w + "%", background: fill }} title={`${DOSHA_LABEL[d]}: ${t}`} />
                    );
                  })}
                </div>
                <button
                  type="button"
                  className="icon-btn"
                  aria-label="Remove prakriti"
                  title="Remove"
                  onClick={() => { setPrakriti(null); toast("Prakriti removed"); }}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14" /></svg>
                </button>
              </div>
            </div>
          )}

          {routines.length > 0 && (
            <div className="ms-section">
              <h3>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M9 11l3 3 5-6M21 12a9 9 0 1 1-9-9" /></svg>
                Saved routines
              </h3>
              {routines.map((r) => (
                <div className="routine-card" key={r.id}>
                  <div className="rc-h">
                    <Link href="/checkin" className="rc-name">{r.conditionName}</Link>
                    <div className="rc-date">{new Date(r.savedAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}</div>
                  </div>
                  {r.top && r.top.length > 0 && (
                    <ul>
                      {r.top.map((t, i) => <li key={i}>• {t}</li>)}
                    </ul>
                  )}
                  <button type="button" className="je-delete" onClick={() => removeRoutine(r.id)}>
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}

          {favList.length > 0 && (
            <div className="ms-section">
              <h3>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M6 4h12v17l-6-4-6 4z" /></svg>
                Saved herbs & formulas
              </h3>
              <div className="fav-chips">
                {favList.map((f) => (
                  <span className="fav-chip" key={`${f.kind}-${f.id}`}>
                    <Link href={`/library?item=${encodeURIComponent(f.id)}&kind=${encodeURIComponent(f.kind)}`}>
                      {f.name}
                    </Link>
                    <button
                      type="button"
                      className="x"
                      aria-label={`Remove ${f.name}`}
                      onClick={() => removeFav(f.id, f.kind)}
                    >×</button>
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="ms-section">
            <h3>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M5 3h14v18H5z" /><path d="M9 8h6M9 12h6" /></svg>
              Journal
            </h3>
            <form className="journal-new" onSubmit={addEntry}>
              <div className="journal-form">
                <div className="journal-row">
                  <label className="journal-label">How are you feeling?</label>
                  <div className="mood-picker">
                    {MOODS.map((m, i) => (
                      <button
                        key={i}
                        type="button"
                        className={`mood-btn ${mood === i ? "selected" : ""}`}
                        onClick={() => setMood(i)}
                        aria-label={`Mood ${i + 1} of 5`}
                      >{m}</button>
                    ))}
                  </div>
                </div>
                <div className="journal-row">
                  <label className="journal-label">Energy level</label>
                  <input
                    className="energy-slider"
                    type="range"
                    min="0"
                    max="10"
                    value={energy}
                    onChange={(e) => setEnergy(Number(e.target.value))}
                    aria-label="Energy level"
                  />
                  <div className="energy-labels"><span>Low</span><span>{energy}/10</span><span>High</span></div>
                </div>
                <div className="journal-row">
                  <label className="journal-label">Notes (optional)</label>
                  <textarea
                    className="journal-textarea"
                    rows={3}
                    placeholder="What happened today? Any patterns you notice?"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>
                <button type="submit" className="btn btn-primary btn-sm">Save entry <span className="btn-arrow">→</span></button>
              </div>
            </form>

            {journal.length > 0 && (
              <div className="journal-history mt-30">
                <div className="journal-history-title">Recent entries</div>
                {journal.map((e) => (
                  <div className="journal-entry" key={e.id}>
                    <div className="je-header">
                      <span className="je-date">
                        {new Date(e.at).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                      </span>
                      <span className="je-mood" aria-label="mood">{MOODS[e.mood]}</span>
                      <span className="je-energy">{e.energy}/10</span>
                    </div>
                    {e.notes && <p className="je-notes">{e.notes}</p>}
                    <div className="je-actions">
                      <button type="button" className="je-delete" onClick={() => deleteEntry(e.id)}>Delete</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {journal.length === 0 && (
              <p className="journal-empty">No journal entries yet.</p>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
