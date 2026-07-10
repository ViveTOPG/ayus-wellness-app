"""FastAPI layer over the engine — the contract the future native app consumes.

Run:
    pip install -r requirements.txt
    uvicorn api.main:app --reload

Then open http://127.0.0.1:8000/docs for interactive API docs.
"""

from __future__ import annotations

from dataclasses import asdict
from typing import Optional

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware

from ayurveda_engine.reasoning import DISCLAIMER, Engine
from api.calculators import (
    BodyMetrics, Sex, ActivityLevel, Goal,
    run_all_calculations, calculate_bmi, calculate_bmr, calculate_bmr_katch_mcardle,
    calculate_tdee, calculate_body_fat_navy, calculate_body_fat_bmi,
    calculate_ideal_weight, calculate_water_intake, calculate_waist_to_height,
    calculate_waist_to_hip, calculate_target_calories,
)

app = FastAPI(
    title="Ayurveda Wellness Engine",
    version="0.1.0",
    description=(
        "Source-cited, evidence-tiered Ayurvedic wellness knowledge. "
        "Educational only — not medical advice."
    ),
)

# The native app / web client will live on a different origin.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["GET"],
    allow_headers=["*"],
)

engine = Engine.load()


@app.get("/health")
def health() -> dict:
    return {"status": "ok", "stats": engine.kb.stats(), "disclaimer": DISCLAIMER}


@app.get("/conditions")
def list_conditions() -> list[dict]:
    return [
        {"id": c.id, "name": c.name, "also_known_as": c.also_known_as}
        for c in engine.kb.conditions.values()
    ]


@app.get("/conditions/{condition_id}")
def get_condition(condition_id: str) -> dict:
    report = engine.report_for_condition(condition_id)
    if report is None:
        raise HTTPException(status_code=404, detail="Unknown condition")
    return asdict(report)


@app.get("/herbs")
def list_herbs() -> list[dict]:
    return [
        {"id": h.id, "common_name": h.common_name, "botanical_name": h.botanical_name}
        for h in engine.kb.herbs.values()
    ]


@app.get("/herbs/{herb_id}")
def get_herb(herb_id: str) -> dict:
    herb = engine.kb.herbs.get(herb_id)
    if herb is None:
        raise HTTPException(status_code=404, detail="Unknown herb")
    return asdict(herb)


@app.get("/formulations")
def list_formulations() -> list[dict]:
    return [{"id": f.id, "name": f.name, "type": f.type} for f in engine.kb.formulations.values()]


@app.get("/formulations/{formulation_id}")
def get_formulation(formulation_id: str) -> dict:
    f = engine.kb.formulations.get(formulation_id)
    if f is None:
        raise HTTPException(status_code=404, detail="Unknown formulation")
    return asdict(f)


@app.get("/search")
def search(q: str) -> dict:
    return engine.search(q)


@app.get("/explain")
def explain(herb: str, condition: str) -> dict:
    res = engine.explain(herb, condition)
    if res is None:
        raise HTTPException(status_code=404, detail="No link between this herb and condition")
    return res


# ========== Fitness Calculators API ==========

@app.get("/calculators/bmi")
def calc_bmi(
    weight_kg: float,
    height_cm: float,
):
    """Calculate BMI from weight (kg) and height (cm)."""
    metrics = BodyMetrics(age=30, sex=Sex.MALE, height_cm=height_cm, weight_kg=weight_kg)
    return run_all_calculations(metrics)["bmi"]


@app.get("/calculators/bmr")
def calc_bmr(
    age: int,
    sex: str = "male",
    weight_kg: float = 70,
    height_cm: float = 175,
    body_fat_pct: Optional[float] = None,
):
    """Calculate BMR using Mifflin-St Jeor (or Katch-McArdle if body_fat_pct provided)."""
    s = Sex.MALE if sex.lower() == "male" else Sex.FEMALE
    metrics = BodyMetrics(age=age, sex=s, height_cm=height_cm, weight_kg=weight_kg, body_fat_pct=body_fat_pct)
    if body_fat_pct:
        try:
            return calculate_bmr_katch_mcardle(metrics).__dict__
        except Exception:
            pass
    return calculate_bmr(metrics).__dict__


@app.get("/calculators/tdee")
def calc_tdee(
    age: int,
    sex: str = "male",
    weight_kg: float = 70,
    height_cm: float = 175,
    activity: str = "moderate",
    body_fat_pct: Optional[float] = None,
):
    """Calculate TDEE (Total Daily Energy Expenditure)."""
    s = Sex.MALE if sex.lower() == "male" else Sex.FEMALE
    act = ActivityLevel(activity.lower())
    metrics = BodyMetrics(age=age, sex=s, height_cm=height_cm, weight_kg=weight_kg, body_fat_pct=body_fat_pct)
    bmr = calculate_bmr(metrics)
    return calculate_tdee(bmr.bmr_kcal, act).__dict__


