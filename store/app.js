(() => {
  'use strict';

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------------- data (all made up) ---------------- */

  const GAMES = [
    { name: 'Vanta Strike', genre: 'Tactical shooter' },
    { name: 'Null Sector', genre: 'Extraction shooter' },
    { name: 'Ironveil', genre: 'Dungeon raids' },
    { name: 'Dead Orbit', genre: 'Space combat' },
    { name: 'Kilo Royale', genre: 'Battle royale' },
  ];

  const DURATIONS = [
    { id: 'd1', label: '1 day', days: 1, mult: 0.14 },
    { id: 'd7', label: '7 days', days: 7, mult: 0.42 },
    { id: 'd30', label: '30 days', days: 30, mult: 1 },
    { id: 'life', label: 'Lifetime', days: null, mult: 3.6 },
  ];

  const PRODUCTS = [
    { id: 'halo', name: 'Halo Aim', game: 'Vanta Strike', cat: 'Aim', base: 24.9, sold: 1840,
      desc: 'Aim assist with a curve that looks like a human hand, not a script.',
      feats: ['Adjustable field of view', 'Bone priority per weapon', 'Recoil control'] },
    { id: 'outline', name: 'Outline', game: 'Vanta Strike', cat: 'Visuals', base: 19.9, sold: 2210,
      desc: 'Player boxes, health and distance, drawn clean so they never clutter a fight.',
      feats: ['Box, skeleton and head dot', 'Visible-only filter', 'Stream-proof overlay'] },
    { id: 'sweep', name: 'Sweep Radar', game: 'Null Sector', cat: 'Utility', base: 14.9, sold: 960,
      desc: 'A second-screen radar that runs in your browser, off the game machine.',
      feats: ['Phone and tablet view', 'Loot and vehicle markers', 'Zero in-game overlay'] },
    { id: 'steady', name: 'Steady', game: 'Null Sector', cat: 'Aim', base: 17.9, sold: 1320,
      desc: 'Recoil and spread compensation for every weapon, tuned per attachment.',
      feats: ['Per-weapon profiles', 'Randomised compensation', 'Toggle on a key'] },
    { id: 'lantern', name: 'Lantern', game: 'Ironveil', cat: 'Visuals', base: 21.9, sold: 1510,
      desc: 'Item, chest and enemy markers for long raids where every corner matters.',
      feats: ['Loot value filter', 'Trap and door markers', 'Custom draw distance'] },
    { id: 'pilot', name: 'Pilot', game: 'Dead Orbit', cat: 'Aim', base: 27.9, sold: 780,
      desc: 'Lead prediction for projectile weapons and ships at any range.',
      feats: ['Travel-time prediction', 'Target lock on a key', 'Smoothing presets'] },
    { id: 'beacon', name: 'Beacon', game: 'Kilo Royale', cat: 'Visuals', base: 22.9, sold: 2630,
      desc: 'Squad, loot and zone overlay built for hundred-player lobbies.',
      feats: ['Next-zone prediction', 'Team colours', 'Low-impact rendering'] },
    { id: 'macro', name: 'Macro Kit', game: 'Kilo Royale', cat: 'Utility', base: 9.9, sold: 640,
      desc: 'Bind any chain of inputs to one key: builds, swaps, slide cancels.',
      feats: ['Visual macro editor', 'Timing jitter', 'Shareable profiles'] },
    { id: 'blank', name: 'Blank Slate', game: 'All games', cat: 'Spoofer', base: 29.9, sold: 1990,
      desc: 'Hardware ID spoofer. Start over on a clean machine identity.',
      feats: ['Disk, board and network IDs', 'One-click restore', 'Works with every product'] },
  ];

  const BUNDLES = [
    { id: 'starter', name: 'Starter', who: 'One game, the two tools most people start with.',
      items: ['outline', 'halo'], off: 0.2 },
    { id: 'ranked', name: 'Ranked', best: true, who: 'Everything for Vanta Strike and Null Sector, plus a clean ID.',
      items: ['halo', 'outline', 'steady', 'sweep', 'blank'], off: 0.3 },
    { id: 'everything', name: 'Everything', who: 'All nine tools across all five games.',
      items: PRODUCTS.map(p => p.id), off: 0.4 },
  ];

  const STATUS = [
    { game: 'Vanta Strike', build: '14.2.1', state: 'Undetected', ago: '2 hours ago' },
    { game: 'Null Sector', build: '0.98.4', state: 'Undetected', ago: '5 hours ago' },
    { game: 'Ironveil', build: '3.11', state: 'Updating', ago: 'Patch landed 40 min ago' },
    { game: 'Dead Orbit', build: '7.0.2', state: 'Undetected', ago: '1 day ago' },
    { game: 'Kilo Royale', build: 'S9.3', state: 'Undetected', ago: '3 hours ago' },
  ];

  const FAQ = [
    ['How fast do I get my key?', 'Straight away. The key is added to My keys the moment the order completes, and it stays there for as long as the licence runs.'],
    ['What happens after a game update?', 'The tool for that game shows as Updating on the Status board until it is checked against the new build. Time lost to an update is added back to your licence.'],
    ['Can I move a key to another computer?', 'Yes. A key locks to the first machine it is activated on. Reset the hardware lock from My keys and activate again on the new one.'],
    ['What is in a bundle?', 'A bundle is several tools at one price, each with its own 30-day key. You can renew the tools separately later.'],
    ['Is this a real store?', 'No. This is a design demo. The games and products do not exist, no payment is taken and nothing is delivered.'],
  ];

  const GLYPHS = {
    Aim: '<circle cx="28" cy="28" r="17"/><circle cx="28" cy="28" r="2.5" class="fill"/><path d="M28 4v12M28 40v12M4 28h12M40 28h12"/>',
    Visuals: '<path d="M14 8H8v8M42 8h6v8M14 48H8v-8M42 48h6v-8"/><circle cx="28" cy="19" r="5"/><path d="M19 44V33a9 9 0 0 1 18 0v11"/>',
    Utility: '<circle cx="28" cy="28" r="22"/><circle cx="28" cy="28" r="12"/><path d="M28 28L44 13"/><circle cx="37" cy="36" r="2" class="fill"/><circle cx="19" cy="22" r="2" class="fill"/>',
    Spoofer: '<rect x="14" y="14" width="28" height="28"/><rect x="22" y="22" width="12" height="12"/><path d="M20 14V6M28 14V6M36 14V6M20 50v-8M28 50v-8M36 50v-8M14 20H6M14 28H6M14 36H6M50 20h-8M50 28h-8M50 36h-8"/>',
  };
  const glyph = cat => `<svg class="glyph" viewBox="0 0 56 56" aria-hidden="true">${GLYPHS[cat]}</svg>`;

  const byId = id => PRODUCTS.find(p => p.id === id);
  const dur = id => DURATIONS.find(d => d.id === id);
  const money = n => '€' + n.toFixed(2);
  const priceOf = (p, d) => Math.max(0.9, Math.round(p.base * dur(d).mult) - 0.1);
  const bundleFull = b => b.items.reduce((s, id) => s + priceOf(byId(id), 'd30'), 0);
  const bundlePrice = b => Math.round(bundleFull(b) * (1 - b.off)) - 0.1;

  /* ---------------- storage ---------------- */

  const store = {
    get(k, fallback) {
      try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : fallback; } catch { return fallback; }
    },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* storage unavailable */ } },
  };

  const DAY = 864e5;
  const newKey = () => {
    const abc = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    const buf = new Uint32Array(16);
    crypto.getRandomValues(buf);
    return [...buf].map((n, i) => (i && i % 4 === 0 ? '-' : '') + abc[n % abc.length]).join('');
  };

  let cart = store.get('noclip.cart', []);
  let keys = store.get('noclip.keys', null);
  if (!keys) {
    const now = Date.now();
    keys = [
      { id: 'k1', pid: 'outline', code: newKey(), start: now - 9 * DAY, end: now + 21 * DAY },
      { id: 'k2', pid: 'blank', code: newKey(), start: now - 60 * DAY, end: null },
      { id: 'k3', pid: 'steady', code: newKey(), start: now - 19 * DAY, end: now - 12 * DAY },
    ];
    store.set('noclip.keys', keys);
  }

  /* ---------------- toast ---------------- */

  const toastEl = $('#toast');
  let toastTimer;
  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add('is-on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('is-on'), 2600);
  }

  /* ---------------- render: static lists ---------------- */

  $('#popularList').innerHTML = [...PRODUCTS].sort((a, b) => b.sold - a.sold).slice(0, 4).map((p, i) => `
    <article class="pop" style="--d:${0.45 + i * 0.08}s">
      <div class="pop__top">${glyph(p.cat)}<span class="pop__rank">No. ${i + 1}</span></div>
      <div>
        <h3 class="pop__name">${p.name}</h3>
        <p class="pop__meta">${p.cat} for ${p.game}</p>
      </div>
      <div class="pop__foot">
        <span class="pop__price">${money(priceOf(p, 'd30'))} <small>/ 30 days</small></span>
        <button class="btn btn--small btn--solid" type="button" data-add="${p.id}" data-dur="d30">Add to cart</button>
      </div>
    </article>`).join('');

  $('#gameList').innerHTML = GAMES.map((g, i) => {
    const own = PRODUCTS.filter(p => p.game === g.name);
    const from = Math.min(...own.map(p => priceOf(p, 'd1')));
    return `<button class="game" type="button" data-pick-game="${g.name}" data-reveal style="--d:${i * 0.06}s">
      <span class="game__name">${g.name}</span>
      <span class="game__genre">${g.genre}</span>
      <span class="game__count">${own.length} ${own.length === 1 ? 'tool' : 'tools'}, from ${money(from)}</span>
    </button>`;
  }).join('');

  const cats = ['All', ...new Set(PRODUCTS.map(p => p.cat))];
  $('#filters').innerHTML = cats.map(c =>
    `<button class="chip" type="button" data-cat="${c}" aria-pressed="${c === 'All'}">${c === 'All' ? 'All types' : c}</button>`).join('');
  $('#gameFilters').innerHTML = ['All', ...GAMES.map(g => g.name)].map(g =>
    `<button class="chip" type="button" data-game="${g}" aria-pressed="${g === 'All'}">${g === 'All' ? 'All games' : g}</button>`).join('');

  $('#grid').innerHTML = PRODUCTS.map((p, i) => `
    <article class="card" data-cat="${p.cat}" data-game="${p.game}" data-pid="${p.id}" data-dur="d30" data-reveal style="--d:${(i % 3) * 0.07}s">
      <div class="card__top">${glyph(p.cat)}<span class="tag">${p.cat}</span></div>
      <div>
        <h3 class="card__name">${p.name}</h3>
        <p class="card__game">${p.game}</p>
      </div>
      <p class="card__desc">${p.desc}</p>
      <ul class="card__feats">${p.feats.map(f => `<li>${f}</li>`).join('')}</ul>
      <div class="card__foot">
        <div class="seg" role="group" aria-label="Licence length for ${p.name}">
          ${DURATIONS.map(d => `<button type="button" data-seg="${d.id}" aria-pressed="${d.id === 'd30'}">${d.label}</button>`).join('')}
        </div>
        <div class="card__buy">
          <span class="price">${money(priceOf(p, 'd30'))}</span>
          <button class="btn btn--small btn--solid" type="button" data-add-card>Add to cart</button>
        </div>
      </div>
    </article>`).join('');

  $('#bundleList').innerHTML = BUNDLES.map((b, i) => `
    <article class="bundle${b.best ? ' bundle--best' : ''}" data-reveal style="--d:${i * 0.09}s">
      <div>
        <div class="bundle__head"><h3 class="bundle__name">${b.name}</h3>${b.best ? '<span class="bundle__pick">Most chosen</span>' : ''}</div>
        <p class="bundle__for">${b.who}</p>
      </div>
      <ul class="bundle__items">
        ${b.items.map(id => { const p = byId(id); return `<li><span>${p.name}</span><span>${p.cat}, ${p.game}</span></li>`; }).join('')}
      </ul>
      <div class="bundle__foot">
        <div class="bundle__price">
          <b>${money(bundlePrice(b))}</b><s>${money(bundleFull(b))}</s>
          <span class="bundle__save">Save ${Math.round(b.off * 100)}%</span>
        </div>
        <button class="btn ${b.best ? 'btn--solid ' : ''}btn--full" type="button" data-bundle="${b.id}">Add ${b.name} to cart</button>
      </div>
    </article>`).join('');

  $('#statusList').innerHTML = `
    <div class="status__row status__row--head"><span>Game</span><span>Status</span><span>Game build</span><span>Last checked</span></div>
    ${STATUS.map((s, i) => `
    <div class="status__row" data-reveal style="--d:${i * 0.05}s">
      <span class="status__game">${s.game}</span>
      <span class="status__state"><i class="dot ${s.state === 'Undetected' ? '' : 'dot--hollow'}"></i>${s.state}</span>
      <span class="mono">${s.build}</span>
      <span>${s.ago}</span>
    </div>`).join('')}`;

  $('#faqList').innerHTML = FAQ.map(([q, a]) => `
    <details>
      <summary>${q}<span class="plus" aria-hidden="true"></span></summary>
      <div class="faq__a"><p>${a}</p></div>
    </details>`).join('');

  /* ---------------- keys ---------------- */

  const shown = new Set();
  const mask = code => code.split('-').map((part, i, all) => (i === 0 || i === all.length - 1 ? part : '••••')).join('-');

  function keyState(k) {
    const now = Date.now();
    if (k.end === null) return { active: true, text: 'Lifetime', p: 1 };
    if (k.end < now) {
      return { active: false, text: 'Expired ' + new Date(k.end).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }), p: 0 };
    }
    const left = k.end - now;
    const days = Math.ceil(left / DAY);
    const text = left < DAY ? Math.max(1, Math.ceil(left / 36e5)) + ' hours left' : days + (days === 1 ? ' day left' : ' days left');
    return { active: true, text, p: Math.max(0.03, left / (k.end - k.start)) };
  }

  function renderKeys(fresh = []) {
    const list = $('#keyList');
    const sorted = [...keys].sort((a, b) => keyState(b).active - keyState(a).active || b.start - a.start);
    const active = sorted.filter(k => keyState(k).active).length;
    $('#keysSummary').innerHTML = `
      <div><b>${active}</b><span>Active</span></div>
      <div><b>${sorted.length - active}</b><span>Expired</span></div>
      <div><b>${new Set(sorted.filter(k => keyState(k).active).map(k => byId(k.pid).game)).size}</b><span>Games covered</span></div>`;

    if (!sorted.length) {
      list.innerHTML = '<p class="empty">No keys yet. <a href="#products">Buy a product</a> and its key shows up here.</p>';
      return;
    }
    list.innerHTML = sorted.map(k => {
      const p = byId(k.pid), s = keyState(k), open = shown.has(k.id);
      return `
      <div class="key${s.active ? '' : ' key--expired'}${fresh.includes(k.id) ? ' is-new' : ''} in" data-key="${k.id}" style="--p:${s.p}">
        <div>
          <div class="key__name">${p.name}</div>
          <div class="key__game">${p.cat}, ${p.game}</div>
        </div>
        <div class="key__code">
          <code>${open ? k.code : mask(k.code)}</code>
          <div>
            <button class="link-btn" type="button" data-act="show">${open ? 'Hide' : 'Show'}</button>
            <button class="link-btn" type="button" data-act="copy">Copy</button>
          </div>
        </div>
        <div class="key__left">
          <span class="status__state"><i class="dot ${s.active ? '' : 'dot--hollow'}"></i>${s.text}</span>
          <div class="key__bar"><i></i></div>
        </div>
        <div class="key__actions">
          ${s.active
            ? '<button class="btn btn--small" type="button" data-act="reset">Reset hardware lock</button>'
            : '<button class="btn btn--small btn--solid" type="button" data-act="renew">Renew</button>'}
        </div>
      </div>`;
    }).join('');
  }

  $('#keyList').addEventListener('click', async e => {
    const btn = e.target.closest('[data-act]');
    if (!btn) return;
    const k = keys.find(x => x.id === btn.closest('[data-key]').dataset.key);
    const act = btn.dataset.act;
    if (act === 'show') { shown.has(k.id) ? shown.delete(k.id) : shown.add(k.id); renderKeys(); }
    if (act === 'copy') {
      try { await navigator.clipboard.writeText(k.code); toast('Key copied'); }
      catch { shown.add(k.id); renderKeys(); toast('Copy is blocked here. The key is shown so you can select it.'); }
    }
    if (act === 'reset') toast(`Hardware lock reset for ${byId(k.pid).name}`);
    if (act === 'renew') { addToCart({ type: 'product', id: k.pid, dur: 'd30' }); openCart(); }
  });

  /* ---------------- cart ---------------- */

  const lineInfo = it => {
    if (it.type === 'bundle') {
      const b = BUNDLES.find(x => x.id === it.id);
      return { name: b.name + ' bundle', meta: `${b.items.length} tools, 30 days each`, price: bundlePrice(b) };
    }
    const p = byId(it.id);
    return { name: p.name, meta: `${p.game}, ${dur(it.dur).label.toLowerCase()}`, price: priceOf(p, it.dur) };
  };

  function renderCart() {
    const count = $('#cartCount');
    count.textContent = cart.length;
    const body = $('#cartItems');
    $('#checkout').disabled = !cart.length;
    $('#checkout').style.opacity = cart.length ? 1 : 0.35;
    if (!cart.length) {
      body.innerHTML = '<p class="empty">Your cart is empty. <a href="#products" data-close>Browse products</a></p>';
    } else {
      body.innerHTML = cart.map((it, i) => {
        const l = lineInfo(it);
        return `<div class="line">
          <div><div class="line__name">${l.name}</div><div class="line__meta">${l.meta}</div></div>
          <div class="line__right"><span class="line__price">${money(l.price)}</span>
          <button class="link-btn" type="button" data-remove="${i}">Remove</button></div>
        </div>`;
      }).join('');
    }
    $('#cartTotal').textContent = money(cart.reduce((s, it) => s + lineInfo(it).price, 0));
    store.set('noclip.cart', cart);
  }

  function addToCart(item) {
    cart.push(item);
    renderCart();
    const c = $('#cartCount');
    c.classList.remove('bump'); void c.offsetWidth; c.classList.add('bump');
    toast(`${lineInfo(item).name} added to cart`);
  }

  const drawer = $('#drawer'), scrim = $('#scrim');
  let lastFocus = null;
  function openCart() {
    lastFocus = document.activeElement;
    drawer.hidden = false; scrim.hidden = false;
    requestAnimationFrame(() => { drawer.classList.add('is-open'); scrim.classList.add('is-open'); });
    lenis && lenis.stop();
    $('#cartClose').focus();
  }
  function closeCart() {
    drawer.classList.remove('is-open'); scrim.classList.remove('is-open');
    lenis && lenis.start();
    setTimeout(() => { drawer.hidden = true; scrim.hidden = true; }, reduced ? 0 : 600);
    lastFocus && lastFocus.focus && lastFocus.focus();
  }
  $('#cartOpen').addEventListener('click', openCart);
  $('#cartClose').addEventListener('click', closeCart);
  scrim.addEventListener('click', closeCart);
  addEventListener('keydown', e => { if (e.key === 'Escape' && !drawer.hidden) closeCart(); });

  $('#cartItems').addEventListener('click', e => {
    const rm = e.target.closest('[data-remove]');
    if (rm) { cart.splice(+rm.dataset.remove, 1); renderCart(); }
    if (e.target.closest('[data-close]')) closeCart();
  });

  $('#checkout').addEventListener('click', () => {
    if (!cart.length) return;
    const now = Date.now(), fresh = [];
    const grant = (pid, d) => {
      const days = dur(d).days;
      const k = { id: 'k' + now + fresh.length, pid, code: newKey(), start: now, end: days ? now + days * DAY : null };
      keys.push(k); fresh.push(k.id);
    };
    cart.forEach(it => {
      if (it.type === 'bundle') BUNDLES.find(b => b.id === it.id).items.forEach(pid => grant(pid, 'd30'));
      else grant(it.id, it.dur);
    });
    store.set('noclip.keys', keys);
    cart = [];
    renderCart();
    renderKeys(fresh);
    closeCart();
    toast(`Demo order complete. ${fresh.length} ${fresh.length === 1 ? 'key' : 'keys'} added to My keys.`);
    setTimeout(() => scrollToEl($('#keys')), 350);
  });

  /* ---------------- product interactions ---------------- */

  document.addEventListener('click', e => {
    const add = e.target.closest('[data-add]');
    if (add) return addToCart({ type: 'product', id: add.dataset.add, dur: add.dataset.dur });

    const bundle = e.target.closest('[data-bundle]');
    if (bundle) return addToCart({ type: 'bundle', id: bundle.dataset.bundle });

    const seg = e.target.closest('[data-seg]');
    if (seg) {
      const card = seg.closest('.card');
      card.dataset.dur = seg.dataset.seg;
      $$('[data-seg]', card).forEach(b => b.setAttribute('aria-pressed', b === seg));
      const price = $('.price', card);
      price.textContent = money(priceOf(byId(card.dataset.pid), seg.dataset.seg));
      price.classList.remove('tick'); void price.offsetWidth; price.classList.add('tick');
      return;
    }

    const addCard = e.target.closest('[data-add-card]');
    if (addCard) {
      const card = addCard.closest('.card');
      return addToCart({ type: 'product', id: card.dataset.pid, dur: card.dataset.dur });
    }

    const chip = e.target.closest('.chip');
    if (chip) {
      if (chip.dataset.cat) filter.cat = chip.dataset.cat;
      if (chip.dataset.game) filter.game = chip.dataset.game;
      return applyFilter();
    }

    const pick = e.target.closest('[data-pick-game]');
    if (pick) {
      filter.game = pick.dataset.pickGame; filter.cat = 'All';
      applyFilter(false);
      return scrollToEl($('#products'));
    }

    if (e.target.closest('#clearFilters')) { filter.cat = 'All'; filter.game = 'All'; applyFilter(); }
  });

  const filter = { cat: 'All', game: 'All' };
  function applyFilter(animate = true) {
    $$('#filters .chip').forEach(c => c.setAttribute('aria-pressed', c.dataset.cat === filter.cat));
    $$('#gameFilters .chip').forEach(c => c.setAttribute('aria-pressed', c.dataset.game === filter.game));
    const cards = $$('.card');
    const match = c => (filter.cat === 'All' || c.dataset.cat === filter.cat)
      && (filter.game === 'All' || c.dataset.game === filter.game || c.dataset.game === 'All games');
    const run = () => {
      let n = 0;
      cards.forEach(c => { const ok = match(c); c.hidden = !ok; if (ok) n++; });
      $('#noMatch').hidden = n > 0;
      if (lenis) lenis.resize();
      requestAnimationFrame(() => cards.forEach(c => { c.classList.remove('is-out'); c.classList.add('in'); }));
    };
    if (!animate || reduced) return run();
    cards.forEach(c => c.classList.add('is-out'));
    setTimeout(run, 240);
  }

  /* FAQ: animate open/close */
  $$('#faqList details').forEach(d => {
    const sum = $('summary', d), body = $('.faq__a', d);
    sum.addEventListener('click', e => {
      if (reduced) return;
      e.preventDefault();
      if (d.open) {
        const a = body.animate({ height: [body.offsetHeight + 'px', '0px'] }, { duration: 380, easing: 'cubic-bezier(.16,1,.3,1)' });
        a.onfinish = () => { d.open = false; };
      } else {
        d.open = true;
        body.animate({ height: ['0px', body.offsetHeight + 'px'] }, { duration: 480, easing: 'cubic-bezier(.16,1,.3,1)' });
      }
    });
  });

  /* ---------------- scrolling ---------------- */

  let lenis = null;
  if (!reduced && typeof window.Lenis === 'function') {
    try {
      lenis = new window.Lenis({ duration: 1.15, smoothWheel: true });
      const raf = t => { lenis.raf(t); requestAnimationFrame(raf); };
      requestAnimationFrame(raf);
    } catch { lenis = null; }
  }

  function scrollToEl(el) {
    if (lenis) lenis.scrollTo(el, { offset: 0 });
    else el.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' });
  }

  const nav = $('#nav'), menuBtn = $('#menuBtn');
  menuBtn.addEventListener('click', () => {
    const open = nav.classList.toggle('is-open');
    menuBtn.setAttribute('aria-expanded', open);
    menuBtn.textContent = open ? 'Close' : 'Menu';
  });

  document.addEventListener('click', e => {
    const a = e.target.closest('a[href^="#"]');
    if (!a) return;
    const target = $(a.getAttribute('href'));
    if (!target) return;
    e.preventDefault();
    nav.classList.remove('is-open');
    menuBtn.setAttribute('aria-expanded', 'false');
    menuBtn.textContent = 'Menu';
    scrollToEl(target);
  });

  const header = $('#header'), progress = $('#progress');
  let lastY = 0;
  function onScroll() {
    const y = scrollY, max = document.documentElement.scrollHeight - innerHeight;
    progress.style.transform = `scaleX(${max > 0 ? y / max : 0})`;
    const down = y > lastY && y > 140;
    if (!nav.classList.contains('is-open')) header.classList.toggle('is-hidden', down);
    lastY = y;
  }
  addEventListener('scroll', onScroll, { passive: true });

  const io = new IntersectionObserver(entries => {
    entries.forEach(en => { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } });
  }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
  $$('[data-reveal]').forEach(el => io.observe(el));

  const links = $$('.nav a');
  const spy = new IntersectionObserver(entries => {
    entries.forEach(en => {
      if (en.isIntersecting) links.forEach(l => l.classList.toggle('is-active', l.getAttribute('href') === '#' + en.target.id));
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  $$('main section[id]').forEach(s => spy.observe(s));

  /* ---------------- intro ---------------- */

  const intro = $('#intro');
  let introDone = false;
  function endIntro() {
    if (introDone) return;
    introDone = true;
    intro.classList.add('is-done');
    document.body.classList.remove('is-loading');
    document.body.classList.add('is-ready');
    setTimeout(() => intro.remove(), 900);
  }
  if (reduced) endIntro(); else setTimeout(endIntro, 1900);
  intro.addEventListener('click', endIntro);
  addEventListener('keydown', endIntro, { once: true });

  /* ---------------- boot ---------------- */

  renderCart();
  renderKeys();
  onScroll();
})();
