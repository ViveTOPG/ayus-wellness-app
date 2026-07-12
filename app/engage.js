/* Āyus Engage v2–v5 — Instagram-style wellness feed, stories, reels, challenges */
(function () {
  'use strict';
  var DATA = window.AYUS_ENGAGE;
  if (!DATA) return;

  var Store = {
    get: function (k, d) {
      try {
        var v = localStorage.getItem('ayus.' + k);
        return v == null ? d : JSON.parse(v);
      } catch (e) {
        return d;
      }
    },
    set: function (k, v) {
      try {
        localStorage.setItem('ayus.' + k, JSON.stringify(v));
        window.dispatchEvent(new CustomEvent('ayus:data', { detail: { key: k } }));
      } catch (e) {}
    }
  };

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
    clearTimeout(window._ett);
    window._ett = setTimeout(function () {
      t.classList.remove('show');
    }, 2400);
  }
  function haptic() {
    try {
      if (navigator.vibrate) navigator.vibrate(8);
    } catch (e) {}
  }

  function likes() {
    return Store.get('likes', {}) || {};
  }
  function saves() {
    return Store.get('saves', {}) || {};
  }
  function seenStories() {
    return Store.get('storiesSeen', {}) || {};
  }
  function challengeProg() {
    return Store.get('challenges', {}) || {};
  }
  function achievements() {
    return Store.get('achievements', []) || [];
  }
  function xp() {
    return Store.get('xp', 0) || 0;
  }

  function toggleLike(id) {
    var L = likes();
    L[id] = !L[id];
    Store.set('likes', L);
    haptic();
    return L[id];
  }
  function toggleSave(id) {
    var S = saves();
    S[id] = !S[id];
    Store.set('saves', S);
    if (S[id]) unlock('saved_5');
    haptic();
    return S[id];
  }

  function unlock(aid) {
    var a = achievements();
    if (a.indexOf(aid) >= 0) return;
    // check conditions
    if (aid === 'saved_5') {
      var n = Object.keys(saves()).filter(function (k) {
        return saves()[k];
      }).length;
      if (n < 5) return;
    }
    if (aid === 'streak_3' || aid === 'streak_7') {
      var st = Store.get('streak', { count: 0 });
      if (aid === 'streak_3' && (st.count || 0) < 3) return;
      if (aid === 'streak_7' && (st.count || 0) < 7) return;
    }
    if (aid === 'stack_3') {
      var sk = Store.get('stack', []);
      if ((sk || []).length < 3) return;
    }
    if (aid === 'journal_3') {
      if ((Store.get('journal', []) || []).length < 3) return;
    }
    if (aid === 'prakriti' && !Store.get('prakriti')) return;
    a.push(aid);
    Store.set('achievements', a);
    Store.set('xp', xp() + 25);
    var meta = DATA.achievements.find(function (x) {
      return x.id === aid;
    });
    toast((meta ? meta.icon + ' ' + meta.title : 'Achievement') + ' unlocked');
    renderBadges();
  }

  function checkAutoUnlocks() {
    unlock('streak_3');
    unlock('streak_7');
    unlock('stack_3');
    unlock('journal_3');
    if (Store.get('prakriti')) unlock('prakriti');
  }

  /* ---------- Stories ---------- */
  var storyIdx = 0;
  function renderStories() {
    var rail = el('storiesRail');
    if (!rail) return;
    var seen = seenStories();
    rail.innerHTML = DATA.stories
      .map(function (s, i) {
        var on = !!seen[s.id];
        return (
          '<button type="button" class="story-ring ' +
          s.gradient +
          (on ? ' seen' : '') +
          '" data-action="openStory" data-i="' +
          i +
          '">' +
          '<span class="story-avatar has-photo" style="' +
          (window.AyusMedia ? window.AyusMedia.photoStyle('story', s.id, 200) : '') +
          '">' +
          s.icon +
          '</span>' +
          '<span class="story-label">' +
          esc(s.title) +
          '</span></button>'
        );
      })
      .join('');
  }

  function openStory(i) {
    storyIdx = +i || 0;
    var ov = el('storyOverlay');
    if (!ov) return;
    ov.classList.add('open');
    ov.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    paintStory();
  }
  function closeStory() {
    var ov = el('storyOverlay');
    if (!ov) return;
    ov.classList.remove('open');
    ov.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    renderStories();
  }
  function paintStory() {
    var s = DATA.stories[storyIdx];
    if (!s) {
      closeStory();
      return;
    }
    var seen = seenStories();
    seen[s.id] = true;
    Store.set('storiesSeen', seen);
    var segs = el('storySegments');
    if (segs) {
      segs.innerHTML = DATA.stories
        .map(function (_, i) {
          return '<i class="' + (i < storyIdx ? 'done' : i === storyIdx ? 'on' : '') + '"></i>';
        })
        .join('');
    }
    var body = el('storyBody');
    if (body) {
      body.className = 'story-body has-photo ' + s.gradient;
      if (window.AyusMedia) {
        body.style.backgroundImage = "url('" + window.AyusMedia.url('story', s.id, 1200) + "')";
      }
      body.innerHTML =
        '<div class="story-emoji">' +
        s.icon +
        '</div>' +
        '<h2>' +
        esc(s.title) +
        '</h2>' +
        '<p>' +
        esc(s.body) +
        '</p>' +
        '<button type="button" class="btn btn-gold btn-sm story-cta" data-action="storyCta" data-act="' +
        esc(s.action) +
        '">' +
        esc(s.cta) +
        '</button>';
    }
    // auto-advance bar
    var bar = el('storyProgress');
    if (bar) {
      bar.style.animation = 'none';
      void bar.offsetWidth;
      bar.style.animation = 'storyProg 4.5s linear forwards';
    }
    clearTimeout(window._storyT);
    window._storyT = setTimeout(function () {
      nextStory();
    }, 4500);
  }
  function nextStory() {
    if (storyIdx < DATA.stories.length - 1) {
      storyIdx++;
      paintStory();
    } else closeStory();
  }
  function prevStory() {
    if (storyIdx > 0) {
      storyIdx--;
      paintStory();
    }
  }

  /* ---------- Feed ---------- */
  function fmt(n) {
    if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
    return String(n);
  }

  function postCard(p) {
    var liked = !!likes()[p.id];
    var saved = !!saves()[p.id];
    var likeN = p.likes + (liked ? 1 : 0);
    var saveN = p.saves + (saved ? 1 : 0);
    var mediaAction = '';
    if (p.herbId) mediaAction = ' data-action="openHerb" data-id="' + esc(p.herbId) + '"';
    else if (p.productId) mediaAction = ' data-action="openProduct" data-id="' + esc(p.productId) + '"';
    else if (p.type === 'reel') mediaAction = ' data-action="openReel" data-id="' + esc(p.id) + '"';

    return (
      '<article class="ig-post" data-id="' +
      esc(p.id) +
      '">' +
      '<header class="ig-post-head">' +
      '<div class="ig-avatar">' +
      p.avatar +
      '</div>' +
      '<div class="ig-meta"><b>' +
      esc(p.author) +
      '</b><span>' +
      esc(p.handle) +
      '</span></div>' +
      (p.type === 'reel' ? '<span class="ig-badge">Reel</span>' : '') +
      '</header>' +
      '<div class="ig-media has-photo ' +
      esc(p.media || '') +
      '" style="' +
      (window.AyusMedia
        ? window.AyusMedia.photoStyle(p.herbId ? 'herb' : 'post', p.herbId || p.id, 1000)
        : '') +
      '"' +
      mediaAction +
      ' role="button" tabindex="0">' +
      '<div class="ig-media-inner">' +
      '<span class="ig-media-kicker">' +
      esc(p.type) +
      '</span>' +
      '<h3>' +
      esc(p.title) +
      '</h3>' +
      (p.duration ? '<span class="ig-dur">' + esc(p.duration) + '</span>' : '') +
      '</div></div>' +
      '<div class="ig-actions">' +
      '<button type="button" class="ig-act' +
      (liked ? ' on' : '') +
      '" data-action="toggleLike" data-id="' +
      esc(p.id) +
      '" aria-pressed="' +
      liked +
      '"><span class="ig-heart">' +
      (liked ? '♥' : '♡') +
      '</span></button>' +
      '<button type="button" class="ig-act' +
      (saved ? ' on' : '') +
      '" data-action="toggleSave" data-id="' +
      esc(p.id) +
      '" aria-pressed="' +
      saved +
      '">' +
      (saved ? '🔖' : '📑') +
      '</button>' +
      '<button type="button" class="ig-act" data-action="sharePost" data-id="' +
      esc(p.id) +
      '">↗</button>' +
      '</div>' +
      '<div class="ig-counts"><b>' +
      fmt(likeN) +
      ' likes</b> · ' +
      fmt(saveN) +
      ' saves</div>' +
      '<div class="ig-caption"><b>' +
      esc(p.handle) +
      '</b> ' +
      esc(p.body) +
      '</div>' +
      '<div class="ig-tags">' +
      (p.tags || [])
        .map(function (t) {
          return '<span>#' + esc(t) + '</span>';
        })
        .join('') +
      '</div></article>'
    );
  }

  function renderFeed() {
    var feed = el('igFeed');
    if (!feed) return;
    var posts = DATA.posts.slice();
    // personalize order: challenges + goals boost
    var goals = (Store.get('profile', {}) || {}).goals || [];
    posts.sort(function (a, b) {
      var sa = 0,
        sb = 0;
      (a.tags || []).forEach(function (t) {
        if (goals.indexOf(t) >= 0) sa += 2;
      });
      (b.tags || []).forEach(function (t) {
        if (goals.indexOf(t) >= 0) sb += 2;
      });
      if (a.type === 'challenge') sa += 1;
      if (b.type === 'challenge') sb += 1;
      return sb - sa;
    });
    feed.innerHTML = posts.map(postCard).join('');
  }

  /* ---------- Explore grid ---------- */
  function renderExplore() {
    var g = el('exploreGrid');
    if (!g) return;
    var items = DATA.posts.concat(
      ((window.AYUS_CATALOG && window.AYUS_CATALOG.products) || []).slice(0, 8).map(function (p) {
        return {
          id: 'cat_' + p.id,
          type: 'catalog',
          title: p.name,
          media: 'gradient-sage',
          productId: p.id,
          avatar: '✦',
          author: 'Catalog',
          handle: '@catalog',
          body: p.summary,
          tags: p.tags || [],
          likes: 100,
          saves: 40
        };
      })
    );
    g.innerHTML = items
      .map(function (p, i) {
        var tall = i % 5 === 0 ? ' tall' : '';
        var photo =
          window.AyusMedia
            ? window.AyusMedia.photoStyle(
                p.herbId ? 'herb' : p.productId ? 'photo' : 'post',
                p.herbId || p.productId || p.id,
                700
              )
            : '';
        return (
          '<button type="button" class="explore-tile has-photo ' +
          esc(p.media || '') +
          tall +
          '" style="' +
          photo +
          '" data-action="exploreOpen" data-id="' +
          esc(p.id) +
          '">' +
          '<span class="et-title">' +
          esc(p.title) +
          '</span></button>'
        );
      })
      .join('');
  }

  /* ---------- Reels ---------- */
  function renderReels() {
    var rail = el('reelsRail');
    if (!rail) return;
    var reels = DATA.posts.filter(function (p) {
      return p.type === 'reel';
    });
    // include synthetic reels from tips
    rail.innerHTML = reels
      .map(function (p) {
        return (
          '<article class="reel-card has-photo ' +
          esc(p.media || '') +
          '" style="' +
          (window.AyusMedia ? window.AyusMedia.photoStyle('post', p.id, 800) : '') +
          '">' +
          '<div class="reel-top"><span class="reel-live">REEL</span><span>' +
          esc(p.duration || '0:30') +
          '</span></div>' +
          '<div class="reel-mid"><h2>' +
          esc(p.title) +
          '</h2><p>' +
          esc(p.body) +
          '</p></div>' +
          '<div class="reel-side">' +
          '<button type="button" data-action="toggleLike" data-id="' +
          esc(p.id) +
          '">♥<small>' +
          fmt(p.likes) +
          '</small></button>' +
          '<button type="button" data-action="toggleSave" data-id="' +
          esc(p.id) +
          '">🔖</button>' +
          '</div></article>'
        );
      })
      .join('');
  }

  /* ---------- Challenges / XP ---------- */
  function renderChallenges() {
    var box = el('challengeList');
    if (!box) return;
    var prog = challengeProg();
    var habits = Store.get('habits', { done: {} }) || { done: {} };
    box.innerHTML = DATA.challenges
      .map(function (c) {
        var p = prog[c.id] || { days: 0, doneToday: false };
        // auto count from habit if matching
        if (c.habit && habits.done && habits.done[c.habit] && !p.doneToday) {
          /* display only — progress updated on habit toggle via hook */
        }
        var pct = Math.min(100, Math.round((p.days / c.days) * 100));
        return (
          '<div class="chal-card">' +
          '<div class="chal-top"><b>' +
          esc(c.title) +
          '</b><span>+' +
          c.xp +
          ' XP</span></div>' +
          '<div class="chal-bar"><i style="width:' +
          pct +
          '%"></i></div>' +
          '<div class="chal-meta">' +
          (p.days || 0) +
          '/' +
          c.days +
          ' days · reward: ' +
          esc(c.reward) +
          '</div>' +
          '<button type="button" class="btn btn-ghost btn-sm" data-action="bumpChallenge" data-id="' +
          esc(c.id) +
          '">Log today</button></div>'
        );
      })
      .join('');
  }

  function bumpChallenge(id) {
    var c = DATA.challenges.find(function (x) {
      return x.id === id;
    });
    if (!c) return;
    var prog = challengeProg();
    var p = prog[id] || { days: 0, last: null };
    var day = new Date().toISOString().slice(0, 10);
    if (p.last === day) {
      toast('Already logged today');
      return;
    }
    p.days = (p.days || 0) + 1;
    p.last = day;
    prog[id] = p;
    Store.set('challenges', prog);
    Store.set('xp', xp() + 10);
    if (p.days >= c.days) toast('Challenge complete · ' + c.reward);
    else toast('Day ' + p.days + '/' + c.days);
    renderChallenges();
    renderBadges();
  }

  function renderBadges() {
    var box = el('badgeRow');
    var xpEl = el('xpChip');
    if (xpEl) xpEl.textContent = xp() + ' XP';
    if (!box) return;
    var got = achievements();
    box.innerHTML = DATA.achievements
      .map(function (a) {
        var on = got.indexOf(a.id) >= 0;
        return (
          '<div class="badge-pill' +
          (on ? ' on' : '') +
          '" title="' +
          esc(a.desc) +
          '"><span>' +
          a.icon +
          '</span><b>' +
          esc(a.title) +
          '</b></div>'
        );
      })
      .join('');
  }

  /* ---------- Home compose ---------- */
  function renderEngageHome() {
    var shell = el('engageHome');
    if (!shell) return;
    var onboarded =
      Store.get('onboarded', false) ||
      !!(Store.get('profile', {}) || {}).name ||
      ((Store.get('profile', {}) || {}).goals || []).length;
    shell.hidden = !onboarded;
    if (!onboarded) return;
    renderStories();
    renderFeed();
    renderChallenges();
    renderBadges();
    checkAutoUnlocks();
  }

  function showScreen(id) {
    document.querySelectorAll('.screen').forEach(function (s) {
      s.classList.remove('active');
    });
    var t = el(id);
    if (t) t.classList.add('active');
    document.querySelectorAll('.bottom-nav button[data-screen], .nav button[data-screen]').forEach(function (b) {
      if (b.dataset.screen === id) b.setAttribute('aria-current', 'page');
      else b.removeAttribute('aria-current');
    });
    try {
      window.scrollTo({ top: 0, behavior: 'auto' });
    } catch (e) {
      window.scrollTo(0, 0);
    }
  }

  function runAction(act) {
    if (!act) return;
    if (act === 'startCheckin') {
      var b = document.querySelector('[data-action="startCheckin"]');
      if (b) b.click();
    } else if (act === 'openQuiz') {
      var q = document.querySelector('[data-action="openQuiz"]');
      if (q) q.click();
    } else if (act.indexOf('openHerb:') === 0) {
      var hid = act.split(':')[1];
      var btn = document.createElement('button');
      btn.dataset.action = 'openHerb';
      btn.dataset.id = hid;
      btn.style.display = 'none';
      document.body.appendChild(btn);
      btn.click();
      btn.remove();
    } else if (act.indexOf('go:') === 0) {
      var go = act.slice(3);
      if (go === 'market' && window.AyusPlatform) window.AyusPlatform.goMarket();
      else if (go === 'stack' && window.AyusPlatform) window.AyusPlatform.goStack();
      else if (go === 'heritage') {
        var h = document.querySelector('[data-action="go:heritage"]');
        if (h) h.click();
      } else if (go === 'explore') {
        showScreen('explore');
        renderExplore();
      } else if (go === 'reels') {
        showScreen('reels');
        renderReels();
      }
    } else if (act.indexOf('habit:') === 0) {
      var hid2 = act.split(':')[1];
      var hb = document.querySelector('[data-action="toggleHabit"][data-id="' + hid2 + '"]');
      if (hb) hb.click();
      else toast('Open Today to complete rituals');
    } else if (act.indexOf('savePost:') === 0) {
      toggleSave(act.split(':')[1]);
      toast('Saved');
    }
    closeStory();
  }

  document.addEventListener('click', function (e) {
    var n = e.target.closest('[data-action]');
    if (!n) {
      // story tap zones
      if (e.target.closest('#storyTapLeft')) {
        prevStory();
        return;
      }
      if (e.target.closest('#storyTapRight')) {
        nextStory();
        return;
      }
      return;
    }
    var act = n.dataset.action;
    if (act === 'openStory') openStory(n.dataset.i);
    else if (act === 'closeStory') closeStory();
    else if (act === 'storyCta') runAction(n.dataset.act);
    else if (act === 'toggleLike') {
      var on = toggleLike(n.dataset.id);
      n.classList.toggle('on', on);
      n.setAttribute('aria-pressed', on);
      var heart = n.querySelector('.ig-heart');
      if (heart) {
        heart.textContent = on ? '♥' : '♡';
        heart.classList.add('pop');
        setTimeout(function () {
          heart.classList.remove('pop');
        }, 400);
      }
      // double-tap style on media
      renderFeed();
    } else if (act === 'toggleSave') {
      toggleSave(n.dataset.id);
      renderFeed();
      toast(saves()[n.dataset.id] ? 'Saved to collection' : 'Removed save');
    } else if (act === 'sharePost') {
      var post = DATA.posts.find(function (p) {
        return p.id === n.dataset.id;
      });
      var text = post ? post.title + ' — via Āyus' : 'Āyus wellness';
      if (navigator.share) navigator.share({ title: 'Āyus', text: text }).catch(function () {});
      else {
        try {
          navigator.clipboard.writeText(text);
          toast('Copied');
        } catch (err) {
          toast(text);
        }
      }
    } else if (act === 'go:explore') {
      showScreen('explore');
      renderExplore();
    } else if (act === 'go:reels') {
      showScreen('reels');
      renderReels();
    } else if (act === 'bumpChallenge') bumpChallenge(n.dataset.id);
    else if (act === 'exploreOpen') {
      var pid = n.dataset.id;
      if (pid.indexOf('cat_') === 0 && window.AyusPlatform) {
        window.AyusPlatform.openProduct(pid.slice(4));
      } else {
        var post2 = DATA.posts.find(function (p) {
          return p.id === pid;
        });
        if (post2 && post2.herbId) runAction('openHerb:' + post2.herbId);
        else if (post2 && post2.productId && window.AyusPlatform) window.AyusPlatform.openProduct(post2.productId);
        else toast(post2 ? post2.title : 'Open from feed');
      }
    } else if (act === 'openReel') {
      showScreen('reels');
      renderReels();
    } else if (act === 'doubleLike') {
      /* handled on dblclick */
    }
  });

  // double-tap like on media
  document.addEventListener('dblclick', function (e) {
    var media = e.target.closest('.ig-media');
    if (!media) return;
    var art = media.closest('.ig-post');
    if (!art) return;
    var id = art.dataset.id;
    if (!likes()[id]) toggleLike(id);
    // heart burst
    var burst = document.createElement('div');
    burst.className = 'like-burst';
    burst.textContent = '♥';
    media.appendChild(burst);
    setTimeout(function () {
      burst.remove();
    }, 700);
    renderFeed();
  });

  window.AyusEngage = {
    render: renderEngageHome,
    renderExplore: renderExplore,
    renderReels: renderReels,
    unlock: unlock,
    checkAutoUnlocks: checkAutoUnlocks
  };

  function boot() {
    renderEngageHome();
    var home = el('home');
    if (home) {
      new MutationObserver(function () {
        if (home.classList.contains('active')) renderEngageHome();
      }).observe(home, { attributes: true, attributeFilter: ['class'] });
    }
    window.addEventListener('ayus:data', function (ev) {
      if (ev.detail && (ev.detail.key === 'habits' || ev.detail.key === 'journal' || ev.detail.key === 'streak')) {
        checkAutoUnlocks();
        renderChallenges();
        renderBadges();
      }
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else setTimeout(boot, 80);
})();
