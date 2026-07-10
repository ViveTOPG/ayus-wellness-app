// Tiny fetch helper. Proxying via /api/* (next.config rewrites → FastAPI) keeps
// the client same-origin and avoids CORS entirely, while still falling back to
// the bare API in dev if the proxy isn't wired up.
const BASE = "/api";

async function get(path, { signal } = {}) {
  const res = await fetch(`${BASE}${path}`, { signal });
  if (!res.ok) {
    let msg;
    try {
      const j = await res.json();
      msg = j.detail || res.statusText;
    } catch {
      msg = res.statusText;
    }
    const err = new Error(`GET ${path} → ${res.status}: ${msg}`);
    err.status = res.status;
    throw err;
  }
  return res.json();
}

export const api = {
  health: () => get("/health"),
  conditions: () => get("/conditions"),
  condition: (id) => get(`/conditions/${encodeURIComponent(id)}`),
  herbs: () => get("/herbs"),
  herb: (id) => get(`/herbs/${encodeURIComponent(id)}`),
  formulations: () => get("/formulations"),
  formulation: (id) => get(`/formulations/${encodeURIComponent(id)}`),
  search: (q) => get(`/search?q=${encodeURIComponent(q)}`),
  explain: (herb, condition) =>
    get(`/explain?herb=${encodeURIComponent(herb)}&condition=${encodeURIComponent(condition)}`),

  // Fitness calculators
  calcBMI: (weight_kg, height_cm) => get(`/calculators/bmi?weight_kg=${weight_kg}&height_cm=${height_cm}`),
  calcBMR: (age, sex, weight_kg, height_cm, body_fat_pct) =>
    get(`/calculators/bmr?age=${age}&sex=${sex}&weight_kg=${weight_kg}&height_cm=${height_cm}${body_fat_pct ? `&body_fat_pct=${body_fat_pct}` : ""}`),
  calcTDEE: (age, sex, weight_kg, height_cm, activity, body_fat_pct) =>
    get(`/calculators/tdee?age=${age}&sex=${sex}&weight_kg=${weight_kg}&height_cm=${height_cm}&activity=${activity}${body_fat_pct ? `&body_fat_pct=${body_fat_pct}` : ""}`),
  calcTargetCalories: (age, sex, weight_kg, height_cm, activity, goal) =>
    get(`/calculators/target-calories?age=${age}&sex=${sex}&weight_kg=${weight_kg}&height_cm=${height_cm}&activity=${activity}&goal=${goal}`),
  calcBodyFat: (age, sex, weight_kg, height_cm, waist_cm, neck_cm, hip_cm) =>
    get(`/calculators/body-fat?age=${age}&sex=${sex}&weight_kg=${weight_kg}&height_cm=${height_cm}${waist_cm ? `&waist_cm=${waist_cm}` : ""}${neck_cm ? `&neck_cm=${neck_cm}` : ""}${hip_cm ? `&hip_cm=${hip_cm}` : ""}`),
  calcIdealWeight: (sex, height_cm) =>
    get(`/calculators/ideal-weight?sex=${sex}&height_cm=${height_cm}`),
  calcWaterIntake: (weight_kg, activity, climate_hot, pregnancy, lactation) =>
    get(`/calculators/water-intake?weight_kg=${weight_kg}&activity=${activity}&climate_hot=${climate_hot}&pregnancy=${pregnancy}&lactation=${lactation}`),
  calcWaistToHeight: (waist_cm, height_cm) =>
    get(`/calculators/waist-to-height?waist_cm=${waist_cm}&height_cm=${height_cm}`),
  calcWaistToHip: (waist_cm, hip_cm, sex) =>
    get(`/calculators/waist-to-hip?waist_cm=${waist_cm}&hip_cm=${hip_cm}&sex=${sex}`),
  calcAll: (age, sex, weight_kg, height_cm, activity, goal, waist_cm, neck_cm, hip_cm) =>
    get(`/calculators/all?age=${age}&sex=${sex}&weight_kg=${weight_kg}&height_cm=${height_cm}&activity=${activity}&goal=${goal}${waist_cm ? `&waist_cm=${waist_cm}` : ""}${neck_cm ? `&neck_cm=${neck_cm}` : ""}${hip_cm ? `&hip_cm=${hip_cm}` : ""}`),
};

export const DOSHAS = ["vata", "pitta", "kapha"];
export const DOSHA_LABEL = {
  vata: "Vāta",
  pitta: "Pitta",
  kapha: "Kapha",
};
export const TIER_LABEL = {
  classical: "Classical",
  traditional: "Traditional",
  preliminary: "Preliminary",
  clinical: "Clinical",
};
