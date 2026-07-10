"""Fitness & body calculators — pure math, no external deps."""

from __future__ import annotations
from dataclasses import dataclass
from enum import Enum
from math import pi, sqrt
from typing import Literal


class Sex(str, Enum):
    MALE = "male"
    FEMALE = "female"


class ActivityLevel(str, Enum):
    SEDENTARY = "sedentary"           # 1.2
    LIGHT = "light"                   # 1.375
    MODERATE = "moderate"             # 1.55
    VERY = "very"                     # 1.725
    EXTREME = "extreme"               # 1.9


ACTIVITY_MULTIPLIERS = {
    ActivityLevel.SEDENTARY: 1.2,
    ActivityLevel.LIGHT: 1.375,
    ActivityLevel.MODERATE: 1.55,
    ActivityLevel.VERY: 1.725,
    ActivityLevel.EXTREME: 1.9,
}


class Goal(str, Enum):
    LOSE = "lose"            # -500 kcal
    MAINTAIN = "maintain"    # 0
    GAIN = "gain"            # +500 kcal


GOAL_ADJUSTMENT = {
    Goal.LOSE: -500,
    Goal.MAINTAIN: 0,
    Goal.GAIN: 500,
}


@dataclass(frozen=True)
class BodyMetrics:
    """Input metrics for calculations."""
    age: int
    sex: Sex
    height_cm: float
    weight_kg: float
    body_fat_pct: float | None = None
    waist_cm: float | None = None
    neck_cm: float | None = None
    hip_cm: float | None = None


@dataclass(frozen=True)
class BMIResult:
    bmi: float
    category: str
    category_key: str
    bmi_prime: float
    healthy_weight_range_kg: tuple[float, float]


@dataclass(frozen=True)
class BMRResult:
    bmr_kcal: float
    formula: str
    note: str


@dataclass(frozen=True)
class TDEEResult:
    tdee_kcal: float
    bmr_kcal: float
    activity_level: ActivityLevel
    multiplier: float


@dataclass(frozen=True)
class TargetCaloriesResult:
    target_kcal: float
    tdee_kcal: float
    goal: Goal
    adjustment: int
    macro_split: MacroSplit


@dataclass(frozen=True)
class MacroSplit:
    protein_g: float
    carbs_g: float
    fat_g: float
    protein_pct: int
    carbs_pct: int
    fat_pct: int


@dataclass(frozen=True)
class BodyFatResult:
    body_fat_pct: float
    method: str
    lean_mass_kg: float
    fat_mass_kg: float
    category: str
    essential_fat_pct: float


@dataclass(frozen=True)
class IdealWeightResult:
    devine_kg: float
    hamwi_kg: float
    miller_kg: float
    robinson_kg: float
    lorentz_kg: float
    bmi_based_range_kg: tuple[float, float]


@dataclass(frozen=True)
class WaterIntakeResult:
    base_ml: int
    activity_ml: int
    total_ml: int
    total_l: float
    cups: int


@dataclass(frozen=True)
class WaistToHeightResult:
    ratio: float
    category: str
    risk_level: str


@dataclass(frozen=True)
class WaistToHipResult:
    ratio: float
    category: str
    risk_level: str


# ---------- BMI ----------
def calculate_bmi(metrics: BodyMetrics) -> BMIResult:
    h_m = metrics.height_cm / 100
    bmi = metrics.weight_kg / (h_m * h_m)
    bmi = round(bmi, 1)
    bmi_prime = round(bmi / 25, 2)

    if bmi < 16:
        cat, key = "Severe thinness", "severe_thinness"
    elif bmi < 17:
        cat, key = "Moderate thinness", "moderate_thinness"
    elif bmi < 18.5:
        cat, key = "Mild thinness", "mild_thinness"
    elif bmi < 25:
        cat, key = "Normal range", "normal"
    elif bmi < 30:
        cat, key = "Overweight (Pre-obese)", "overweight"
    elif bmi < 35:
        cat, key = "Obese Class I", "obese_1"
    elif bmi < 40:
        cat, key = "Obese Class II", "obese_2"
    else:
        cat, key = "Obese Class III", "obese_3"

    healthy_min = round(18.5 * h_m * h_m, 1)
    healthy_max = round(24.9 * h_m * h_m, 1)

    return BMIResult(
        bmi=bmi,
        category=cat,
        category_key=key,
        bmi_prime=bmi_prime,
        healthy_weight_range_kg=(healthy_min, healthy_max),
    )


