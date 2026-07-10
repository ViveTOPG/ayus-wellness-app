"use client";
import { useState, useCallback, useEffect, useRef } from "react";
import { api } from "@/lib/api";

const ACTIVITY_LEVELS = [
  { id: "sedentary", label: "Sedentary", desc: "Desk job, little exercise", mult: "1.2" },
  { id: "light", label: "Light", desc: "1–3 days/week", mult: "1.375" },
  { id: "moderate", label: "Moderate", desc: "3–5 days/week", mult: "1.55" },
  { id: "very", label: "Very Active", desc: "6–7 days/week", mult: "1.725" },
  { id: "extreme", label: "Extreme", desc: "Twice daily / pro athlete", mult: "1.9" },
];

const GOALS = [
  { id: "lose", label: "Lose weight", adj: "-500 kcal", icon: "▽" },
  { id: "maintain", label: "Maintain", adj: "Maintenance", icon: "=" },
  { id: "gain", label: "Gain weight", adj: "+500 kcal", icon: "△" },
];

const CALC_TABS = [
  { id: "all", label: "Full Analysis", icon: "✦" },
  { id: "bmi", label: "BMI", icon: "⚖" },
  { id: "bmr", label: "BMR", icon: "🔥" },
  { id: "bodyfat", label: "Body Fat", icon: "◉" },
  { id: "water", label: "Water", icon: "💧" },
  { id: "macros", label: "Macros", icon: "🥗" },
];

function useCalc() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const call = useCallback(async (fn) => {
    setLoading(true); setError(null);
    try { const r = await fn(); setResult(r); } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, []);
  return { loading, error, result, setResult, call };
}

function Input({ label, unit, value, onChange, min, max, step, type = "number" }) {
  return (
    <label className="calc-field">
      <span className="calc-label">{label}</span>
      <div className="calc-input-wrap">
        <input type={type} value={value} onChange={onChange} min={min} max={max} step={step} />
        {unit && <span className="calc-unit">{unit}</span>}
      </div>
    </label>
  );
}

