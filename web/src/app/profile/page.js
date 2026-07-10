"use client";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useLocal } from "@/lib/storage";
import { useToast } from "@/components/Toast";
import { api, DOSHA_LABEL } from "@/lib/api";

const GENDER_LABELS = { male: "Male", female: "Female" };
const ACTIVITY_NAMES = { sedentary: "Sedentary", light: "Light", moderate: "Moderate", very: "Very Active", extreme: "Extreme" };
const BMC = { ectomorph: "Ectomorph (lean, thin frame)", mesomorph: "Mesomorph (athletic, muscular)", endomorph: "Endomorph (stocky, soft curves)" };
const SLEEP_TYPES = { lion: "Lion — Early riser, early bed", bear: "Bear — Sun-synced sleeper", wolf: "Wolf — Night owl", dolphin: "Dolphin — Light, irregular sleeper" };
const DIET_TYPES = { vegetarian: "Vegetarian", vegan: "Vegan", pescatarian: "Pescatarian", omnivore: "Omnivore", flexitarian: "Flexitarian", keto: "Keto / Low-carb", paleo: "Paleo" };

export default function ProfilePage() {
  const toast = useToast();
  const [profile, setProfile] = useLocal("userProfile", null);
  const [prakriti] = useLocal("prakriti", null);
  const [editMode, setEditMode] = useState(!profile);

  const defaultProfile = {
    name: "",
    age: 30,
    sex: "male",
    height_cm: 175,
    weight_kg: 70,
    goal: "maintain",
    activity: "moderate",
    body_type: "",
    sleep_type: "",
    diet_type: "",
    concerns: "",
    allergies: "",
    medications: "",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const [form, setForm] = useState(profile || defaultProfile);
  const [saving, setSaving] = useState(false);
  const [calcResults, setCalcResults] = useState(null);

  useEffect(() => {
    if (profile && form.weight_kg && form.height_cm && form.age && form.sex) {
      api.calcAll(form.age, form.sex, parseFloat(form.weight_kg), parseFloat(form.height_cm), form.activity || "moderate", form.goal || "maintain")
        .then(setCalcResults).catch(() => {});
    }
  }, [profile]);

  const handleSave = useCallback(() => {
    setSaving(true);
    const updated = { ...form, updated_at: new Date().toISOString() };
    if (!profile) updated.created_at = new Date().toISOString();
    setProfile(updated);
    setForm(updated);
    setEditMode(false);
    setSaving(false);
    toast("Profile saved!");
  }, [form, profile, setProfile, toast]);

  const handleInputChange = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }));
  const handleNumberChange = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }));

  if (!profile || editMode) {
    return (
      <main className="screen active">
        <section className="profile-builder wrap">
          <div className="section-head text-center">
            <div className="kicker">{profile ? "Edit your" : "Create your"} profile</div>
            <h1>{profile ? "Update Profile" : "Your Wellness Profile"}</h1>
            <p>Let us know you — the more detail, the more personalised your insights.</p>
          </div>

          <div className="profile-form-card">
            <div className="pf-section">
              <h3>Basic info</h3>
              <div className="pf-grid">
                <label className="pf-field">
                  <span>Name</span>
                  <input type="text" value={form.name} onChange={handleInputChange("name")} placeholder="Your name" />
                </label>
                <label className="pf-field">
                  <span>Age</span>
                  <input type="number" value={form.age} onChange={handleNumberChange("age")} min="10" max="120" />
                </label>
                <label className="pf-field">
                  <span>Sex</span>
                  <select value={form.sex} onChange={handleInputChange("sex")}>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                  </select>
                </label>
                <label className="pf-field">
                  <span>Height (cm)</span>
                  <input type="number" value={form.height_cm} onChange={handleNumberChange("height_cm")} min="50" max="280" />
                </label>
                <label className="pf-field">
                  <span>Weight (kg)</span>
                  <input type="number" value={form.weight_kg} onChange={handleNumberChange("weight_kg")} min="20" max="400" step="0.1" />
                </label>
              </div>
            </div>

            <div className="pf-section">
              <h3>Lifestyle & wellness</h3>
              <div className="pf-grid">
                <label className="pf-field">
                  <span>Activity level</span>
                  <select value={form.activity} onChange={handleInputChange("activity")}>
                    {Object.entries(ACTIVITY_NAMES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </label>
                <label className="pf-field">
                  <span>Goal</span>
                  <select value={form.goal} onChange={handleInputChange("goal")}>
                    <option value="lose">Lose weight</option>
                    <option value="maintain">Maintain</option>
                    <option value="gain">Gain weight</option>
                  </select>
                </label>
                <label className="pf-field">
                  <span>Body type</span>
                  <select value={form.body_type} onChange={handleInputChange("body_type")}>
                    <option value="">Select…</option>
                    {Object.entries(BMC).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </label>
                <label className="pf-field">
                  <span>Sleep chronotype</span>
                  <select value={form.sleep_type} onChange={handleInputChange("sleep_type")}>
                    <option value="">Select…</option>
                    {Object.entries(SLEEP_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </label>
                <label className="pf-field">
                  <span>Diet</span>
                  <select value={form.diet_type} onChange={handleInputChange("diet_type")}>
                    <option value="">Select…</option>
                    {Object.entries(DIET_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </label>
              </div>
            </div>

            <div className="pf-section">
              <h3>Health notes (optional)</h3>
              <div className="pf-grid">
                <label className="pf-field pf-field-full">
                  <span>Health concerns</span>
                  <textarea value={form.concerns} onChange={handleInputChange("concerns")} rows={2} placeholder="Any conditions, symptoms, or areas you are working on…" />
                </label>
                <label className="pf-field pf-field-full">
                  <span>Allergies / intolerances</span>
                  <textarea value={form.allergies} onChange={handleInputChange("allergies")} rows={2} placeholder="Food allergies, environmental allergies, etc." />
                </label>
                <label className="pf-field pf-field-full">
                  <span>Medications / supplements</span>
                  <textarea value={form.medications} onChange={handleInputChange("medications")} rows={2} placeholder="Current meds, supplements, or herbs you take" />
                </label>
              </div>
            </div>

            <div className="pf-actions">
              <button className="btn btn-primary btn-lg" onClick={handleSave} disabled={saving}>
                {saving ? "Saving…" : profile ? "Update profile" : "Create profile"} <span className="btn-arrow">→</span>
              </button>
              {profile && <button className="btn btn-ghost" onClick={() => { setEditMode(false); setForm(profile); }}>Cancel</button>}
            </div>
          </div>
        </section>
      </main>
    );
  }

  const bmiVal = calcResults?.bmi?.bmi;
  const bmiCat = calcResults?.bmi?.category;
  const bodyFat = calcResults?.body_fat?.body_fat_pct;
  const tdee = calcResults?.tdee?.tdee_kcal;
  const waterL = calcResults?.water_intake?.total_l;

  return (
    <main className="screen active">
      <section className="profile-view wrap">
        <div className="pv-header">
          <div className="pv-avatar">{profile.name ? profile.name[0].toUpperCase() : "U"}</div>
          <div>
            <h1>{profile.name || "Your Profile"}</h1>
            <p className="pv-meta">{profile.age} years · {GENDER_LABELS[profile.sex]} · {ACTIVITY_NAMES[profile.activity]}</p>
            <p className="pv-since">Profile created {new Date(profile.created_at).toLocaleDateString()}</p>
          </div>
          <button className="btn btn-ghost btn-sm pv-edit" onClick={() => { setEditMode(true); }}>
            Edit profile
          </button>
        </div>

        {prakriti && (
          <div className="pv-card pv-dosha">
            <div className="pv-card-header">
              <span className="pv-card-icon">◉</span>
              <h3>Ayurvedic Constitution</h3>
            </div>
            <div className="pv-dosha-body">
              <div className="pv-primary">{prakriti.primary}</div>
              <div className="pv-dosha-bars">
                {["vata", "pitta", "kapha"].map(d => {
                  const pct = Math.round(((prakriti[d] || 0) / ((prakriti.vata || 0) + (prakriti.pitta || 0) + (prakriti.kapha || 0) || 1)) * 100);
                  return (
                    <div key={d} className="pv-bar-row">
                      <span className="pv-bar-label">{DOSHA_LABEL[d]}</span>
                      <div className="pv-bar-track"><div className="pv-bar-fill" data-d={d} style={{ width: pct + "%" }} /></div>
                      <span className="pv-bar-pct">{pct}%</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {profile.body_type && (
          <div className="pv-card">
            <div className="pv-card-header">
              <span className="pv-card-icon">◇</span>
              <h3>Body Type</h3>
            </div>
            <p>{BMC[profile.body_type]}</p>
          </div>
        )}

        {calcResults && (
          <div className="pv-card pv-stats">
            <div className="pv-card-header">
              <span className="pv-card-icon">✦</span>
              <h3>Body Metrics</h3>
              <span className="pv-card-date">Based on latest inputs</span>
            </div>
            <div className="pv-stat-grid">
              <div className="pv-stat">
                <span className="pv-stat-val">{bmiVal}</span>
                <span className="pv-stat-label">BMI · {bmiCat}</span>
              </div>
              <div className="pv-stat">
                <span className="pv-stat-val">{bodyFat}%</span>
                <span className="pv-stat-label">Body Fat</span>
              </div>
              <div className="pv-stat">
                <span className="pv-stat-val">{tdee}</span>
                <span className="pv-stat-label">TDEE (kcal)</span>
              </div>
              <div className="pv-stat">
                <span className="pv-stat-val">{waterL}L</span>
                <span className="pv-stat-label">Water / day</span>
              </div>
            </div>
            <Link href="/calculators" className="pv-cta-link">Full calculation details →</Link>
          </div>
        )}

        {(profile.concerns || profile.allergies || profile.medications) && (
          <div className="pv-card pv-notes">
            <div className="pv-card-header">
              <span className="pv-card-icon">📋</span>
              <h3>Health Notes</h3>
            </div>
            <div className="pv-notes-grid">
              {profile.concerns && (
                <div><strong>Concerns</strong><p>{profile.concerns}</p></div>
              )}
              {profile.allergies && (
                <div><strong>Allergies / Intolerances</strong><p>{profile.allergies}</p></div>
              )}
              {profile.medications && (
                <div><strong>Medications / Supplements</strong><p>{profile.medications}</p></div>
              )}
            </div>
          </div>
        )}

        {profile.sleep_type && (
          <div className="pv-card">
            <div className="pv-card-header">
              <span className="pv-card-icon">🌙</span>
              <h3>Sleep Chronotype</h3>
            </div>
            <p>{SLEEP_TYPES[profile.sleep_type]}</p>
          </div>
        )}

        {profile.diet_type && (
          <div className="pv-card">
            <div className="pv-card-header">
              <span className="pv-card-icon">🥗</span>
              <h3>Diet Preference</h3>
            </div>
            <p>{DIET_TYPES[profile.diet_type]}</p>
          </div>
        )}

        <div className="pv-footer-actions">
          <Link href="/calculators" className="btn btn-primary">Update metrics <span className="btn-arrow">→</span></Link>
          <Link href="/tracking" className="btn btn-gold">Track progress <span className="btn-arrow">→</span></Link>
          <Link href="/quiz" className="btn btn-ghost">Take prakriti quiz</Link>
        </div>
      </section>
    </main>
  );
}