# ---------- BMR ----------
def calculate_bmr(metrics: BodyMetrics) -> BMRResult:
    """Mifflin-St Jeor (1990) — most accurate for general population."""
    m, h, a = metrics.weight_kg, metrics.height_cm, metrics.age
    s = 5 if metrics.sex == Sex.MALE else -161
    bmr = (10 * m) + (6.25 * h) - (5 * a) + s
    return BMRResult(
        bmr_kcal=round(bmr),
        formula="Mifflin-St Jeor",
        note="Industry standard; ~5% more accurate than revised Harris-Benedict.",
    )


def calculate_bmr_katch_mcardle(metrics: BodyMetrics) -> BMRResult:
    """Requires body fat % — best for athletes/obese."""
    if metrics.body_fat_pct is None:
        raise ValueError("body_fat_pct required for Katch-McArdle")
    lbm = metrics.weight_kg * (1 - metrics.body_fat_pct / 100)
    bmr = 370 + 21.6 * lbm
    return BMRResult(
        bmr_kcal=round(bmr),
        formula="Katch-McArdle",
        note="Uses lean body mass; best for high muscle or high adiposity.",
    )


# ---------- TDEE ----------
def calculate_tdee(bmr_kcal: float, activity: ActivityLevel) -> TDEEResult:
    mult = ACTIVITY_MULTIPLIERS[activity]
    return TDEEResult(
        tdee_kcal=round(bmr_kcal * mult),
        bmr_kcal=round(bmr_kcal),
        activity_level=activity,
        multiplier=mult,
    )


# ---------- Target Calories + Macros ----------
def calculate_target_calories(
    tdee_kcal: float,
    goal: Goal,
    metrics: BodyMetrics,
    protein_per_kg: float = 2.0,
    fat_pct: float = 0.25,
) -> TargetCaloriesResult:
    adj = GOAL_ADJUSTMENT[goal]
    target = round(tdee_kcal + adj)

    protein_g = round(metrics.weight_kg * protein_per_kg)
    fat_g = round((target * fat_pct) / 9)
    carb_g = round((target - (protein_g * 4) - (fat_g * 9)) / 4)

    total_macro_kcal = protein_g * 4 + fat_g * 9 + carb_g * 4
    if total_macro_kcal != target:
        diff = target - total_macro_kcal
        carb_g += round(diff / 4)

    return TargetCaloriesResult(
        target_kcal=target,
        tdee_kcal=round(tdee_kcal),
        goal=goal,
        adjustment=adj,
        macro_split=MacroSplit(
            protein_g=protein_g,
            carbs_g=max(0, carb_g),
            fat_g=fat_g,
            protein_pct=round(protein_g * 4 / target * 100),
            carbs_pct=round(max(0, carb_g) * 4 / target * 100),
            fat_pct=round(fat_g * 9 / target * 100),
        ),
    )


# ---------- Body Fat % ----------
def calculate_body_fat_navy(metrics: BodyMetrics) -> BodyFatResult:
    """US Navy method — needs waist, neck (+ hip for females)."""
    if metrics.waist_cm is None or metrics.neck_cm is None:
        raise ValueError("waist_cm and neck_cm required for Navy method")
    if metrics.sex == Sex.FEMALE and metrics.hip_cm is None:
        raise ValueError("hip_cm required for females (Navy method)")

    w, n = metrics.waist_cm, metrics.neck_cm
    h = metrics.height_cm

    if metrics.sex == Sex.MALE:
        bf = 495 / (1.0324 - 0.19077 * (w - n) / h + 0.15456 * h / 100) - 450
    else:
        hip = metrics.hip_cm
        bf = 495 / (1.29579 - 0.35004 * (w + hip - n) / h + 0.22100 * h / 100) - 450

    bf = max(2, min(50, round(bf, 1)))

    if metrics.sex == Sex.MALE:
        if bf < 6: cat, ess = "Essential fat", 3
        elif bf < 14: cat, ess = "Athletes", 3
        elif bf < 18: cat, ess = "Fitness", 3
        elif bf < 25: cat, ess = "Average", 3
        else: cat, ess = "Obese", 3
    else:
        if bf < 14: cat, ess = "Essential fat", 12
        elif bf < 21: cat, ess = "Athletes", 12
        elif bf < 25: cat, ess = "Fitness", 12
        elif bf < 32: cat, ess = "Average", 12
        else: cat, ess = "Obese", 12

    fat_mass = round(metrics.weight_kg * bf / 100, 1)
    lean_mass = round(metrics.weight_kg - fat_mass, 1)

    return BodyFatResult(
        body_fat_pct=bf,
        method="US Navy",
        lean_mass_kg=lean_mass,
        fat_mass_kg=fat_mass,
        category=cat,
        essential_fat_pct=ess,
    )


