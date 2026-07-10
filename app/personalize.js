/* Cross-feature personalization engine — shared state graph for Āyus Platform v6 */
(function (global) {
  'use strict';

  var Store = {
    get: function (k, def) {
      try {
        var v = localStorage.getItem('ayus.' + k);
        return v == null ? def : JSON.parse(v);
      } catch (e) {
        return def;
      }
    },
    set: function (k, v) {
      try {
        localStorage.setItem('ayus.' + k, JSON.stringify(v));
        global.dispatchEvent(new CustomEvent('ayus:data', { detail: { key: k } }));
      } catch (e) {}
    }
  };

  function profile() {
    return Store.get('profile', { name: '', goals: [] }) || { name: '', goals: [] };
  }
  function prakriti() {
    return Store.get('prakriti', null);
  }
  function journal() {
    return Store.get('journal', []) || [];
  }
  function stack() {
    return Store.get('stack', []) || [];
  }
  function setStack(items) {
    Store.set('stack', items.slice(0, 40));
  }

  function moodEnergyTrend() {
    var entries = journal().slice(0, 14);
    if (!entries.length) return { mood: null, energy: null, label: 'No journal yet', n: 0 };
    var moodScore = { great: 5, good: 4, okay: 3, low: 2, bad: 1 };
    var m = 0,
      e = 0;
    entries.forEach(function (x) {
      m += moodScore[x.mood] || 3;
      e += x.energy || 3;
    });
    m /= entries.length;
    e /= entries.length;
    var label = m >= 3.6 && e >= 3.2 ? 'Steady' : m < 2.6 ? 'Needs rest' : 'Mixed';
    return { mood: +m.toFixed(1), energy: +e.toFixed(1), label: label, n: entries.length };
  }

  function scoreProduct(p) {
    var s = 0;
    var goals = profile().goals || [];
    var pr = prakriti();
    var dominant = pr && pr.dominant;
    var trend = moodEnergyTrend();

    (p.goals || []).forEach(function (g) {
      if (goals.indexOf(g) >= 0) s += 12;
    });
    if (dominant && (p.doshas || []).indexOf(dominant) >= 0) s += 8;
    if (trend.mood != null && trend.mood < 3 && (p.goals || []).indexOf('stress') >= 0) s += 6;
    if (trend.mood != null && trend.mood < 3 && (p.goals || []).indexOf('sleep') >= 0) s += 5;
    if (trend.energy != null && trend.energy < 2.8 && (p.goals || []).indexOf('energy') >= 0) s += 6;

    // Prefer gentler daily items first for new users
    if ((p.tags || []).indexOf('daily') >= 0) s += 2;
    if ((p.tags || []).indexOf('labs-required') >= 0) s -= 4;
    if ((p.tags || []).indexOf('advanced') >= 0) s -= 2;

    // Already in stack? slight boost for related, not duplicates
    var inStack = stack().some(function (x) {
      return x.productId === p.id;
    });
    if (inStack) s -= 20;

    return s;
  }

  function catalog() {
    return (global.AYUS_CATALOG && global.AYUS_CATALOG.products) || [];
  }

  function recommendations(limit) {
    limit = limit || 6;
    return catalog()
      .map(function (p) {
        return { product: p, score: scoreProduct(p) };
      })
      .filter(function (x) {
        return x.score > 0;
      })
      .sort(function (a, b) {
        return b.score - a.score;
      })
      .slice(0, limit);
  }

  function productsForGoal(goalId) {
    return catalog().filter(function (p) {
      return (p.goals || []).indexOf(goalId) >= 0;
    });
  }

  function productsForCondition(cid) {
    return catalog().filter(function (p) {
      return (p.conditions || []).indexOf(cid) >= 0;
    });
  }

  function productsForHerb(herbId) {
    return catalog().filter(function (p) {
      return p.links && p.links.herbs && p.links.herbs.indexOf(herbId) >= 0;
    });
  }

  function addToStack(productId, slot) {
    var p = catalog().find(function (x) {
      return x.id === productId;
    });
    if (!p) return { ok: false, reason: 'not_found' };
    var items = stack();
    if (items.some(function (x) {
      return x.productId === productId;
    }))
      return { ok: false, reason: 'duplicate' };
    items.unshift({
      productId: productId,
      slot: slot || 'morning',
      note: '',
      addedAt: Date.now()
    });
    setStack(items);
    return { ok: true, items: items };
  }

  function removeFromStack(productId) {
    setStack(
      stack().filter(function (x) {
        return x.productId !== productId;
      })
    );
  }

  function updateStackSlot(productId, slot) {
    var items = stack().map(function (x) {
      if (x.productId === productId) x.slot = slot;
      return x;
    });
    setStack(items);
  }

  function stackResolved() {
    var map = {};
    catalog().forEach(function (p) {
      map[p.id] = p;
    });
    return stack()
      .map(function (item) {
        return { item: item, product: map[item.productId] };
      })
      .filter(function (x) {
        return x.product;
      });
  }

  /** Guidance blurb combining all signals */
  function dailyGuide() {
    var p = profile();
    var pr = prakriti();
    var t = moodEnergyTrend();
    var recs = recommendations(3);
    var lines = [];
    if (p.name) lines.push('Focus today supports ' + (p.name || 'you') + '.');
    if (pr && pr.dominant) {
      var names = { vata: 'Vāta', pitta: 'Pitta', kapha: 'Kapha' };
      lines.push('Your prakṛti leans ' + (names[pr.dominant] || pr.dominant) + '—prefer routines that steady that pattern.');
    }
    if (t.n) lines.push('Journal pulse: mood ' + t.mood + '/5 · energy ' + t.energy + '/5 · ' + t.label + '.');
    else lines.push('Log mood once today so guidance can personalise further.');
    if ((p.goals || []).length) lines.push('Active goals: ' + p.goals.join(', ') + '.');
    if (recs.length)
      lines.push(
        'Catalog matches: ' +
          recs
            .map(function (r) {
              return r.product.name;
            })
            .join(', ') +
          '.'
      );
    if (stack().length) lines.push('You have ' + stack().length + ' item(s) in My Stack—keep timing consistent.');
    return {
      lines: lines,
      recs: recs,
      trend: t,
      goals: p.goals || [],
      dominant: pr && pr.dominant
    };
  }

  global.AyusPersonalize = {
    Store: Store,
    profile: profile,
    prakriti: prakriti,
    journal: journal,
    stack: stack,
    stackResolved: stackResolved,
    addToStack: addToStack,
    removeFromStack: removeFromStack,
    updateStackSlot: updateStackSlot,
    recommendations: recommendations,
    productsForGoal: productsForGoal,
    productsForCondition: productsForCondition,
    productsForHerb: productsForHerb,
    scoreProduct: scoreProduct,
    moodEnergyTrend: moodEnergyTrend,
    dailyGuide: dailyGuide,
    catalog: catalog
  };
})(window);
