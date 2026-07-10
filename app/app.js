/* ===========================================================================
   Āyus — app logic (v5 · product upgrade). Reads window.AYUR and runs the same
   trust-chain reasoning offline: concern -> herb/formulation -> why -> tier -> source.

   v5 product layer:
     · Personal profile (name, goals) + private on-device storage
     · "Today" dashboard with greeting, streak, dinacharya habits, wellness pulse
     · Bottom nav for daily retention · expanded onboarding
     · Plain-language UX with Indian heritage aesthetic
   =========================================================================== */
(function () {
  'use strict';

  /* ------------------------------------------------------------------ */
  /*  #2  Guard: bail if data.js didn't load                            */
  /* ------------------------------------------------------------------ */
  var D = window.AYUR;
  if (!D || !D.herbs || !D.conditions) {
    document.body.innerHTML = '';
    var err = document.getElementById('dataError');
    if (err) { err.classList.remove('hidden'); document.body.appendChild(err); }
    else { document.body.innerHTML = '<div style="text-align:center;padding:120px 20px;font-family:sans-serif"><h2>Unable to load wellness data</h2><p>Please refresh the page.</p></div>'; }
    return;
  }

  /* ------------------------------------------------------------------ */
  /*  Constants                                                         */
  /* ------------------------------------------------------------------ */
  var TIER_RANK = { classical: 0, traditional: 1, preliminary: 2, clinical: 3 };
  var TIER_LABEL = {
    classical: 'Classical text',
    traditional: 'Established tradition',
    preliminary: 'Preliminary research',
    clinical: 'Clinical evidence'
  };
  var TIER_COUNT = Object.keys(TIER_LABEL).length;
  var CAT_ORDER = ['Digestion & gut', 'Mind & emotions', 'Energy & immunity', 'Skin & hair',
    'Joints & body', 'Breath & allergy', 'Heart & metabolic', "Women's wellness",
    'Urinary care', 'Eyes & mouth', 'Pain management', 'Reproductive health', 'Metabolic health', 'Mental health'];

  var state = {
    condition: null,
    duration: null,
    intensity: null,
    step: 1,
    answers: {},
    deepIndex: 0
  };
  var routineCache = null;
  var undoTimer = null;
  var undoData = null;

  /* Deep personal questionnaire (after problem page) */
  var DEEP_QUESTIONS = [
    {
      id: 'duration',
      title: 'How long has this been with you?',
      sub: 'Time tells us whether this is a short storm or a longer pattern.',
      multi: false,
      options: [
        { v: 'new', t: 'Just started (today / yesterday)' },
        { v: 'days', t: 'A few days' },
        { v: 'weeks', t: 'A few weeks' },
        { v: 'long', t: 'Months or longer' }
      ]
    },
    {
      id: 'intensity',
      title: 'How strongly is it affecting you right now?',
      sub: 'Be honest — intensity changes how urgent self-care and professional care should be.',
      multi: false,
      options: [
        { v: 'mild', t: 'Mild — noticeable but I can ignore it' },
        { v: 'moderate', t: 'Moderate — bothersome through the day' },
        { v: 'strong', t: 'Strong — hard to function or rest' }
      ]
    },
    {
      id: 'when',
      title: 'When do you notice it most?',
      sub: 'Timing points to which daily rhythms may be feeding the imbalance.',
      multi: false,
      options: [
        { v: 'morning', t: 'Morning / on waking' },
        { v: 'midday', t: 'Midday / after meals' },
        { v: 'evening', t: 'Evening / after work' },
        { v: 'night', t: 'Night / when trying to sleep' },
        { v: 'allday', t: 'Most of the day' },
        { v: 'random', t: 'It comes and goes unpredictably' }
      ]
    },
    {
      id: 'triggers',
      title: 'What usually makes it worse?',
      sub: 'Pick all that fit — these are the levers we can change.',
      multi: true,
      options: [
        { v: 'stress', t: 'Stress, worry, or overthinking' },
        { v: 'sleep', t: 'Poor or short sleep' },
        { v: 'food', t: 'Certain foods or heavy meals' },
        { v: 'irregular', t: 'Irregular meal times / skipping meals' },
        { v: 'cold', t: 'Cold, dry, or windy weather' },
        { v: 'heat', t: 'Heat, spice, or sun' },
        { v: 'sitting', t: 'Long sitting / little movement' },
        { v: 'screens', t: 'Screens late at night' },
        { v: 'travel', t: 'Travel or schedule change' },
        { v: 'unknown', t: 'I am not sure yet' }
      ]
    },
    {
      id: 'lifestyle',
      title: 'Which of these is closest to your recent lifestyle?',
      sub: 'A snapshot of rhythm — not a judgment.',
      multi: false,
      options: [
        { v: 'rushed', t: 'Rushed, irregular, always “on”' },
        { v: 'sedentary', t: 'Mostly sitting; little outdoor time' },
        { v: 'overwork', t: 'Long work hours; late nights' },
        { v: 'emotional', t: 'High emotional load / conflict' },
        { v: 'balanced', t: 'Mostly steady meals and sleep' },
        { v: 'recovering', t: 'Recovering from illness or burnout' }
      ]
    },
    {
      id: 'sleep_q',
      title: 'How has your sleep been?',
      sub: 'Sleep is half of healing for almost every concern.',
      multi: false,
      options: [
        { v: 'good', t: 'Mostly restful' },
        { v: 'light', t: 'Light / wake often' },
        { v: 'hard_start', t: 'Hard to fall asleep' },
        { v: 'early_wake', t: 'Wake too early, mind racing' },
        { v: 'short', t: 'Too few hours' }
      ]
    },
    {
      id: 'digestion_q',
      title: 'How is your digestion overall?',
      sub: 'In Ayurveda, gut fire (agni) shapes energy, mood, and tissue repair.',
      multi: false,
      options: [
        { v: 'strong', t: 'Strong appetite; regular, easy elimination' },
        { v: 'variable', t: 'Variable — some days great, some not' },
        { v: 'slow', t: 'Slow, heavy, bloated after meals' },
        { v: 'irregular', t: 'Irregular appetite or bowels' },
        { v: 'hot', t: 'Burning, acidity, or sharp hunger' }
      ]
    },
    {
      id: 'tried',
      title: 'What have you already tried?',
      sub: 'So we do not repeat the same dead ends.',
      multi: true,
      options: [
        { v: 'nothing', t: 'Nothing specific yet' },
        { v: 'rest', t: 'Rest / sleep more' },
        { v: 'diet', t: 'Diet changes' },
        { v: 'exercise', t: 'Exercise or yoga' },
        { v: 'otc', t: 'OTC pharmacy products' },
        { v: 'herbs', t: 'Herbs or supplements' },
        { v: 'doctor', t: 'Seen a clinician' }
      ]
    },
    {
      id: 'impact',
      title: 'Where does this show up in your life most?',
      sub: 'Impact tells us what “better” must look like for you.',
      multi: true,
      options: [
        { v: 'work', t: 'Work / study focus' },
        { v: 'mood', t: 'Mood / patience' },
        { v: 'energy', t: 'Energy / drive' },
        { v: 'sleep_life', t: 'Sleep quality' },
        { v: 'body', t: 'Body comfort / pain' },
        { v: 'social', t: 'Social life / relationships' }
      ]
    },
    {
      id: 'goal',
      title: 'If one thing improved first, what would matter most?',
      sub: 'Your north star for the plan we build next.',
      multi: false,
      options: [
        { v: 'relief', t: 'Feel physical relief soon' },
        { v: 'sleep_goal', t: 'Sleep more deeply' },
        { v: 'calm', t: 'Feel calmer and clearer' },
        { v: 'energy_goal', t: 'Steady energy through the day' },
        { v: 'digestion_goal', t: 'Digest without heaviness' },
        { v: 'rhythm', t: 'A simple daily rhythm I can keep' }
      ]
    }
  ];

  /* ------------------------------------------------------------------ */
  /*  #10  Template helper                                              */
  /* ------------------------------------------------------------------ */
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function cap(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : s; }
  function el(id) { return document.getElementById(id); }

  function h(tag, attrs, children) {
    var open = '<' + tag;
    if (attrs) {
      for (var k in attrs) {
        if (attrs.hasOwnProperty(k) && attrs[k] != null) {
          open += ' ' + k + '="' + esc(String(attrs[k])) + '"';
        }
      }
    }
    if (children == null) return open + '/>';
    if (!Array.isArray(children)) children = [children];
    return open + '>' + children.join('') + '</' + tag + '>';
  }

  /* ------------------------------------------------------------------ */
  /*  SVG icons                                                          */
  /* ------------------------------------------------------------------ */
  var ICONS = {
    bowl: '<path d="M3 11h18a9 9 0 0 1-18 0Z"/><path d="M12 3c2 1 2 3 0 4"/>',
    lotus: '<path d="M12 21c-5 0-8-3-8-6 2 0 4 1 5 2 0-3 1-6 3-9 2 3 3 6 3 9 1-1 3-2 5-2 0 3-3 6-8 6Z"/>',
    flame: '<path d="M12 3c1 3 4 4 4 8a4 4 0 0 1-8 0c0-1 .5-2 1-3 .5 2 2 2 2 0 0-2-1-3 1-5Z"/>',
    leaf: '<path d="M4 20c0-9 6-15 16-16C19 13 13 20 4 20Z"/><path d="M9 15c2-3 5-5 8-6"/>',
    bone: '<path d="M7 7a2 2 0 1 0-2 2l9 9a2 2 0 1 0 2-2Z"/>',
    wind: '<path d="M3 8h9a2.5 2.5 0 1 0-2.5-3M3 12h13a3 3 0 1 1-3 3M3 16h7"/>',
    heart: '<path d="M12 20s-7-4.5-7-9.5A3.5 3.5 0 0 1 12 8a3.5 3.5 0 0 1 7 2.5C19 15.5 12 20 12 20Z"/>',
    moon: '<path d="M20 14a8 8 0 1 1-9-11 6 6 0 0 0 9 11Z"/>',
    drop: '<path d="M12 3c3 5 6 7 6 10a6 6 0 0 1-12 0c0-3 3-5 6-10Z"/>',
    eye: '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="2.5"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4 12H2M22 12h-2M5 5 6.5 6.5M17.5 17.5 19 19M19 5l-1.5 1.5M6.5 17.5 5 19"/>',
    'sun-high': '<circle cx="12" cy="13" r="3.5"/><path d="M12 4v2M5 8 6.5 9M19 8l-1.5 1M3 14h2M19 14h2"/>',
    sunset: '<circle cx="12" cy="13" r="3.5"/><path d="M3 19h18M8 13a4 4 0 0 1 8 0M12 3v3M5 8l1.5 1.2M19 8l-1.5 1.2"/>',
    star: '<path d="m12 3 2.5 5.5L20 9l-4 4 1 6-5-3-5 3 1-6-4-4 5.5-.5Z"/>',
    check: '<path d="M20 6 9 17l-5-5"/>',
    x: '<path d="M18 6 6 18M6 6l12 12"/>'
  };
  function svg(name, cls, extra) {
    var attrs = { 'class': cls || '', 'viewBox': '0 0 24 24', 'fill': 'none', 'stroke': 'currentColor', 'stroke-width': '1.4', 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'aria-hidden': 'true' };
    if (extra) { for (var k in extra) attrs[k] = extra[k]; }
    return h('svg', attrs, [ICONS[name] || ICONS.leaf]);
  }
  var ACCENT = { saffron: '#d98a2b', indigo: '#4b4a87', terracotta: '#b5532a', rose: '#b14e6a', green: '#2f6a4d', sky: '#2f7d9a', gold: '#b8902e' };

  /* ------------------------------------------------------------------ */
  /*  ARIA live helpers (#6)                                             */
  /* ------------------------------------------------------------------ */
  function announce(msg, assertive) {
    var node = el(assertive ? 'ariaAssertive' : 'ariaLive');
    if (node) { node.textContent = ''; setTimeout(function () { node.textContent = msg; }, 50); }
  }

  /* ------------------------------------------------------------------ */
  /*  #18  Undo toast                                                    */
  /* ------------------------------------------------------------------ */
  function toast(msg) {
    var t = el('toast'); t.textContent = msg; t.classList.add('show');
    clearTimeout(window._tt); window._tt = setTimeout(function () { t.classList.remove('show'); }, 2800);
  }
  function toastUndo(msg, undoFn) {
    clearTimeout(undoTimer);
    var t = el('toastUndo');
    el('toastUndoMsg').textContent = msg;
    t.classList.add('show');
    undoData = undoFn;
    announce(msg + ' Undo available.', true);
    undoTimer = setTimeout(function () { t.classList.remove('show'); undoData = null; }, 5000);
  }

  /* ------------------------------------------------------------------ */
  /*  #8  Weighted search                                               */
  /* ------------------------------------------------------------------ */
  function searchScore(item, q) {
    var hay = [item.name || item.common_name || '', item.sanskrit_name || '', item.botanical_name || '']
      .concat(item.also_known_as || []).concat(item.description || '')
      .concat(item.category || '').join(' ').toLowerCase();
    var terms = q.toLowerCase().split(/\s+/);
    var score = 0;
    for (var i = 0; i < terms.length; i++) {
      var t = terms[i];
      if (!t) continue;
      var name = (item.common_name || item.name || '').toLowerCase();
      var sans = (item.sanskrit_name || '').toLowerCase();
      var bot = (item.botanical_name || '').toLowerCase();
      var aka = (item.also_known_as || []).map(function (a) { return a.toLowerCase(); });
      if (name === t || sans === t) { score += 100; continue; }
      if (name.indexOf(t) === 0 || sans.indexOf(t) === 0) { score += 80; continue; }
      if (name.indexOf(t) >= 0) { score += 60; continue; }
      if (sans.indexOf(t) >= 0) { score += 55; continue; }
      if (bot.indexOf(t) >= 0) { score += 50; continue; }
      for (var j = 0; j < aka.length; j++) {
        if (aka[j].indexOf(t) >= 0) { score += 70; break; }
      }
      if (hay.indexOf(t) >= 0 && score === 0) score += 20;
    }
    return score;
  }

  function searchConditions(q) {
    return D.conditions
      .map(function (c) { return { item: c, score: searchScore(c, q) }; })
      .filter(function (x) { return x.score > 0; })
      .sort(function (a, b) { return b.score - a.score; })
      .map(function (x) { return x.item; });
  }

  function searchHerbs(q) {
    var isForm = libState.type === 'formulation';
    var source = isForm ? D.formulations : D.herbs;
    return source
      .map(function (it) {
        var mapped = isForm ? { name: it.name, sanskrit_name: it.sanskrit_name, also_known_as: it.ingredients || [], description: it.description || it.type || '' } : it;
        return { item: it, score: searchScore(mapped, q) };
      })
      .filter(function (x) { return x.score > 0; })
      .sort(function (a, b) { return b.score - a.score; })
      .map(function (x) { return x.item; });
  }

  /* ------------------------------------------------------------------ */
  /*  Navigation                                                         */
  /* ------------------------------------------------------------------ */
  function go(screen) {
    closeMobileNav();
    var screens = document.querySelectorAll('.screen');
    for (var i = 0; i < screens.length; i++) screens[i].classList.remove('active');
    var t = el(screen); if (t) t.classList.add('active');
    document.querySelectorAll('.nav button[data-screen], .bottom-nav button[data-screen], .mobile-nav-panel button[data-screen]').forEach(function (b) {
      if (b.dataset.screen === screen) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current');
    });
    if (screen === 'home') renderHome();
    if (screen === 'myspace') renderMySpace();
    if (screen === 'journal') renderJournal();
    if (screen === 'tools' && window.AyusTools && window.AyusTools.render) {
      try { window.AyusTools.render(); } catch (e) {}
    }
    try { window.scrollTo({ top: 0, behavior: 'auto' }); } catch (e) { window.scrollTo(0, 0); }
    setTimeout(function () {
      var focusEl = t && t.querySelector('h1, h2, [tabindex]');
      if (focusEl) { focusEl.setAttribute('tabindex', '-1'); focusEl.focus(); }
      else if (t) t.focus();
    }, 60);
    setTimeout(revealObserve, 80);
    touchActivity(screen);
  }

  /* ------------------------------------------------------------------ */
  /*  #22  Mobile nav                                                    */
  /* ------------------------------------------------------------------ */
  function toggleMobileNav() {
    var nav = el('mobileNav');
    var btn = el('hamburgerBtn');
    if (!nav || !btn) return;
    var open = nav.classList.contains('open');
    if (open) closeMobileNav();
    else {
      nav.classList.add('open');
      nav.setAttribute('aria-hidden', 'false');
      btn.classList.add('open');
      btn.setAttribute('aria-expanded', 'true');
      document.body.style.overflow = 'hidden';
      /* focus first actionable item for a11y */
      setTimeout(function () {
        var first = nav.querySelector('.mobile-nav-panel > button, .mobile-nav-x');
        if (first) first.focus();
      }, 40);
    }
  }
  function closeMobileNav() {
    var nav = el('mobileNav'); var btn = el('hamburgerBtn');
    if (nav && nav.classList.contains('open')) {
      nav.classList.remove('open');
      nav.setAttribute('aria-hidden', 'true');
      if (btn) { btn.classList.remove('open'); btn.setAttribute('aria-expanded', 'false'); }
      /* only clear overflow if modal is also closed */
      if (!el('modal') || !el('modal').classList.contains('open')) {
        document.body.style.overflow = '';
      }
    }
  }

  /* ------------------------------------------------------------------ */
  /*  Intake flow — problem page + deep questionnaire                     */
  /* ------------------------------------------------------------------ */
  var PHASE = {
    1: 'Choose a category',
    '1b': 'Choose the problem',
    2: 'Understand the problem',
    3: 'Personal questions',
    5: 'Your story · ready to reveal'
  };

  function startCheckin() {
    state = {
      condition: null,
      duration: null,
      intensity: null,
      step: 1,
      answers: {},
      deepIndex: 0,
      category: null,
      concernList: null
    };
    document.querySelectorAll('.chip.selected, .tile.selected').forEach(function (n) { n.classList.remove('selected'); });
    if (el('search')) el('search').value = '';
    if (el('concernGrid')) el('concernGrid').innerHTML = '';
    buildCategories();
    go('intake');
    toStep(1);
  }

  function setProgress(step) {
    /* Map: 1 category, 1b problems→dot1–2, 2 problem page→2, quiz→3–4, summary→5 */
    var vis = 1;
    if (step === 1) vis = 1;
    else if (step === '1b') vis = 1;
    else if (step === 2) vis = 2;
    else if (step === 3 || step === 4) {
      var frac = DEEP_QUESTIONS.length ? state.deepIndex / DEEP_QUESTIONS.length : 0;
      vis = frac < 0.5 ? 3 : 4;
    } else if (step === 5) vis = 5;
    else vis = typeof step === 'number' ? step : 1;

    var dots = document.querySelectorAll('#intakeProgress .step-dot');
    for (var i = 0; i < dots.length; i++) dots[i].classList.toggle('on', i < vis);
    var lines = document.querySelectorAll('#intakeProgress .step-line');
    for (var j = 0; j < lines.length; j++) lines[j].classList.toggle('on', j < vis - 1);
    var pg = el('intakeProgress');
    if (pg) {
      pg.setAttribute('aria-valuenow', vis);
      pg.setAttribute('aria-valuemax', '5');
    }
    var ph = el('intakePhase');
    if (ph) ph.textContent = PHASE[step] || PHASE[3];
  }

  function toStep(n) {
    if ((n === 2 || n === 3 || n === 5) && !state.condition && n !== '1b') {
      if (n === 2 && !state.condition) {
        toStep(state.category || state.concernList ? '1b' : 1);
        return;
      }
      if (n === 3 && !state.condition) {
        toStep(1);
        return;
      }
    }
    if (n === 3 && state.condition && (state.step === 2 || state.step === '1b')) state.deepIndex = 0;
    if (n === 5) renderIntakeSummary();
    if (n === '1b') renderConcernPage();
    state.step = n;
    document.querySelectorAll('.q-step').forEach(function (s) {
      var raw = s.dataset.step;
      var active = raw === String(n) || (n === 3 && raw === '3') || (n === 4 && raw === '3');
      s.classList.toggle('active', active);
    });
    if (n === 2) renderProblemPage();
    if (n === 3 || n === 4) renderDeepQuestion();
    setProgress(n === 4 ? 3 : n);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    announce(PHASE[n] || 'Questionnaire');
  }

  function buildCategories() {
    var counts = {};
    D.conditions.forEach(function (c) { counts[c.category] = (counts[c.category] || 0) + 1; });
    var html = '';
    CAT_ORDER.forEach(function (cat) {
      if (!counts[cat]) return;
      var meta = D.categoryMeta[cat] || { icon: 'leaf', accent: 'green' };
      var color = ACCENT[meta.accent] || ACCENT.green;
      html += h('button', { 'class': 'tile', 'data-cat': cat, 'data-action': 'pickCategory' }, [
        h('span', { 'class': 'tico', 'style': 'color:' + color }, [svg(meta.icon, 'tico')]),
        h('h4', null, [esc(cat)]),
        h('div', { 'class': 'meta' }, [counts[cat] + ' concern' + (counts[cat] > 1 ? 's' : '')])
      ]);
    });
    var cg = el('catGrid');
    if (cg) cg.innerHTML = html;
  }

  function pickCategory(node) {
    document.querySelectorAll('#catGrid .tile').forEach(function (t) { t.classList.remove('selected'); });
    node.classList.add('selected');
    var cat = node.dataset.cat;
    state.category = cat;
    state.concernList = D.conditions.filter(function (c) { return c.category === cat; });
    state.condition = null;
    toStep('1b');
  }

  function renderConcernPage() {
    var list = state.concernList || [];
    var title = el('concernPageTitle');
    var sub = el('concernPageSub');
    if (title) {
      title.textContent = state.category
        ? state.category
        : list.length
          ? 'Matching problems'
          : 'Choose the problem';
    }
    if (sub) {
      sub.textContent = state.category
        ? list.length + ' problem' + (list.length === 1 ? '' : 's') + ' in this area — pick one to continue.'
        : 'Select what matches how you feel.';
    }
    renderConcerns(list);
  }

  function renderConcerns(list) {
    var grid = el('concernGrid');
    if (!grid) return;
    if (!list.length) {
      grid.innerHTML =
        '<p class="muted text-center" style="grid-column:1/-1">No matching concern — go back and try another category or search.</p>';
      return;
    }
    var html = '';
    list.forEach(function (c) {
      var aka = (c.also_known_as || []).slice(0, 2).join(', ');
      html += h('button', { 'class': 'tile', 'data-id': c.id, 'data-action': 'pickConcern' }, [
        h('h4', null, [esc(c.name)]),
        h('div', { 'class': 'meta' }, [esc(aka || c.category)])
      ]);
    });
    grid.innerHTML = html;
  }

  function pickConcern(cid) {
    state.condition = D.conditions.find(function (c) { return c.id === cid; });
    if (!state.condition) return;
    toStep(2);
  }

  function searchConcerns(q) {
    q = q.trim();
    if (!q) return;
    state.category = null;
    state.concernList = searchConditions(q);
    state.condition = null;
    toStep('1b');
    var title = el('concernPageTitle');
    var sub = el('concernPageSub');
    if (title) title.textContent = 'Search results';
    if (sub) sub.textContent = 'Results for “' + q + '” — pick a problem to continue.';
  }

  function renderProblemPage() {
    var c = state.condition;
    var box = el('problemPage');
    if (!box || !c) return;
    var aka = (c.also_known_as || []).slice(0, 4).join(' · ');
    var doshas = (c.primary_dosha || []).map(function (d) {
      return h('span', { 'class': 'dosha', 'data-d': d }, [
        h('span', { 'class': 'ddot', 'aria-hidden': 'true' }, ['']),
        h('span', { 'class': 'dosha-name' }, [{ vata: 'Vāta', pitta: 'Pitta', kapha: 'Kapha' }[d] || cap(d)])
      ]);
    }).join('');
    box.innerHTML =
      h('div', { 'class': 'problem-hero' }, [
        h('div', { 'class': 'kicker' }, ['Your selected problem']),
        h('h2', { 'class': 'problem-title' }, [esc(c.name)]),
        aka ? h('p', { 'class': 'problem-aka' }, [esc(aka)]) : '',
        h('div', { 'class': 'dosha-row' }, [doshas])
      ].join('')) +
      h('div', { 'class': 'problem-card' }, [
        h('h3', null, ['What this usually means']),
        h('p', null, [esc(c.description || c.ayurvedic_view || '')])
      ].join('')) +
      h('div', { 'class': 'problem-card soft' }, [
        h('h3', null, ['Ayurvedic lens (preview)']),
        h('p', null, [esc(c.ayurvedic_view || c.description || '')])
      ].join('')) +
      h('div', { 'class': 'problem-next-note' }, [
        h('p', null, [
          'Next we ask <b>personal questions</b> about timing, triggers, lifestyle, sleep, digestion, and what you want to change — so the plan is about <em>your</em> how and why, not a generic tip list.'
        ])
      ].join(''));
  }

  function optionSelected(qid, v) {
    var q = DEEP_QUESTIONS.find(function (x) { return x.id === qid; });
    if (!q) return false;
    var ans = state.answers[qid];
    if (q.multi) return Array.isArray(ans) && ans.indexOf(v) >= 0;
    return ans === v;
  }

  function renderDeepQuestion() {
    var box = el('deepQuiz');
    if (!box) return;
    var i = state.deepIndex;
    if (i >= DEEP_QUESTIONS.length) {
      toStep(5);
      return;
    }
    var q = DEEP_QUESTIONS[i];
    var opts = q.options
      .map(function (o) {
        var on = optionSelected(q.id, o.v);
        return (
          '<button type="button" class="deep-opt' +
          (on ? ' selected' : '') +
          '" data-action="deepPick" data-qid="' +
          esc(q.id) +
          '" data-v="' +
          esc(o.v) +
          '" data-multi="' +
          (q.multi ? '1' : '0') +
          '" aria-pressed="' +
          on +
          '">' +
          '<span class="deep-check" aria-hidden="true"></span>' +
          '<span>' +
          esc(o.t) +
          '</span></button>'
        );
      })
      .join('');
    box.innerHTML =
      '<div class="deep-progress-label">Question ' +
      (i + 1) +
      ' of ' +
      DEEP_QUESTIONS.length +
      (q.multi ? ' · choose all that apply' : '') +
      '</div>' +
      '<h2 class="q-title">' +
      esc(q.title) +
      '</h2>' +
      '<p class="q-sub">' +
      esc(q.sub) +
      '</p>' +
      '<div class="deep-opts" role="group">' +
      opts +
      '</div>' +
      '<div class="q-nav">' +
      '<button type="button" class="btn btn-ghost btn-sm" data-action="deepQuizBack"><span class="btn-arrow">←</span> Back</button>' +
      '<button type="button" class="btn btn-primary btn-sm" data-action="deepQuizNext">Continue <span class="btn-arrow">→</span></button>' +
      '</div>';
    setProgress(3);
    announce('Question ' + (i + 1) + ' of ' + DEEP_QUESTIONS.length + ': ' + q.title);
  }

  function deepPick(qid, v, multi) {
    if (multi) {
      var arr = state.answers[qid];
      if (!Array.isArray(arr)) arr = [];
      var ix = arr.indexOf(v);
      if (ix >= 0) arr.splice(ix, 1);
      else arr.push(v);
      state.answers[qid] = arr;
      if (qid === 'duration' && arr[0]) state.duration = arr[0];
    } else {
      state.answers[qid] = v;
      if (qid === 'duration') state.duration = v;
      if (qid === 'intensity') state.intensity = v;
    }
    renderDeepQuestion();
  }

  function deepQuizNext() {
    var q = DEEP_QUESTIONS[state.deepIndex];
    if (!q) {
      toStep(5);
      return;
    }
    var ans = state.answers[q.id];
    var ok = q.multi ? Array.isArray(ans) && ans.length > 0 : !!ans;
    if (!ok) {
      document.querySelectorAll('.deep-opt').forEach(function (n) {
        n.classList.add('shake');
        setTimeout(function () {
          n.classList.remove('shake');
        }, 450);
      });
      announce('Please choose an answer to continue.', true);
      toast('Pick at least one option');
      return;
    }
    if (q.id === 'duration') state.duration = q.multi ? ans[0] : ans;
    if (q.id === 'intensity') state.intensity = q.multi ? ans[0] : ans;
    state.deepIndex++;
    if (state.deepIndex >= DEEP_QUESTIONS.length) toStep(5);
    else renderDeepQuestion();
  }

  function deepQuizBack() {
    if (state.step === 5) {
      state.deepIndex = DEEP_QUESTIONS.length - 1;
      toStep(3);
      return;
    }
    if (state.deepIndex > 0) {
      state.deepIndex--;
      renderDeepQuestion();
    } else toStep(2);
  }

  function labelFor(qid, v) {
    var q = DEEP_QUESTIONS.find(function (x) { return x.id === qid; });
    if (!q) return v;
    var o = q.options.find(function (x) { return x.v === v; });
    return o ? o.t : v;
  }

  function renderIntakeSummary() {
    var box = el('intakeSummary');
    var c = state.condition;
    if (!box || !c) return;
    var rows = DEEP_QUESTIONS.map(function (q) {
      var ans = state.answers[q.id];
      if (ans == null || (Array.isArray(ans) && !ans.length)) return '';
      var text = Array.isArray(ans)
        ? ans
            .map(function (v) {
              return labelFor(q.id, v);
            })
            .join('; ')
        : labelFor(q.id, ans);
      return (
        '<div class="sum-row"><div class="sum-q">' +
        esc(q.title) +
        '</div><div class="sum-a">' +
        esc(text) +
        '</div></div>'
      );
    }).join('');
    box.innerHTML =
      '<div class="sum-hero">' +
      '<div class="kicker">Ready to reveal</div>' +
      '<h2>' +
      esc(c.name) +
      '</h2>' +
      '<p class="q-sub">We will connect <b>your answers</b> to how this arises, why it persists, and what to change — then a practical plan.</p>' +
      '</div>' +
      '<div class="sum-card">' +
      rows +
      '</div>';
  }

  function buildInsight() {
    var c = state.condition;
    var a = state.answers || {};
    var how = [];
    var why = [];
    var change = [];
    var solve = [];

    how.push(c.ayurvedic_view || c.description || 'This concern is seen as a pattern of imbalance in Ayurveda.');
    if (a.when) how.push('You notice it most: ' + labelFor('when', a.when) + '.');
    if (a.intensity) how.push('Intensity right now: ' + labelFor('intensity', a.intensity) + '.');
    if (a.duration) how.push('It has been present: ' + labelFor('duration', a.duration) + '.');

    var trig = Array.isArray(a.triggers) ? a.triggers : [];
    if (trig.length && trig.indexOf('unknown') < 0) {
      why.push(
        'Likely feeders from your report: ' +
          trig
            .map(function (t) {
              return labelFor('triggers', t);
            })
            .join('; ') +
          '.'
      );
    } else {
      why.push('Triggers are still unclear — the plan starts with rhythm and observation.');
    }
    if (a.lifestyle) why.push('Lifestyle snapshot: ' + labelFor('lifestyle', a.lifestyle) + '.');
    if (a.sleep_q) why.push('Sleep pattern: ' + labelFor('sleep_q', a.sleep_q) + ' — poor rest often amplifies Vāta and lowers recovery.');
    if (a.digestion_q) why.push('Digestion snapshot: ' + labelFor('digestion_q', a.digestion_q) + ' — agni (digestive fire) is a root lever.');
    if (c.primary_dosha && c.primary_dosha.length) {
      why.push(
        'Classically linked dosha pattern: ' +
          c.primary_dosha
            .map(function (d) {
              return { vata: 'Vāta', pitta: 'Pitta', kapha: 'Kapha' }[d] || d;
            })
            .join(' · ') +
          '.'
      );
    }

    if (trig.indexOf('stress') >= 0 || a.lifestyle === 'rushed' || a.lifestyle === 'overwork' || a.lifestyle === 'emotional') {
      change.push('Protect a daily downshift: breath, shorter evenings, fewer late screens.');
    }
    if (trig.indexOf('sleep') >= 0 || a.sleep_q === 'light' || a.sleep_q === 'hard_start' || a.sleep_q === 'short' || a.sleep_q === 'early_wake') {
      change.push('Treat sleep as non-negotiable medicine: fixed wind-down, earlier lights-out.');
    }
    if (trig.indexOf('food') >= 0 || trig.indexOf('irregular') >= 0 || a.digestion_q === 'slow' || a.digestion_q === 'hot' || a.digestion_q === 'irregular') {
      change.push('Stabilise meals: warm, regular, lunch as main meal; reduce the foods that provoke you.');
    }
    if (trig.indexOf('sitting') >= 0 || a.lifestyle === 'sedentary') {
      change.push('Add short movement breaks — walk after meals, gentle mobility.');
    }
    if (trig.indexOf('screens') >= 0 || a.when === 'night') {
      change.push('Create a screen-free last 45 minutes; calm the senses before bed.');
    }
    if (a.goal) change.push('Your priority target: ' + labelFor('goal', a.goal) + '.');
    if (!change.length) change.push('Start with dinacharya: regular wake, meals, and sleep — the base that every remedy needs.');

    solve.push('Cited herbs/formulas address the traditional pattern behind ' + c.name + ' with transparent evidence tiers.');
    solve.push('Lifestyle and diet steps from the classics are matched to your timing and triggers.');
    if (a.goal === 'rhythm') solve.push('We emphasise simple daily slots you can keep, not a long checklist.');
    if (a.goal === 'sleep_goal') solve.push('Evening routine and calming supports are prioritised.');
    if (a.goal === 'digestion_goal') solve.push('Meal timing and agni-kindling steps come first.');
    if (a.goal === 'calm') solve.push('Nervous-system settling practices and medhya/rasāyana supports are emphasised where appropriate.');
    solve.push('You re-check with journal + check-in so the plan can evolve — educational, not a prescription.');

    return { how: how, why: why, change: change, solve: solve };
  }

  function toStepChecked(n) {
    if (n >= 3 && !state.condition) {
      toStep(1);
      announce('Please choose a problem first.', true);
      return;
    }
    toStep(n);
  }

  function pickChip(node, group) {
    /* legacy helper — deep quiz uses deepPick */
    if (!node || !node.parentNode) return;
    node.parentNode.querySelectorAll('.chip').forEach(function (c) {
      c.classList.remove('selected');
      c.setAttribute('aria-checked', 'false');
    });
    node.classList.add('selected');
    node.setAttribute('aria-checked', 'true');
    state[group] = node.dataset.v;
  }

  /* ------------------------------------------------------------------ */
  /*  Analyze + result                                                   */
  /* ------------------------------------------------------------------ */
  var AMSGS = [
    'Listening to your answers…',
    'Mapping how this shows up for you…',
    'Tracing why it may be persisting…',
    'Matching classical remedies & levers…',
    'Writing what to change — and how…'
  ];

  function analyze() {
    if (!state.condition) {
      toStep(1);
      return;
    }
    /* allow analyze if deep quiz mostly done */
    if (!state.duration && state.answers.duration) {
      state.duration = Array.isArray(state.answers.duration) ? state.answers.duration[0] : state.answers.duration;
    }
    if (!state.intensity && state.answers.intensity) {
      state.intensity = Array.isArray(state.answers.intensity) ? state.answers.intensity[0] : state.answers.intensity;
    }
    if (!state.duration || !state.intensity) {
      state.deepIndex = 0;
      toStep(3);
      announce('Please complete the personal questions first.', true);
      return;
    }
    go('analyzing');
    var i = 0;
    el('amsg').innerHTML = AMSGS[0];
    var iv = setInterval(function () {
      i++;
      if (i < AMSGS.length) {
        el('amsg').style.opacity = 0;
        setTimeout(function () {
          el('amsg').innerHTML = AMSGS[i];
          el('amsg').style.opacity = 1;
        }, 220);
      }
    }, 520);
    setTimeout(function () {
      clearInterval(iv);
      renderResult();
      go('result');
      touchActivity('checkin');
      Store.set('onboarded', true);
      try {
        Store.set('lastCheckin', {
          conditionId: state.condition.id,
          answers: state.answers,
          ts: Date.now()
        });
      } catch (e) {}
      if (window.AyusEngage && window.AyusEngage.unlock) {
        try {
          window.AyusEngage.unlock('first_checkin');
        } catch (e) {}
      }
    }, 2800);
  }

  /* ------------------------------------------------------------------ */
  /*  Reasoning                                                          */
  /* ------------------------------------------------------------------ */
  function recommendationsFor(cid) {
    var out = [];
    D.herbs.forEach(function (h) {
      (h.indications || []).forEach(function (ind) {
        if (ind.condition_id === cid) {
          out.push({ kind: 'herb', id: h.id, name: h.common_name, sanskrit: h.sanskrit_name,
            botanical: h.botanical_name, rationale: ind.rationale, tier: ind.evidence_tier,
            citations: ind.citations || [], dosage: h.typical_dosage, safety: h.safety || [], herb: h });
        }
      });
    });
    D.formulations.forEach(function (f) {
      (f.indications || []).forEach(function (ind) {
        if (ind.condition_id === cid) {
          out.push({ kind: 'formulation', id: f.id, name: f.name, sanskrit: f.sanskrit_name,
            botanical: (f.ingredients || []).slice(0, 4).join(' · '), rationale: ind.rationale, tier: ind.evidence_tier,
            citations: ind.citations || [], dosage: f.typical_dosage, safety: f.safety || [] });
        }
      });
    });
    out.sort(function (a, b) { return TIER_RANK[b.tier] - TIER_RANK[a.tier]; });
    return out;
  }

  function resolveCite(c) {
    var s = D.sources[c.source_id];
    return { title: s ? s.title : c.source_id, locator: c.locator || '', verify: !!c.requires_verification };
  }

  /* ------------------------------------------------------------------ */
  /*  Result rendering                                                   */
  /* ------------------------------------------------------------------ */
  function doshaRow(doshas) {
    if (!doshas || !doshas.length) return '';
    return h('div', { 'class': 'dosha-row' },
      doshas.map(function (d) {
        var label = { vata: 'V\u0101ta', pitta: 'Pitta', kapha: 'Kapha' }[d] || cap(d);
        return h('span', { 'class': 'dosha', 'data-d': d }, [
          h('span', { 'class': 'ddot', 'aria-hidden': 'true' }, ['']),
          h('span', { 'class': 'dosha-name' }, [label])
        ]);
      })
    );
  }

  function citeHtml(c) {
    var rc = resolveCite(c);
    return h('div', { 'class': 'cite' }, [
      svg('star', '', { 'width': '13', 'height': '13', 'style': 'flex:none;color:var(--saffron)' }),
      h('span', null, [
        esc(rc.title),
        rc.locator ? ' — ' + h('span', { 'class': 'muted' }, [esc(rc.locator)]) : '',
        rc.verify ? h('span', { 'class': 'vflag' }, ['verify']) : ''
      ])
    ]);
  }

  function solCard(r) {
    var cites = r.citations.map(citeHtml).join('');
    var safety = (r.safety || []).map(function (s) { return h('li', null, [esc(s)]); }).join('');
    var nameInner = h('span', { 'class': 'sc-name-text' }, [
      esc(r.name),
      r.sanskrit ? ' ' + h('span', { 'class': 'sc-name-sk' }, [esc(r.sanskrit)]) : ''
    ]);
    var action = r.kind === 'herb' ? 'openHerb' : 'openFormulation';
    var nameHtml = h('button', { 'class': 'sc-name sc-link', 'data-action': action, 'data-id': r.id, 'aria-label': 'More on ' + esc(r.name) }, [
      nameInner, h('span', { 'class': 'sc-arrow', 'aria-hidden': 'true' }, ['\u203A'])
    ]);

    return h('div', { 'class': 'sol-card' }, [
      h('div', { 'class': 'sc-top' }, [
        nameHtml,
        h('span', { 'class': 'kind-pill ' + r.kind }, [r.kind])
      ]),
      r.botanical ? h('div', { 'class': 'sc-bot' }, [esc(r.botanical)]) : '',
      h('span', { 'class': 'tier', 'data-t': r.tier }, [
        h('span', { 'class': 'tb' }), TIER_LABEL[r.tier]
      ]),
      h('p', { 'class': 'sc-why' }, [esc(r.rationale)]),
      h('div', { 'class': 'sc-foot' }, [
        r.dosage ? h('div', { 'class': 'sc-dose' }, [h('b', null, ['Typical use: ']), esc(r.dosage)]) : '',
        h('button', { 'class': 'disclose', 'data-action': 'toggleDisclose' }, [
          svg('star', '', { 'width': '14', 'height': '14' }), ' Safety & sources'
        ]),
        h('div', { 'class': 'disclose-body' }, [
          safety ? '<h5>Safety</h5><ul>' + safety + '</ul>' : '',
          '<h5>Sources</h5>' + (cites || h('div', { 'class': 'cite muted' }, ['\u2014']))
        ])
      ])
    ]);
  }

  function buildRoutine(c, recs) {
    var slots = {
      morning: { name: 'On rising', sk: 'Pr\u0101ta\u1e25', icon: 'sun', items: ['Begin the day with a glass of warm water.'] },
      midday: { name: 'Midday', sk: 'Madhy\u0101hna', icon: 'sun-high', items: [] },
      evening: { name: 'Evening', sk: 'S\u0101ya\u1e3c', icon: 'sunset', items: [] },
      night: { name: 'Before sleep', sk: 'R\u0101tri', icon: 'moon', items: [] }
    };
    function route(text) {
      var t = text.toLowerCase();
      if (/sleep|bed|night|wind|screen|evening|relax|abhyan|oil massage/.test(t)) return 'night';
      if (/morning|wake|rising|sunrise|exercise|walk|yoga|routine|massage|breath|pr.n.y.m|pranayama|meditat/.test(t)) return 'morning';
      if (/lunch|main meal|midday|after meal|with meal|eat|food|digest/.test(t)) return 'midday';
      return null;
    }
    (c.lifestyle || []).forEach(function (l) { var s = route(l) || 'evening'; slots[s].items.push(l); });
    (c.diet || []).forEach(function (d, i) { var s = route(d) || (i % 2 ? 'evening' : 'midday'); slots[s].items.push(d); });

    recs.slice(0, 3).forEach(function (r) {
      if (!r.dosage) return;
      var dl = r.dosage.toLowerCase(); var slot = 'morning';
      if (/milk|night|bed|sleep/.test(dl)) slot = 'night';
      else if (/before meal|after meal|with food|with meal|with meals|with warm water at night/.test(dl)) slot = 'midday';
      else if (/tea/.test(dl)) slot = 'evening';
      slots[slot].items.push('Take ' + r.name + ' \u2014 ' + r.dosage);
    });
    if (!slots.night.items.some(function (x) { return /sleep|bed/i.test(x); })) slots.night.items.push('Keep a consistent, early-ish sleep time.');

    var order = ['morning', 'midday', 'evening', 'night'];
    var html = '<div class="timeline">';
    order.forEach(function (k) {
      var s = slots[k];
      var lis = s.items.length ? s.items.map(function (it) {
        return h('li', null, [
          h('span', { 'class': 'tl-dot' }, [svg('star', '', { 'width': '14', 'height': '14' })]),
          h('span', null, [esc(it)])
        ]);
      }).join('') : '';
      html += h('div', { 'class': 'tl-row' }, [
        h('div', { 'class': 'tl-time' }, [
          svg(s.icon, 'tl-ic'),
          h('div', { 'class': 'tl-n' }, [s.name]),
          h('div', { 'class': 'tl-s' }, [s.sk])
        ]),
        h('div', { 'class': 'tl-card' + (s.items.length ? '' : ' empty') }, [
          h('ul', null, [lis || '<li>Rest and keep a calm, regular rhythm.</li>'])
        ])
      ]);
    });
    return html + '</div>';
  }

  function routineText(c, recs) {
    var lines = ['My \u0100yus routine \u2014 ' + c.name, ''];
    (c.lifestyle || []).slice(0, 4).forEach(function (l) { lines.push('\u2022 ' + l); });
    (c.diet || []).slice(0, 4).forEach(function (l) { lines.push('\u2022 ' + l); });
    if (recs.length) { lines.push(''); lines.push('Supportive herbs:'); recs.slice(0, 4).forEach(function (r) { lines.push('\u2022 ' + r.name + (r.dosage ? ' \u2014 ' + r.dosage : '')); }); }
    lines.push(''); lines.push('Educational only \u2014 not medical advice. See a professional for any red-flag symptom.');
    return lines.join('\n');
  }

  function renderResult() {
    var c = state.condition;
    var recs = recommendationsFor(c.id);
    var aka = (c.also_known_as || []).slice(0, 3).join(' \u00b7 ');
    var insight = buildInsight();
    var contextNote = '';
    if (state.duration === 'long' || state.duration === 'weeks' || state.intensity === 'strong') {
      contextNote = h('div', { 'class': 'panel context-note' }, [
        h('p', null, [
          h('b', null, [
            'Because this is ' +
              (state.intensity === 'strong' ? 'strongly affecting you' : 'lasting a while')
          ]),
          ' — please read the red flags below and consider seeing a qualified practitioner alongside any self-care.'
        ])
      ]);
    }

    var redflags = (c.red_flags || [])
      .map(function (r) {
        return h('li', null, [
          h('span', { 'class': 'rf-i' }, [svg('star', '', { width: '16', height: '16' })]),
          h('span', null, [esc(r)])
        ]);
      })
      .join('');

    var solCards = recs.length
      ? recs.map(solCard).join('')
      : '<p class="muted">No specific herbs are linked to this concern yet — focus on the lifestyle and diet routine below.</p>';

    function insightList(items) {
      return (
        '<ul class="insight-list">' +
        items
          .map(function (t) {
            return '<li>' + esc(t) + '</li>';
          })
          .join('') +
        '</ul>'
      );
    }

    var html =
      h('div', { 'class': 'result-hero' }, [
        h('div', { 'class': 'kicker' }, ["Your personal map"]),
        h('h2', null, [esc(c.name)]),
        aka ? h('div', { 'class': 'aka' }, [esc(aka)]) : '',
        doshaRow(c.primary_dosha)
      ].join('')) +

      h('div', { 'class': 'insight-grid' }, [
        h('div', { 'class': 'insight-card' }, [
          h('div', { 'class': 'insight-k' }, ['01 · How it is showing up']),
          insightList(insight.how)
        ].join('')),
        h('div', { 'class': 'insight-card' }, [
          h('div', { 'class': 'insight-k' }, ['02 · Why it may be happening']),
          insightList(insight.why)
        ].join('')),
        h('div', { 'class': 'insight-card' }, [
          h('div', { 'class': 'insight-k' }, ['03 · What you will change']),
          insightList(insight.change)
        ].join('')),
        h('div', { 'class': 'insight-card gold' }, [
          h('div', { 'class': 'insight-k' }, ['04 · How this plan helps']),
          insightList(insight.solve)
        ].join(''))
      ].join('')) +

      h('div', { 'class': 'panel' }, [
        h('div', { 'class': 'panel-label' }, [svg('lotus', '', { width: '16', height: '16' }), ' Classical Ayurvedic view']),
        h('p', { 'class': 'lead-view' }, [esc(c.ayurvedic_view || c.description)]),
        c.description && c.ayurvedic_view
          ? h('p', { 'style': 'margin-top:14px' }, [esc(c.description)])
          : ''
      ].join('')) +

      contextNote +

      (redflags
        ? h('div', { 'class': 'redflags' }, [
            h('div', { 'class': 'panel-label' }, [
              svg('star', '', { width: '16', height: '16' }),
              ' When to see a professional'
            ]),
            h('h3', null, ["Please don't self-treat if…"]),
            h('ul', null, [redflags])
          ].join(''))
        : '') +

      h('div', { 'class': 'section-head', 'style': 'margin:50px auto 24px' }, [
        h('div', { 'class': 'kicker' }, ['Supportive solutions']),
        h('h2', { 'style': 'font-size:clamp(28px,5vw,44px)' }, ['Cited herbs & formulas']),
        h('p', null, ['Strongest evidence first — each carries its reason, honesty rating, and source.'])
      ].join('')) +
      h('div', { 'class': 'chain' }, [
        '<span class="node">your story</span><span class="arrow">→</span>',
        '<span class="node">why</span><span class="arrow">→</span>',
        '<span class="node">change</span><span class="arrow">→</span>',
        '<span class="node">herb</span><span class="arrow">→</span>',
        '<span class="node">source</span>'
      ].join('')) +
      h('div', { 'class': 'sol-grid', 'style': 'margin-top:24px' }, [solCards]) +

      h('div', { 'class': 'section-head', 'style': 'margin:60px auto 24px' }, [
        h('div', { 'class': 'kicker' }, ['Live the change']),
        h('h2', { 'style': 'font-size:clamp(28px,5vw,44px)' }, ['Your dinacharya']),
        h('p', null, ["A daily rhythm woven from this concern and the levers you named."])
      ].join('')) +
      h('div', { 'class': 'panel' }, [
        buildRoutine(c, recs),
        h('div', { 'class': 'result-actions' }, [
          h('button', { 'class': 'btn btn-primary', 'data-action': 'go:home' }, ['Back to Today']),
          h('button', { 'class': 'btn btn-gold', 'data-action': 'saveRoutine' }, ['Save routine'])
        ].join('')),
        h('div', { 'class': 'share-row share-row-secondary' }, [
          h('button', { 'class': 'btn btn-ghost btn-sm', 'data-action': 'shareRoutine' }, ['Share']),
          h('button', { 'class': 'btn btn-ghost btn-sm', 'data-action': 'exportRoutine' }, ['Export']),
          h('button', { 'class': 'btn btn-ghost btn-sm', 'data-action': 'printPage' }, ['Print']),
          h('button', { 'class': 'btn btn-ghost btn-sm', 'data-action': 'startCheckin' }, ['Another concern'])
        ].join(''))
      ].join('')) +

      h('div', { 'class': 'disclaimer' }, [
        'This is educational information drawn from traditional Ayurvedic sources and, where noted, modern research. ',
        'It is ',
        h('b', null, ['not medical advice']),
        ' and does not diagnose, treat, or cure any disease. ',
        'Consult a qualified healthcare professional before acting — especially if you are pregnant, nursing, taking medication, or managing a medical condition.'
      ].join(''));

    el('resultBody').innerHTML = html;
    setTimeout(revealObserve, 50);
    routineCache = { c: c, recs: recs, answers: state.answers, insight: insight };
    announce('Results loaded for ' + c.name);
  }

  /* ------------------------------------------------------------------ */
  /*  #23  Export routine                                                 */
  /* ------------------------------------------------------------------ */
  function exportRoutine() {
    if (!routineCache) return;
    var text = routineText(routineCache.c, routineCache.recs);
    var blob = new Blob([text], { type: 'text/plain' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url; a.download = 'ayus-routine-' + routineCache.c.id + '.txt';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast('Routine downloaded as text file');
  }

  /* ------------------------------------------------------------------ */
  /*  Share / save routine                                               */
  /* ------------------------------------------------------------------ */
  function shareRoutine() {
    if (!routineCache) return;
    var text = routineText(routineCache.c, routineCache.recs);
    if (navigator.share) {
      navigator.share({ title: 'My \u0100yus routine', text: text }).catch(function () {});
      return;
    }
    function done() { toast('Routine copied to clipboard'); }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done, function () { fallbackCopy(text, done); });
    } else { fallbackCopy(text, done); }
  }
  function fallbackCopy(text, cb) {
    var ta = document.createElement('textarea'); ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = 0;
    document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); cb(); } catch (e) { toast('Press Ctrl+C to copy'); }
    document.body.removeChild(ta);
  }

  function toggleDisclose(btn) {
    var body = btn.nextElementSibling;
    if (body) {
      body.classList.toggle('open');
      btn.setAttribute('aria-expanded', body.classList.contains('open'));
    }
  }

  /* ------------------------------------------------------------------ */
  /*  Local storage + profile / streaks / habits                         */
  /* ------------------------------------------------------------------ */
  var Store = {
    get: function (k, def) { try { var v = localStorage.getItem('ayus.' + k); return v == null ? def : JSON.parse(v); } catch (e) { return def; } },
    set: function (k, v) { try { localStorage.setItem('ayus.' + k, JSON.stringify(v)); } catch (e) {} }
  };

  var GOAL_META = {
    sleep: { label: 'Better sleep', concern: 'sleep', tip: 'Wind down before 10pm and keep screens out of bed.' },
    stress: { label: 'Less stress', concern: 'stress', tip: 'A few minutes of slow breathing settles prāṇa and the mind.' },
    digestion: { label: 'Easier digestion', concern: 'agnimandya', tip: 'Make lunch your main meal — agni is strongest at midday.' },
    energy: { label: 'More energy', concern: 'fatigue', tip: 'Warm water on rising and a short morning walk kindle ojas.' },
    immunity: { label: 'Stronger immunity', concern: 'low_immunity', tip: 'Steady sleep, warm meals, and gentle movement build ojas.' },
    skin: { label: 'Clearer skin', concern: 'skin_health', tip: 'Cooling routines and lighter evening meals support clear skin.' },
    weight: { label: 'Healthy weight', concern: 'weight_management', tip: 'Regular meal times and a brisk daily walk steady Kapha.' },
    focus: { label: 'Calm focus', concern: 'memory_focus', tip: 'Short silence or meditation is a rasāyana for the mind.' }
  };

  var DEFAULT_HABITS = [
    { id: 'warm_water', label: 'Drink warm water with lemon', sk: 'Uṣṇodaka', icon: '🍋' },
    { id: 'mindful_meal', label: 'Mindful meal', sk: 'Ahāra', icon: '🥣' },
    { id: 'move', label: 'Move your body', sk: 'Vyāyāma', icon: '〰' },
    { id: 'breathe', label: 'Breath practice', sk: 'Prāṇāyāma', icon: '🌬️' },
    { id: 'early_wind', label: 'Wind down ritual', sk: 'Nidrā', icon: '🌙' }
  ];

  function getProfile() {
    return Store.get('profile', null) || {
      name: '',
      goals: [],
      createdAt: null,
      updatedAt: null
    };
  }
  function saveProfile(p) {
    p.updatedAt = Date.now();
    if (!p.createdAt) p.createdAt = Date.now();
    Store.set('profile', p);
    updateChromeIdentity();
  }
  function hasProfile() {
    var p = getProfile();
    return !!(Store.get('onboarded', false) || (p && (p.name || (p.goals && p.goals.length))));
  }
  function dayKey(d) {
    d = d || new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }
  function yesterdayKey() {
    var d = new Date(); d.setDate(d.getDate() - 1);
    return dayKey(d);
  }
  function getStreak() {
    return Store.get('streak', { count: 0, lastDay: null, best: 0 });
  }
  function touchActivity(reason) {
    var today = dayKey();
    var s = getStreak();
    if (s.lastDay === today) {
      /* already counted today — still mark visit */
      Store.set('lastVisit', Date.now());
      return s;
    }
    if (s.lastDay === yesterdayKey()) s.count = (s.count || 0) + 1;
    else s.count = 1;
    s.lastDay = today;
    if ((s.count || 0) > (s.best || 0)) s.best = s.count;
    Store.set('streak', s);
    Store.set('lastVisit', Date.now());
    return s;
  }
  function getHabitsState() {
    var today = dayKey();
    var st = Store.get('habits', { day: today, done: {} });
    if (st.day !== today) st = { day: today, done: {} };
    return st;
  }
  function toggleHabit(id) {
    var st = getHabitsState();
    st.done[id] = !st.done[id];
    Store.set('habits', st);
    touchActivity('habit');
    renderHome();
    if (st.done[id]) toast('Ritual completed — well done');
  }
  function greetingForHour() {
    var h = new Date().getHours();
    if (h < 5) return 'Still hours';
    if (h < 12) return 'Suprabhātam · Good morning';
    if (h < 17) return 'Namaste · Good afternoon';
    if (h < 21) return 'Good evening';
    return 'Śubha rātri · Rest well';
  }
  function updateChromeIdentity() {
    var p = getProfile();
    var name = (p && p.name) ? String(p.name).trim() : '';
    var avatar = el('navAvatar');
    if (avatar) avatar.textContent = name ? name.charAt(0).toUpperCase() : 'ॐ';
    var hello = el('mobileHello');
    if (hello) hello.textContent = name ? ('Hello, ' + name) : 'Your wellness space';
  }

  /* ------------------------------------------------------------------ */
  /*  Today dashboard                                                    */
  /* ------------------------------------------------------------------ */
  function renderHome() {
    var onboarded = hasProfile();
    var dash = el('todayDash');
    var engage = el('engageHome');
    var hero = el('guestHero');
    var guestTip = el('guestTipBand');
    var howBand = el('how');
    var heritageTeaser = el('homeHeritageTeaser');
    if (dash) dash.hidden = true; /* legacy shell */
    if (engage) engage.hidden = !onboarded;
    if (hero) hero.hidden = onboarded;
    if (guestTip) guestTip.hidden = onboarded;
    /* Returning users: focus on feed — hide marketing chrome */
    if (howBand) howBand.hidden = onboarded;
    if (heritageTeaser) heritageTeaser.hidden = onboarded;
    document.body.classList.toggle('is-member', !!onboarded);
    document.body.classList.toggle('engage-mode', !!onboarded);
    if (onboarded && window.AyusEngage && window.AyusEngage.render) {
      try { window.AyusEngage.render(); } catch (e) {}
    }

    renderTip();
    if (!onboarded) return;

    var p = getProfile();
    var name = (p.name || '').trim();
    var streak = getStreak();
    var kicker = el('todayKicker');
    var title = el('todayTitle');
    var sub = el('todaySub');
    if (kicker) kicker.textContent = greetingForHour();
    /* Concept: large centered "Good morning, Name" */
    if (title) {
      var greetWord = greetingForHour().indexOf('morning') >= 0 || greetingForHour().indexOf('Suprabh') >= 0
        ? 'Good morning'
        : (greetingForHour().indexOf('evening') >= 0 || greetingForHour().indexOf('rātri') >= 0
          ? 'Good evening'
          : 'Namaste');
      title.textContent = name ? (greetWord + ', ' + name) : greetWord;
    }
    if (sub) {
      var prak = Store.get('prakriti', null);
      if (prak && prak.dominant && DOSHA_INFO[prak.dominant]) {
        sub.textContent = 'Prakṛti leans ' + DOSHA_INFO[prak.dominant].name + ' · steady practices build ojas.';
      } else {
        sub.textContent = 'Your daily rhythm starts here.';
      }
    }
    var sn = el('streakNum');
    if (sn) sn.textContent = String(streak.count || 0);
    var sc = el('streakCard');
    if (sc) sc.title = 'Best streak: ' + (streak.best || 0) + ' days';

    /* habits — concept: checklist rows with trailing icons */
    var hst = getHabitsState();
    var doneN = 0;
    var list = el('habitList');
    if (list) {
      list.innerHTML = DEFAULT_HABITS.map(function (hb) {
        var on = !!hst.done[hb.id];
        if (on) doneN++;
        return h('button', {
          'class': 'habit-item' + (on ? ' done' : ''),
          'type': 'button',
          'role': 'listitem',
          'data-action': 'toggleHabit',
          'data-id': hb.id,
          'aria-pressed': String(on)
        }, [
          h('span', { 'class': 'habit-check', 'aria-hidden': 'true' }, [on ? '✓' : '']),
          h('span', { 'class': 'habit-body' }, [
            h('span', { 'class': 'habit-label' }, [esc(hb.label)])
          ]),
          h('span', { 'class': 'habit-icon', 'aria-hidden': 'true' }, [hb.icon || ''])
        ]);
      }).join('');
    }
    var hp = el('habitProgress');
    if (hp) hp.textContent = doneN + '/' + DEFAULT_HABITS.length;

    /* pulse — concept: Mood / Energy / Balance row */
    var pulse = el('pulseStats');
    if (pulse) {
      var entries = journalEntries().slice(0, 7);
      if (!entries.length) {
        pulse.innerHTML =
          h('div', { 'class': 'pulse-row pulse-empty' }, [
            h('p', { 'class': 'muted' }, ['Log how you feel in Journal to fill this pulse.']),
            h('button', { 'class': 'btn btn-ghost btn-sm', 'data-action': 'go:journal' }, ['Open journal'])
          ]);
      } else {
        var moodScore = { great: 5, good: 4, okay: 3, low: 2, bad: 1 };
        var moodLabel = { great: 'Great', good: 'Calm', okay: 'Okay', low: 'Low', bad: 'Hard' };
        var avgM = 0, avgE = 0;
        entries.forEach(function (e) { avgM += moodScore[e.mood] || 3; avgE += e.energy || 3; });
        avgM = avgM / entries.length;
        avgE = avgE / entries.length;
        var last = entries[0];
        var energyN = Math.round((avgE / 5) * 100);
        var bal = avgM >= 3.5 && avgE >= 3 ? 'Steady' : (avgM < 2.5 ? 'Rest' : 'Mixed');
        pulse.innerHTML =
          h('div', { 'class': 'pulse-row' }, [
            h('div', { 'class': 'pulse-stat' }, [
              h('div', { 'class': 'ps-l' }, ['Mood']),
              h('div', { 'class': 'ps-n' }, [esc(moodLabel[last.mood] || 'Okay')])
            ]),
            h('div', { 'class': 'pulse-stat' }, [
              h('div', { 'class': 'ps-l' }, ['Energy']),
              h('div', { 'class': 'ps-n' }, [String(energyN)])
            ]),
            h('div', { 'class': 'pulse-stat' }, [
              h('div', { 'class': 'ps-l' }, ['Balance']),
              h('div', { 'class': 'ps-n' }, [bal])
            ])
          ]);
      }
    }

    /* goals */
    var goals = (p.goals || []).filter(function (g) { return GOAL_META[g]; });
    var chips = el('focusChips');
    var actions = el('focusActions');
    var ft = el('focusTitle');
    if (ft) ft.textContent = goals.length ? 'Your focus areas' : 'Choose what to improve';
    if (chips) {
      if (goals.length) {
        chips.innerHTML = goals.map(function (g) {
          return h('span', { 'class': 'focus-chip' }, [esc(GOAL_META[g].label)]);
        }).join('');
      } else {
        chips.innerHTML = '<p class="muted">Set goals in your profile so we can personalise tips.</p>';
      }
    }
    if (actions) {
      if (goals.length) {
        var g0 = goals[0];
        var meta = GOAL_META[g0];
        actions.innerHTML =
          h('p', { 'class': 'focus-tip' }, [esc(meta.tip)]) +
          h('div', { 'class': 'focus-btns' }, [
            h('button', { 'class': 'btn btn-primary btn-sm', 'data-action': 'startCheckin' }, ['Check in on this']),
            meta.concern ? h('button', { 'class': 'btn btn-ghost btn-sm', 'data-action': 'openConcern', 'data-id': meta.concern }, ['Open related concern']) : ''
          ].join(''));
      } else {
        actions.innerHTML = h('button', { 'class': 'btn btn-ghost btn-sm', 'data-action': 'openMySpace' }, ['Set goals in profile →']);
      }
    }
    updateChromeIdentity();
    renderCoach();
    setTimeout(revealObserve, 40);
  }

  /* ------------------------------------------------------------------ */
  /*  Onboarding                                                         */
  /* ------------------------------------------------------------------ */
  var obStep = 1, obFocus, obGoalsSelected = [];
  var OB_MAX = 6;
  function showOnboarding() {
    var ob = el('onboarding'); if (!ob) return;
    obFocus = document.activeElement;
    obStep = 1;
    obGoalsSelected = (getProfile().goals || []).slice();
    var nameInput = el('obName');
    if (nameInput) nameInput.value = getProfile().name || '';
    syncObGoalsUI();
    syncObComfortUI();
    updateObStep();
    ob.classList.remove('hidden');
    setTimeout(function () { var f = ob.querySelector('button, a, input, [tabindex]'); if (f) f.focus(); }, 30);
  }
  function syncObComfortUI() {
    var c = getComfort();
    var large = el('obTextLarge');
    var calm = el('obCalm');
    var simple = el('obSimple');
    if (large) large.checked = c.textSize === 'large' || c.textSize === 'xl';
    if (calm) calm.checked = !!c.calm;
    if (simple) simple.checked = c.simple !== false;
  }
  function commitObComfort() {
    var c = getComfort();
    var large = el('obTextLarge');
    var calm = el('obCalm');
    var simple = el('obSimple');
    if (large) c.textSize = large.checked ? 'large' : 'normal';
    if (calm) c.calm = !!calm.checked;
    if (simple) c.simple = !!simple.checked;
    saveComfort(c);
  }
  function syncObGoalsUI() {
    document.querySelectorAll('#obGoals .goal-chip').forEach(function (b) {
      var on = obGoalsSelected.indexOf(b.dataset.goal) >= 0;
      b.classList.toggle('selected', on);
      b.setAttribute('aria-pressed', String(on));
    });
  }
  function toggleObGoal(goal) {
    if (!goal) return;
    var i = obGoalsSelected.indexOf(goal);
    if (i >= 0) obGoalsSelected.splice(i, 1);
    else {
      if (obGoalsSelected.length >= 3) { toast('Pick up to three goals'); return; }
      obGoalsSelected.push(goal);
    }
    syncObGoalsUI();
  }
  function nextOnboarding() {
    if (obStep === 2) {
      var n = el('obName');
      if (n && n.value.trim()) {
        var p = getProfile();
        p.name = n.value.trim().slice(0, 40);
        saveProfile(p);
      }
    }
    if (obStep === 3) {
      var p2 = getProfile();
      p2.goals = obGoalsSelected.slice(0, 3);
      saveProfile(p2);
    }
    if (obStep === 5) {
      commitObComfort();
    }
    if (obStep < OB_MAX) { obStep++; updateObStep(); }
  }
  function updateObStep() {
    document.querySelectorAll('#obSteps .ob-step').forEach(function (s) { s.classList.toggle('active', +s.dataset.ob === obStep); });
    document.querySelectorAll('#obDots .ob-dot').forEach(function (d) { d.classList.toggle('on', +d.dataset.ob === obStep); });
    if (obStep === 2) {
      var n = el('obName'); if (n) setTimeout(function () { n.focus(); }, 80);
    }
  }
  function commitOnboarding() {
    var n = el('obName');
    var p = getProfile();
    if (n && n.value.trim()) p.name = n.value.trim().slice(0, 40);
    if (obGoalsSelected.length) p.goals = obGoalsSelected.slice(0, 3);
    saveProfile(p);
    commitObComfort();
    Store.set('onboarded', true);
    touchActivity('onboard');
  }
  function finishOnboarding(node) {
    commitOnboarding();
    el('onboarding').classList.add('hidden');
    if (obFocus && obFocus.focus) try { obFocus.focus(); } catch (e) {}
    renderHome();
    var next = node && node.dataset ? node.dataset.next : 'home';
    if (next === 'checkin') startCheckin();
    else if (next === 'quiz') openQuiz();
    else go('home');
    toast(getProfile().name ? ('Welcome, ' + getProfile().name) : 'Welcome to Āyus');
  }
  function closeOnboarding() {
    commitOnboarding();
    el('onboarding').classList.add('hidden');
    renderHome();
  }

  /* ------------------------------------------------------------------ */
  /*  Prakriti (constitution) quiz                                       */
  /* ------------------------------------------------------------------ */
  var QUIZ = [
    { q: 'Your natural body frame is\u2026', a: [
      { t: 'Slim and light \u2014 I find it hard to gain weight', d: 'vata' },
      { t: 'Medium and athletic \u2014 well proportioned', d: 'pitta' },
      { t: 'Solid and sturdy \u2014 I gain weight easily', d: 'kapha' }] },
    { q: 'Your skin and hair tend to be\u2026', a: [
      { t: 'Dry, thin, rough; hair dry or frizzy', d: 'vata' },
      { t: 'Warm, sensitive, prone to redness; fine hair', d: 'pitta' },
      { t: 'Soft, cool, oily; thick, lustrous hair', d: 'kapha' }] },
    { q: 'Your appetite and digestion are\u2026', a: [
      { t: 'Irregular \u2014 variable, sometimes forget to eat', d: 'vata' },
      { t: 'Strong and sharp \u2014 I get "hangry" if I skip a meal', d: 'pitta' },
      { t: 'Steady but slow \u2014 I can easily skip a meal', d: 'kapha' }] },
    { q: 'Your sleep is usually\u2026', a: [
      { t: 'Light and easily disturbed', d: 'vata' },
      { t: 'Moderate \u2014 but I wake if too hot or stressed', d: 'pitta' },
      { t: 'Deep and long \u2014 I love my sleep', d: 'kapha' }] },
    { q: 'Under stress, you most often feel\u2026', a: [
      { t: 'Anxious, worried, scattered', d: 'vata' },
      { t: 'Irritable, intense, critical', d: 'pitta' },
      { t: 'Withdrawn, heavy, want to avoid it', d: 'kapha' }] },
    { q: 'Your energy and pace are\u2026', a: [
      { t: 'Quick bursts \u2014 then I tire and need rest', d: 'vata' },
      { t: 'Focused and driven \u2014 strong stamina with purpose', d: 'pitta' },
      { t: 'Slow to start but steady and enduring', d: 'kapha' }] },
    { q: 'The weather you find hardest is\u2026', a: [
      { t: 'Cold, dry and windy', d: 'vata' },
      { t: 'Hot and humid', d: 'pitta' },
      { t: 'Cold and damp', d: 'kapha' }] }
  ];
  var DOSHA_INFO = {
    vata: { name: 'V\u0101ta', element: 'Air & Ether \u2014 the principle of movement',
      traits: 'Creative, quick, lively and adaptable when balanced. When aggravated, V\u0101ta brings dryness, restlessness, anxiety and irregularity.',
      balance: ['Favour warm, cooked, moist, grounding meals \u2014 and eat at regular times.',
        'Keep a steady daily routine; protect rest and good sleep.',
        'A daily warm-oil self-massage (abhya\u1e3cga) is deeply calming for V\u0101ta.',
        'Stay warm; avoid cold, wind, over-stimulation and skipping meals.'] },
    pitta: { name: 'Pitta', element: 'Fire & Water \u2014 the principle of transformation',
      traits: 'Sharp, focused, courageous and warm when balanced. When aggravated, Pitta brings heat, irritability, inflammation and a critical edge.',
      balance: ['Favour cooling, fresh foods; go easy on spicy, sour, fried, salty and alcohol.',
        'Never skip meals \u2014 Pitta needs steady fuel to stay even.',
        'Avoid the midday heat and overworking; build in time to cool down.',
        'Channel intensity into calm, non-competitive movement and nature.'] },
    kapha: { name: 'Kapha', element: 'Earth & Water \u2014 the principle of structure',
      traits: 'Calm, steady, strong and nurturing when balanced. When aggravated, Kapha brings heaviness, sluggishness, congestion and attachment.',
      balance: ['Favour light, warm, well-spiced food; go easy on dairy, sweets and heavy meals.',
        'Move vigorously every day; rise early and avoid daytime naps.',
        'Seek variety, stimulation and new experiences to stay motivated.',
        'Use warming, drying spices \u2014 ginger, black pepper, turmeric.'] }
  };
  var quizState = { i: 0, answers: [] };

  function openQuiz() { go('quiz'); el('quizIntro').classList.remove('hidden'); el('quizFlow').classList.add('hidden'); el('quizResult').classList.add('hidden'); }
  function beginQuiz() {
    quizState = { i: 0, answers: [] };
    el('quizIntro').classList.add('hidden'); el('quizResult').classList.add('hidden'); el('quizFlow').classList.remove('hidden');
    renderQ(0);
  }
  function quizProgress(i) {
    var html = ''; for (var k = 0; k < QUIZ.length; k++) html += '<span class="dot' + (k <= i ? ' on' : '') + '"></span>';
    var p = el('quizProgress'); p.innerHTML = html;
    p.setAttribute('aria-valuenow', i + 1);
    p.setAttribute('aria-valuemax', QUIZ.length);
  }
  function renderQ(i) {
    quizState.i = i;
    var q = QUIZ[i];
    var opts = q.a.map(function (o, idx) {
      return h('button', { 'class': 'quiz-opt', 'data-action': 'quizAnswer', 'data-i': i, 'data-d': o.d, 'role': 'option', 'aria-selected': 'false' }, [
        h('span', { 'class': 'qo-mark' }), h('span', null, [esc(o.t)])
      ]);
    }).join('');
    el('quizQ').innerHTML = h('div', { 'class': 'quiz-q-card' }, [
      h('div', { 'class': 'quiz-q-title' }, [esc(q.q)]),
      h('div', { 'class': 'quiz-options', 'role': 'listbox', 'aria-label': 'Answer options' }, [opts]),
      i > 0 ? h('button', { 'class': 'quiz-back', 'data-action': 'quizBack' }, ['\u2190 previous']) : ''
    ].join(''));
    quizProgress(i);
    announce('Question ' + (i + 1) + ' of ' + QUIZ.length + ': ' + q.q);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  function quizAnswer(i, d) {
    quizState.answers[i] = d;
    document.querySelectorAll('#quizQ .quiz-opt').forEach(function (o) { o.classList.remove('selected'); o.setAttribute('aria-selected', 'false'); });
    var opts = document.querySelectorAll('#quizQ .quiz-opt');
    for (var qi = 0; qi < opts.length; qi++) {
      if (opts[qi].dataset.d === d && +opts[qi].dataset.i === i) { opts[qi].classList.add('selected'); opts[qi].setAttribute('aria-selected', 'true'); break; }
    }
    announce('Answer recorded');
    setTimeout(function () {
      if (i + 1 < QUIZ.length) renderQ(i + 1); else showQuizResult();
    }, 280);
  }
  function quizBack() { if (quizState.i > 0) renderQ(quizState.i - 1); }

  function showQuizResult() {
    var sc = { vata: 0, pitta: 0, kapha: 0 };
    quizState.answers.forEach(function (d) { sc[d]++; });
    var total = QUIZ.length;
    var arr = [['vata', sc.vata], ['pitta', sc.pitta], ['kapha', sc.kapha]].sort(function (a, b) { return b[1] - a[1]; });
    var dominant = arr[0][0];
    var dual = arr[1][1] === arr[0][1];
    var info = DOSHA_INFO[dominant];
    var typeName = dual ? (DOSHA_INFO[arr[0][0]].name + '\u2013' + DOSHA_INFO[arr[1][0]].name) : info.name;

    var bars = arr.map(function (x) {
      var pct = Math.round(x[1] / total * 100);
      return h('div', { 'class': 'qr-bar-row' }, [
        h('span', { 'class': 'qr-name' }, [DOSHA_INFO[x[0]].name]),
        h('div', { 'class': 'qr-track' }, [h('div', { 'class': 'qr-fill', 'data-d': x[0], 'data-pct': pct })]),
        h('span', { 'class': 'qr-pct' }, [pct + '%'])
      ].join(''));
    }).join('');
    var tips = info.balance.map(function (t) {
      return h('li', null, [
        h('span', { 'class': 'tl-dot' }, [svg('star', '', { 'width': '14', 'height': '14' })]),
        h('span', null, [esc(t)])
      ]);
    }).join('');

    el('quizResult').innerHTML =
      h('div', { 'class': 'qr-head' }, [
        h('div', { 'class': 'kicker' }, ['Your nature leans']),
        h('h2', null, [typeName]),
        h('div', { 'class': 'qr-el' }, [esc(info.element)])
      ].join('')) +
      h('div', { 'class': 'qr-bars' }, [bars]) +
      h('div', { 'class': 'qr-saved' }, [
        svg('star', '', { 'width': '13', 'height': '13', 'style': 'vertical-align:-2px' }),
        ' Saved to this device \u2014 your balance is shown across the app'
      ]) +
      h('div', { 'class': 'panel', 'style': 'max-width:680px;margin:30px auto' }, [
        h('div', { 'class': 'panel-label' }, [svg('lotus', '', { 'width': '16', 'height': '16' }), ' About ' + info.name]),
        h('p', { 'class': 'lead-view' }, [esc(info.traits)])
      ].join('')) +
      h('div', { 'class': 'panel', 'style': 'max-width:680px;margin:30px auto' }, [
        h('div', { 'class': 'panel-label' }, [svg('leaf', '', { 'width': '16', 'height': '16' }), ' To stay in balance']),
        h('div', { 'class': 'tl-card', 'style': 'border:none;padding:0' }, [h('ul', null, [tips])])
      ].join('')) +
      h('div', { 'class': 'share-row quiz-result-actions' }, [
        h('button', { 'class': 'btn btn-primary btn-sm', 'data-action': 'go:home' }, ['Go to Today']),
        h('button', { 'class': 'btn btn-gold btn-sm', 'data-action': 'startCheckin' }, ['Check a concern \u2192']),
        h('button', { 'class': 'btn btn-ghost btn-sm', 'data-action': 'beginQuiz' }, ['Retake quiz'])
      ].join(''));

    Store.set('prakriti', { scores: sc, dominant: dominant, dual: dual, ts: Date.now() });
    Store.set('onboarded', true);
    touchActivity('quiz');
    el('quizFlow').classList.add('hidden'); el('quizResult').classList.remove('hidden');
    announce('Your constitution is ' + typeName);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setTimeout(function () { document.querySelectorAll('#quizResult .qr-fill').forEach(function (f) { f.style.width = f.dataset.pct + '%'; }); }, 120);
  }

  /* ------------------------------------------------------------------ */
  /*  My space                                                           */
  /* ------------------------------------------------------------------ */
  function favs() { return Store.get('favs', []); }
  function isFav(id) { return favs().indexOf(id) >= 0; }
  function toggleFavUI(id, btn) {
    var f = favs(); var i = f.indexOf(id);
    if (i >= 0) {
      var herb = D.herbs.find(function (x) { return x.id === id; });
      var name = herb ? herb.common_name : id;
      f.splice(i, 1);
      Store.set('favs', f);
      btn.classList.remove('on'); btn.setAttribute('aria-pressed', 'false');
      toastUndo('Removed ' + name + ' from favourites', function () {
        var ff = favs(); if (ff.indexOf(id) < 0) ff.push(id); Store.set('favs', ff);
        if (btn) { btn.classList.add('on'); btn.setAttribute('aria-pressed', 'true'); }
      });
    } else {
      f.push(id);
      Store.set('favs', f);
      btn.classList.add('on'); btn.setAttribute('aria-pressed', 'true');
      toast('Added to favourites');
    }
  }
  function pushRecent(id) {
    var r = Store.get('recent', []).filter(function (x) { return x !== id; });
    r.unshift(id); if (r.length > 10) r = r.slice(0, 10); Store.set('recent', r);
  }
  function saveRoutine() {
    if (!routineCache) return;
    var rs = Store.get('routines', []);
    if (rs.some(function (x) { return x.cid === routineCache.c.id; })) { toast('Already saved in My space'); return; }
    rs.unshift({ cid: routineCache.c.id, name: routineCache.c.name, ts: Date.now(), herbs: routineCache.recs.slice(0, 5).map(function (r) { return r.name; }) });
    if (rs.length > 20) rs = rs.slice(0, 20); Store.set('routines', rs);
    toast('Routine saved to My space');
  }
  function removeRoutine(idx) {
    var rs = Store.get('routines', []);
    var removed = rs[idx];
    rs.splice(idx, 1); Store.set('routines', rs);
    toastUndo('Removed routine', function () {
      var rrs = Store.get('routines', []);
      if (removed) rrs.splice(idx, 0, removed);
      Store.set('routines', rrs);
      renderMySpace();
    });
    renderMySpace();
  }
  function removeFav(id) {
    var f = favs().filter(function (x) { return x !== id; });
    Store.set('favs', f);
    toastUndo('Removed from favourites', function () {
      var ff = favs(); if (ff.indexOf(id) < 0) ff.push(id); Store.set('favs', ff);
      renderMySpace();
    });
    renderMySpace();
  }

  function openConcern(cid) {
    var c = CMAP[cid] || D.conditions.find(function (x) { return x.id === cid; });
    if (!c) { toast('That concern is not in the library yet'); return; }
    state.condition = c; state.duration = 'weeks'; state.intensity = 'mild';
    renderResult(); go('result');
    touchActivity('concern');
  }

  function chipFor(id, withRemove) {
    var herb = D.herbs.find(function (x) { return x.id === id; }); if (!herb) return '';
    return h('span', { 'class': 'fav-chip' }, [
      h('button', { 'data-action': 'openHerb', 'data-id': id }, [esc(herb.common_name)]),
      withRemove ? ' ' + h('button', { 'class': 'x', 'data-action': 'removeFav', 'data-id': id, 'aria-label': 'Remove' }, ['\u00d7']) : ''
    ].join(''));
  }

  function renderMySpace() {
    var prak = Store.get('prakriti', null);
    var profile = getProfile();
    var f = favs();
    var rs = Store.get('routines', []);
    var rec = Store.get('recent', []);
    var streak = getStreak();
    var journalN = journalEntries().length;
    var html = '';
    var name = (profile.name || '').trim();
    var goals = profile.goals || [];

    /* Identity + edit */
    html += h('div', { 'class': 'ms-section profile-hero-card' }, [
      h('div', { 'class': 'ph-row' }, [
        h('div', { 'class': 'ph-avatar' }, [esc(name ? name.charAt(0).toUpperCase() : 'ॐ')]),
        h('div', { 'class': 'ph-meta' }, [
          h('div', { 'class': 'ph-name' }, [esc(name || 'Your wellness profile')]),
          h('div', { 'class': 'ph-sub' }, ['Private on this device · educational companion'])
        ].join(''))
      ].join('')),
      h('div', { 'class': 'ph-stats' }, [
        h('div', { 'class': 'ph-stat' }, [h('div', { 'class': 'ph-n' }, [String(streak.count || 0)]), h('div', { 'class': 'ph-l' }, ['Day streak'])]),
        h('div', { 'class': 'ph-stat' }, [h('div', { 'class': 'ph-n' }, [String(streak.best || 0)]), h('div', { 'class': 'ph-l' }, ['Best streak'])]),
        h('div', { 'class': 'ph-stat' }, [h('div', { 'class': 'ph-n' }, [String(rs.length)]), h('div', { 'class': 'ph-l' }, ['Routines'])]),
        h('div', { 'class': 'ph-stat' }, [h('div', { 'class': 'ph-n' }, [String(journalN)]), h('div', { 'class': 'ph-l' }, ['Journal'])])
      ].join(''))
    ].join(''));

    html += h('div', { 'class': 'ms-section' }, [
      h('h3', null, [svg('leaf'), ' Profile basics'])
    ].join(''));
    html += h('div', { 'class': 'profile-edit' }, [
      h('label', { 'class': 'pe-field' }, [
        h('span', null, ['Name']),
        h('input', { 'id': 'profileName', 'type': 'text', 'maxlength': '40', 'value': name, 'placeholder': 'Your first name', 'autocomplete': 'given-name' })
      ]),
      h('div', { 'class': 'pe-field' }, [
        h('span', null, ['Focus goals (up to 3)']),
        h('div', { 'class': 'ob-goals profile-goals', 'id': 'profileGoals' }, [
          Object.keys(GOAL_META).map(function (g) {
            var on = goals.indexOf(g) >= 0;
            return h('button', {
              'type': 'button',
              'class': 'goal-chip' + (on ? ' selected' : ''),
              'data-action': 'toggleProfileGoal',
              'data-goal': g,
              'aria-pressed': String(on)
            }, [esc(GOAL_META[g].label)]);
          }).join('')
        ].join(''))
      ].join('')),
      h('button', { 'class': 'btn btn-primary btn-sm', 'data-action': 'saveProfile' }, ['Save profile'])
    ].join(''));
    html += '</div>';

    html += h('div', { 'class': 'ms-section' }, [
      h('h3', null, [svg('lotus'), ' Your constitution (prakṛti)'])
    ].join(''));
    if (prak) {
      var segs = ['vata', 'pitta', 'kapha'].map(function (d) {
        var pct = Math.round(prak.scores[d] / 7 * 100);
        var col = { vata: 'var(--sky)', pitta: 'var(--terracotta)', kapha: 'var(--green-2)' }[d];
        return pct ? h('div', { 'class': 'mp-seg', 'style': 'width:' + pct + '%;background:' + col, 'title': d + ' ' + pct + '%' }) : '';
      }).join('');
      html += h('div', { 'class': 'ms-prakriti' }, [
        h('div', null, [
          h('div', { 'class': 'mp-name' }, [DOSHA_INFO[prak.dominant].name + (prak.dual ? ' (dual)' : '')]),
          h('div', { 'class': 'rc-date' }, [esc(DOSHA_INFO[prak.dominant].element)])
        ].join('')),
        h('div', { 'class': 'mp-bars' }, [segs]),
        h('button', { 'class': 'btn btn-ghost btn-sm', 'data-action': 'openQuiz' }, ['Retake'])
      ].join(''));
    } else {
      html += '<p class="ms-empty">You haven\'t taken the quiz yet. <button class="disclose" data-action="openQuiz">Discover your nature \u2192</button></p>';
    }
    html += '</div>';

    html += h('div', { 'class': 'ms-section' }, [h('h3', null, [svg('star'), ' Saved routines'])].join(''));
    if (rs.length) {
      html += rs.map(function (r, i) {
        return h('div', { 'class': 'routine-card' }, [
          h('div', { 'class': 'rc-h' }, [
            h('span', { 'class': 'rc-name', 'data-action': 'openConcern', 'data-id': r.cid }, [esc(r.name)]),
            h('button', { 'class': 'icon-btn', 'data-action': 'removeRoutine', 'data-idx': i, 'aria-label': 'Remove routine', 'style': 'font-size:20px' }, ['\u00d7'])
          ].join('')),
          r.herbs && r.herbs.length ? h('ul', null, [h('li', null, [r.herbs.map(esc).join(' \u00b7 ')])]) : ''
        ].join(''));
      }).join('');
    } else { html += '<p class="ms-empty">No saved routines yet \u2014 finish a check-in and tap "Save to My space".</p>'; }
    html += '</div>';

    html += h('div', { 'class': 'ms-section' }, [h('h3', null, [svg('heart'), ' Favourite herbs'])].join(''));
    html += f.length ? '<div class="fav-chips">' + f.map(function (id) { return chipFor(id, true); }).join('') + '</div>'
      : '<p class="ms-empty">No favourites yet \u2014 open any herb and tap the bookmark.</p>';
    html += '</div>';

    html += h('div', { 'class': 'ms-section' }, [h('h3', null, [svg('eye'), ' Recently viewed'])].join(''));
    html += rec.length ? '<div class="fav-chips">' + rec.map(function (id) { return chipFor(id, false); }).join('') + '</div>'
      : '<p class="ms-empty">Herbs you open will appear here.</p>';
    html += '</div>';

    /* Comfort — dual-audience usability */
    var comfort = getComfort();
    html += h('div', { 'class': 'ms-section' }, [
      h('h3', null, ['Tools in this app']),
      h('p', { 'class': 'muted' }, ['Everything lives here — no second app needed.']),
      h('div', { 'class': 'focus-btns', style: 'margin-top:10px' }, [
        h('button', { type: 'button', 'class': 'btn btn-primary btn-sm', 'data-action': 'toolsOpen', 'data-tab': 'calc' }, ['Calculators']),
        h('button', { type: 'button', 'class': 'btn btn-ghost btn-sm', 'data-action': 'toolsOpen', 'data-tab': 'progress' }, ['Progress']),
        h('button', { type: 'button', 'class': 'btn btn-ghost btn-sm', 'data-action': 'toolsOpen', 'data-tab': 'kitchen' }, ['Kitchen'])
      ].join(''))
    ].join(''));

    html += h('div', { 'class': 'ms-section comfort-section' }, [
      h('h3', null, ['Comfort & ease']),
      h('p', { 'class': 'muted comfort-lead' }, [
        'Made for every age — teens who want it fast, and adults who want it clear. Change anytime.'
      ])
    ].join(''));
    html += h('div', { 'class': 'comfort-panel' }, [
      h('div', { 'class': 'comfort-row' }, [
        h('div', { 'class': 'comfort-copy' }, [
          h('strong', null, ['Text size']),
          h('span', null, [comfort.textSize === 'xl' ? 'Extra large' : (comfort.textSize === 'large' ? 'Large' : 'Standard')])
        ].join('')),
        h('button', { 'type': 'button', 'class': 'btn btn-ghost btn-sm', 'data-action': 'cycleTextSize' }, ['Change size'])
      ].join('')),
      h('label', { 'class': 'comfort-toggle' }, [
        h('input', {
          'type': 'checkbox',
          'data-action': 'toggleComfort',
          'data-key': 'calm',
          'checked': comfort.calm ? 'checked' : null
        }),
        h('span', null, [
          h('strong', null, ['Calm mode']),
          h('em', null, ['Fewer animations · quieter home feed'])
        ].join(''))
      ].join('')),
      h('label', { 'class': 'comfort-toggle' }, [
        h('input', {
          'type': 'checkbox',
          'data-action': 'toggleComfort',
          'data-key': 'simple',
          'checked': comfort.simple !== false ? 'checked' : null
        }),
        h('span', null, [
          h('strong', null, ['Plain language']),
          h('em', null, ['Clear words first · less jargon by default'])
        ].join(''))
      ].join('')),
      h('label', { 'class': 'comfort-toggle' }, [
        h('input', {
          'type': 'checkbox',
          'data-action': 'toggleComfort',
          'data-key': 'contrast',
          'checked': comfort.contrast ? 'checked' : null
        }),
        h('span', null, [
          h('strong', null, ['Higher contrast']),
          h('em', null, ['Stronger text and borders for easier reading'])
        ].join(''))
      ].join('')),
      h('button', { 'type': 'button', 'class': 'btn btn-ghost btn-sm', 'data-action': 'openHelp' }, ['Open how-to guide'])
    ].join(''));

    html += h('div', { 'class': 'ms-section ms-privacy' }, [
      h('h3', null, ['Privacy']),
      h('p', { 'class': 'muted' }, ['Everything on this page stays in your browser only. Āyus does not send your profile, journal, or routines to any server.']),
      h('button', { 'class': 'btn btn-ghost btn-sm', 'data-action': 'go:journal' }, ['Open health journal →'])
    ].join(''));

    el('mySpaceBody').innerHTML = html;
    updateChromeIdentity();
  }
  function openMySpace() { go('myspace'); }

  function toggleProfileGoal(goal) {
    if (!goal || !GOAL_META[goal]) return;
    var p = getProfile();
    p.goals = p.goals || [];
    var i = p.goals.indexOf(goal);
    if (i >= 0) p.goals.splice(i, 1);
    else {
      if (p.goals.length >= 3) { toast('Pick up to three goals'); return; }
      p.goals.push(goal);
    }
    /* optimistic UI without full save yet — re-render chips only */
    document.querySelectorAll('#profileGoals .goal-chip').forEach(function (b) {
      var on = p.goals.indexOf(b.dataset.goal) >= 0;
      b.classList.toggle('selected', on);
      b.setAttribute('aria-pressed', String(on));
    });
    /* keep in memory via temp — store on save; also stash for save */
    window._ayusProfileDraftGoals = p.goals.slice();
  }
  function saveProfileFromForm() {
    var p = getProfile();
    var nameEl = el('profileName');
    if (nameEl) p.name = String(nameEl.value || '').trim().slice(0, 40);
    if (window._ayusProfileDraftGoals) p.goals = window._ayusProfileDraftGoals.slice(0, 3);
    else {
      /* read selected chips */
      var g = [];
      document.querySelectorAll('#profileGoals .goal-chip.selected').forEach(function (b) { g.push(b.dataset.goal); });
      p.goals = g.slice(0, 3);
    }
    saveProfile(p);
    Store.set('onboarded', true);
    window._ayusProfileDraftGoals = null;
    toast('Profile saved');
    renderMySpace();
    renderHome();
  }

  /* ------------------------------------------------------------------ */
  /*  Herb library                                                       */
  /* ------------------------------------------------------------------ */
  var CMAP = {};
  var libState = { q: '', tier: 'all', type: 'herb' };

  function herbTiers(h) { return (h.indications || []).map(function (i) { return i.evidence_tier; }); }
  function herbBestTier(h) { var t = herbTiers(h); t.sort(function (a, b) { return TIER_RANK[b] - TIER_RANK[a]; }); return t[0] || 'classical'; }

  function indHtml(inds) {
    return (inds || []).slice().sort(function (a, b) { return TIER_RANK[b.evidence_tier] - TIER_RANK[a.evidence_tier]; }).map(function (ind) {
      var c = CMAP[ind.condition_id];
      var cites = (ind.citations || []).map(citeHtml).join('');
      return h('div', { 'class': 'ind-item' }, [
        h('div', { 'class': 'ind-head' }, [
          h('span', { 'class': 'ind-cond' }, [esc(c ? c.name : ind.condition_id)]),
          h('span', { 'class': 'tier', 'data-t': ind.evidence_tier }, [
            h('span', { 'class': 'tb' }), TIER_LABEL[ind.evidence_tier]
          ])
        ].join('')),
        h('p', null, [esc(ind.rationale)]),
        h('div', { 'class': 'ind-cites' }, [cites])
      ].join(''));
    }).join('');
  }
  function safetyHtml(s) { return (s || []).map(function (x) { return h('li', null, [esc(x)]); }).join(''); }

  function libCard(item) {
    var tags = (item.indications || []).slice(0, 3).map(function (i) {
      var c = CMAP[i.condition_id]; return h('span', { 'class': 'lc-tag' }, [esc(c ? c.name : i.condition_id)]);
    }).join('');
    var bt = herbBestTier(item);
    return h('button', { 'class': 'lib-card', 'data-action': 'openHerb', 'data-id': item.id, 'aria-label': esc(item.common_name) + ' details' }, [
      h('div', { 'class': 'lc-name' }, [esc(item.common_name)]),
      item.sanskrit_name ? h('div', { 'class': 'lc-sk' }, [esc(item.sanskrit_name)]) : '',
      item.botanical_name ? h('div', { 'class': 'lc-bot' }, [esc(item.botanical_name)]) : '',
      h('div', { 'class': 'lc-tags' }, [tags]),
      h('span', { 'class': 'tier', 'data-t': bt }, [h('span', { 'class': 'tb' }), TIER_LABEL[bt]])
    ].join(''));
  }

  function formLibCard(f) {
    var tags = (f.indications || []).slice(0, 3).map(function (i) { var c = CMAP[i.condition_id]; return h('span', { 'class': 'lc-tag' }, [esc(c ? c.name : i.condition_id)]); }).join('');
    var bt = herbBestTier(f);
    var ingr = (f.ingredients || []).slice(0, 3).map(function (x) { var hh = D.herbs.find(function (z) { return z.id === x; }); return hh ? hh.common_name : x; }).join(' \u00b7 ');
    return h('button', { 'class': 'lib-card', 'data-action': 'openFormulation', 'data-id': f.id, 'aria-label': esc(f.name) + ' details' }, [
      h('div', { 'class': 'lc-name' }, [esc(f.name)]),
      f.sanskrit_name ? h('div', { 'class': 'lc-sk' }, [esc(f.sanskrit_name)]) : '',
      f.type ? h('div', { 'class': 'lc-bot' }, [esc(f.type)]) : '',
      ingr ? h('div', { 'class': 'lc-bot', 'style': 'font-style:normal;margin-top:2px' }, [esc(ingr) + (f.ingredients.length > 3 ? ' \u2026' : '')]) : '',
      h('div', { 'class': 'lc-tags' }, [tags]),
      h('span', { 'class': 'tier', 'data-t': bt }, [h('span', { 'class': 'tb' }), TIER_LABEL[bt]])
    ].join(''));
  }

  function renderLibrary() {
    var q = libState.q.trim();
    var isForm = libState.type === 'formulation';
    var source = isForm ? D.formulations : D.herbs;
    var list;
    if (q) {
      list = searchHerbs(q);
      if (libState.tier !== 'all') {
        list = list.filter(function (it) { return herbTiers(it).indexOf(libState.tier) >= 0; });
      }
    } else {
      list = source.filter(function (it) {
        if (libState.tier !== 'all' && herbTiers(it).indexOf(libState.tier) < 0) return false;
        return true;
      });
      list.sort(function (a, b) { return (a.common_name || a.name).localeCompare(b.common_name || b.name); });
    }
    el('libCount').textContent = list.length + ' of ' + source.length + ' ' + (isForm ? 'formulas' : 'herbs');
    el('libGrid').innerHTML = list.length ? list.map(isForm ? formLibCard : libCard).join('') :
      '<p class="muted text-center" style="grid-column:1/-1">No ' + (isForm ? 'formula' : 'herb') + ' matches \u2014 try another word or tier.</p>';
  }

  function openFormulation(id) {
    var f = D.formulations.find(function (x) { return x.id === id; });
    if (!f) return;
    var ingr = (f.ingredients || []).map(function (x) {
      var hh = D.herbs.find(function (z) { return z.id === x; });
      return hh
        ? h('button', { 'class': 'fav-chip', 'style': 'border:1px solid var(--line);cursor:pointer', 'data-action': 'openHerb', 'data-id': hh.id }, [esc(hh.common_name) + ' \u203a'])
        : h('span', { 'class': 'fav-chip' }, [esc(x)]);
    }).join('');
    var inds = indHtml(f.indications);
    var safety = safetyHtml(f.safety);
    var html = h('div', { 'class': 'modal-head' }, [
      h('button', { 'class': 'modal-close', 'data-action': 'closeModal', 'aria-label': 'Close' }, ['\u00d7']),
      h('div', { 'class': 'mh-name', 'id': 'modalTitle' }, [esc(f.name)]),
      f.sanskrit_name ? h('span', { 'class': 'mh-sk' }, [esc(f.sanskrit_name)]) : '',
      f.type ? h('div', { 'class': 'mh-bot' }, [esc(f.type)]) : ''
    ].join('')) +
    h('div', { 'class': 'modal-body' }, [
      f.description ? h('p', { 'class': 'lead-view' }, [esc(f.description)]) : '',
      h('div', { 'class': 'modal-section-title' }, ['Ingredients']),
      h('div', { 'class': 'fav-chips' }, [ingr || h('span', { 'class': 'muted' }, ['\u2014'])]),
      h('div', { 'class': 'modal-section-title' }, ['Traditionally used for']),
      inds || '<p class="muted">\u2014</p>',
      f.typical_dosage ? h('div', { 'class': 'prop', 'style': 'margin-top:18px' }, [h('div', { 'class': 'pk' }, ['Typical use']), h('div', { 'class': 'pv' }, [esc(f.typical_dosage)])]) : '',
      safety ? '<div class="modal-section-title">Safety &amp; cautions</div><ul class="safety-list">' + safety + '</ul>' : '',
      h('div', { 'class': 'modal-cta' }, [h('button', { 'class': 'btn btn-ghost btn-sm', 'data-action': 'closeModal' }, ['Close'])])
    ].join(''));
    openModal(html);
  }

  function doshaMini(eff) {
    if (!eff) return h('span', { 'class': 'muted' }, ['\u2014']);
    var sym = { decrease: '\u2193', increase: '\u2191', neutral: '\u00b7' };
    return h('div', { 'class': 'dosha-mini' }, ['vata', 'pitta', 'kapha'].map(function (d) {
      if (!eff[d]) return '';
      var v = eff[d].toLowerCase();
      var cls = v.indexOf('decrease') >= 0 ? 'dm-dec' : (v.indexOf('increase') >= 0 ? 'dm-inc' : 'dm-neu');
      var s = v.indexOf('decrease') >= 0 ? sym.decrease : (v.indexOf('increase') >= 0 ? sym.increase : sym.neutral);
      return h('span', { 'class': cls }, [cap(d) + ' ' + s]);
    }).join(''));
  }

  function prop(k, v) {
    if (!v || (Array.isArray(v) && !v.length)) return '';
    var val = Array.isArray(v) ? v.join(', ') : v;
    return h('div', { 'class': 'prop' }, [h('div', { 'class': 'pk' }, [k]), h('div', { 'class': 'pv' }, [esc(val)])]);
  }

  function openHerb(id) {
    var herb = D.herbs.find(function (x) { return x.id === id; });
    if (!herb) return;
    pushRecent(herb.id);
    var props = h('div', { 'class': 'prop-grid' }, [
      prop('Rasa \u00b7 taste', herb.rasa), prop('V\u012Brya \u00b7 potency', herb.virya), prop('Vip\u0101ka \u00b7 after-effect', herb.vipaka),
      prop('Gu\u1E43a \u00b7 quality', herb.guna),
      h('div', { 'class': 'prop' }, [h('div', { 'class': 'pk' }, ['Effect on do\u1E63as']), h('div', { 'class': 'pv' }, [doshaMini(herb.dosha_effect)])]),
      prop('Karma \u00b7 actions', herb.karma), prop('Parts used', herb.parts_used), prop('Preparation', herb.preparation)
    ].join('')) +
    (herb.typical_dosage ? h('div', { 'class': 'prop', 'style': 'margin-top:14px' }, [h('div', { 'class': 'pk' }, ['Typical use']), h('div', { 'class': 'pv' }, [esc(herb.typical_dosage)])]) : '');

    var inds = (herb.indications || []).slice().sort(function (a, b) { return TIER_RANK[b.evidence_tier] - TIER_RANK[a.evidence_tier]; }).map(function (ind) {
      var c = CMAP[ind.condition_id];
      var cites = (ind.citations || []).map(citeHtml).join('');
      return h('div', { 'class': 'ind-item' }, [
        h('div', { 'class': 'ind-head' }, [
          h('span', { 'class': 'ind-cond' }, [esc(c ? c.name : ind.condition_id)]),
          h('span', { 'class': 'tier', 'data-t': ind.evidence_tier }, [h('span', { 'class': 'tb' }), TIER_LABEL[ind.evidence_tier]])
        ].join('')),
        h('p', null, [esc(ind.rationale)]),
        h('div', { 'class': 'ind-cites' }, [cites])
      ].join(''));
    }).join('');

    var safety = (herb.safety || []).map(function (s) { return h('li', null, [esc(s)]); }).join('');

    var html = h('div', { 'class': 'modal-head' }, [
      h('button', { 'class': 'modal-close', 'data-action': 'closeModal', 'aria-label': 'Close' }, ['\u00d7']),
      h('button', { 'class': 'fav-toggle' + (isFav(herb.id) ? ' on' : ''), 'aria-label': 'Save to favourites', 'aria-pressed': String(isFav(herb.id)), 'data-action': 'toggleFavUI', 'data-id': herb.id }, [svg('heart')]),
      h('div', { 'class': 'mh-name', 'id': 'modalTitle' }, [esc(herb.common_name)]),
      herb.sanskrit_name ? h('span', { 'class': 'mh-sk' }, [esc(herb.sanskrit_name)]) : '',
      herb.botanical_name ? h('div', { 'class': 'mh-bot' }, [esc(herb.botanical_name)]) : ''
    ].join('')) +
    h('div', { 'class': 'modal-body' }, [
      props,
      h('div', { 'class': 'modal-section-title' }, ['Traditionally used for']),
      inds || '<p class="muted">\u2014</p>',
      safety ? '<div class="modal-section-title">Safety &amp; cautions</div><ul class="safety-list">' + safety + '</ul>' : '',
      h('div', { 'class': 'modal-cta' }, [h('button', { 'class': 'btn btn-ghost btn-sm', 'data-action': 'closeModal' }, ['Close'])])
    ].join(''));
    openModal(html);
  }

  /* ------------------------------------------------------------------ */
  /*  Modal                                                              */
  /* ------------------------------------------------------------------ */
  var lastFocus = null;
  function trap(e) {
    if (e.key === 'Escape') { closeModal(); return; }
    if (e.key !== 'Tab') return;
    var f = el('modalCard').querySelectorAll('button, [href], input, [tabindex]:not([tabindex="-1"])');
    if (!f.length) return;
    var first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }
  function openModal(html) {
    lastFocus = document.activeElement;
    var card = el('modalCard'); card.innerHTML = html;
    var m = el('modal'); m.classList.add('open'); m.setAttribute('aria-hidden', 'false');
    document.querySelectorAll('.screen.active, .topbar').forEach(function (el) { el.setAttribute('inert', ''); });
    document.body.style.overflow = 'hidden';
    card.scrollTop = 0;
    setTimeout(function () { var c = card.querySelector('.modal-close'); (c || card).focus(); }, 30);
    document.addEventListener('keydown', trap);
  }
  function closeModal() {
    var m = el('modal'); var card = el('modalCard');
    card.style.animation = 'modalout .25s var(--ease) forwards';
    setTimeout(function () {
      m.classList.remove('open'); m.setAttribute('aria-hidden', 'true');
      card.style.animation = '';
      document.querySelectorAll('.screen, .topbar').forEach(function (el) { el.removeAttribute('inert'); });
      document.body.style.overflow = '';
      document.removeEventListener('keydown', trap);
      if (lastFocus && lastFocus.focus) lastFocus.focus();
    }, 260);
  }

  /* ------------------------------------------------------------------ */
  /*  Decorative + stats                                                 */
  /* ------------------------------------------------------------------ */
  function buildMandala() {
    var a = el('petalsA'), b = el('petalsB'); if (!a) return;
    var s = '';
    for (var i = 0; i < 24; i++) s += '<ellipse cx="300" cy="58" rx="9" ry="40" transform="rotate(' + (i * 15) + ' 300 300)"/>';
    a.innerHTML = s;
    s = '';
    for (var j = 0; j < 12; j++) s += '<path d="M300 150 q22 40 0 90 q-22-50 0-90" transform="rotate(' + (j * 30) + ' 300 300)"/>';
    b.innerHTML = s;
  }

  function countUp(node, target) {
    var start = 0, dur = 1400, t0 = null;
    function frame(t) {
      if (!t0) t0 = t;
      var p = Math.min((t - t0) / dur, 1);
      var ease = 1 - Math.pow(1 - p, 3);
      node.textContent = Math.round(target * ease).toLocaleString();
      if (p < 1) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  function buildStats() {
    var m = D.meta;
    var items = [
      [m.herbs, 'Herbs'],
      [m.conditions, 'Concerns'],
      [m.citations, 'Citations'],
      [TIER_COUNT, 'Evidence tiers']
    ];
    var html = '';
    items.forEach(function (it) { html += '<div class="stat"><div class="n" data-n="' + it[0] + '">0</div><div class="l">' + it[1] + '</div></div>'; });
    el('statStrip').innerHTML = html;
    var ns = document.querySelectorAll('#statStrip .n');
    var seen = false;
    var io = new IntersectionObserver(function (ents) {
      ents.forEach(function (e) { if (e.isIntersecting && !seen) { seen = true; ns.forEach(function (n) { countUp(n, +n.dataset.n); }); } });
    });
    io.observe(el('statStrip'));
  }

  function buildSources() {
    var counts = {};
    function tally(coll) {
      coll.forEach(function (e) {
        (e.citations || []).forEach(function (c) { counts[c.source_id] = (counts[c.source_id] || 0) + 1; });
        (e.indications || []).forEach(function (ind) { (ind.citations || []).forEach(function (c) { counts[c.source_id] = (counts[c.source_id] || 0) + 1; }); });
      });
    }
    tally(D.herbs); tally(D.conditions); tally(D.formulations);
    var ids = Object.keys(D.sources).sort(function (a, b) { return (counts[b] || 0) - (counts[a] || 0); });
    var html = '';
    ids.forEach(function (id) {
      var s = D.sources[id];
      html += h('div', { 'class': 'source-item reveal' }, [
        h('div', null, [
          h('div', { 'class': 'si-title' }, [esc(s.title)]),
          h('div', { 'class': 'si-meta' }, [esc(s.author || (s.kind === 'modern_research' ? 'Modern studies (placeholder slot)' : s.kind))])
        ].join('')),
        h('div', { 'style': 'display:flex;gap:12px;align-items:center' }, [
          s.public_domain ? '<span class="pd">public domain</span>' : '',
          h('span', { 'class': 'si-count' }, [(counts[id] || 0) + ' citations'])
        ].join(''))
      ].join(''));
    });
    el('sourcesList').innerHTML = html;
  }

  /* ------------------------------------------------------------------ */
  /*  Reveal on scroll                                                   */
  /* ------------------------------------------------------------------ */
  var revealIO;
  function revealObserve() {
    if (!revealIO) {
      revealIO = new IntersectionObserver(function (ents) {
        ents.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); revealIO.unobserve(e.target); } });
      }, { threshold: 0.12 });
    }
    document.querySelectorAll('.reveal:not(.in)').forEach(function (n) { revealIO.observe(n); });
  }

  /* ------------------------------------------------------------------ */
  /*  #17  Daily tip                                                     */
  /* ------------------------------------------------------------------ */
  var TIPS = [
    { term: 'U\u1e62\u1e63odaka', en: 'warm water', tip: 'Begin the day with a glass of warm water to gently wake your digestion (agni) and ease elimination.' },
    { term: 'Abhya\u1e3cga', en: 'oil self-massage', tip: 'A few minutes of warm-oil massage before bathing settles V\u0101ta and grounds the nervous system.' },
    { term: 'Jihv\u0101-nirlekhana', en: 'tongue scraping', tip: 'Scrape your tongue each morning to clear overnight residue (ama) and sharpen taste.' },
    { term: 'Madhy\u0101hna bhojana', en: 'midday meal', tip: 'Make lunch your largest meal \u2014 digestive fire is strongest at midday \u2014 and keep dinner lighter.' },
    { term: 'Dinacharya', en: 'daily rhythm', tip: 'Regular wake, meal and sleep times steady all three do\u1E63as. Routine itself is medicine.' },
    { term: 'Pr\u0101\u1e47\u0101y\u0101ma', en: 'breath', tip: 'A few minutes of slow, even breathing calms the mind and balances pr\u0101\u1e43a.' },
    { term: '\u0100rdraka', en: 'fresh ginger', tip: 'A slice of ginger with a pinch of rock salt before meals kindles appetite and digestion.' },
    { term: 'Nidr\u0101', en: 'sleep', tip: 'Wind down screen-free and aim to sleep before 10pm, while Kapha hours make rest deepest.' },
    { term: '\u1e24\u1e6bachary\u0101', en: 'seasonal living', tip: 'Eat with the season \u2014 warming foods in cold months, cooling foods in the heat.' },
    { term: 'Snehana', en: 'good fats', tip: 'A little ghee nourishes the tissues and lubricates the gut \u2014 especially for dry, V\u0101ta types.' },
    { term: 'Maunam', en: 'quiet', tip: 'A short daily spell of silence or meditation is a ras\u0101yana (rejuvenator) for the mind.' },
    { term: 'P\u0101d\u0101bhya\u1e3cga', en: 'foot massage', tip: 'Massaging the soles with warm oil at night invites calm and deeper sleep.' },
    { term: 'Takra', en: 'spiced buttermilk', tip: 'Thin buttermilk with roasted cumin after lunch supports digestion and the gut.' },
    { term: 'Triphal\u0101', en: 'three fruits', tip: 'A little Triphala with warm water at night gently supports overnight cleansing \u2014 start with a small amount.' }
  ];

  var TIP_DOSHA_BOOST = {
    vata: [1, 5, 9, 11, 13],
    pitta: [3, 5, 6, 9, 12],
    kapha: [4, 5, 7, 9, 14]
  };

  function renderTip() {
    var now = new Date();
    var doy = Math.floor((now - new Date(now.getFullYear(), 0, 0)) / 86400000);
    var p = Store.get('prakriti', null);
    var idx = ((doy % TIPS.length) + TIPS.length) % TIPS.length;

    if (p && p.dominant && TIP_DOSHA_BOOST[p.dominant]) {
      var boosts = TIP_DOSHA_BOOST[p.dominant];
      var boostIdx = doy % boosts.length;
      idx = boosts[boostIdx] - 1;
    }

    var t = TIPS[idx];
    if (!t) t = TIPS[0];
    var html = h('div', { 'class': 'dt-kicker' }, ['Today\u2019s ritual']) +
      h('div', { 'class': 'dt-term' }, [esc(t.term) + ' ', h('span', { 'class': 'dt-en' }, ['\u00b7 ' + esc(t.en)])]) +
      h('div', { 'class': 'dt-text' }, [esc(t.tip)]) +
      h('button', { 'class': 'btn btn-ghost btn-sm dt-done', 'data-action': 'completeRitualTip', 'type': 'button' }, ['I did this today']);
    ['dailyTip', 'dailyTipGuest'].forEach(function (id) {
      var node = el(id);
      if (node) node.innerHTML = html;
    });
  }

  /* ------------------------------------------------------------------ */
  /*  #20  Journal                                                       */
  /* ------------------------------------------------------------------ */
  function journalEntries() { return Store.get('journal', []); }

  function renderJournal() {
    var entries = journalEntries();
    var list = el('journalList');
    if (!entries.length) {
      list.innerHTML = '<p class="journal-empty">No entries yet. Start tracking how you feel above.</p>';
      return;
    }
    list.innerHTML = entries.slice(0, 30).map(function (e, i) {
      var moodEmoji = { great: '😊', good: '🙂', okay: '😐', low: '😔', bad: '😣' };
      var date = new Date(e.ts);
      var dateStr = date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
      var timeStr = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
      return h('div', { 'class': 'journal-entry' }, [
        h('div', { 'class': 'je-header' }, [
          h('span', { 'class': 'je-date' }, [dateStr + ' \u00b7 ' + timeStr]),
          h('span', { 'class': 'je-mood' }, [moodEmoji[e.mood] || '']),
          h('span', { 'class': 'je-energy' }, ['Energy: ' + e.energy + '/5'])
        ].join('')),
        e.notes ? h('div', { 'class': 'je-notes' }, [esc(e.notes)]) : '',
        h('div', { 'class': 'je-actions' }, [
          h('button', { 'class': 'je-delete', 'data-action': 'deleteJournal', 'data-idx': i }, ['Remove'])
        ])
      ].join(''));
    }).join('');
  }

  function saveJournalEntry() {
    var moodBtn = document.querySelector('#moodPicker .mood-btn.selected');
    if (!moodBtn) { toast('Pick a mood first'); return; }
    var mood = moodBtn.dataset.mood;
    var energy = el('journalEnergy').value;
    var notes = el('journalNotes').value.trim();
    var entries = journalEntries();
    entries.unshift({ ts: Date.now(), mood: mood, energy: +energy, notes: notes });
    if (entries.length > 100) entries = entries.slice(0, 100);
    Store.set('journal', entries);
    el('journalNotes').value = '';
    el('journalEnergy').value = 3;
    document.querySelectorAll('#moodPicker .mood-btn').forEach(function (b) { b.classList.remove('selected'); b.setAttribute('aria-checked', 'false'); });
    touchActivity('journal');
    renderJournal();
    toast('Journal entry saved · streak updated');
    announce('Journal entry saved');
  }

  function deleteJournalEntry(idx) {
    var entries = journalEntries();
    var removed = entries[idx];
    entries.splice(idx, 1);
    Store.set('journal', entries);
    toastUndo('Journal entry removed', function () {
      var e = journalEntries();
      if (removed) e.splice(idx, 0, removed);
      Store.set('journal', e);
      renderJournal();
    });
    renderJournal();
  }

  function goJournal() { go('journal'); }

  /* ------------------------------------------------------------------ */
  /*  Theme                                                              */
  /* ------------------------------------------------------------------ */
  var SUN = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><circle cx="12" cy="12" r="4.4"/><path d="M12 2v2.4M12 19.6V22M4.2 12H1.8M22.2 12H19.8M5 5l1.7 1.7M17.3 17.3 19 19M19 5l-1.7 1.7M6.7 17.3 5 19"/></svg>';
  var MOON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"><path d="M20 14.4A8 8 0 1 1 9.6 4 6.2 6.2 0 0 0 20 14.4Z"/></svg>';
  var ROOT_BG = { light: '#f7f1e4', dark: '#14110d' };
  function applyTheme(t) {
    /* Only light or dark; anything else falls back to light */
    t = t === 'dark' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', t);
    var bg = ROOT_BG[t] || ROOT_BG.light;
    document.documentElement.style.backgroundColor = bg;
    document.body.style.backgroundColor = bg;
    var b = el('themeBtn'); if (b) { b.innerHTML = '<span class="ti-wrap">' + (t === 'dark' ? SUN : MOON) + '</span>'; b.setAttribute('aria-pressed', String(t === 'dark'));
      var w = b.querySelector('.ti-wrap'); if (w) { w.classList.remove('ti-spin'); void w.offsetWidth; w.classList.add('ti-spin'); } }
    Store.set('theme', t);
  }
  function toggleTheme() { applyTheme(document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark'); }
  function initTheme() {
    /* Default theme is light only (never auto from OS prefers-color-scheme) */
    var stored = Store.get('theme', null);
    var attr = document.documentElement.getAttribute('data-theme');
    var t = 'light';
    if (stored === 'dark' || stored === 'light') t = stored;
    else if (attr === 'dark' || attr === 'light') t = attr;
    applyTheme(t);
  }

  /* ------------------------------------------------------------------ */
  /*  Comfort prefs — easy for Gen Z/Alpha AND 35+                       */
  /* ------------------------------------------------------------------ */
  function getComfort() {
    var c = Store.get('comfort', null) || {};
    return {
      textSize: c.textSize === 'large' || c.textSize === 'xl' ? c.textSize : 'normal',
      calm: !!c.calm,
      simple: c.simple === false ? false : true,
      contrast: !!c.contrast
    };
  }
  function saveComfort(c) {
    Store.set('comfort', c);
    applyComfort(c);
  }
  function applyComfort(c) {
    c = c || getComfort();
    var root = document.documentElement;
    root.setAttribute('data-text', c.textSize || 'normal');
    root.setAttribute('data-calm', c.calm ? '1' : '0');
    root.setAttribute('data-simple', c.simple !== false ? '1' : '0');
    root.setAttribute('data-contrast', c.contrast ? '1' : '0');
    root.classList.toggle('pref-calm', !!c.calm);
    document.body.classList.toggle('calm-mode', !!c.calm);
    document.body.classList.toggle('simple-lang', c.simple !== false);
    document.body.classList.toggle('text-large', c.textSize === 'large');
    document.body.classList.toggle('text-xl', c.textSize === 'xl');
    document.body.classList.toggle('high-contrast', !!c.contrast);
  }
  function setComfortKey(key, value) {
    var c = getComfort();
    c[key] = value;
    saveComfort(c);
    if (key === 'textSize') toast(value === 'normal' ? 'Standard text size' : (value === 'xl' ? 'Extra-large text' : 'Larger text on'));
    else if (key === 'calm') toast(value ? 'Calm mode on — quieter home' : 'Full experience on');
    else if (key === 'simple') toast(value ? 'Plain language on' : 'Full terms shown');
    else if (key === 'contrast') toast(value ? 'Higher contrast on' : 'Standard contrast');
    renderCoach();
    if (el('mySpaceBody') && document.getElementById('myspace') && document.getElementById('myspace').classList.contains('active')) {
      renderMySpace();
    }
  }
  function cycleTextSize() {
    var c = getComfort();
    var order = ['normal', 'large', 'xl'];
    var i = order.indexOf(c.textSize);
    setComfortKey('textSize', order[(i + 1) % order.length]);
  }

  /* ------------------------------------------------------------------ */
  /*  Coach: always one clear next step                                  */
  /* ------------------------------------------------------------------ */
  function computeNextStep() {
    var name = ((getProfile().name) || '').trim();
    var prak = Store.get('prakriti', null);
    var hst = getHabitsState();
    var doneN = 0;
    DEFAULT_HABITS.forEach(function (hb) { if (hst.done[hb.id]) doneN++; });
    var journalN = journalEntries().length;
    var routines = Store.get('routines', []) || [];
    var hour = new Date().getHours();

    if (!Store.get('onboarded', false) && !hasProfile()) {
      return {
        kicker: 'Start here',
        title: 'Welcome — two minutes to feel clearer',
        body: 'A short check-in turns “I feel off” into a simple plan with honest sources.',
        cta: 'Begin check-in',
        action: 'startCheckin',
        icon: '🌿'
      };
    }
    if (!prak) {
      return {
        kicker: name ? ('Next for you, ' + name) : 'Next for you',
        title: 'Learn your body type',
        body: 'A gentle quiz maps Vāta, Pitta, or Kapha — so tips fit how you naturally feel.',
        cta: 'Take the 2-min quiz',
        action: 'openQuiz',
        icon: '🧭'
      };
    }
    if (!routines.length) {
      return {
        kicker: 'Your first plan',
        title: 'Check in about one concern',
        body: 'Sleep, stress, digestion — pick what matters today. You’ll get lifestyle tips and cited herbs.',
        cta: 'Start check-in',
        action: 'startCheckin',
        icon: '✨'
      };
    }
    if (doneN < Math.min(2, DEFAULT_HABITS.length)) {
      var undone = DEFAULT_HABITS.filter(function (hb) { return !hst.done[hb.id]; })[0];
      return {
        kicker: hour < 12 ? 'Morning win' : (hour < 18 ? 'Afternoon pause' : 'Evening wind-down'),
        title: undone ? ('Try: ' + undone.label) : 'Do one small ritual',
        body: 'One checkbox is enough. Consistency beats intensity — for teens and for busy parents.',
        cta: 'Mark a ritual below',
        action: 'scrollRituals',
        icon: '🪔'
      };
    }
    if (journalN < 1) {
      return {
        kicker: 'Know your pattern',
        title: 'Log how you feel today',
        body: 'A 10-second mood note helps you see what actually helps over time.',
        cta: 'Open journal',
        action: 'go:journal',
        icon: '📝'
      };
    }
    return {
      kicker: 'You’re on track',
      title: doneN >= DEFAULT_HABITS.length ? 'All rituals done — rest well' : 'Keep the gentle streak',
      body: 'Revisit a concern, browse herbs, or just enjoy a calm moment. No guilt mode here.',
      cta: 'Browse herbs',
      action: 'go:library',
      secondary: { cta: 'Another check-in', action: 'startCheckin' },
      icon: '💚'
    };
  }
  function renderCoach() {
    var mount = el('coachCard');
    if (!mount) return;
    if (!hasProfile()) {
      mount.innerHTML = '';
      mount.hidden = true;
      return;
    }
    mount.hidden = false;
    var s = computeNextStep();
    var sec = s.secondary
      ? h('button', { 'type': 'button', 'class': 'btn btn-ghost btn-sm', 'data-action': s.secondary.action }, [esc(s.secondary.cta)])
      : '';
    mount.innerHTML = h('div', { 'class': 'coach-inner' }, [
      h('div', { 'class': 'coach-icon', 'aria-hidden': 'true' }, [s.icon || '🌿']),
      h('div', { 'class': 'coach-copy' }, [
        h('div', { 'class': 'coach-kicker' }, [esc(s.kicker)]),
        h('div', { 'class': 'coach-title' }, [esc(s.title)]),
        h('p', { 'class': 'coach-body' }, [esc(s.body)])
      ].join('')),
      h('div', { 'class': 'coach-actions' }, [
        h('button', { 'type': 'button', 'class': 'btn btn-primary btn-sm', 'data-action': s.action }, [esc(s.cta)]),
        sec
      ].join(''))
    ].join(''));
  }
  function scrollRituals() {
    var node = el('dashRitual') || el('habitList');
    if (node && node.scrollIntoView) {
      node.scrollIntoView({ behavior: document.documentElement.getAttribute('data-calm') === '1' ? 'auto' : 'smooth', block: 'center' });
    }
    toast('Tap any ritual when you finish it');
  }

  /* ------------------------------------------------------------------ */
  /*  Help sheet                                                         */
  /* ------------------------------------------------------------------ */
  var helpFocus = null;
  function openHelp() {
    var sheet = el('helpSheet');
    if (!sheet) return;
    helpFocus = document.activeElement;
    sheet.hidden = false;
    sheet.setAttribute('aria-hidden', 'false');
    sheet.classList.add('open');
    document.body.classList.add('help-open');
    setTimeout(function () {
      var panel = sheet.querySelector('.help-panel');
      if (panel) panel.focus();
    }, 40);
  }
  function closeHelp() {
    var sheet = el('helpSheet');
    if (!sheet) return;
    sheet.classList.remove('open');
    sheet.setAttribute('aria-hidden', 'true');
    sheet.hidden = true;
    document.body.classList.remove('help-open');
    if (helpFocus && helpFocus.focus) try { helpFocus.focus(); } catch (e) {}
  }

  /* ------------------------------------------------------------------ */
  /*  #11  Keyboard navigation                                           */
  /* ------------------------------------------------------------------ */
  function gridKeyNav(e) {
    var key = e.key;
    if (key !== 'ArrowRight' && key !== 'ArrowLeft' && key !== 'ArrowDown' && key !== 'ArrowUp') return;
    var target = e.target;
    if (!target.classList.contains('tile') && !target.classList.contains('quiz-opt') && !target.classList.contains('lib-card')) return;
    e.preventDefault();
    var container = target.closest('.grid-cards, .quiz-options, .lib-grid');
    if (!container) return;
    var items = Array.prototype.slice.call(container.querySelectorAll('.tile, .quiz-opt, .lib-card'));
    var idx = items.indexOf(target);
    if (idx < 0) return;
    var cols = Math.round(container.offsetWidth / items[0].offsetWidth) || 1;
    var next = idx;
    if (key === 'ArrowRight') next = Math.min(idx + 1, items.length - 1);
    else if (key === 'ArrowLeft') next = Math.max(idx - 1, 0);
    else if (key === 'ArrowDown') next = Math.min(idx + cols, items.length - 1);
    else if (key === 'ArrowUp') next = Math.max(idx - cols, 0);
    if (next !== idx) items[next].focus();
  }

  /* ------------------------------------------------------------------ */
  /*  #12  Touch swipe                                                   */
  /* ------------------------------------------------------------------ */
  var touchStartX = 0, touchStartY = 0;
  function onTouchStart(e) {
    /* ignore swipes from interactive controls / drawers */
    var t = e.target;
    if (t && t.closest && t.closest('input, textarea, .mobile-nav, .modal, .bottom-nav, .ob-goals, .mood-picker')) return;
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
  }
  function onTouchEnd(e) {
    if (!touchStartX && !touchStartY) return;
    var dx = e.changedTouches[0].clientX - touchStartX;
    var dy = e.changedTouches[0].clientY - touchStartY;
    touchStartX = 0; touchStartY = 0;
    if (Math.abs(dx) < 80 || Math.abs(dy) > Math.abs(dx) * 0.75) return;
    /* avoid swipe-nav when drawer/modal open */
    if (el('mobileNav') && el('mobileNav').classList.contains('open')) return;
    if (el('modal') && el('modal').classList.contains('open')) return;
    if (el('onboarding') && !el('onboarding').classList.contains('hidden')) return;
    var active = document.querySelector('.screen.active');
    if (!active) return;
    if (dx > 0) {
      if (active.id === 'intake' && state.step > 1) { toStep(state.step - 1); }
      else if (active.id === 'quiz' && el('quizFlow') && !el('quizFlow').classList.contains('hidden') && quizState.i > 0) { quizBack(); }
    } else {
      if (active.id === 'intake' && state.step === 1 && state.category) { toStep('1b'); }
      else if (active.id === 'intake' && state.step === '1b' && state.condition) { toStep(2); }
      else if (active.id === 'intake' && state.step === 2) { toStep(3); }
      else if (active.id === 'intake' && state.step === 3) { deepQuizNext(); }
      else if (active.id === 'intake' && state.step === 5) { analyze(); }
    }
  }

  /* ------------------------------------------------------------------ */
  /*  #18  Undo handler                                                  */
  /* ------------------------------------------------------------------ */
  function handleUndo() {
    if (undoData) { undoData(); undoData = null; }
    clearTimeout(undoTimer);
    el('toastUndo').classList.remove('show');
    toast('Undone');
  }

  /* ------------------------------------------------------------------ */
  /*  Event delegation                                                   */
  /* ------------------------------------------------------------------ */
  function findAction(node) {
    var n = node;
    while (n && n !== document) {
      if (n.dataset && n.dataset.action) return n;
      n = n.parentElement;
    }
    return null;
  }

  function handleAction(e) {
    var node = findAction(e.target);
    if (!node) return;
    var act = node.dataset.action;

    /* Tools hub (calculators / progress / kitchen) — handle first */
    if (window.AyusTools && window.AyusTools.handle && window.AyusTools.handle(node, e)) {
      return;
    }

    if (act === 'go:home') { go('home'); }
    else if (act === 'go:library') { go('library'); }
    else if (act === 'go:heritage') { go('heritage'); }
    else if (act === 'go:journal') { goJournal(); }
    else if (act === 'go:tools') { go('tools'); }
    else if (act === 'go:explore') {
      if (window.AyusEngage && window.AyusEngage.goExplore) window.AyusEngage.goExplore();
      else go('explore');
    }
    else if (act === 'toolsOpen') {
      var tab = node.dataset.tab || 'calc';
      if (window.AyusTools && window.AyusTools.open) window.AyusTools.open(tab);
      else go('tools');
    }
    else if (act === 'startCheckin') { startCheckin(); }
    else if (act === 'openQuiz') { openQuiz(); }
    else if (act === 'beginQuiz') { beginQuiz(); }
    else if (act === 'openMySpace') { openMySpace(); }
    else if (act === 'toggleTheme') { toggleTheme(); }
    else if (act === 'toStep:1') { toStep(1); }
    else if (act === 'toStep:1b') { toStep('1b'); }
    else if (act === 'toStep:2') { toStepChecked(2); }
    else if (act === 'toStep:3') { toStepChecked(3); }
    else if (act === 'toStep:5') { toStepChecked(5); }
    else if (act === 'deepPick') {
      deepPick(node.dataset.qid, node.dataset.v, node.dataset.multi === '1');
    }
    else if (act === 'deepQuizNext') { deepQuizNext(); }
    else if (act === 'deepQuizBack') { deepQuizBack(); }
    else if (act === 'analyze') { analyze(); }
    else if (act === 'closeModal') { closeModal(); }
    else if (act === 'toggleDisclose') { toggleDisclose(node); }
    else if (act === 'shareRoutine') { shareRoutine(); }
    else if (act === 'saveRoutine') { saveRoutine(); }
    else if (act === 'exportRoutine') { exportRoutine(); }
    else if (act === 'printPage') { window.print(); }
    else if (act === 'pickCategory') { pickCategory(node); }
    else if (act === 'pickConcern') { pickConcern(node.dataset.id); }
    else if (act === 'openHerb') { openHerb(node.dataset.id); }
    else if (act === 'openFormulation') { openFormulation(node.dataset.id); }
    else if (act === 'openConcern') { openConcern(node.dataset.id); }
    else if (act === 'toggleFavUI') { toggleFavUI(node.dataset.id, node); }
    else if (act === 'removeFav') { removeFav(node.dataset.id); }
    else if (act === 'removeRoutine') { removeRoutine(+node.dataset.idx); }
    else if (act === 'quizAnswer') { quizAnswer(+node.dataset.i, node.dataset.d); }
    else if (act === 'quizBack') { quizBack(); }
    else if (act === 'undo') { handleUndo(); }
    else if (act === 'toggleMobileNav') { toggleMobileNav(); }
    else if (act === 'closeMobileNav') { closeMobileNav(); }
    else if (act === 'nextOnboarding') { nextOnboarding(); }
    else if (act === 'finishOnboarding') { finishOnboarding(node); }
    else if (act === 'closeOnboarding') { closeOnboarding(); }
    else if (act === 'saveJournal') { saveJournalEntry(); }
    else if (act === 'deleteJournal') { deleteJournalEntry(+node.dataset.idx); }
    else if (act === 'reloadPage') { location.reload(); }
    else if (act === 'toggleHabit') { toggleHabit(node.dataset.id); }
    else if (act === 'toggleObGoal') { toggleObGoal(node.dataset.goal); }
    else if (act === 'toggleProfileGoal') { toggleProfileGoal(node.dataset.goal); }
    else if (act === 'saveProfile') { saveProfileFromForm(); }
    else if (act === 'completeRitualTip') {
      touchActivity('tip');
      var st = getHabitsState();
      /* map tip completion to breathe habit as a gentle win */
      st.done.breathe = true;
      Store.set('habits', st);
      toast('Ritual noted — streak kept alive');
      renderHome();
    }
    else if (act === 'openHelp') { openHelp(); }
    else if (act === 'closeHelp') { closeHelp(); }
    else if (act === 'scrollRituals') { scrollRituals(); }
    else if (act === 'cycleTextSize') { cycleTextSize(); }
    else if (act === 'toggleComfort') {
      var key = node.dataset.key;
      if (!key) return;
      if (key === 'textSize') cycleTextSize();
      else setComfortKey(key, !!node.checked);
    }
    if (node.dataset.also === 'closeHelp') closeHelp();
  }

  /* ------------------------------------------------------------------ */
  /*  Init                                                               */
  /* ------------------------------------------------------------------ */
  function init() {
    initTheme();
    applyComfort(getComfort());
    D.conditions.forEach(function (c) { CMAP[c.id] = c; });
    buildMandala();
    buildStats();
    buildCategories();
    buildSources();
    renderLibrary();
    renderTip();
    renderJournal();
    updateChromeIdentity();
    renderHome();
    revealObserve();

    /* Show onboarding for first-time users */
    if (!Store.get('onboarded', false)) {
      setTimeout(showOnboarding, 500);
    } else {
      touchActivity('visit');
    }

    document.addEventListener('click', handleAction);
    document.addEventListener('change', function (e) {
      var t = e.target;
      if (!t || !t.dataset) return;
      if (t.dataset.action === 'toggleComfort' && t.dataset.key) {
        setComfortKey(t.dataset.key, !!t.checked);
      }
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        if (el('helpSheet') && el('helpSheet').classList.contains('open')) {
          closeHelp();
          e.preventDefault();
        }
      }
    });

    /* Onboarding goal chips (also delegated via handleAction if data-action set) */
    var og = el('obGoals');
    if (og) {
      og.addEventListener('click', function (e) {
        var chip = e.target.closest('.goal-chip');
        if (chip && chip.dataset.goal) toggleObGoal(chip.dataset.goal);
      });
    }
    document.addEventListener('keydown', function (e) {
      if ((e.key === 'Enter' || e.key === ' ') && e.target.closest && e.target.closest('[data-action="go:home"]')) {
        e.preventDefault(); go('home');
      }
    });

    el('search').addEventListener('input', function (e) { searchConcerns(e.target.value); });
    el('search').addEventListener('keydown', function (e) { if (e.key === 'Escape') { e.target.value = ''; searchConcerns(''); e.target.blur(); } });
    el('libSearch').addEventListener('input', function (e) { libState.q = e.target.value; renderLibrary(); });
    el('libSearch').addEventListener('keydown', function (e) { if (e.key === 'Escape') { e.target.value = ''; libState.q = ''; renderLibrary(); e.target.blur(); } });

    el('libFilters').addEventListener('click', function (e) {
      var chip = e.target.closest('.fchip');
      if (!chip) return;
      document.querySelectorAll('#libFilters .fchip').forEach(function (x) { x.classList.remove('selected'); });
      chip.classList.add('selected'); libState.tier = chip.dataset.tier; renderLibrary();
    });

    el('libType').addEventListener('click', function (e) {
      var chip = e.target.closest('.tchip');
      if (!chip) return;
      document.querySelectorAll('#libType .tchip').forEach(function (x) { x.classList.remove('selected'); });
      chip.classList.add('selected'); libState.type = chip.dataset.type; renderLibrary();
    });

    /* duration/intensity now live inside deep quiz (deepPick) */

    el('toastUndoBtn').addEventListener('click', handleUndo);

    /* Journal mood picker */
    el('moodPicker').addEventListener('click', function (e) {
      var btn = e.target.closest('.mood-btn');
      if (!btn) return;
      document.querySelectorAll('#moodPicker .mood-btn').forEach(function (b) { b.classList.remove('selected'); b.setAttribute('aria-checked', 'false'); });
      btn.classList.add('selected'); btn.setAttribute('aria-checked', 'true');
    });

    document.addEventListener('keydown', gridKeyNav);
    document.addEventListener('touchstart', onTouchStart, { passive: true });
    document.addEventListener('touchend', onTouchEnd, { passive: true });
  }

  /* Public API for tools.js / platform.js integration */
  window.AyusApp = {
    go: go,
    toast: toast,
    startCheckin: startCheckin,
    openQuiz: openQuiz,
    openMySpace: openMySpace,
    getProfile: getProfile,
    Store: Store
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