def calculate_body_fat_bmi(metrics: BodyMetrics) -> BodyFatResult:
    """Quick estimate from BMI — Deurenberg formula."""
    bmi = metrics.weight_kg / (metrics.height_cm / 100) ** 2
    if metrics.sex == Sex.MALE:
        bf = 1.20 * bmi + 0.23 * metrics.age - 16.2
    else:
        bf = 1.20 * bmi + 0.23 * metrics.age - 5.4
    bf = max(2, min(50, round(bf, 1)))

    if metrics.sex == Sex.MALE:
        if bf < 6: cat = "Essential fat"
        elif bf < 14: cat = "Athletes"
        elif bf < 18: cat = "Fitness"
        elif bf < 25: cat = "Average"
        else: cat = "Obese"
    else:
        if bf < 14: cat = "Essential fat"
        elif bf < 21: cat = "Athletes"
        elif bf < 25: cat = "Fitness"
        elif bf < 32: cat = "Average"
        else: cat = "Obese"

    fat_mass = round(metrics.weight_kg * bf / 100, 1)
    lean_mass = round(metrics.weight_kg - fat_mass, 1)

    return BodyFatResult(
        body_fat_pct=bf,
        method="BMI-based (Deurenberg)",
        lean_mass_kg=lean_mass,
        fat_mass_kg=fat_mass,
        category=cat,
        essential_fat_pct=3 if metrics.sex == Sex.MALE else 12,
    )


# ---------- Ideal Weight ----------
def calculate_ideal_weight(metrics: BodyMetrics) -> IdealWeightResult:
    h_in = metrics.height_cm / 2.54
    h_m = metrics.height_cm / 100

    # Devine (1974)
    if metrics.sex == Sex.MALE:
        devine = 50 + 2.3 * max(0, h_in - 60)
    else:
        devine = 45.5 + 2.3 * max(0, h_in - 60)

    # Hamwi (1964)
    if metrics.sex == Sex.MALE:
        hamwi = 48 + 2.7 * max(0, h_in - 60)
    else:
        hamwi = 45.5 + 2.2 * max(0, h_in - 60)

    # Miller (1983)
    if metrics.sex == Sex.MALE:
        miller = 56.2 + 1.41 * max(0, h_in - 60)
    else:
        miller = 53.1 + 1.36 * max(0, h_in - 60)

    # Robinson (1983)
    if metrics.sex == Sex.MALE:
        robinson = 52 + 1.9 * max(0, h_in - 60)
    else:
        robinson = 49 + 1.7 * max(0, h_in - 60)

    # Lorentz (1929) — simple, ignores sex
    lorentz = metrics.height_cm - 100 - (metrics.height_cm - 150) / 4

    bmi_min = 18.5 * h_m * h_m
    bmi_max = 24.9 * h_m * h_m

    return IdealWeightResult(
        devine_kg=round(devine, 1),
        hamwi_kg=round(hamwi, 1),
        miller_kg=round(miller, 1),
        robinson_kg=round(robinson, 1),
        lorentz_kg=round(lorentz, 1),
        bmi_based_range_kg=(round(bmi_min, 1), round(bmi_max, 1)),
    )