function CalcContainer({ title, subtitle, children, result, icon }) {
  return (
    <div className="calc-container">
      <div className="calc-header">
        <span className="calc-icon">{icon}</span>
        <div>
          <h3 className="calc-title">{title}</h3>
          {subtitle && <p className="calc-sub">{subtitle}</p>}
        </div>
      </div>
      <div className="calc-body">
        {children}
      </div>
      {result && (
        <div className="calc-result-panel">
          {typeof result === "string" ? (
            <p className="calc-result-text">{result}</p>
          ) : (
            Object.entries(result).map(([k, v]) => (
              <div key={k} className="calc-stat">
                <span className="calc-stat-label">{k.replace(/_/g, " ")}</span>
                <span className="calc-stat-value">{String(v)}</span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

export default function CalculatorsPage() {
  const [tab, setTab] = useState("all");
  const [age, setAge] = useState("30");
  const [sex, setSex] = useState("male");
  const [weight, setWeight] = useState("70");
  const [height, setHeight] = useState("175");
  const [waist, setWaist] = useState("");
  const [neck, setNeck] = useState("");
  const [hip, setHip] = useState("");
  const [bfPct, setBfPct] = useState("");
  const [activity, setActivity] = useState("moderate");
  const [goal, setGoal] = useState("maintain");
  const [climateHot, setClimateHot] = useState(false);

  const { loading, error, result, call } = useCalc();
  const resultRef = useRef(null);

  useEffect(() => { if (result && resultRef.current) resultRef.current.scrollIntoView({ behavior: "smooth", block: "start" }); }, [result]);

  const runCalc = useCallback(() => {
    const w = parseFloat(weight), h = parseFloat(height), a = parseInt(age);
    const wc = waist ? parseFloat(waist) : null;
    const nc = neck ? parseFloat(neck) : null;
    const hc = hip ? parseFloat(hip) : null;

    if (tab === "all") {
      call(() => api.calcAll(a, sex, w, h, activity, goal, wc, nc, hc));
    } else if (tab === "bmi") {
      call(() => api.calcBMI(w, h));
    } else if (tab === "bmr") {
      call(() => api.calcBMR(a, sex, w, h, bfPct || null));
    } else if (tab === "bodyfat") {
      call(() => api.calcBodyFat(a, sex, w, h, wc, nc, hc));
    } else if (tab === "water") {
      call(() => api.calcWaterIntake(w, activity, climateHot));
    } else if (tab === "macros") {
      call(() => api.calcTargetCalories(a, sex, w, h, activity, goal));
    }
  }, [tab, age, sex, weight, height, waist, neck, hip, bfPct, activity, goal, climateHot, call]);

  const bmiCat = result?.bmi?.category;
  const bmiCatClass = bmiCat?.toLowerCase().includes("normal") ? "cat-green"
    : bmiCat?.toLowerCase().includes("thin") || bmiCat?.toLowerCase().includes("under") ? "cat-yellow"
    : bmiCat?.toLowerCase().includes("obese") ? "cat-red"
    : "cat-orange";

  return (
    <main className="screen active">
      <section className="calc-hero">
        <div className="wrap">
          <div className="section-head text-center">
            <div className="kicker">Know your numbers</div>
            <h1>Body Intelligence</h1>
            <p>Ancient wisdom meets modern metrics. Understand the signals your body sends — from metabolism to macros.</p>
          </div>
        </div>
      </section>

      <section className="calc-tabs wrap">
        {CALC_TABS.map(t => (
          <button key={t.id} className={`calc-tab ${tab === t.id ? "active" : ""}`} onClick={() => setTab(t.id)}>
            <span className="tab-icon">{t.icon}</span>
            <span>{t.label}</span>
          </button>
        ))}
      </section>

      <section className="calc-work wrap">
        <div className="calc-sidebar">
          <div className="calc-card-form">
            <h3 className="calc-form-title">Your metrics</h3>
            <div className="calc-form-grid">
              <Input label="Age" unit="years" value={age} onChange={e => setAge(e.target.value)} min="10" max="120" />
              <label className="calc-field">
                <span className="calc-label">Sex</span>
                <div className="calc-input-wrap">
                  <select value={sex} onChange={e => setSex(e.target.value)}>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                  </select>
                </div>
              </label>
              <Input label="Weight" unit="kg" value={weight} onChange={e => setWeight(e.target.value)} min="20" max="400" step="0.1" />
              <Input label="Height" unit="cm" value={height} onChange={e => setHeight(e.target.value)} min="50" max="280" />
              {tab !== "bmi" && tab !== "water" && (
                <Input label="Waist" unit="cm" value={waist} onChange={e => setWaist(e.target.value)} />
              )}
              {(tab === "all" || tab === "bodyfat") && (
                <>
                  <Input label="Neck" unit="cm" value={neck} onChange={e => setNeck(e.target.value)} />
                  {sex === "female" && <Input label="Hip" unit="cm" value={hip} onChange={e => setHip(e.target.value)} />}
                </>
              )}
            </div>

            <label className="calc-field">
              <span className="calc-label">Activity level</span>
              <div className="calc-input-wrap">
                <select value={activity} onChange={e => setActivity(e.target.value)}>
                  {ACTIVITY_LEVELS.map(a => <option key={a.id} value={a.id}>{a.label} — {a.mult}×</option>)}
                </select>
              </div>
            </label>

            {(tab === "all" || tab === "macros") && (
              <div className="calc-goals">
                <span className="calc-label">Goal</span>
                <div className="goal-chips">
                  {GOALS.map(g => (
                    <button key={g.id} className={`goal-chip ${goal === g.id ? "selected" : ""}`} onClick={() => setGoal(g.id)}>
                      <span className="goal-icon">{g.icon}</span>
                      <span>{g.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {tab === "water" && (
              <label className="calc-field checkbox-field">
                <input type="checkbox" checked={climateHot} onChange={e => setClimateHot(e.target.checked)} />
                <span>Hot climate / heavy sweating</span>
              </label>
            )}

            <button className="btn btn-primary calc-run" onClick={runCalc} disabled={loading}>
              {loading ? <span className="calc-spinner">⟳</span> : "Calculate"}
              <span className="btn-arrow">→</span>
            </button>
            {error && <p className="calc-error">{error}</p>}
          </div>
        </div>

        <div className="calc-main" ref={resultRef}>
          {!result && !loading && (
            <div className="calc-empty">
              <div className="calc-empty-icon">✦</div>
              <h3>Ready when you are</h3>
              <p>Fill in your metrics and hit Calculate to see your complete body profile.</p>
            </div>
          )}
          {loading && (
            <div className="calc-loading">
              <div className="calc-pulse"><span className="calc-pulse-core">○</span></div>
              <p>Crunching the numbers…</p>
            </div>
          )}

          {result && !loading && tab === "all" && (
            <div className="calc-results">
              <div className="calc-results-header">
                <h2>Your Complete Profile</h2>
                <p>All metrics calculated from your inputs</p>
              </div>

              <div className="calc-bmi-banner" data-cat={bmiCatClass}>
                <span className="bmi-big">{result.bmi.bmi}</span>
                <div>
                  <span className="bmi-label">BMI</span>
                  <span className="bmi-cat">{result.bmi.category}</span>
                  <span className="bmi-range">Healthy: {result.bmi.healthy_weight_range_kg[0]}–{result.bmi.healthy_weight_range_kg[1]} kg</span>
                </div>
              </div>

              <div className="calc-metric-grid">
                <div className="calc-metric-card">
                  <span className="metric-icon">🔥</span>
                  <span className="metric-value">{result.bmr.bmr_kcal}</span>
                  <span className="metric-label">BMR (kcal/day)</span>
                  <span className="metric-sub">{result.bmr.formula}</span>
                </div>
                <div className="calc-metric-card">
                  <span className="metric-icon">⚡</span>
                  <span className="metric-value">{result.tdee.tdee_kcal}</span>
                  <span className="metric-label">TDEE (kcal/day)</span>
                  <span className="metric-sub">{result.tdee.activity_level} · {result.tdee.multiplier}×</span>
                </div>
                <div className="calc-metric-card">
                  <span className="metric-icon">🎯</span>
                  <span className="metric-value">{result.target_calories.target_kcal}</span>
                  <span className="metric-label">Target Calories</span>
                  <span className="metric-sub">{result.target_calories.goal}</span>
                </div>
                <div className="calc-metric-card">
                  <span className="metric-icon">◉</span>
                  <span className="metric-value">{result.body_fat.body_fat_pct}%</span>
                  <span className="metric-label">Body Fat</span>
                  <span className="metric-sub">{result.body_fat.method} · {result.body_fat.category}</span>
                </div>
                <div className="calc-metric-card">
                  <span className="metric-icon">💧</span>
                  <span className="metric-value">{result.water_intake.total_l}L</span>
                  <span className="metric-label">Water Intake</span>
                  <span className="metric-sub">{result.water_intake.cups} cups/day</span>
                </div>
                <div className="calc-metric-card">
                  <span className="metric-icon">🔄</span>
                  <span className="metric-value">{result.ideal_weight.devine_kg}kg</span>
                  <span className="metric-label">Ideal Weight (Devine)</span>
                  <span className="metric-sub">Range: {result.ideal_weight.bmi_based_range_kg[0]}–{result.ideal_weight.bmi_based_range_kg[1]} kg</span>
                </div>
              </div>

              {result.target_calories.macro_split && (
                <div className="calc-macro-panel">
                  <h3>Macronutrient Split</h3>
                  <div className="macro-bars">
                    <div className="macro-row">
                      <span className="macro-label">Protein</span>
                      <div className="macro-track">
                        <div className="macro-fill protein" style={{ width: result.target_calories.macro_split.protein_pct + "%" }} />
                      </div>
                      <span className="macro-gram">{result.target_calories.macro_split.protein_g}g</span>
                    </div>
                    <div className="macro-row">
                      <span className="macro-label">Carbs</span>
                      <div className="macro-track">
                        <div className="macro-fill carbs" style={{ width: result.target_calories.macro_split.carbs_pct + "%" }} />
                      </div>
                      <span className="macro-gram">{result.target_calories.macro_split.carbs_g}g</span>
                    </div>
                    <div className="macro-row">
                      <span className="macro-label">Fat</span>
                      <div className="macro-track">
                        <div className="macro-fill fat" style={{ width: result.target_calories.macro_split.fat_pct + "%" }} />
                      </div>
                      <span className="macro-gram">{result.target_calories.macro_split.fat_g}g</span>
                    </div>
                  </div>
                </div>
              )}

              {result.waist_to_height && (
                <div className="calc-ratios">
                  <div className="ratio-card">
                    <h4>Waist-to-Height</h4>
                    <span className="ratio-val">{result.waist_to_height.ratio}</span>
                    <span className={`ratio-risk risk-${result.waist_to_height.risk_level.toLowerCase()}`}>{result.waist_to_height.risk_level} risk</span>
                  </div>
                  {result.waist_to_hip && (
                    <div className="ratio-card">
                      <h4>Waist-to-Hip</h4>
                      <span className="ratio-val">{result.waist_to_hip.ratio}</span>
                      <span className={`ratio-risk risk-${result.waist_to_hip.risk_level.toLowerCase()}`}>{result.waist_to_hip.category}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {result && !loading && tab === "bmi" && (
            <div className="calc-results">
              <div className="calc-bmi-banner" data-cat={bmiCatClass}>
                <span className="bmi-big">{result.bmi}</span>
                <div>
                  <span className="bmi-label">BMI</span>
                  <span className="bmi-cat">{result.category}</span>
                  <span className="bmi-sub">BMI Prime: {result.bmi_prime}</span>
                </div>
              </div>
              <div className="calc-simple-stat">
                <span>Healthy weight range</span>
                <strong>{result.healthy_weight_range_kg[0]} – {result.healthy_weight_range_kg[1]} kg</strong>
              </div>
            </div>
          )}

          {result && !loading && tab === "bmr" && (
            <div className="calc-results">
              <div className="calc-metric-grid">
                <div className="calc-metric-card big">
                  <span className="metric-icon">🔥</span>
                  <span className="metric-value">{result.bmr_kcal}</span>
                  <span className="metric-label">BMR (kcal/day)</span>
                  <span className="metric-sub">{result.formula}</span>
                </div>
              </div>
              {result.note && <p className="calc-note">{result.note}</p>}
            </div>
          )}

          {result && !loading && tab === "bodyfat" && (
            <div className="calc-results">
              <div className="calc-metric-grid">
                <div className="calc-metric-card big">
                  <span className="metric-icon">◉</span>
                  <span className="metric-value">{result.body_fat_pct}%</span>
                  <span className="metric-label">Body Fat</span>
                  <span className="metric-sub">{result.method} · {result.category}</span>
                </div>
                <div className="calc-metric-card">
                  <span className="metric-label">Lean Mass</span>
                  <span className="metric-value">{result.lean_mass_kg} kg</span>
                </div>
                <div className="calc-metric-card">
                  <span className="metric-label">Fat Mass</span>
                  <span className="metric-value">{result.fat_mass_kg} kg</span>
                </div>
              </div>
            </div>
          )}

          {result && !loading && tab === "water" && (
            <div className="calc-results">
              <div className="calc-metric-grid">
                <div className="calc-metric-card big">
                  <span className="metric-icon">💧</span>
                  <span className="metric-value">{result.total_l}L</span>
                  <span className="metric-label">Daily Water Intake</span>
                  <span className="metric-sub">{result.cups} cups · {result.total_ml} ml</span>
                </div>
              </div>
              <div className="calc-simple-stat">
                <span>Base requirement</span>
                <strong>{result.base_ml} ml</strong>
              </div>
              {result.activity_ml > 0 && (
                <div className="calc-simple-stat">
                  <span>Activity adjustment</span>
                  <strong>+{result.activity_ml} ml</strong>
                </div>
              )}
            </div>
          )}

          {result && !loading && tab === "macros" && (
            <div className="calc-results">
              <div className="calc-metric-grid">
                <div className="calc-metric-card big">
                  <span className="metric-icon">🎯</span>
                  <span className="metric-value">{result.target_kcal}</span>
                  <span className="metric-label">Daily Target</span>
                  <span className="metric-sub">TDEE: {result.tdee_kcal} · Goal: {result.goal} ({result.adjustment > 0 ? "+" : ""}{result.adjustment})</span>
                </div>
              </div>
              {result.macro_split && (
                <div className="calc-macro-panel">
                  <h3>Recommended Macros</h3>
                  <div className="macro-bars">
                    <div className="macro-row">
                      <span className="macro-label" style={{ color: "var(--terracotta)" }}>Protein</span>
                      <div className="macro-track">
                        <div className="macro-fill protein" style={{ width: result.macro_split.protein_pct + "%" }} />
                      </div>
                      <span className="macro-gram">{result.macro_split.protein_g}g ({result.macro_split.protein_pct}%)</span>
                    </div>
                    <div className="macro-row">
                      <span className="macro-label" style={{ color: "var(--gold)" }}>Carbs</span>
                      <div className="macro-track">
                        <div className="macro-fill carbs" style={{ width: result.macro_split.carbs_pct + "%" }} />
                      </div>
                      <span className="macro-gram">{result.macro_split.carbs_g}g ({result.macro_split.carbs_pct}%)</span>
                    </div>
                    <div className="macro-row">
                      <span className="macro-label" style={{ color: "var(--green)" }}>Fat</span>
                      <div className="macro-track">
                        <div className="macro-fill fat" style={{ width: result.macro_split.fat_pct + "%" }} />
                      </div>
                      <span className="macro-gram">{result.macro_split.fat_g}g ({result.macro_split.fat_pct}%)</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      <section className="band band-cta">
        <div className="wrap text-center">
          <div className="section-head">
            <h2>Numbers tell a story</h2>
            <p>Pair your metrics with Ayurvedic wisdom — discover what your body type means for your ideal routine.</p>
          </div>
          <div className="hero-cta" style={{ justifyContent: "center" }}>
            <a href="/quiz" className="btn btn-gold btn-lg">Discover your dosha <span aria-hidden="true">→</span></a>
            <a href="/profile" className="btn btn-ghost btn-lg">Build your profile <span aria-hidden="true">→</span></a>
          </div>
        </div>
      </section>
    </main>
  );
}