@app.get("/calculators/target-calories")
def calc_target_calories(
    age: int,
    sex: str = "male",
    weight_kg: float = 70,
    height_cm: float = 175,
    activity: str = "moderate",
    goal: str = "maintain",
):
    """Calculate target calories and macro split for weight loss/gain/maintenance."""
    s = Sex.MALE if sex.lower() == "male" else Sex.FEMALE
    act = ActivityLevel(activity.lower())
    g = Goal(goal.lower())
    metrics = BodyMetrics(age=age, sex=s, height_cm=height_cm, weight_kg=weight_kg)
    bmr = calculate_bmr(metrics)
    tdee = calculate_tdee(bmr.bmr_kcal, act)
    return calculate_target_calories(tdee.tdee_kcal, g, metrics).__dict__


@app.get("/calculators/body-fat")
def calc_body_fat(
    age: int,
    sex: str = "male",
    weight_kg: float = 70,
    height_cm: float = 175,
    waist_cm: Optional[float] = None,
    neck_cm: Optional[float] = None,
    hip_cm: Optional[float] = None,
    body_fat_pct: Optional[float] = None,
):
    """Calculate body fat percentage using US Navy method (if measurements provided) or BMI-based estimate."""
    s = Sex.MALE if sex.lower() == "male" else Sex.FEMALE
    metrics = BodyMetrics(
        age=age, sex=s, height_cm=height_cm, weight_kg=weight_kg,
        body_fat_pct=body_fat_pct, waist_cm=waist_cm, neck_cm=neck_cm, hip_cm=hip_cm,
    )
    if waist_cm and neck_cm:
        try:
            return calculate_body_fat_navy(metrics).__dict__
        except Exception:
            return calculate_body_fat_bmi(metrics).__dict__
    return calculate_body_fat_bmi(metrics).__dict__


@app.get("/calculators/ideal-weight")
def calc_ideal_weight(
    sex: str = "male",
    height_cm: float = 175,
):
    """Calculate ideal weight using multiple formulas (Devine, Hamwi, Miller, Robinson, Lorentz)."""
    s = Sex.MALE if sex.lower() == "male" else Sex.FEMALE
    metrics = BodyMetrics(age=30, sex=s, height_cm=height_cm, weight_kg=70)
    return calculate_ideal_weight(metrics).__dict__


@app.get("/calculators/water-intake")
def calc_water_intake(
    weight_kg: float = 70,
    activity: str = "moderate",
    climate_hot: bool = False,
    pregnancy: bool = False,
    lactation: bool = False,
):
    """Calculate daily water intake recommendation."""
    act = ActivityLevel(activity.lower())
    metrics = BodyMetrics(age=30, sex=Sex.MALE, height_cm=175, weight_kg=weight_kg)
    return calculate_water_intake(metrics, act, climate_hot, pregnancy, lactation).__dict__


@app.get("/calculators/waist-to-height")
def calc_waist_to_height(
    waist_cm: float,
    height_cm: float,
):
    """Calculate waist-to-height ratio for health risk assessment."""
    metrics = BodyMetrics(age=30, sex=Sex.MALE, height_cm=height_cm, weight_kg=70, waist_cm=waist_cm)
    return calculate_waist_to_height(metrics).__dict__


@app.get("/calculators/waist-to-hip")
def calc_waist_to_hip(
    waist_cm: float,
    hip_cm: float,
    sex: str = "male",
):
    """Calculate waist-to-hip ratio for health risk assessment."""
    s = Sex.MALE if sex.lower() == "male" else Sex.FEMALE
    metrics = BodyMetrics(age=30, sex=s, height_cm=175, weight_kg=70, waist_cm=waist_cm, hip_cm=hip_cm)
    return calculate_waist_to_hip(metrics).__dict__


@app.get("/calculators/all")
def calc_all(
    age: int,
    sex: str = "male",
    weight_kg: float = 70,
    height_cm: float = 175,
    activity: str = "moderate",
    goal: str = "maintain",
    waist_cm: Optional[float] = None,
    neck_cm: Optional[float] = None,
    hip_cm: Optional[float] = None,
    body_fat_pct: Optional[float] = None,
):
    """Run all calculators at once and return complete body analysis."""
    s = Sex.MALE if sex.lower() == "male" else Sex.FEMALE
    act = ActivityLevel(activity.lower())
    g = Goal(goal.lower())
    metrics = BodyMetrics(
        age=age, sex=s, height_cm=height_cm, weight_kg=weight_kg,
        body_fat_pct=body_fat_pct, waist_cm=waist_cm, neck_cm=neck_cm, hip_cm=hip_cm,
    )
    return run_all_calculations(metrics, act, g)
