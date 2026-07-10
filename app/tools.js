/* ===========================================================================
   Āyus Tools hub — Calculators · Progress · Kitchen (recipes)
   Integrated into the SPA so everything lives in one app.
   =========================================================================== */
(function (global) {
  'use strict';

  var Store = {
    get: function (k, def) {
      try {
        var v = localStorage.getItem('ayus.' + k);
        return v == null ? def : JSON.parse(v);
      } catch (e) { return def; }
    },
    set: function (k, v) {
      try { localStorage.setItem('ayus.' + k, JSON.stringify(v)); } catch (e) {}
    }
  };

  var state = {
    tab: 'calc', // calc | progress | kitchen
    calcTab: 'all',
    form: null,
    result: null,
    recipeFilter: 'all',
    openRecipe: null
  };

  function el(id) { return document.getElementById(id); }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function h(tag, attrs, children) {
    var open = '<' + tag;
    if (attrs) {
      for (var k in attrs) {
        if (attrs.hasOwnProperty(k) && attrs[k] != null && attrs[k] !== false) {
          open += ' ' + k + '="' + esc(String(attrs[k])) + '"';
        }
      }
    }
    if (children == null) return open + ' />';
    if (!Array.isArray(children)) children = [children];
    return open + '>' + children.join('') + '</' + tag + '>';
  }

  function toast(msg) {
    if (global.AyusApp && global.AyusApp.toast) global.AyusApp.toast(msg);
    else {
      var t = el('toast');
      if (!t) return;
      t.textContent = msg;
      t.classList.add('show');
      setTimeout(function () { t.classList.remove('show'); }, 2200);
    }
  }

  function defaultForm() {
    var saved = Store.get('calcMetrics', null) || {};
    return {
      age: saved.age || '30',
      sex: saved.sex || 'male',
      weight: saved.weight || '70',
      height: saved.height || '175',
      waist: saved.waist || '',
      neck: saved.neck || '',
      hip: saved.hip || '',
      activity: saved.activity || 'moderate',
      goal: saved.goal || 'maintain',
      climateHot: !!saved.climateHot
    };
  }

  function saveForm() {
    if (!state.form) return;
    Store.set('calcMetrics', {
      age: state.form.age,
      sex: state.form.sex,
      weight: state.form.weight,
      height: state.form.height,
      waist: state.form.waist,
      neck: state.form.neck,
      hip: state.form.hip,
      activity: state.form.activity,
      goal: state.form.goal,
      climateHot: state.form.climateHot
    });
  }

  function readFormFromDom() {
    if (!state.form) state.form = defaultForm();
    var f = state.form;
    var map = {
      calcAge: 'age', calcSex: 'sex', calcWeight: 'weight', calcHeight: 'height',
      calcWaist: 'waist', calcNeck: 'neck', calcHip: 'hip',
      calcActivity: 'activity', calcGoal: 'goal'
    };
    Object.keys(map).forEach(function (id) {
      var node = el(id);
      if (node) f[map[id]] = node.value;
    });
    var hot = el('calcClimate');
    if (hot) f.climateHot = !!hot.checked;
    return f;
  }

  function bmiCatClass(cat) {
    if (!cat) return 'cat-neutral';
    var c = cat.toLowerCase();
    if (c.indexOf('normal') >= 0 || c.indexOf('healthy') >= 0) return 'cat-green';
    if (c.indexOf('thin') >= 0 || c.indexOf('slim') >= 0) return 'cat-yellow';
    if (c.indexOf('obese') >= 0) return 'cat-red';
    return 'cat-orange';
  }

  function runCalculate() {
    if (!global.AyusCalc) {
      toast('Calculators not loaded');
      return;
    }
    var f = readFormFromDom();
    state.form = f;
    saveForm();
    try {
      var all = global.AyusCalc.runAll({
        age: f.age,
        sex: f.sex,
        weight_kg: f.weight,
        height_cm: f.height,
        waist_cm: f.waist,
        neck_cm: f.neck,
        hip_cm: f.hip,
        activity: f.activity,
        goal: f.goal,
        climate_hot: f.climateHot
      });
      /* slice result by tab for focused views */
      if (state.calcTab === 'bmi') state.result = { mode: 'bmi', data: all.bmi };
      else if (state.calcTab === 'bmr') state.result = { mode: 'bmr', data: all.bmr, tdee: all.tdee };
      else if (state.calcTab === 'bodyfat') state.result = { mode: 'bodyfat', data: all.body_fat };
      else if (state.calcTab === 'water') state.result = { mode: 'water', data: all.water_intake };
      else if (state.calcTab === 'macros') state.result = { mode: 'macros', data: all.target_calories };
      else state.result = { mode: 'all', data: all };
      Store.set('lastCalc', { at: Date.now(), result: all, form: f });
      render();
      toast('Calculated · saved on this device');
      setTimeout(function () {
        var r = el('calcResults');
        if (r) r.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 40);
    } catch (e) {
      toast(e.message || 'Check your numbers');
    }
  }

  /* ---------- Calculators UI ---------- */
  function renderCalcForm() {
    if (!state.form) state.form = defaultForm();
    var f = state.form;
    var tabs = [
      { id: 'all', label: 'Full profile', icon: '✦' },
      { id: 'bmi', label: 'BMI', icon: '⚖' },
      { id: 'bmr', label: 'BMR', icon: '🔥' },
      { id: 'bodyfat', label: 'Body fat', icon: '◉' },
      { id: 'water', label: 'Water', icon: '💧' },
      { id: 'macros', label: 'Macros', icon: '🥗' }
    ];
    var tabHtml = tabs.map(function (t) {
      return h('button', {
        type: 'button',
        'class': 'tools-subtab' + (state.calcTab === t.id ? ' active' : ''),
        'data-action': 'toolsCalcTab',
        'data-id': t.id
      }, [h('span', { 'aria-hidden': 'true' }, [t.icon]), ' ', esc(t.label)]);
    }).join('');

    var goals = [
      { id: 'lose', label: 'Lose' },
      { id: 'maintain', label: 'Maintain' },
      { id: 'gain', label: 'Gain' }
    ];
    var goalHtml = goals.map(function (g) {
      return h('button', {
        type: 'button',
        'class': 'goal-chip' + (f.goal === g.id ? ' selected' : ''),
        'data-action': 'toolsSetGoal',
        'data-id': g.id
      }, [esc(g.label)]);
    }).join('');

    var actOpts = Object.keys(global.AyusCalc.ACTIVITY).map(function (k) {
      var a = global.AyusCalc.ACTIVITY[k];
      return '<option value="' + k + '"' + (f.activity === k ? ' selected' : '') + '>' +
        esc(a.label) + ' · ' + a.mult + '×</option>';
    }).join('');

    return (
      h('div', { 'class': 'tools-calc' }, [
        h('div', { 'class': 'tools-subtabs', role: 'tablist' }, [tabHtml]),
        h('div', { 'class': 'calc-layout' }, [
          h('div', { 'class': 'calc-card-form panel-like' }, [
            h('h3', { 'class': 'calc-form-title' }, ['Your metrics']),
            h('p', { 'class': 'muted calc-form-note' }, ['Private on this device · educational estimates only']),
            h('div', { 'class': 'calc-form-grid' }, [
              field('Age', 'calcAge', f.age, 'years', 'number'),
              selectField('Sex', 'calcSex', f.sex, [
                { v: 'male', t: 'Male' },
                { v: 'female', t: 'Female' }
              ]),
              field('Weight', 'calcWeight', f.weight, 'kg', 'number'),
              field('Height', 'calcHeight', f.height, 'cm', 'number'),
              field('Waist', 'calcWaist', f.waist, 'cm', 'number'),
              field('Neck', 'calcNeck', f.neck, 'cm', 'number'),
              f.sex === 'female' ? field('Hip', 'calcHip', f.hip, 'cm', 'number') : ''
            ].join('')),
            h('label', { 'class': 'calc-field' }, [
              h('span', { 'class': 'calc-label' }, ['Activity level']),
              h('div', { 'class': 'calc-input-wrap' }, [
                '<select id="calcActivity">' + actOpts + '</select>'
              ])
            ].join('')),
            (state.calcTab === 'all' || state.calcTab === 'macros')
              ? h('div', { 'class': 'calc-goals' }, [
                  h('span', { 'class': 'calc-label' }, ['Goal']),
                  h('div', { 'class': 'goal-chips' }, [goalHtml])
                ].join(''))
              : '',
            (state.calcTab === 'all' || state.calcTab === 'water')
              ? h('label', { 'class': 'comfort-toggle calc-check' }, [
                  h('input', {
                    type: 'checkbox',
                    id: 'calcClimate',
                    checked: f.climateHot ? 'checked' : null
                  }),
                  h('span', null, [h('strong', null, ['Hot climate / heavy sweating'])])
                ].join(''))
              : '',
            h('button', {
              type: 'button',
              'class': 'btn btn-primary calc-run',
              'data-action': 'toolsRunCalc'
            }, ['Calculate →'])
          ].join('')),
          h('div', { 'class': 'calc-main', id: 'calcResults' }, [renderCalcResults()])
        ].join(''))
      ].join(''))
    );
  }

  function field(label, id, value, unit, type) {
    return h('label', { 'class': 'calc-field' }, [
      h('span', { 'class': 'calc-label' }, [esc(label)]),
      h('div', { 'class': 'calc-input-wrap' }, [
        h('input', { id: id, type: type || 'text', value: value == null ? '' : value, inputmode: 'decimal' }),
        unit ? h('span', { 'class': 'calc-unit' }, [esc(unit)]) : ''
      ].join(''))
    ].join(''));
  }

  function selectField(label, id, value, opts) {
    var options = opts.map(function (o) {
      return '<option value="' + esc(o.v) + '"' + (value === o.v ? ' selected' : '') + '>' + esc(o.t) + '</option>';
    }).join('');
    return h('label', { 'class': 'calc-field' }, [
      h('span', { 'class': 'calc-label' }, [esc(label)]),
      h('div', { 'class': 'calc-input-wrap' }, [
        '<select id="' + id + '">' + options + '</select>'
      ])
    ].join(''));
  }

  function metricCard(icon, value, label, sub) {
    return h('div', { 'class': 'calc-metric-card' }, [
      h('span', { 'class': 'metric-icon', 'aria-hidden': 'true' }, [icon]),
      h('span', { 'class': 'metric-value' }, [esc(String(value))]),
      h('span', { 'class': 'metric-label' }, [esc(label)]),
      sub ? h('span', { 'class': 'metric-sub' }, [esc(sub)]) : ''
    ].join(''));
  }

  function renderCalcResults() {
    if (!state.result) {
      return h('div', { 'class': 'calc-empty panel-like' }, [
        h('div', { 'class': 'calc-empty-icon', 'aria-hidden': 'true' }, ['✦']),
        h('h3', null, ['Ready when you are']),
        h('p', null, ['Enter your metrics and tap Calculate for BMI, metabolism, water, and macros — all offline on this device.'])
      ].join(''));
    }
    var mode = state.result.mode;
    var d = state.result.data;

    if (mode === 'bmi') {
      return h('div', { 'class': 'calc-results' }, [
        bmiBanner(d),
        h('p', { 'class': 'calc-disclaimer' }, ['BMI is a population screening tool, not a diagnosis.'])
      ].join(''));
    }
    if (mode === 'bmr') {
      var td = state.result.tdee;
      return h('div', { 'class': 'calc-results' }, [
        h('div', { 'class': 'calc-metric-grid' }, [
          metricCard('🔥', d.bmr_kcal, 'BMR kcal/day', d.formula),
          td ? metricCard('⚡', td.tdee_kcal, 'TDEE kcal/day', (td.activity_label || td.activity_level) + ' · ' + td.multiplier + '×') : ''
        ].join(''))
      ].join(''));
    }
    if (mode === 'bodyfat') {
      return h('div', { 'class': 'calc-results' }, [
        h('div', { 'class': 'calc-metric-grid' }, [
          metricCard('◉', d.body_fat_pct + '%', 'Body fat', d.method + ' · ' + d.category),
          metricCard('💪', d.lean_mass_kg + ' kg', 'Lean mass', ''),
          metricCard('📦', d.fat_mass_kg + ' kg', 'Fat mass', '')
        ].join(''))
      ].join(''));
    }
    if (mode === 'water') {
      return h('div', { 'class': 'calc-results' }, [
        h('div', { 'class': 'calc-metric-grid' }, [
          metricCard('💧', d.total_l + ' L', 'Daily water', d.cups + ' cups · ' + d.total_ml + ' ml'),
          metricCard('📦', d.base_ml + ' ml', 'Base need', '≈ 35 ml per kg'),
          metricCard('🏃', d.activity_ml + ' ml', 'Activity add-on', '')
        ].join(''))
      ].join(''));
    }
    if (mode === 'macros') {
      var m = d.macro_split || {};
      return h('div', { 'class': 'calc-results' }, [
        h('div', { 'class': 'calc-metric-grid' }, [
          metricCard('🎯', d.target_kcal, 'Target kcal', d.goal + (d.adjustment ? ' (' + d.adjustment + ')' : '')),
          metricCard('🥩', m.protein_g + ' g', 'Protein', m.protein_pct + '%'),
          metricCard('🍞', m.carbs_g + ' g', 'Carbs', m.carbs_pct + '%'),
          metricCard('🥑', m.fat_g + ' g', 'Fat', m.fat_pct + '%')
        ].join(''))
      ].join(''));
    }

    /* full */
    var all = d;
    var macros = (all.target_calories && all.target_calories.macro_split) || {};
    var ideal = all.ideal_weight || {};
    return h('div', { 'class': 'calc-results' }, [
      h('div', { 'class': 'calc-results-header' }, [
        h('h2', null, ['Your complete profile']),
        h('p', null, ['All metrics from your inputs · private on this device'])
      ].join('')),
      bmiBanner(all.bmi),
      h('div', { 'class': 'calc-metric-grid' }, [
        metricCard('🔥', all.bmr.bmr_kcal, 'BMR kcal/day', all.bmr.formula),
        metricCard('⚡', all.tdee.tdee_kcal, 'TDEE kcal/day', (all.tdee.activity_label || all.tdee.activity_level) + ' · ' + all.tdee.multiplier + '×'),
        metricCard('🎯', all.target_calories.target_kcal, 'Target calories', all.target_calories.goal),
        metricCard('◉', all.body_fat.body_fat_pct + '%', 'Body fat', all.body_fat.method + ' · ' + all.body_fat.category),
        metricCard('💧', all.water_intake.total_l + ' L', 'Water', all.water_intake.cups + ' cups/day'),
        metricCard('🥗', macros.protein_g + ' / ' + macros.carbs_g + ' / ' + macros.fat_g, 'P / C / F grams', ''),
        metricCard('📏', ideal.devine_kg + ' kg', 'Ideal (Devine)', 'Range ' + (ideal.bmi_based_range_kg || []).join('–') + ' kg'),
        all.waist_to_height ? metricCard('🔄', all.waist_to_height.ratio, 'Waist÷height', all.waist_to_height.category) : '',
        all.waist_to_hip ? metricCard('📐', all.waist_to_hip.ratio, 'Waist÷hip', all.waist_to_hip.category) : ''
      ].join('')),
      h('p', { 'class': 'calc-disclaimer' }, [
        'Educational estimates only. Not medical advice — talk to a qualified professional for health decisions.'
      ])
    ].join(''));
  }

  function bmiBanner(bmi) {
    if (!bmi) return '';
    var cls = bmiCatClass(bmi.category);
    var range = bmi.healthy_weight_range_kg || [];
    return h('div', { 'class': 'calc-bmi-banner', 'data-cat': cls }, [
      h('span', { 'class': 'bmi-big' }, [esc(String(bmi.bmi))]),
      h('div', null, [
        h('span', { 'class': 'bmi-label' }, ['BMI']),
        h('span', { 'class': 'bmi-cat' }, [esc(bmi.category)]),
        h('span', { 'class': 'bmi-range' }, ['Healthy weight: ' + range[0] + '–' + range[1] + ' kg'])
      ].join(''))
    ].join(''));
  }

  /* ---------- Progress UI ---------- */
  function moodScore(mood) {
    return { great: 5, good: 4, okay: 3, low: 2, bad: 1 }[mood] || 3;
  }
  function moodEmoji(n) {
    var e = ['', '😣', '😔', '😐', '🙂', '😊'];
    return e[Math.round(n)] || '😐';
  }

  function renderProgress() {
    var journal = Store.get('journal', []) || [];
    var routines = Store.get('routines', []) || [];
    var streak = Store.get('streak', { count: 0, best: 0 }) || {};
    var measurements = Store.get('measurements', []) || [];
    var lastCalc = Store.get('lastCalc', null);

    var moodSum = 0, energySum = 0;
    journal.forEach(function (e) {
      moodSum += moodScore(e.mood);
      energySum += e.energy || 3;
    });
    var moodAvg = journal.length ? (moodSum / journal.length).toFixed(1) : '—';
    var energyAvg = journal.length ? (energySum / journal.length).toFixed(1) : '—';

    var week = [];
    for (var i = 6; i >= 0; i--) {
      var d = new Date();
      d.setDate(d.getDate() - i);
      var key = d.toDateString();
      var entries = journal.filter(function (e) {
        return new Date(e.ts || e.at).toDateString() === key;
      });
      var avgM = null, avgE = null;
      if (entries.length) {
        avgM = entries.reduce(function (s, e) { return s + moodScore(e.mood); }, 0) / entries.length;
        avgE = entries.reduce(function (s, e) { return s + (e.energy || 3); }, 0) / entries.length;
      }
      week.push({
        day: d.toLocaleDateString(undefined, { weekday: 'short' }),
        mood: avgM,
        energy: avgE
      });
    }

    var sortedMeas = measurements.slice().sort(function (a, b) {
      return new Date(a.at) - new Date(b.at);
    });
    var trend = null;
    if (sortedMeas.length >= 2) {
      var first = sortedMeas[0].weight_kg;
      var last = sortedMeas[sortedMeas.length - 1].weight_kg;
      var diff = Math.round((last - first) * 10) / 10;
      trend = { first: first, last: last, diff: diff, dir: diff < 0 ? 'down' : diff > 0 ? 'up' : 'stable' };
    }

    var weekBars = week.map(function (w) {
      return h('div', { 'class': 'wc-col' }, [
        h('div', { 'class': 'wc-bars-inner' }, [
          w.mood != null
            ? h('div', {
                'class': 'wc-bar mood',
                style: 'height:' + (w.mood / 5 * 100) + '%',
                title: 'Mood ' + w.mood.toFixed(1)
              }, [h('span', { 'class': 'wc-bar-label' }, [moodEmoji(w.mood)])])
            : h('div', { 'class': 'wc-bar empty' }, []),
          w.energy != null
            ? h('div', {
                'class': 'wc-bar energy',
                style: 'height:' + (w.energy / 5 * 100) + '%',
                title: 'Energy ' + w.energy.toFixed(1)
              }, [h('span', { 'class': 'wc-bar-label' }, [String(Math.round(w.energy))])])
            : ''
        ].join('')),
        h('span', { 'class': 'wc-day' }, [esc(w.day)])
      ].join(''));
    }).join('');

    var measList = measurements.slice(0, 12).map(function (m) {
      var date = new Date(m.at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
      return h('div', { 'class': 'meas-row' }, [
        h('div', { 'class': 'meas-main' }, [
          h('strong', null, [esc(String(m.weight_kg)) + ' kg']),
          m.waist_cm ? h('span', { 'class': 'muted' }, [' · waist ' + esc(String(m.waist_cm)) + ' cm']) : '',
          m.notes ? h('div', { 'class': 'meas-notes' }, [esc(m.notes)]) : ''
        ].join('')),
        h('div', { 'class': 'meas-side' }, [
          h('span', { 'class': 'meas-date' }, [esc(date)]),
          h('button', {
            type: 'button',
            'class': 'icon-btn',
            'data-action': 'toolsDeleteMeas',
            'data-id': m.id,
            'aria-label': 'Delete measurement'
          }, ['×'])
        ].join(''))
      ].join(''));
    }).join('');

    return h('div', { 'class': 'tools-progress' }, [
      h('div', { 'class': 'track-stat-strip' }, [
        statCard(journal.length, 'Journal'),
        statCard(streak.count || 0, 'Day streak'),
        statCard(moodAvg, 'Avg mood'),
        statCard(energyAvg, 'Avg energy'),
        statCard(measurements.length, 'Measurements'),
        statCard(routines.length, 'Routines')
      ].join('')),
      h('div', { 'class': 'track-grid' }, [
        h('div', { 'class': 'track-panel panel-like' }, [
          h('div', { 'class': 'tp-header' }, [
            h('h3', null, ['Weekly snapshot']),
            h('span', { 'class': 'tp-sub' }, ['Mood & energy · last 7 days'])
          ].join('')),
          h('div', { 'class': 'week-chart' }, [
            h('div', { 'class': 'wc-y-axis' }, ['<span>5</span><span>3</span><span>1</span>']),
            h('div', { 'class': 'wc-bars' }, [weekBars])
          ].join('')),
          h('div', { 'class': 'wc-legend' }, [
            h('span', null, ['<i class="lg-mood"></i> Mood']),
            h('span', null, ['<i class="lg-energy"></i> Energy'])
          ].join('')),
          h('div', { 'class': 'track-actions' }, [
            h('button', { type: 'button', 'class': 'btn btn-primary btn-sm', 'data-action': 'go:journal' }, ['Log mood']),
            h('button', { type: 'button', 'class': 'btn btn-ghost btn-sm', 'data-action': 'startCheckin' }, ['Check-in'])
          ].join(''))
        ].join('')),
        h('div', { 'class': 'track-panel panel-like' }, [
          h('div', { 'class': 'tp-header' }, [
            h('h3', null, ['Body measurements']),
            h('span', { 'class': 'tp-sub' }, [trend
              ? ('Trend: ' + (trend.dir === 'down' ? '↓' : trend.dir === 'up' ? '↑' : '→') + ' ' + Math.abs(trend.diff) + ' kg')
              : 'Log weight over time'])
          ].join('')),
          h('form', { 'class': 'meas-form', id: 'measForm', 'data-action': 'toolsAddMeas' }, [
            h('div', { 'class': 'calc-form-grid' }, [
              field('Weight', 'measWeight', '', 'kg', 'number'),
              field('Waist (opt.)', 'measWaist', '', 'cm', 'number')
            ].join('')),
            h('label', { 'class': 'calc-field' }, [
              h('span', { 'class': 'calc-label' }, ['Note']),
              h('div', { 'class': 'calc-input-wrap' }, [
                h('input', { id: 'measNotes', type: 'text', placeholder: 'Optional note', maxlength: '80' })
              ])
            ].join('')),
            h('button', { type: 'submit', 'class': 'btn btn-primary btn-sm' }, ['Save measurement'])
          ].join('')),
          measurements.length
            ? h('div', { 'class': 'meas-list' }, [measList])
            : h('p', { 'class': 'muted' }, ['No measurements yet — add your first above.'])
        ].join(''))
      ].join('')),
      lastCalc && lastCalc.result
        ? h('div', { 'class': 'track-panel panel-like last-calc-card' }, [
            h('div', { 'class': 'tp-header' }, [
              h('h3', null, ['Latest calculator snapshot']),
              h('span', { 'class': 'tp-sub' }, [new Date(lastCalc.at).toLocaleString()])
            ].join('')),
            h('div', { 'class': 'calc-metric-grid compact' }, [
              metricCard('⚖', lastCalc.result.bmi.bmi, 'BMI', lastCalc.result.bmi.category),
              metricCard('🔥', lastCalc.result.bmr.bmr_kcal, 'BMR', 'kcal/day'),
              metricCard('⚡', lastCalc.result.tdee.tdee_kcal, 'TDEE', 'kcal/day'),
              metricCard('💧', lastCalc.result.water_intake.total_l + ' L', 'Water', '')
            ].join('')),
            h('button', { type: 'button', 'class': 'btn btn-ghost btn-sm', 'data-action': 'toolsTab', 'data-id': 'calc' }, ['Open calculators →'])
          ].join(''))
        : h('div', { 'class': 'track-panel panel-like' }, [
            h('h3', null, ['No calculator run yet']),
            h('p', { 'class': 'muted' }, ['Run a full body profile to see metrics here.']),
            h('button', { type: 'button', 'class': 'btn btn-primary btn-sm', 'data-action': 'toolsTab', 'data-id': 'calc' }, ['Open calculators'])
          ].join(''))
    ].join(''));
  }

  function statCard(value, label) {
    return h('div', { 'class': 'track-stat-card' }, [
      h('span', { 'class': 'tstat-value' }, [esc(String(value))]),
      h('span', { 'class': 'tstat-label' }, [esc(label)])
    ].join(''));
  }

  function addMeasurement(e) {
    if (e && e.preventDefault) e.preventDefault();
    var w = el('measWeight');
    var waist = el('measWaist');
    var notes = el('measNotes');
    var weight = w && w.value ? parseFloat(w.value) : NaN;
    if (!(weight > 0)) { toast('Enter your weight first'); return; }
    var list = Store.get('measurements', []) || [];
    list.unshift({
      id: 'm-' + Date.now(),
      weight_kg: weight,
      waist_cm: waist && waist.value ? parseFloat(waist.value) : null,
      notes: notes && notes.value ? notes.value.trim() : '',
      at: new Date().toISOString()
    });
    Store.set('measurements', list.slice(0, 200));
    toast('Measurement saved');
    render();
  }

  function deleteMeasurement(id) {
    var list = (Store.get('measurements', []) || []).filter(function (m) { return m.id !== id; });
    Store.set('measurements', list);
    toast('Measurement removed');
    render();
  }

  /* ---------- Kitchen / recipes ---------- */
  function renderKitchen() {
    var recipes = global.AYUS_RECIPES || [];
    var filters = [
      { id: 'all', label: 'All' },
      { id: 'digestion', label: 'Digestion' },
      { id: 'morning', label: 'Morning' },
      { id: 'evening', label: 'Evening' },
      { id: 'cooling', label: 'Cooling' },
      { id: 'daily', label: 'Daily' }
    ];
    var filterHtml = filters.map(function (f) {
      return h('button', {
        type: 'button',
        'class': 'fchip' + (state.recipeFilter === f.id ? ' selected' : ''),
        'data-action': 'toolsRecipeFilter',
        'data-id': f.id
      }, [esc(f.label)]);
    }).join('');

    var list = recipes.filter(function (r) {
      if (state.recipeFilter === 'all') return true;
      return (r.tags || []).indexOf(state.recipeFilter) >= 0 ||
        (r.dosha || []).indexOf(state.recipeFilter) >= 0;
    });

    if (state.openRecipe) {
      var r = recipes.find(function (x) { return x.id === state.openRecipe; });
      if (r) return renderRecipeDetail(r);
    }

    var cards = list.map(function (r) {
      return h('button', {
        type: 'button',
        'class': 'recipe-card',
        'data-action': 'toolsOpenRecipe',
        'data-id': r.id
      }, [
        h('div', { 'class': 'recipe-emoji', 'aria-hidden': 'true' }, [r.emoji || '🍲']),
        h('div', { 'class': 'recipe-body' }, [
          h('div', { 'class': 'recipe-name' }, [esc(r.name)]),
          r.sanskrit ? h('div', { 'class': 'recipe-sk' }, [esc(r.sanskrit)]) : '',
          h('p', { 'class': 'recipe-sum' }, [esc(r.summary)]),
          h('div', { 'class': 'recipe-meta' }, [
            h('span', null, [esc(r.time)]),
            h('span', null, [esc(r.serves)]),
            h('span', null, [esc((r.dosha || []).join(' · '))])
          ].join(''))
        ].join(''))
      ].join(''));
    }).join('');

    return h('div', { 'class': 'tools-kitchen' }, [
      h('p', { 'class': 'kitchen-lead' }, [
        'Simple Ayurvedic kitchen ideas — home recipes, not prescriptions. Adjust for your season and how you feel.'
      ]),
      h('div', { 'class': 'lib-filters kitchen-filters' }, [filterHtml]),
      h('div', { 'class': 'recipe-grid' }, [
        cards || h('p', { 'class': 'muted' }, ['No recipes in this filter.'])
      ])
    ].join(''));
  }

  function renderRecipeDetail(r) {
    var ings = (r.ingredients || []).map(function (i) {
      return h('li', null, [esc(i)]);
    }).join('');
    var steps = (r.steps || []).map(function (s, i) {
      return h('li', null, [h('span', { 'class': 'step-n' }, [String(i + 1)]), ' ', esc(s)]);
    }).join('');
    return h('div', { 'class': 'recipe-detail panel-like' }, [
      h('button', { type: 'button', 'class': 'btn btn-ghost btn-sm', 'data-action': 'toolsCloseRecipe' }, ['← All recipes']),
      h('div', { 'class': 'recipe-detail-head' }, [
        h('span', { 'class': 'recipe-emoji lg', 'aria-hidden': 'true' }, [r.emoji || '🍲']),
        h('div', null, [
          h('h2', null, [esc(r.name)]),
          r.sanskrit ? h('p', { 'class': 'recipe-sk' }, [esc(r.sanskrit)]) : '',
          h('div', { 'class': 'recipe-meta' }, [
            h('span', null, [esc(r.time)]),
            h('span', null, [esc(r.serves)])
          ].join(''))
        ].join(''))
      ].join('')),
      h('p', { 'class': 'recipe-sum' }, [esc(r.summary)]),
      h('h3', null, ['Ingredients']),
      h('ul', { 'class': 'recipe-list' }, [ings]),
      h('h3', null, ['Steps']),
      h('ol', { 'class': 'recipe-steps' }, [steps]),
      r.tip ? h('div', { 'class': 'recipe-tip' }, [h('strong', null, ['Tip: ']), esc(r.tip)]) : '',
      h('p', { 'class': 'calc-disclaimer' }, ['Kitchen education only — not medical treatment. Adapt for allergies and personal needs.'])
    ].join(''));
  }

  /* ---------- Shell ---------- */
  function render() {
    var root = el('toolsBody');
    if (!root) return;
    if (!state.form) state.form = defaultForm();

    var tabs = [
      { id: 'calc', label: 'Calculators', icon: '⚖' },
      { id: 'progress', label: 'Progress', icon: '📈' },
      { id: 'kitchen', label: 'Kitchen', icon: '🍲' }
    ];
    var tabBar = tabs.map(function (t) {
      return h('button', {
        type: 'button',
        'class': 'tools-tab' + (state.tab === t.id ? ' active' : ''),
        'data-action': 'toolsTab',
        'data-id': t.id,
        role: 'tab',
        'aria-selected': String(state.tab === t.id)
      }, [h('span', { 'aria-hidden': 'true' }, [t.icon]), ' ', esc(t.label)]);
    }).join('');

    var body = '';
    if (state.tab === 'calc') body = renderCalcForm();
    else if (state.tab === 'progress') body = renderProgress();
    else body = renderKitchen();

    root.innerHTML =
      h('div', { 'class': 'tools-tabs', role: 'tablist', 'aria-label': 'Tools sections' }, [tabBar]) +
      h('div', { 'class': 'tools-panel' }, [body]);
  }

  function open(tab) {
    if (tab === 'calculators' || tab === 'calc') state.tab = 'calc';
    else if (tab === 'progress' || tab === 'tracking') state.tab = 'progress';
    else if (tab === 'kitchen' || tab === 'recipes') state.tab = 'kitchen';
    else if (tab) state.tab = tab;
    state.openRecipe = null;
    if (global.AyusApp && global.AyusApp.go) global.AyusApp.go('tools');
    else {
      document.querySelectorAll('.screen').forEach(function (s) { s.classList.remove('active'); });
      var t = el('tools');
      if (t) t.classList.add('active');
    }
    render();
  }

  function handle(node, e) {
    var act = node.dataset.action;
    if (act === 'toolsTab') {
      state.tab = node.dataset.id || 'calc';
      state.openRecipe = null;
      render();
      return true;
    }
    if (act === 'toolsCalcTab') {
      readFormFromDom();
      state.calcTab = node.dataset.id || 'all';
      state.result = null;
      render();
      return true;
    }
    if (act === 'toolsSetGoal') {
      readFormFromDom();
      state.form.goal = node.dataset.id || 'maintain';
      render();
      return true;
    }
    if (act === 'toolsRunCalc') {
      runCalculate();
      return true;
    }
    if (act === 'toolsAddMeas') {
      addMeasurement(e);
      return true;
    }
    if (act === 'toolsDeleteMeas') {
      deleteMeasurement(node.dataset.id);
      return true;
    }
    if (act === 'toolsRecipeFilter') {
      state.recipeFilter = node.dataset.id || 'all';
      state.openRecipe = null;
      render();
      return true;
    }
    if (act === 'toolsOpenRecipe') {
      state.openRecipe = node.dataset.id;
      render();
      return true;
    }
    if (act === 'toolsCloseRecipe') {
      state.openRecipe = null;
      render();
      return true;
    }
    return false;
  }

  /* form submit for measurements */
  document.addEventListener('submit', function (e) {
    if (e.target && e.target.id === 'measForm') {
      e.preventDefault();
      addMeasurement(e);
    }
  });

  /* show hip field when sex = female without losing other inputs */
  document.addEventListener('change', function (e) {
    if (e.target && e.target.id === 'calcSex') {
      readFormFromDom();
      render();
    }
  });

  global.AyusTools = {
    render: render,
    open: open,
    handle: handle,
    setTab: function (t) { state.tab = t; render(); }
  };
})(typeof window !== 'undefined' ? window : this);
