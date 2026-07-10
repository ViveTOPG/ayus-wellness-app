"use client";
import { useState, useMemo, useRef, useEffect } from "react";
import Link from "next/link";
import { useLocal } from "@/lib/storage";
import { useToast } from "@/components/Toast";
import { DOSHA_LABEL } from "@/lib/api";

const MOODS = ["😔", "😕", "😐", "🙂", "😄"];
const MOOD_SCORE = [1, 2, 3, 4, 5];

export default function TrackingPage() {
  const toast = useToast();
  const [journal] = useLocal("journal", []);
  const [routines] = useLocal("routines", []);
  const [prakriti] = useLocal("prakriti", null);
  const [profile] = useLocal("userProfile", null);
  const [measurements, setMeasurements] = useLocal("measurements", []);
  const [showNewMeasurement, setShowNewMeasurement] = useState(false);

  const [mWeight, setMWeight] = useState("");
  const [mWaist, setMWaist] = useState("");
  const [mNotes, setMNotes] = useState("");

  const addMeasurement = (e) => {
    e.preventDefault();
    if (!mWeight) { toast("Enter your weight first"); return; }
    const entry = {
      id: `m-${Date.now()}`,
      weight_kg: parseFloat(mWeight),
      waist_cm: mWaist ? parseFloat(mWaist) : null,
      notes: mNotes.trim(),
      at: new Date().toISOString(),
    };
    setMeasurements([entry, ...measurements].slice(0, 200));
    setMWeight(""); setMWaist(""); setMNotes(""); setShowNewMeasurement(false);
    toast("Measurement saved");
  };

  const sortedJournal = useMemo(() => [...journal].sort((a, b) => new Date(b.at) - new Date(a.at)), [journal]);
  const sortedMeas = useMemo(() => [...measurements].sort((a, b) => new Date(a.at) - new Date(b.at)), [measurements]);
  const recentJournal = sortedJournal.slice(0, 10);

  const moodAvg = useMemo(() => {
    if (!journal.length) return 0;
    return (journal.reduce((s, e) => s + MOOD_SCORE[e.mood], 0) / journal.length).toFixed(1);
  }, [journal]);

  const energyAvg = useMemo(() => {
    if (!journal.length) return 0;
    return (journal.reduce((s, e) => s + e.energy, 0) / journal.length).toFixed(1);
  }, [journal]);

  const streak = useMemo(() => {
    if (!journal.length) return 0;
    const days = [...new Set(journal.map(e => new Date(e.at).toDateString()))].sort((a, b) => new Date(b) - new Date(a));
    let s = 1;
    for (let i = 1; i < days.length; i++) {
      const diff = (new Date(days[i - 1]) - new Date(days[i])) / 86400000;
      if (diff <= 1.5) s++; else break;
    }
    return s;
  }, [journal]);

  const weekJournal = useMemo(() => {
    const w = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const dateStr = d.toDateString();
      const entries = journal.filter(e => new Date(e.at).toDateString() === dateStr);
      const avgMood = entries.length ? (entries.reduce((s, e) => s + MOOD_SCORE[e.mood], 0) / entries.length) : null;
      const avgEnergy = entries.length ? (entries.reduce((s, e) => s + e.energy, 0) / entries.length) : null;
      w.push({ day: d.toLocaleDateString(undefined, { weekday: "short" }), date: dateStr, mood: avgMood, energy: avgEnergy, entries: entries.length });
    }
    return w;
  }, [journal]);

  const weightTrend = useMemo(() => {
    if (sortedMeas.length < 2) return null;
    const first = sortedMeas[0].weight_kg;
    const last = sortedMeas[sortedMeas.length - 1].weight_kg;
    const diff = last - first;
    return { first, last, diff: Math.round(diff * 10) / 10, direction: diff < 0 ? "down" : diff > 0 ? "up" : "stable" };
  }, [sortedMeas]);

  const deleteMeasurement = (id) => setMeasurements(m => m.filter(x => x.id !== id));

  return (
    <main className="screen active">
      <section className="track-hero">
        <div className="wrap">
          <div className="section-head text-center">
            <div className="kicker">Your journey</div>
            <h1>Progress & performance</h1>
            <p>Track your body changes, mood patterns, and daily habits — all in one place.</p>
          </div>
        </div>
      </section>

      <section className="track-dashboard wrap">
        <div className="track-stat-strip">
          <div className="track-stat-card">
            <span className="tstat-value">{journal.length}</span>
            <span className="tstat-label">Journal entries</span>
          </div>
          <div className="track-stat-card">
            <span className="tstat-value">{streak}</span>
            <span className="tstat-label">Day streak</span>
          </div>
          <div className="track-stat-card">
            <span className="tstat-value">{moodAvg}</span>
            <span className="tstat-label">Avg mood</span>
          </div>
          <div className="track-stat-card">
            <span className="tstat-value">{energyAvg}</span>
            <span className="tstat-label">Avg energy</span>
          </div>
          <div className="track-stat-card">
            <span className="tstat-value">{sortedMeas.length}</span>
            <span className="tstat-label">Measurements</span>
          </div>
          <div className="track-stat-card">
            <span className="tstat-value">{routines.length}</span>
            <span className="tstat-label">Routines saved</span>
          </div>
        </div>

        <div className="track-grid">
          <div className="track-panel">
            <div className="tp-header">
              <h3>Weekly snapshot</h3>
              <span className="tp-sub">Mood & energy (last 7 days)</span>
            </div>
            <div className="week-chart">
              <div className="wc-y-axis">
                <span>5</span><span>4</span><span>3</span><span>2</span><span>1</span>
              </div>
              <div className="wc-bars">
                {weekJournal.map(w => (
                  <div key={w.date} className="wc-col">
                    <div className="wc-bars-inner">
                      {w.mood !== null && (
                        <div className="wc-bar mood" style={{ height: (w.mood / 5) * 100 + "%" }} title={`Mood: ${w.mood.toFixed(1)}`}>
                          <span className="wc-bar-label">{MOODS[Math.round(w.mood) - 1]}</span>
                        </div>
                      )}
                      {w.energy !== null && (
                        <div className="wc-bar energy" style={{ height: (w.energy / 10) * 100 + "%" }} title={`Energy: ${w.energy.toFixed(1)}`}>
                          <span className="wc-bar-label">{Math.round(w.energy)}</span>
                        </div>
                      )}
                    </div>
                    <span className="wc-day">{w.day}</span>
                  </div>
                ))}
              </div>
            </div>
            {journal.length === 0 && <p className="tp-empty">No journal entries yet — start tracking to see your weekly pattern.</p>}
          </div>

          <div className="track-panel">
            <div className="tp-header">
              <h3>Weight trend</h3>
              <span className="tp-sub">{sortedMeas.length} measurements</span>
            </div>
            {weightTrend ? (
              <div className="wt-body">
                <div className="wt-summary">
                  <span className="wt-change" data-dir={weightTrend.direction}>
                    {weightTrend.direction === "down" ? "↓" : weightTrend.direction === "up" ? "↑" : "="} 
                    {Math.abs(weightTrend.diff)} kg
                  </span>
                  <span className="wt-range">{weightTrend.first} → {weightTrend.last} kg</span>
                </div>
                <div className="wt-chart">
                  {sortedMeas.map((m, i) => {
                    const min = Math.min(...sortedMeas.map(x => x.weight_kg));
                    const max = Math.max(...sortedMeas.map(x => x.weight_kg));
                    const range = max - min || 1;
                    const pct = ((m.weight_kg - min) / range) * 60;
                    return (
                      <div key={m.id} className="wt-point" style={{ bottom: pct + "%", left: (i / Math.max(1, sortedMeas.length - 1)) * 100 + "%" }} title={`${m.weight_kg} kg`}>
                        <span className="wt-dot" />
                      </div>
                    );
                  })}
                  <div className="wt-line" />
                </div>
              </div>
            ) : (
              <div className="tp-empty">
                <p>No measurements yet. Log your first weight to see trends.</p>
                <button className="btn btn-primary btn-sm" onClick={() => setShowNewMeasurement(true)}>Add measurement</button>
              </div>
            )}
            {!showNewMeasurement && sortedMeas.length > 0 && (
              <button className="btn btn-ghost btn-sm" onClick={() => setShowNewMeasurement(true)} style={{ marginTop: 12 }}>Add new measurement</button>
            )}
          </div>
        </div>

        {showNewMeasurement && (
          <div className="track-panel">
            <form className="measurement-form" onSubmit={addMeasurement}>
              <h3>Log measurement</h3>
              <div className="mf-grid">
                <label className="pf-field">
                  <span>Weight (kg)</span>
                  <input type="number" step="0.1" value={mWeight} onChange={e => setMWeight(e.target.value)} required />
                </label>
                <label className="pf-field">
                  <span>Waist (cm) — optional</span>
                  <input type="number" step="0.1" value={mWaist} onChange={e => setMWaist(e.target.value)} />
                </label>
                <label className="pf-field pf-field-full">
                  <span>Notes</span>
                  <input type="text" value={mNotes} onChange={e => setMNotes(e.target.value)} placeholder="Feeling good today…" />
                </label>
              </div>
              <div className="pf-actions">
                <button type="submit" className="btn btn-primary btn-sm">Save <span className="btn-arrow">→</span></button>
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => setShowNewMeasurement(false)}>Cancel</button>
              </div>
            </form>
          </div>
        )}

        {sortedMeas.length > 0 && (
          <div className="track-panel">
            <div className="tp-header">
              <h3>Measurement history</h3>
              <span className="tp-sub">{sortedMeas.length} entries</span>
            </div>
            <div className="mh-list">
              {[...sortedMeas].reverse().map(m => (
                <div key={m.id} className="mh-item">
                  <div className="mh-left">
                    <span className="mh-date">{new Date(m.at).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}</span>
                    <span className="mh-val">{m.weight_kg} kg</span>
                    {m.waist_cm && <span className="mh-val-sm">Waist: {m.waist_cm} cm</span>}
                    {m.notes && <p className="mh-notes">{m.notes}</p>}
                  </div>
                  <button className="mh-delete" onClick={() => deleteMeasurement(m.id)} aria-label="Delete">×</button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="track-panel">
          <div className="tp-header">
            <h3>Recent journal entries</h3>
            <span className="tp-sub">{journal.length} total</span>
          </div>
          {recentJournal.length > 0 ? (
            <div className="je-list">
              {recentJournal.map(e => (
                <div key={e.id} className="je-item">
                  <div className="je-item-header">
                    <span className="je-item-date">{new Date(e.at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span>
                    <span className="je-item-mood">{MOODS[e.mood]}</span>
                    <span className="je-item-energy">{e.energy}/10</span>
                  </div>
                  {e.notes && <p className="je-item-notes">{e.notes}</p>}
                </div>
              ))}
            </div>
          ) : (
            <div className="tp-empty">
              <p>No journal entries yet. Start tracking daily in <Link href="/myspace">My space</Link>.</p>
            </div>
          )}
          <Link href="/myspace" className="btn btn-ghost btn-sm" style={{ marginTop: 16 }}>Go to journal →</Link>
        </div>

        <div className="track-panel">
          <div className="tp-header">
            <h3>Wellness report</h3>
            <span className="tp-sub">AI-powered insights</span>
          </div>
          <div className="wr-body">
            {journal.length > 0 || sortedMeas.length > 0 ? (
              <div className="wr-insights">
                <div className="wr-insight">
                  <span className="wr-icon">📊</span>
                  <div>
                    <strong>Tracking consistency</strong>
                    <p>You have logged {journal.length} journal entries and {sortedMeas.length} body measurements. {streak > 1 ? `Current streak: ${streak} days — keep it up!` : "Try to log daily for the best insights."}</p>
                  </div>
                </div>
                {moodAvg > 0 && (
                  <div className="wr-insight">
                    <span className="wr-icon">😊</span>
                    <div>
                      <strong>Mood trend</strong>
                      <p>Your average mood is {moodAvg}/5 ({moodAvg >= 4 ? "great" : moodAvg >= 3 ? "balanced" : "could improve"}). {energyAvg > 0 && `Energy averages ${energyAvg}/10.`}</p>
                    </div>
                  </div>
                )}
                {weightTrend && (
                  <div className="wr-insight">
                    <span className="wr-icon">⚖</span>
                    <div>
                      <strong>Weight trend</strong>
                      <p>Changed by {Math.abs(weightTrend.diff)} kg {weightTrend.direction === "down" ? "down" : weightTrend.direction === "up" ? "up" : ""} across {sortedMeas.length} measurements.</p>
                    </div>
                  </div>
                )}
                {prakriti && (
                  <div className="wr-insight">
                    <span className="wr-icon">◉</span>
                    <div>
                      <strong>Ayurvedic profile</strong>
                      <p>Your dominant dosha is {prakriti.primary}. Check your <Link href="/profile">full profile</Link> for personalised recommendations.</p>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="tp-empty">
                <p>Start tracking your mood, energy, and body measurements — your wellness report will appear here.</p>
                <div className="hero-cta" style={{ justifyContent: "center", marginTop: 20 }}>
                  <Link href="/myspace" className="btn btn-primary btn-sm">Start journal <span className="btn-arrow">→</span></Link>
                  <button className="btn btn-gold btn-sm" onClick={() => setShowNewMeasurement(true)}>Log measurement</button>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="track-cta">
          <Link href="/profile" className="btn btn-ghost">Update your profile</Link>
          <Link href="/calculators" className="btn btn-ghost">Re-calculate metrics</Link>
          <Link href="/myspace" className="btn btn-ghost">View saved items</Link>
        </div>
      </section>
    </main>
  );
}