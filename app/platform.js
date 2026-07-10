/* Āyus Platform v6 — Market, Stack, Guide integration */
(function () {
  'use strict';
  var P = window.AyusPersonalize;
  var icon = window.ayusIcon || function () { return ''; };
  if (!P) return;

  function el(id) {
    return document.getElementById(id);
  }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function toast(msg) {
    var t = el('toast');
    if (!t) return;
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(window._ptt);
    window._ptt = setTimeout(function () {
      t.classList.remove('show');
    }, 2600);
  }

  var marketState = { q: '', cat: 'all', sort: 'for_you' };

  function showScreen(id) {
    document.querySelectorAll('.screen').forEach(function (s) {
      s.classList.remove('active');
    });
    var t = el(id);
    if (t) t.classList.add('active');
    document
      .querySelectorAll('.nav button[data-screen], .bottom-nav button[data-screen], .mobile-nav-panel button[data-screen]')
      .forEach(function (b) {
        if (b.dataset.screen === id) b.setAttribute('aria-current', 'page');
        else b.removeAttribute('aria-current');
      });
    try {
      window.scrollTo({ top: 0, behavior: 'auto' });
    } catch (e) {
      window.scrollTo(0, 0);
    }
    document.body.classList.remove('nav-open');
    var mn = el('mobileNav');
    if (mn) {
      mn.classList.remove('open');
      mn.setAttribute('aria-hidden', 'true');
    }
  }

  function goMarket() {
    showScreen('market');
    renderMarket();
  }
  function goStack() {
    showScreen('stack');
    renderStack();
  }

  function productCard(p, score) {
    var cats = (window.AYUS_CATALOG && window.AYUS_CATALOG.meta.categories) || [];
    var cat = cats.find(function (c) {
      return c.id === p.category;
    });
    var scoreHtml =
      score != null
        ? '<span class="pc-score" title="Personal match">Match ' + Math.min(99, Math.round(score)) + '</span>'
        : '';
    return (
      '<article class="product-card reveal in" data-action="openProduct" data-id="' +
      esc(p.id) +
      '">' +
      '<div class="pc-top">' +
      '<span class="pc-cat">' +
      esc(cat ? cat.label : p.category) +
      '</span>' +
      scoreHtml +
      '</div>' +
      '<h3 class="pc-name">' +
      esc(p.name) +
      '</h3>' +
      (p.sanskrit ? '<div class="pc-sk">' + esc(p.sanskrit) + '</div>' : '') +
      '<div class="pc-form">' +
      esc(p.form || '') +
      '</div>' +
      '<p class="pc-sum">' +
      esc(p.summary) +
      '</p>' +
      '<div class="pc-tags">' +
      (p.goals || [])
        .slice(0, 3)
        .map(function (g) {
          return '<span class="pc-tag">' + esc(g) + '</span>';
        })
        .join('') +
      '</div>' +
      '<div class="pc-actions">' +
      '<button type="button" class="btn btn-ghost btn-sm" data-action="openProduct" data-id="' +
      esc(p.id) +
      '">Details</button>' +
      '<button type="button" class="btn btn-primary btn-sm" data-action="addStack" data-id="' +
      esc(p.id) +
      '">' +
      icon('plus', 'i-sm') +
      ' Stack</button>' +
      '</div></article>'
    );
  }

  function renderMarket() {
    var body = el('marketBody');
    if (!body) return;
    var guide = P.dailyGuide();
    var list = P.catalog().slice();

    if (marketState.cat !== 'all') {
      list = list.filter(function (p) {
        return p.category === marketState.cat;
      });
    }
    if (marketState.q.trim()) {
      var q = marketState.q.toLowerCase();
      list = list.filter(function (p) {
        var hay = [p.name, p.sanskrit, p.summary, p.form, (p.tags || []).join(' '), (p.goals || []).join(' ')]
          .join(' ')
          .toLowerCase();
        return hay.indexOf(q) >= 0;
      });
    }

    var scored = list.map(function (p) {
      return { p: p, s: P.scoreProduct(p) };
    });
    if (marketState.sort === 'for_you') {
      scored.sort(function (a, b) {
        return b.s - a.s;
      });
    } else {
      scored.sort(function (a, b) {
        return a.p.name.localeCompare(b.p.name);
      });
    }

    var cats = (window.AYUS_CATALOG && window.AYUS_CATALOG.meta.categories) || [];
    var catHtml =
      '<button type="button" class="fchip' +
      (marketState.cat === 'all' ? ' selected' : '') +
      '" data-action="marketCat" data-cat="all">All</button>' +
      cats
        .map(function (c) {
          return (
            '<button type="button" class="fchip' +
            (marketState.cat === c.id ? ' selected' : '') +
            '" data-action="marketCat" data-cat="' +
            esc(c.id) +
            '">' +
            esc(c.label) +
            '</button>'
          );
        })
        .join('');

    var recStrip = '';
    if (guide.recs.length) {
      recStrip =
        '<div class="market-rec strip-card">' +
        '<div class="strip-label">' +
        icon('spark', 'i-sm') +
        ' For your profile</div>' +
        '<div class="rec-chips">' +
        guide.recs
          .map(function (r) {
            return (
              '<button type="button" class="rec-chip" data-action="openProduct" data-id="' +
              esc(r.product.id) +
              '">' +
              esc(r.product.name) +
              '<span>+' +
              Math.round(r.score) +
              '</span></button>'
            );
          })
          .join('') +
        '</div></div>';
    }

    body.innerHTML =
      '<div class="market-head">' +
      recStrip +
      '<div class="searchbar market-search">' +
      icon('search', 'si') +
      '<input id="marketSearch" type="search" placeholder="Search vitamins, herbs, formulas…" value="' +
      esc(marketState.q) +
      '" aria-label="Search catalog" />' +
      '</div>' +
      '<div class="lib-filters market-filters" role="group">' +
      catHtml +
      '</div>' +
      '<div class="market-sort">' +
      '<button type="button" class="tchip' +
      (marketState.sort === 'for_you' ? ' selected' : '') +
      '" data-action="marketSort" data-sort="for_you">For you</button>' +
      '<button type="button" class="tchip' +
      (marketState.sort === 'az' ? ' selected' : '') +
      '" data-action="marketSort" data-sort="az">A–Z</button>' +
      '</div>' +
      '<p class="market-disclaimer muted">' +
      esc(window.AYUS_CATALOG.meta.disclaimer) +
      '</p>' +
      '</div>' +
      '<div class="product-grid">' +
      (scored.length
        ? scored
            .map(function (x) {
              return productCard(x.p, marketState.sort === 'for_you' ? x.s : null);
            })
            .join('')
        : '<p class="empty-state">No matches — try another word or category.</p>') +
      '</div>';

    var inp = el('marketSearch');
    if (inp) {
      inp.addEventListener('input', function (e) {
        marketState.q = e.target.value;
        renderMarket();
        var n = el('marketSearch');
        if (n) {
          n.focus();
          try {
            n.setSelectionRange(n.value.length, n.value.length);
          } catch (err) {}
        }
      });
    }
  }

  function openProduct(id) {
    var p = P.catalog().find(function (x) {
      return x.id === id;
    });
    if (!p) return;
    var slots = (window.AYUS_CATALOG && window.AYUS_CATALOG.stack_slots) || [];
    var slotOpts = slots
      .map(function (s) {
        return '<option value="' + esc(s.id) + '">' + esc(s.label) + '</option>';
      })
      .join('');
    var safety = (p.safety || [])
      .map(function (s) {
        return '<li>' + esc(s) + '</li>';
      })
      .join('');
    var goals = (p.goals || [])
      .map(function (g) {
        return '<span class="pc-tag">' + esc(g) + '</span>';
      })
      .join('');
    var herbLinks = '';
    if (p.links && p.links.herbs && window.AYUR && window.AYUR.herbs) {
      herbLinks = p.links.herbs
        .map(function (hid) {
          var h = window.AYUR.herbs.find(function (x) {
            return x.id === hid;
          });
          return h
            ? '<button type="button" class="fav-chip" data-action="openHerb" data-id="' +
                esc(h.id) +
                '">' +
                esc(h.common_name) +
                ' ›</button>'
            : '';
        })
        .join('');
    }
    var html =
      '<div class="modal-head">' +
      '<button class="modal-close" data-action="closeModal" aria-label="Close">×</button>' +
      '<div class="mh-name" id="modalTitle">' +
      esc(p.name) +
      '</div>' +
      (p.sanskrit ? '<span class="mh-sk">' + esc(p.sanskrit) + '</span>' : '') +
      '<div class="mh-bot">' +
      esc(p.form || '') +
      ' · ' +
      esc(p.category) +
      '</div></div>' +
      '<div class="modal-body">' +
      '<p class="lead-view">' +
      esc(p.summary) +
      '</p>' +
      '<div class="modal-section-title">Why it may fit you</div>' +
      '<div class="pc-tags">' +
      goals +
      '</div>' +
      '<div class="prop" style="margin-top:14px"><div class="pk">Evidence note</div><div class="pv">' +
      esc(p.evidence_note || '—') +
      '</div></div>' +
      '<div class="prop"><div class="pk">Typical use</div><div class="pv">' +
      esc(p.typical_use || '—') +
      '</div></div>' +
      (p.lab_hint
        ? '<div class="prop"><div class="pk">Lab tip</div><div class="pv">' + esc(p.lab_hint) + '</div></div>'
        : '') +
      (safety ? '<div class="modal-section-title">Safety & cautions</div><ul class="safety-list">' + safety + '</ul>' : '') +
      (herbLinks
        ? '<div class="modal-section-title">Linked herbs in Āyus library</div><div class="fav-chips">' +
          herbLinks +
          '</div>'
        : '') +
      '<div class="modal-section-title">Add to My Stack</div>' +
      '<div class="stack-add-row">' +
      '<label class="sr-only" for="stackSlotPick">Time of day</label>' +
      '<select id="stackSlotPick" class="stack-select">' +
      slotOpts +
      '</select>' +
      '<button type="button" class="btn btn-primary btn-sm" data-action="addStackSlot" data-id="' +
      esc(p.id) +
      '">Add to stack</button>' +
      '</div>' +
      '<p class="muted" style="margin-top:16px;font-size:13px">Educational only — verify with a qualified professional before starting any supplement or medicine.</p>' +
      '<div class="modal-cta"><button class="btn btn-ghost btn-sm" data-action="closeModal">Close</button></div>' +
      '</div>';

    // Reuse app modal
    var card = el('modalCard');
    var m = el('modal');
    if (!card || !m) return;
    card.innerHTML = html;
    m.classList.add('open');
    m.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }

  function renderStack() {
    var body = el('stackBody');
    if (!body) return;
    var items = P.stackResolved();
    var slots = (window.AYUS_CATALOG && window.AYUS_CATALOG.stack_slots) || [];
    var bySlot = {};
    slots.forEach(function (s) {
      bySlot[s.id] = [];
    });
    items.forEach(function (x) {
      var slot = x.item.slot || 'as_needed';
      if (!bySlot[slot]) bySlot[slot] = [];
      bySlot[slot].push(x);
    });

    var guide = P.dailyGuide();
    var html =
      '<div class="stack-hero strip-card">' +
      '<div class="strip-label">' +
      icon('stack', 'i-sm') +
      ' Your regimen graph</div>' +
      '<p>Items here feed <strong>Today</strong> recommendations and stay private on this device. Timing keeps dinacharya coherent.</p>' +
      '<div class="stack-stats">' +
      '<div><b>' +
      items.length +
      '</b><span>in stack</span></div>' +
      '<div><b>' +
      (guide.goals.length || 0) +
      '</b><span>goals</span></div>' +
      '<div><b>' +
      (guide.trend.n || 0) +
      '</b><span>journal days</span></div>' +
      '</div>' +
      '<button type="button" class="btn btn-primary btn-sm" data-action="go:market">Browse catalog</button>' +
      '</div>';

    if (!items.length) {
      html +=
        '<div class="empty-state card-empty">' +
        icon('capsule', 'i-lg') +
        '<h3>Build your stack</h3><p>Add vitamins, classical formulas, or nutraceuticals that match your goals and constitution.</p>' +
        '<button type="button" class="btn btn-gold" data-action="go:market">Open catalog</button></div>';
      body.innerHTML = html;
      return;
    }

    slots.forEach(function (s) {
      var list = bySlot[s.id] || [];
      if (!list.length) return;
      html += '<div class="stack-slot-block"><h3>' + esc(s.label) + ' <span class="muted">' + esc(s.sk) + '</span></h3><div class="stack-list">';
      list.forEach(function (x) {
        var p = x.product;
        html +=
          '<div class="stack-item">' +
          '<div class="si-main">' +
          '<div class="si-name">' +
          esc(p.name) +
          '</div>' +
          '<div class="si-meta">' +
          esc(p.form || '') +
          '</div>' +
          '</div>' +
          '<select class="stack-select sm" data-action="changeSlot" data-id="' +
          esc(p.id) +
          '" aria-label="Time slot">' +
          slots
            .map(function (ss) {
              return (
                '<option value="' +
                esc(ss.id) +
                '"' +
                (ss.id === x.item.slot ? ' selected' : '') +
                '>' +
                esc(ss.label) +
                '</option>'
              );
            })
            .join('') +
          '</select>' +
          '<button type="button" class="icon-btn" data-action="removeStack" data-id="' +
          esc(p.id) +
          '" aria-label="Remove">×</button>' +
          '</div>';
      });
      html += '</div></div>';
    });

    html +=
      '<div class="stack-safety strip-card warn">' +
      icon('shield', 'i-sm') +
      ' <div><strong>Safety first.</strong> Cross-check interactions with your clinician or pharmacist—especially for thyroid, blood thinners, pregnancy, and polypharmacy. Āyus does not sell or prescribe.</div></div>';

    body.innerHTML = html;
  }

  function enhanceToday() {
    var mount = el('platformGuide');
    if (!mount) return;
    if (!P.Store.get('onboarded', false) && !(P.profile().name || (P.profile().goals || []).length)) {
      mount.innerHTML = '';
      mount.hidden = true;
      return;
    }
    mount.hidden = false;
    var g = P.dailyGuide();
    var recHtml = g.recs.length
      ? '<div class="guide-recs">' +
        g.recs
          .map(function (r) {
            return (
              '<button type="button" class="guide-rec" data-action="openProduct" data-id="' +
              esc(r.product.id) +
              '"><span class="gr-name">' +
              esc(r.product.name) +
              '</span><span class="gr-meta">' +
              esc(r.product.form || '') +
              '</span></button>'
            );
          })
          .join('') +
        '</div>'
      : '<p class="muted">Set goals in Profile to unlock catalog matches.</p>';

    var stackN = P.stack().length;
    mount.innerHTML =
      '<div class="dash-card platform-guide reveal in">' +
      '<div class="dash-card-head"><h3>Personal guide</h3>' +
      '<button type="button" class="btn btn-ghost btn-sm" data-action="go:stack">Stack (' +
      stackN +
      ')</button></div>' +
      '<ul class="guide-lines">' +
      g.lines
        .map(function (l) {
          return '<li>' + esc(l) + '</li>';
        })
        .join('') +
      '</ul>' +
      '<div class="guide-label">Suggested from your data</div>' +
      recHtml +
      '<div class="guide-links">' +
      '<button type="button" class="btn btn-primary btn-sm" data-action="go:market">Catalog</button>' +
      '<button type="button" class="btn btn-ghost btn-sm" data-action="go:journal">Journal</button>' +
      '</div></div>';
  }

  function injectResultProducts(conditionId) {
    var mount = el('resultCatalogMount');
    if (!mount) return;
    var list = P.productsForCondition(conditionId).slice(0, 4);
    if (!list.length) {
      // fallback to goals
      list = P.recommendations(3).map(function (r) {
        return r.product;
      });
    }
    if (!list.length) {
      mount.innerHTML = '';
      return;
    }
    mount.innerHTML =
      '<div class="section-head" style="margin:40px auto 16px"><div class="kicker">Catalog bridge</div>' +
      '<h2 style="font-size:clamp(26px,5vw,40px)">Related vitamins & formulas</h2>' +
      '<p>Educational matches from the nutraceutical & classical catalog—linked to your concern and goals.</p></div>' +
      '<div class="product-grid compact">' +
      list
        .map(function (p) {
          return productCard(p, P.scoreProduct(p));
        })
        .join('') +
      '</div>' +
      '<p class="muted text-center" style="margin-top:12px;font-size:13px">Not prescriptions. Confirm with a qualified professional.</p>';
  }

  // Observe result renders
  var resultObserver;
  function watchResult() {
    var rb = el('resultBody');
    if (!rb || resultObserver) return;
    resultObserver = new MutationObserver(function () {
      // find condition from routineCache if exposed — use last open concern via data
      var title = rb.querySelector('.result-hero h2');
      // try match condition by name
      var cid = null;
      if (window.AYUR && window.AYUR.conditions && title) {
        var name = title.textContent.trim();
        var c = window.AYUR.conditions.find(function (x) {
          return x.name === name;
        });
        if (c) cid = c.id;
      }
      // inject mount if missing
      if (!el('resultCatalogMount')) {
        var d = document.createElement('div');
        d.id = 'resultCatalogMount';
        rb.appendChild(d);
      }
      injectResultProducts(cid);
    });
    resultObserver.observe(rb, { childList: true });
  }

  document.addEventListener('click', function (e) {
    var node = e.target.closest('[data-action]');
    if (!node) return;
    var act = node.dataset.action;
    if (act === 'go:market') {
      e.preventDefault();
      goMarket();
    } else if (act === 'go:stack') {
      e.preventDefault();
      goStack();
    } else if (act === 'marketCat') {
      marketState.cat = node.dataset.cat || 'all';
      renderMarket();
    } else if (act === 'marketSort') {
      marketState.sort = node.dataset.sort || 'for_you';
      renderMarket();
    } else if (act === 'openProduct') {
      e.preventDefault();
      e.stopPropagation();
      openProduct(node.dataset.id);
    } else if (act === 'addStack') {
      e.preventDefault();
      e.stopPropagation();
      var r = P.addToStack(node.dataset.id, 'morning');
      if (r.ok) toast('Added to My Stack');
      else if (r.reason === 'duplicate') toast('Already in your stack');
      enhanceToday();
    } else if (act === 'addStackSlot') {
      e.preventDefault();
      var sel = el('stackSlotPick');
      var slot = sel ? sel.value : 'morning';
      var r2 = P.addToStack(node.dataset.id, slot);
      if (r2.ok) toast('Added to My Stack');
      else if (r2.reason === 'duplicate') toast('Already in your stack');
      var m = el('modal');
      if (m) {
        m.classList.remove('open');
        document.body.style.overflow = '';
      }
      enhanceToday();
    } else if (act === 'removeStack') {
      P.removeFromStack(node.dataset.id);
      toast('Removed from stack');
      renderStack();
      enhanceToday();
    }
  });

  document.addEventListener('change', function (e) {
    var t = e.target;
    if (t && t.dataset && t.dataset.action === 'changeSlot') {
      P.updateStackSlot(t.dataset.id, t.value);
      toast('Timing updated');
      renderStack();
    }
  });

  // After app paints Today
  globalThis.AyusPlatform = {
    goMarket: goMarket,
    goStack: goStack,
    enhanceToday: enhanceToday,
    renderMarket: renderMarket,
    renderStack: renderStack,
    openProduct: openProduct
  };

  function boot() {
    watchResult();
    enhanceToday();
    // Re-enhance when storage changes or screen might be home
    window.addEventListener('ayus:data', function () {
      enhanceToday();
    });
    // Hook into navigation: when home becomes active
    var home = el('home');
    if (home) {
      var ho = new MutationObserver(function () {
        if (home.classList.contains('active')) enhanceToday();
      });
      ho.observe(home, { attributes: true, attributeFilter: ['class'] });
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else setTimeout(boot, 50);
})();
