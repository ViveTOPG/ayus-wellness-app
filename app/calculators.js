/* ===========================================================================
   Āyus — body calculators (client-side, offline)
   Ported from api/calculators.py so the SPA does not need the Next.js app.
   Educational estimates only — not medical advice.
   =========================================================================== */
(function (global) {
  'use strict';

  var ACTIVITY = {
    sedentary: { mult: 1.2, extraMl: 0, label: 'Sedentary' },
    light: { mult: 1.375, extraMl: 300, label: 'Light' },
    moderate: { mult: 1.55, extraMl: 500, label: 'Moderate' },
    very: { mult: 1.725, extraMl: 700, label: 'Very active' },
    extreme: { mult: 1.9, extraMl: 1000, label: 'Extreme' }
  };

  var GOAL_ADJ = { lose: -500, maintain: 0, gain: 500 };

  function r1(n) { return Math.round(n * 10) / 10; }
  function r0(n) { return Math.round(n); }
  function r3(n) { return Math.round(n * 1000) / 1000; }
  function clamp(n, a, b) { return Math.max(a, Math.min(b, n)); }

  function bmi(weightKg, heightCm) {
    var hm = heightCm / 100;
    var b = weightKg / (hm * hm);
    b = r1(b);
    var cat, key;
    if (b < 16) { cat = 'Severe thinness'; key = 'severe_thinness'; }
    else if (b < 17) { cat = 'Moderate thinness'; key = 'moderate_thinness'; }
    else if (b < 18.5) { cat = 'Mild thinness'; key = 'mild_thinness'; }
    else if (b < 25) { cat = 'Normal range'; key = 'normal'; }
    else if (b < 30) { cat = 'Overweight (Pre-obese)'; key = 'overweight'; }
    else if (b < 35) { cat = 'Obese Class I'; key = 'obese_1'; }
    else if (b < 40) { cat = 'Obese Class II'; key = 'obese_2'; }
    else { cat = 'Obese Class III'; key = 'obese_3'; }
    return {
      bmi: b,
      category: cat,
      category_key: key,
      bmi_prime: r1(b / 25 * 10) / 10,
      healthy_weight_range_kg: [r1(18.5 * hm * hm), r1(24.9 * hm * hm)]
    };
  }

  function bmr(age, sex, weightKg, heightCm, bodyFatPct) {
    if (bodyFatPct != null && bodyFatPct !== '' && !isNaN(+bodyFatPct)) {
      var lbm = weightKg * (1 - (+bodyFatPct) / 100);
      return {
        bmr_kcal: r0(370 + 21.6 * lbm),
        formula: 'Katch-McArdle',
        note: 'Uses lean body mass; best when body-fat % is known.'
      };
    }
    var s = sex === 'female' ? -161 : 5;
    return {
      bmr_kcal: r0((10 * weightKg) + (6.25 * heightCm) - (5 * age) + s),
      formula: 'Mifflin-St Jeor',
      note: 'Industry standard for general population.'
    };
  }

  function tdee(bmrKcal, activity) {
    var a = ACTIVITY[activity] || ACTIVITY.moderate;
    return {
      tdee_kcal: r0(bmrKcal * a.mult),
      bmr_kcal: r0(bmrKcal),
      activity_level: activity,
      multiplier: a.mult,
      activity_label: a.label
    };
  }

  function targetCalories(tdeeKcal, goal, weightKg) {
    var adj = GOAL_ADJ[goal] != null ? GOAL_ADJ[goal] : 0;
    var target = r0(tdeeKcal + adj);
    var proteinG = r0(weightKg * 2.0);
    var fatG = r0((target * 0.25) / 9);
    var carbG = r0((target - (proteinG * 4) - (fatG * 9)) / 4);
    if (carbG < 0) carbG = 0;
    var totalK = proteinG * 4 + fatG * 9 + carbG * 4;
    if (totalK !== target) carbG = Math.max(0, carbG + r0((target - totalK) / 4));
    return {
      target_kcal: target,
      tdee_kcal: r0(tdeeKcal),
      goal: goal,
      adjustment: adj,
      macro_split: {
        protein_g: proteinG,
        carbs_g: carbG,
        fat_g: fatG,
        protein_pct: target ? r0(proteinG * 4 / target * 100) : 0,
        carbs_pct: target ? r0(carbG * 4 / target * 100) : 0,
        fat_pct: target ? r0(fatG * 9 / target * 100) : 0
      }
    };
  }

  function bodyFatNavy(age, sex, weightKg, heightCm, waistCm, neckCm, hipCm) {
    if (waistCm == null || neckCm == null) return null;
    if (sex === 'female' && hipCm == null) return null;
    var log10 = Math.log10 || function (x) { return Math.log(x) / Math.LN10; };
    var bf;
    if (sex === 'male') {
      var d = waistCm - neckCm;
      if (d <= 0) return null;
      bf = 495 / (1.0324 - 0.19077 * log10(d) + 0.15456 * log10(heightCm)) - 450;
    } else {
      var d2 = waistCm + hipCm - neckCm;
      if (d2 <= 0) return null;
      bf = 495 / (1.29579 - 0.35004 * log10(d2) + 0.22100 * log10(heightCm)) - 450;
    }
    bf = clamp(r1(bf), 2, 50);
    return bodyFatResult(bf, 'US Navy', sex, weightKg);
  }

  function bodyFatBmi(age, sex, weightKg, heightCm) {
    var b = weightKg / Math.pow(heightCm / 100, 2);
    var bf = sex === 'male'
      ? 1.20 * b + 0.23 * age - 16.2
      : 1.20 * b + 0.23 * age - 5.4;
    bf = clamp(r1(bf), 2, 50);
    return bodyFatResult(bf, 'BMI-based (Deurenberg)', sex, weightKg);
  }

  function bodyFatResult(bf, method, sex, weightKg) {
    var cat;
    if (sex === 'male') {
      if (bf < 6) cat = 'Essential fat';
      else if (bf < 14) cat = 'Athletes';
      else if (bf < 18) cat = 'Fitness';
      else if (bf < 25) cat = 'Average';
      else cat = 'Obese';
    } else {
      if (bf < 14) cat = 'Essential fat';
      else if (bf < 21) cat = 'Athletes';
      else if (bf < 25) cat = 'Fitness';
      else if (bf < 32) cat = 'Average';
      else cat = 'Obese';
    }
    var fat = r1(weightKg * bf / 100);
    return {
      body_fat_pct: bf,
      method: method,
      lean_mass_kg: r1(weightKg - fat),
      fat_mass_kg: fat,
      category: cat,
      essential_fat_pct: sex === 'male' ? 3 : 12
    };
  }

  function idealWeight(sex, heightCm) {
    var hin = heightCm / 2.54;
    var hm = heightCm / 100;
    var over = Math.max(0, hin - 60);
    var male = sex === 'male';
    return {
      devine_kg: r1((male ? 50 : 45.5) + 2.3 * over),
      hamwi_kg: r1((male ? 48 : 45.5) + (male ? 2.7 : 2.2) * over),
      miller_kg: r1((male ? 56.2 : 53.1) + (male ? 1.41 : 1.36) * over),
      robinson_kg: r1((male ? 52 : 49) + (male ? 1.9 : 1.7) * over),
      lorentz_kg: r1(heightCm - 100 - (heightCm - 150) / 4),
      bmi_based_range_kg: [r1(18.5 * hm * hm), r1(24.9 * hm * hm)]
    };
  }

  function waterIntake(weightKg, activity, climateHot, pregnancy, lactation) {
    var a = ACTIVITY[activity] || ACTIVITY.moderate;
    var base = r0(weightKg * 35);
    var act = a.extraMl;
    var climate = climateHot ? 500 : 0;
    var preg = pregnancy ? 300 : 0;
    var lact = lactation ? 700 : 0;
    var total = base + act + climate + preg + lact;
    return {
      base_ml: base,
      activity_ml: act,
      total_ml: total,
      total_l: r1(total / 1000),
      cups: r0(total / 240)
    };
  }

  function waistToHeight(waistCm, heightCm) {
    if (waistCm == null || !heightCm) return null;
    var ratio = r3(waistCm / heightCm);
    var cat, risk;
    if (ratio < 0.4) { cat = 'Abnormally slim'; risk = 'Very low'; }
    else if (ratio < 0.5) { cat = 'Healthy'; risk = 'Low'; }
    else if (ratio < 0.6) { cat = 'Overweight / Increased risk'; risk = 'Moderate'; }
    else { cat = 'Obese / High risk'; risk = 'High'; }
    return { ratio: ratio, category: cat, risk_level: risk };
  }

  function waistToHip(waistCm, hipCm, sex) {
    if (waistCm == null || hipCm == null) return null;
    var ratio = r3(waistCm / hipCm);
    var cat, risk;
    if (sex === 'male') {
      if (ratio < 0.9) { cat = 'Low risk'; risk = 'Low'; }
      else if (ratio < 1.0) { cat = 'Moderate risk'; risk = 'Moderate'; }
      else { cat = 'High risk'; risk = 'High'; }
    } else {
      if (ratio < 0.8) { cat = 'Low risk'; risk = 'Low'; }
      else if (ratio < 0.85) { cat = 'Moderate risk'; risk = 'Moderate'; }
      else { cat = 'High risk'; risk = 'High'; }
    }
    return { ratio: ratio, category: cat, risk_level: risk };
  }

  function runAll(input) {
    var age = +input.age;
    var sex = input.sex === 'female' ? 'female' : 'male';
    var w = +input.weight_kg;
    var h = +input.height_cm;
    var activity = input.activity || 'moderate';
    var goal = input.goal || 'maintain';
    var waist = input.waist_cm != null && input.waist_cm !== '' ? +input.waist_cm : null;
    var neck = input.neck_cm != null && input.neck_cm !== '' ? +input.neck_cm : null;
    var hip = input.hip_cm != null && input.hip_cm !== '' ? +input.hip_cm : null;
    var bfIn = input.body_fat_pct != null && input.body_fat_pct !== '' ? +input.body_fat_pct : null;

    if (!(w > 0 && h > 0 && age > 0)) throw new Error('Enter age, weight, and height');

    var bmiR = bmi(w, h);
    var bmrR = bmr(age, sex, w, h, bfIn);
    var tdeeR = tdee(bmrR.bmr_kcal, activity);
    var targetR = targetCalories(tdeeR.tdee_kcal, goal, w);

    var bodyFat;
    if (bfIn != null && !isNaN(bfIn)) {
      bodyFat = bodyFatResult(bfIn, 'User provided', sex, w);
    } else {
      bodyFat = bodyFatNavy(age, sex, w, h, waist, neck, hip) || bodyFatBmi(age, sex, w, h);
    }

    return {
      bmi: bmiR,
      bmr: bmrR,
      tdee: tdeeR,
      target_calories: targetR,
      body_fat: bodyFat,
      ideal_weight: idealWeight(sex, h),
      water_intake: waterIntake(w, activity, !!input.climate_hot, !!input.pregnancy, !!input.lactation),
      waist_to_height: waist ? waistToHeight(waist, h) : null,
      waist_to_hip: waist && hip ? waistToHip(waist, hip, sex) : null
    };
  }

  global.AyusCalc = {
    ACTIVITY: ACTIVITY,
    bmi: bmi,
    bmr: bmr,
    tdee: tdee,
    targetCalories: targetCalories,
    bodyFatNavy: bodyFatNavy,
    bodyFatBmi: bodyFatBmi,
    idealWeight: idealWeight,
    waterIntake: waterIntake,
    waistToHeight: waistToHeight,
    waistToHip: waistToHip,
    runAll: runAll
  };
})(typeof window !== 'undefined' ? window : this);