# ---------- Water Intake ----------
def calculate_water_intake(
    metrics: BodyMetrics,
    activity: ActivityLevel,
    climate_hot: bool = False,
    pregnancy: bool = False,
    lactation: bool = False,
) -> WaterIntakeResult:
    """Based on NAS/IOM guidelines: 35 ml/kg + activity + climate."""
    base = round(metrics.weight_kg * 35)
    act_extra = {
        ActivityLevel.SEDENTARY: 0,
        ActivityLevel.LIGHT: 300,
        ActivityLevel.MODERATE: 500,
        ActivityLevel.VERY: 700,
        ActivityLevel.EXTREME: 1000,
    }[activity]

    climate_extra = 500 if climate_hot else 0
    preg_extra = 300 if pregnancy else 0
    lact_extra = 700 if lactation else 0

    total = base + act_extra + climate_extra + preg_extra + lact_extra

    return WaterIntakeResult(
        base_ml=base,
        activity_ml=act_extra,
        total_ml=total,
        total_l=round(total / 1000, 1),
        cups=round(total / 240),
    )


# ---------- Waist-to-Height ----------
def calculate_waist_to_height(metrics: BodyMetrics) -> WaistToHeightResult:
    if metrics.waist_cm is None:
        raise ValueError("waist_cm required")
    ratio = metrics.waist_cm / metrics.height_cm
    ratio = round(ratio, 3)

    if ratio < 0.4:
        cat, risk = "Abnormally slim", "Very low"
    elif ratio < 0.5:
        cat, risk = "Healthy", "Low"
    elif ratio < 0.6:
        cat, risk = "Overweight / Increased risk", "Moderate"
    else:
        cat, risk = "Obese / High risk", "High"

    return WaistToHeightResult(ratio=ratio, category=cat, risk_level=risk)


# ---------- Waist-to-Hip ----------
def calculate_waist_to_hip(metrics: BodyMetrics) -> WaistToHipResult:
    if metrics.waist_cm is None or metrics.hip_cm is None:
        raise ValueError("waist_cm and hip_cm required")
    ratio = metrics.waist_cm / metrics.hip_cm
    ratio = round(ratio, 3)

    if metrics.sex == Sex.MALE:
        if ratio < 0.9:
            cat, risk = "Low risk", "Low"
        elif ratio < 1.0:
            cat, risk = "Moderate risk", "Moderate"
        else:
            cat, risk = "High risk", "High"
    else:
        if ratio < 0.8:
            cat, risk = "Low risk", "Low"
        elif ratio < 0.85:
            cat, risk = "Moderate risk", "Moderate"
        else:
            cat, risk = "High risk", "High"

    return WaistToHipResult(ratio=ratio, category=cat, risk_level=risk)


# ---------- Master: run all ----------
def run_all_calculations(
    metrics: BodyMetrics,
    activity: ActivityLevel = ActivityLevel.SEDENTARY,
    goal: Goal = Goal.MAINTAIN,
) -> dict:
    bmi = calculate_bmi(metrics)
    bmr = calculate_bmr(metrics)
    tdee = calculate_tdee(bmr.bmr_kcal, activity)
    target = calculate_target_calories(tdee.tdee_kcal, goal, metrics)

    body_fat = None
    if metrics.body_fat_pct is not None:
        body_fat = BodyFatResult(
            body_fat_pct=metrics.body_fat_pct,
            method="User provided",
            lean_mass_kg=round(metrics.weight_kg * (1 - metrics.body_fat_pct / 100), 1),
            fat_mass_kg=round(metrics.weight_kg * metrics.body_fat_pct / 100, 1),
            category="—",
            essential_fat_pct=3 if metrics.sex == Sex.MALE else 12,
        )
    elif metrics.waist_cm and metrics.neck_cm:
        try:
            body_fat = calculate_body_fat_navy(metrics)
        except Exception:
            body_fat = calculate_body_fat_bmi(metrics)
    else:
        body_fat = calculate_body_fat_bmi(metrics)

    ideal = calculate_ideal_weight(metrics)
    water = calculate_water_intake(metrics, activity)
    wth = calculate_waist_to_height(metrics) if metrics.waist_cm else None
    wthip = calculate_waist_to_hip(metrics) if metrics.waist_cm and metrics.hip_cm else None

    return {
        "bmi": bmi.__dict__,
        "bmr": bmr.__dict__,
        "tdee": tdee.__dict__,
        "target_calories": target.__dict__,
        "body_fat": body_fat.__dict__,
        "ideal_weight": ideal.__dict__,
        "water_intake": water.__dict__,
        "waist_to_height": wth.__dict__ if wth else None,
        "waist_to_hip": wthip.__dict__ if wthip else None,
    }