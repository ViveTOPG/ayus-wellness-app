/* ===========================================================================
   Āyus media library — curated wellness / Ayurveda photography
   Unsplash License (https://unsplash.com/license) — free for commercial use.
   Failures fall back to warm gradients in CSS (.media-fallback).
   =========================================================================== */
(function (global) {
  'use strict';

  function u(id, w) {
    w = w || 900;
    return 'https://images.unsplash.com/' + id + '?auto=format&fit=crop&w=' + w + '&q=80';
  }

  /* Stable Unsplash photo paths */
  var P = {
    hero: 'photo-1544367567-0f2fcb009e0b',           /* calm yoga / morning light */
    herbs: 'photo-1512290923902-8a9f81dc236c',        /* dried herbs market */
    spices: 'photo-1596040033229-a9821ebd058d',       /* spices bowls */
    turmeric: 'photo-1615485500704-8e990f9900f7',     /* turmeric powder */
    ginger: 'photo-1599940824399-b87987ceb72a',       /* ginger root */
    tea: 'photo-1576092768241-dec231879fc3',          /* herbal tea cup */
    ashwagandha: 'photo-1505576399279-565b52d4ac71', /* botanical greenery */
    tulsi: 'photo-1466692476866-aef1dfb1e735',        /* green leaves */
    kitchen: 'photo-1556910103-1c02745aae4d',         /* warm kitchen cooking */
    kitchari: 'photo-1585937421612-70a008356fbe',     /* indian bowl meal */
    goldenMilk: 'photo-1571934811356-5cc061b6821f',   /* latte / golden drink */
    morning: 'photo-1506126613408-eca07ce68773',      /* sunrise yoga */
    sleep: 'photo-1541781774459-bb2af2f05b55',        /* peaceful rest */
    breath: 'photo-1506126613408-eca07ce68773',
    meditation: 'photo-1506126613408-eca07ce68773',
    nature: 'photo-1441974231531-c6227db76b6e',       /* forest path */
    water: 'photo-1548839140-29a749e1cf4d',           /* water glass */
    body: 'photo-1571019614242-c5c5dee9f50b',         /* fitness wellness */
    progress: 'photo-1434494878577-86c23bcb06b9',     /* watch / tracking */
    heritage: 'photo-1561361513-2d000a50f0dc',        /* indian temple architecture */
    books: 'photo-1481627834876-b7833e8f5570',        /* old books */
    digests: 'photo-1490645935967-10de6ba17061',      /* healthy plate */
    skin: 'photo-1556228720-195a672e8a03',            /* skincare natural */
    joints: 'photo-1518611012118-696072aa579a',       /* gentle stretch */
    mind: 'photo-1499209974431-9dddcece7f88',         /* calm mind landscape */
    immunity: 'photo-1505576399279-565b52d4ac71',
    women: 'photo-1515377905703-c4788e51af15',
    checkin: 'photo-1505751172876-fa1923c5c528',      /* care / health hands */
    tools: 'photo-1576092768241-dec231879fc3',
    catalog: 'photo-1512290923902-8a9f81dc236c',
    stack: 'photo-1556910103-1c02745aae4d',
    cardamom: 'photo-1596040033229-a9821ebd058d',
    cumin: 'photo-1596040033229-a9821ebd058d',
    neem: 'photo-1466692476866-aef1dfb1e735',
    amalaki: 'photo-1610832958506-aa56368176cf',      /* amla / fruits */
    brahmi: 'photo-1466692476866-aef1dfb1e735',
    ghee: 'photo-1628088062854-d1870b4553da',
    rice: 'photo-1536304993881-ff6e9eefa2a6',
    soup: 'photo-1547592166-23ac45744acd',
    cucumber: 'photo-1449300079323-02e209d9d3a6',
    stones: 'photo-1506905925346-21bda4d32df4',       /* mountain calm */
    lotus: 'photo-1518531933037-91b2f5f229cc',
    incense: 'photo-1600880292203-757bb62b4baf',
    mortar: 'photo-1512290923902-8a9f81dc236c',
    sunrise: 'photo-1470252649378-9c29740c9fa8',
    forest: 'photo-1441974231531-c6227db76b6e',
    night: 'photo-1507400492013-162706c8c05e',
    ember: 'photo-1478144592103-25e218a04891',
    gold: 'photo-1615485500704-8e990f9900f7',
    sage: 'photo-1466692476866-aef1dfb1e735'
  };

  var SECTIONS = {
    hero: P.hero,
    how: P.lotus,
    heritage: P.heritage,
    checkin: P.checkin,
    library: P.herbs,
    tools: P.tools,
    tools_calc: P.body,
    tools_progress: P.progress,
    tools_kitchen: P.kitchen,
    journal: P.mind,
    market: P.catalog,
    stack: P.stack,
    quiz: P.stones,
    explore: P.nature,
    onboarding: P.sunrise,
    profile: P.meditation
  };

  var GRADIENTS = {
    'gradient-sunrise': P.sunrise,
    'gradient-forest': P.forest,
    'gradient-night': P.night,
    'gradient-ember': P.ember,
    'gradient-gold': P.gold,
    'gradient-sage': P.sage
  };

  var HERBS = {
    ashwagandha: P.ashwagandha,
    turmeric: P.turmeric,
    ginger: P.ginger,
    tulsi: P.tulsi,
    brahmi: P.brahmi,
    amalaki: P.amalaki,
    neem: P.neem,
    guduchi: P.herbs,
    shatavari: P.herbs,
    yashtimadhu: P.spices,
    fenugreek: P.spices,
    guggulu: P.spices,
    cumin: P.cumin,
    cardamom: P.cardamom,
    pippali: P.spices
  };

  var RECIPES = {
    'ginger-lemon-tea': P.ginger,
    kitchari: P.kitchari,
    'golden-milk': P.goldenMilk,
    'cumin-fennel-tea': P.tea,
    'spiced-oats': P.rice,
    'cooling-raita': P.cucumber,
    'tulsi-tea': P.tulsi,
    'mung-soup': P.soup
  };

  var CATEGORIES = {
    'Digestion & gut': P.digests,
    'Mind & emotions': P.mind,
    'Energy & immunity': P.immunity,
    'Skin & hair': P.skin,
    'Joints & body': P.joints,
    'Breath & allergy': P.breath,
    'Heart & metabolic': P.body,
    "Women's wellness": P.women,
    'Urinary care': P.water,
    'Eyes & mouth': P.herbs,
    'Pain management': P.joints,
    'Reproductive health': P.lotus,
    'Metabolic health': P.body,
    'Mental health': P.mind
  };

  var STORIES = {
    s_ritual: P.morning,
    s_dosha: P.stones,
    s_herb: P.ashwagandha,
    s_breath: P.breath,
    s_catalog: P.spices,
    s_sleep: P.sleep,
    s_check: P.checkin,
    s_heritage: P.heritage
  };

  var POSTS = {
    p_morning: P.morning,
    p_ashwa: P.ashwagandha,
    p_sleep: P.sleep,
    p_gut: P.digests,
    p_challenge: P.water,
    p_heritage: P.heritage
  };

  function pick(map, key, fallback) {
    if (key && map[key]) return map[key];
    return fallback || P.herbs;
  }

  function urlFor(kind, key, w) {
    var id;
    if (kind === 'section') id = pick(SECTIONS, key, P.nature);
    else if (kind === 'herb') id = pick(HERBS, key, P.herbs);
    else if (kind === 'recipe') id = pick(RECIPES, key, P.kitchen);
    else if (kind === 'category') id = pick(CATEGORIES, key, P.lotus);
    else if (kind === 'gradient') id = pick(GRADIENTS, key, P.nature);
    else if (kind === 'story') id = pick(STORIES, key, P.sunrise);
    else if (kind === 'post') id = pick(POSTS, key, P.nature);
    else if (kind === 'photo') id = P[key] || P.nature;
    else id = P.nature;
    return u(id, w);
  }

  /** Hash key → stable photo from pool for unknown herbs/products */
  var POOL = [P.herbs, P.spices, P.turmeric, P.ginger, P.tulsi, P.tea, P.nature, P.lotus, P.mortar, P.kitchen];
  function hashUrl(key, w) {
    var s = String(key || 'x');
    var h = 0;
    for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
    return u(POOL[h % POOL.length], w);
  }

  function herbUrl(id, w) {
    if (HERBS[id]) return u(HERBS[id], w);
    return hashUrl(id, w);
  }

  global.AYUS_MEDIA = {
    P: P,
    SECTIONS: SECTIONS,
    GRADIENTS: GRADIENTS,
    HERBS: HERBS,
    RECIPES: RECIPES,
    CATEGORIES: CATEGORIES,
    url: urlFor,
    herb: herbUrl,
    hash: hashUrl,
    u: u
  };

  global.AyusMedia = {
    url: urlFor,
    herb: herbUrl,
    hash: hashUrl,
    /** Background-image cover div */
    cover: function (kind, key, extraClass, w) {
      var src = urlFor(kind, key, w || 900);
      var cls = 'media-cover' + (extraClass ? ' ' + extraClass : '');
      return (
        '<div class="' +
        cls +
        '" style="background-image:url(\'' +
        src +
        '\')" role="img" aria-hidden="true"></div>'
      );
    },
    /** <img> with lazy load + fallback class */
    img: function (kind, key, alt, extraClass, w) {
      var src = urlFor(kind, key, w || 800);
      var cls = 'media-img' + (extraClass ? ' ' + extraClass : '');
      return (
        '<img class="' +
        cls +
        '" src="' +
        src +
        '" alt="' +
        String(alt || '').replace(/"/g, '&quot;') +
        '" loading="lazy" decoding="async" onerror="this.onerror=null;this.classList.add(\'media-fallback\');" />'
      );
    },
    photoStyle: function (kind, key, w) {
      return "background-image:url('" + urlFor(kind, key, w || 900) + "')";
    }
  };
})(typeof window !== 'undefined' ? window : this);
