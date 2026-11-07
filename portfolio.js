/* 作品集層（階段 1）：入場畫面、Circle Reveal、側欄、色塊轉場、卡牌分頁。
   不碰 main.js 的遊戲邏輯。內容資料在 data/works.js。 */
(function () {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const el = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; };

  const G = window.gsap;
  // 作品集是用來展示動畫的，所以預設不理會系統的「減少動態」。需要時在網址後面加 ?motion=reduced 才會關閉動畫。
  const RM = /[?&]motion=reduced\b/.test(location.search);
  const D = s => (RM ? 0.01 : s);
  const W = window.WORKS || { pages: [] };

  const intro = $('#intro'), side = $('#side'), pageEl = $('#page'), blocksEl = $('#blocks');
  const state = { scene: 'intro', current: 'game', busy: false, carousel: null, viewerOpen: false, lightbox: false };
  // 暫停／恢復遊戲輸入（鍵盤、搖桿、抓取鈕）。沒有載入 main.js 時什麼都不做。
  const pauseGame = p => { try { if (window.GameControls) window.GameControls.setPaused(p); } catch (e) { /* 忽略 */ } };

  /* ---------- 側欄 ---------- */
  const ICONS = {
    game: '<rect x="3" y="8" width="18" height="10" rx="4"/><path d="M8 11v4M6 13h4"/><circle cx="15.5" cy="12" r=".8"/><circle cx="17.5" cy="14" r=".8"/>',
    processing: '<path d="M8 7l-5 5 5 5M16 7l5 5-5 5M13.5 5l-3 14"/>',
    art: '<path d="M12 3a9 9 0 100 18c1.5 0 2-1 1.5-2.2-.5-1.2.3-2.3 1.7-2.3H17a4 4 0 004-4c0-5-4-9.5-9-9.5z"/><circle cx="7.5" cy="11" r="1"/><circle cx="10.5" cy="7" r="1"/><circle cx="15.5" cy="7.5" r="1"/>',
    music: '<path d="M9 18V6l11-2v12"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="17.5" cy="16" r="2.5"/>'
  };
  function navItem(p, i) {
    const b = el('button', 'item'); b.dataset.go = p.id; b.dataset.tone = String(i % 3); b.setAttribute('aria-label', p.label);
    const ico = el('span', 'ico'); ico.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true">' + (ICONS[p.id] || '<circle cx="12" cy="12" r="4"/>') + '</svg>';
    b.appendChild(ico); b.appendChild(el('span', 'label', p.label)); return b;
  }
  function mobileMenu(open) {
    const ov = $('.moverlay', side); if (!ov) return;
    if (!G) { ov.classList.toggle('open', open); return; }
    if (open) { ov.classList.add('open'); G.fromTo(ov, { xPercent: -100, opacity: 0 }, { xPercent: 0, opacity: 1, duration: D(.3), ease: 'power2.inOut' }); }
    else G.to(ov, { xPercent: -100, opacity: 0, duration: D(.25), ease: 'power2.inOut', onComplete: () => ov.classList.remove('open') });
  }
  function buildSide() {
    const pages = [{ id: 'game', label: '娃娃機' }].concat(W.pages);
    const dock = el('div', 'dock');
    const brand = el('div', 'brand'); brand.appendChild(el('span', 'mark', 'P')); brand.appendChild(el('span', 'name', 'My Profile'));
    dock.appendChild(brand); pages.forEach((p, i) => dock.appendChild(navItem(p, i)));
    const bar = el('div', 'mbar'); bar.appendChild(el('span', 'name', 'My Profile'));
    const menu = el('button', 'menu'); menu.setAttribute('aria-label', '開啟選單'); menu.innerHTML = '<svg viewBox="0 0 24 24"><path d="M4 7h16M4 12h16M4 17h16"/></svg>'; bar.appendChild(menu);
    const ov = el('div', 'moverlay');
    const x = el('button', 'close'); x.setAttribute('aria-label', '關閉選單'); x.innerHTML = '<svg viewBox="0 0 24 24"><path d="M5 5l14 14M19 5L5 19"/></svg>'; ov.appendChild(x);
    pages.forEach((p, i) => ov.appendChild(navItem(p, i)));
    side.appendChild(dock); side.appendChild(bar); side.appendChild(ov);
    menu.addEventListener('click', () => mobileMenu(true)); x.addEventListener('click', () => mobileMenu(false));
    ov.addEventListener('click', e => { if (e.target.closest('[data-go]')) mobileMenu(false); });
  }
  function markCurrent() {
    $$('#side .item').forEach(b => b.setAttribute('aria-current', String(b.dataset.go === state.current)));
  }

  /* ---------- 分頁內容 ---------- */
  function thumb(src) {
    const t = el('div', 'thumb');
    if (src) { const i = new Image(); i.alt = ''; i.src = src; t.appendChild(i); }
    return t;
  }
  function buildGrid(p, body) {
    const g = el('div', 'grid');
    p.items.forEach(it => {
      const c = el('div', 'gcard'); c.appendChild(thumb(it.img));
      const m = el('div', 'meta'); m.appendChild(el('h3', null, it.title)); m.appendChild(el('p', null, it.desc || ''));
      c.appendChild(m); g.appendChild(c);
    });
    body.appendChild(g);
  }
  function buildFan(p, body) {
    const fan = el('div', 'fan'), info = el('div', 'fan-info');
    const n = p.items.length; let sel = null; const cards = [];
    const mid = (n - 1) / 2;
    const to = (t, v) => { if (G) G.to(t, v); };
    function layout() {
      cards.forEach((c, i) => {
        const o = i - mid;
        if (i === sel) {
          to(c, { x: 0, y: -40, rotation: 0, scale: 1.35, opacity: 1, zIndex: 50, duration: D(.5), ease: 'back.out(1.4)' });
        } else {
          to(c, { x: o * (sel == null ? 62 : 95), y: sel == null ? 0 : 30, rotation: o * (sel == null ? 9 : 5),
            scale: sel == null ? 1 : .85, opacity: sel == null ? 1 : .55, zIndex: i, duration: D(.45), ease: 'power3.out' });
        }
      });
      info.textContent = '';
      if (sel != null) { info.textContent = p.items[sel].title; info.appendChild(el('small', null, p.items[sel].artist || '')); }
    }
    p.items.forEach((it, i) => {
      const c = el('div', 'card');
      const cv = el('div', 'cover');
      if (it.cover) { const im = new Image(); im.alt = ''; im.src = it.cover; cv.appendChild(im); }
      c.appendChild(cv); c.appendChild(el('div', 't', it.title));
      c.addEventListener('mouseenter', () => { if (sel == null && G) G.to(c, { y: -34, scale: 1.06, duration: D(.25), ease: 'power2.out' }); });
      c.addEventListener('mouseleave', () => { if (sel == null && G) G.to(c, { y: 0, scale: 1, duration: D(.25), ease: 'power2.out' }); });
      c.addEventListener('click', () => { sel = (sel === i) ? null : i; layout(); });
      cards.push(c); fan.appendChild(c);
    });
    body.appendChild(fan); body.appendChild(info);
    layout();
  }
  function placeholderCover(i) {
    const c = ['#ecd993', '#dfb4b0', '#b7d2db'][i % 3];
    const svg = "<svg xmlns='http://www.w3.org/2000/svg' width='400' height='400'><defs><pattern id='h' width='12' height='12' patternUnits='userSpaceOnUse' patternTransform='rotate(45)'><line x1='0' y1='0' x2='0' y2='12' stroke='#6e5f60' stroke-opacity='.14' stroke-width='2'/></pattern></defs><rect width='400' height='400' fill='" + c + "'/><rect width='400' height='400' fill='url(#h)'/><text x='200' y='238' font-size='120' text-anchor='middle' fill='#6e5f60' fill-opacity='.55'>\u266A</text></svg>";
    return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
  }
  // React Bits 的 Circular Carousel（已打包成 vendor/circular-carousel/*.bundle.js）；沒載入時退回原本的扇形卡牌
  function buildCarousel(p, body) {
    const host = el('div', 'cc-host'); body.appendChild(host);
    const paper = getComputedStyle(document.documentElement).getPropertyValue('--paper').trim() || '#f6eed6';
    state.carousel = window.mountCircularCarousel(host, {
      items: p.items.map((it, i) => ({ src: it.cover || placeholderCover(i), alt: it.title, title: it.title, subtitle: it.artist || '' })),
      preset: 'cylinder', intro: 'rise', cardWidth: 190, aspectRatio: 1, gap: 22,
      autoplay: 'drift', speed: 9, fadeColor: paper, innerShade: .85, cornerRadius: 14, depthFade: .5, captions: true
    });
  }
  function destroyCarousel() { if (state.carousel) { state.carousel.destroy(); state.carousel = null; } }
  /* ---------- 作品大圖彈窗 ---------- */
  const lb = el('div'); lb.id = 'lightbox'; lb.setAttribute('role', 'dialog'); lb.setAttribute('aria-modal', 'true'); lb.setAttribute('aria-label', '作品大圖');
  document.body.appendChild(lb);
  function openLightbox(src, caption) {
    lb.textContent = '';
    const im = document.createElement('img'); im.alt = caption || ''; im.src = src;
    const x = el('button', 'x', '×'); x.setAttribute('aria-label', '關閉大圖');
    lb.appendChild(im); if (caption) lb.appendChild(el('div', 'cap', caption)); lb.appendChild(x);
    lb.classList.add('open'); state.lightbox = true;
    if (G) { G.from(lb, { opacity: 0, duration: D(.25) }); G.from(im, { scale: .94, duration: D(.4), ease: 'power2.out', clearProps: 'transform' }); }
    x.focus();
  }
  function closeLightbox() {
    if (!state.lightbox) return;
    state.lightbox = false; lb.classList.remove('open'); lb.textContent = '';
  }
  lb.addEventListener('click', closeLightbox);

  function placeholderArt(i) {
    const c = ['#ecd993', '#dfb4b0', '#b7d2db'][i % 3];
    const svg = "<svg xmlns='http://www.w3.org/2000/svg' width='600' height='410'><defs><pattern id='h' width='12' height='12' patternUnits='userSpaceOnUse' patternTransform='rotate(45)'><line x1='0' y1='0' x2='0' y2='12' stroke='#6e5f60' stroke-opacity='.14' stroke-width='2'/></pattern></defs><rect width='600' height='410' fill='" + c + "'/><rect width='600' height='410' fill='url(#h)'/><text x='300' y='225' font-size='34' text-anchor='middle' fill='#6e5f60' fill-opacity='.6' font-family='sans-serif'>\u4F5C\u54C1\u5716 " + (i + 1) + "</text></svg>";
    return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
  }
  // 火柴盒輪播（21st.dev，已打包進 vendor/circular-carousel/*.bundle.js）；沒載入時退回格狀卡片
  function buildMatchbox(p, body) {
    const cs = getComputedStyle(document.documentElement), v = (n, d) => cs.getPropertyValue(n).trim() || d;
    const tints = [v('--yellow', '#ecd993'), v('--pink', '#dfb4b0'), v('--blue', '#b7d2db')];
    const host = el('div', 'mb-host'); body.appendChild(host);
    state.carousel = window.mountMatchboxCarousel(host, {
      items: p.items.map((it, i) => ({ src: it.img || placeholderArt(i), alt: it.alt || it.title, title: it.title, detail: it.desc || '', href: it.href, tint: it.tint || tints[i % 3] })),
      view: 'angle', table: v('--paper-2', '#efe4c4'), ink: v('--ink', '#6e5f60'), autoplay: true, interval: 5, label: p.label
    });
    // 圖片比抽屜大時會被裁切：點開啟中的那張圖，跳出完整大圖
    let downPt = null;
    host.addEventListener('pointerdown', e => { downPt = { x: e.clientX, y: e.clientY }; }, true);
    host.addEventListener('click', e => {
      if (downPt && Math.hypot(e.clientX - downPt.x, e.clientY - downPt.y) > 6) return;   // 拖曳不算點擊
      const tray = e.target.closest && e.target.closest('.mbx-on .mbx-tray');
      const img = tray && tray.querySelector('img');
      if (img) openLightbox(img.currentSrc || img.src, img.alt);
    });
  }
  function openPage(id) {
    destroyCarousel();
    const p = W.pages.find(x => x.id === id); if (!p) return;
    pageEl.textContent = '';
    const head = el('div', 'pg-head');
    const back = el('button', 'pg-back', '← 回到娃娃機'); back.dataset.go = 'game';
    head.appendChild(back); head.appendChild(el('h2', null, p.label)); head.appendChild(el('p', null, p.intro || ''));
    const body = el('div', 'pg-body');
    pageEl.appendChild(head); pageEl.appendChild(body);
    (p.type === 'cards' ? (window.mountCircularCarousel ? buildCarousel : buildFan)
      : p.type === 'matchbox' ? (window.mountMatchboxCarousel ? buildMatchbox : buildGrid) : buildGrid)(p, body);
    pageEl.scrollTop = 0; pageEl.classList.add('open'); document.body.classList.add('page-open'); pauseGame(true);
    if (G) G.from(pageEl.querySelectorAll('.pg-head > *, .gcard, .fan .card, .mb-host'), { y: 28, opacity: 0, stagger: D(.07), duration: D(.5), delay: D(.3), ease: 'power3.out', clearProps: 'opacity,y' });
  }
  function closePage() { pauseGame(false); destroyCarousel(); pageEl.classList.remove('open'); document.body.classList.remove('page-open'); pageEl.textContent = ''; }

  /* ---------- 色塊轉場 ---------- */
  function transition(swap) {
    return new Promise(res => {
      if (!G) { swap(); return res(); }
      const cols = $$('.blk', blocksEl); blocksEl.style.display = 'flex';
      G.timeline({ onComplete: () => { blocksEl.style.display = 'none'; res(); } })
        .fromTo(cols, { yPercent: -100 }, { yPercent: 0, duration: D(.45), stagger: D(.06), ease: 'power3.inOut' })
        .add(swap)
        .to(cols, { yPercent: 100, duration: D(.45), stagger: D(.06), ease: 'power3.inOut' }, '+=0.05');
    });
  }
  function go(id) {
    if (state.busy || state.scene !== 'game') return;
    if (id === state.current && !state.viewerOpen) return;
    state.busy = true;
    transition(() => {
      hideViewer(true);                       // 從獎品展示畫面出發時，先收起展示並讓獎品重新掉回機台
      if (id === 'game') closePage(); else openPage(id);
      state.current = id; markCurrent();
    }).then(() => { state.busy = false; });
  }
  document.addEventListener('click', e => { const b = e.target.closest('[data-go]'); if (b) go(b.dataset.go); });
  document.addEventListener('keydown', e => { if (e.key !== 'Escape') return;
    if (state.lightbox) { closeLightbox(); return; }
    if (state.viewerOpen) hideViewer(true);
    else if (state.current !== 'game') go('game'); });

  /* ---------- 入場畫面 ---------- */
  function probe(node) {
    return new Promise(res => {
      const im = new Image(); const t = setTimeout(res, 900);
      im.onload = () => { clearTimeout(t); node.textContent = ''; node.appendChild(im); node.classList.add('has-img'); res(); };
      im.onerror = () => { clearTimeout(t); res(); };
      im.alt = ''; im.draggable = false; im.src = node.dataset.img;
    });
  }
  function splitChars(node) {
    const t = node.textContent; node.textContent = '';
    return Array.from(t).map(ch => { const s = el('span', 'ch', ch); node.appendChild(s); return s; });
  }
  function startIdle() {
    if (RM) return;
    G.to('.a-ribbon', { rotation: 3, transformOrigin: '50% 0%', duration: 2, yoyo: true, repeat: -1, ease: 'sine.inOut' });
    G.to('.a-leaves', { y: 6, duration: 2.4, yoyo: true, repeat: -1, ease: 'sine.inOut' });
    G.to('.a-profile', { y: -6, duration: 3, yoyo: true, repeat: -1, ease: 'sine.inOut' });
    G.to('.a-press', { opacity: .45, duration: 1.1, yoyo: true, repeat: -1, ease: 'sine.inOut' });
  }
  function enter() {
    const w = $('.a-welcome');
    const chars = w && !w.classList.contains('has-img') ? splitChars(w) : [];
    const tl = G.timeline({ defaults: { ease: 'power3.out' } });
    tl.from('.a-ribbon', { yPercent: -110, duration: D(.8), ease: 'bounce.out' }, 0.1)
      .from('.a-shapes', { scale: 0, rotation: -30, duration: D(.7), ease: 'back.out(1.6)' }, 0.2);
    if (chars.length) tl.from(chars, { y: 20, opacity: 0, stagger: D(.04), duration: D(.4) }, 0.5);
    else tl.from('.a-welcome', { y: 20, opacity: 0, duration: D(.5) }, 0.5);
    tl.fromTo('.a-profile', { clipPath: 'inset(0 100% 0 0)' }, { clipPath: 'inset(0 0% 0 0)', duration: D(1), ease: 'power2.inOut' }, 0.8)
      .from('.a-machine', { scale: 0, transformOrigin: '50% 100%', duration: D(.9), ease: 'elastic.out(1,.5)' }, 1.1)
      .from('.a-leaves', { xPercent: -30, opacity: 0, duration: D(.7) }, 1.2)
      .from('.a-press', { opacity: 0, duration: D(.6) }, 1.8)
      .add(() => { intro.dataset.ready = '1'; startIdle(); });
  }
  function machineFx() {
    const m = $('.a-machine'), stage = $('.a-stage'); if (!m) return;
    m.addEventListener('mouseenter', () => {
      if (RM) return;
      G.fromTo(m, { rotation: -3 }, { rotation: 3, duration: .12, repeat: 5, yoyo: true, ease: 'sine.inOut', onComplete: () => G.to(m, { rotation: 0, duration: .2 }) });
      const sr = stage.getBoundingClientRect(), mr = m.getBoundingClientRect();
      for (let i = 0; i < 6; i++) {
        const s = el('span', 'spark', '✦'); stage.appendChild(s);
        const a = Math.random() * Math.PI * 2, r = mr.width * (.55 + Math.random() * .3);
        G.set(s, { left: mr.left - sr.left + mr.width / 2, top: mr.top - sr.top + mr.height / 2 });
        G.to(s, { x: Math.cos(a) * r, y: Math.sin(a) * r, scale: 1.6, opacity: 0, duration: .9, ease: 'power2.out', onComplete: () => s.remove() });
      }
    });
    m.addEventListener('mousemove', e => {
      if (RM) return;
      const r = m.getBoundingClientRect();
      const nx = (e.clientX - r.left) / r.width * 2 - 1, ny = (e.clientY - r.top) / r.height * 2 - 1;
      G.to(m, { rotationY: nx * 14, rotationX: -ny * 10, transformPerspective: 600, duration: .4, overwrite: 'auto' });
    });
    m.addEventListener('mouseleave', () => G.to(m, { rotationX: 0, rotationY: 0, duration: .5 }));
    intro.addEventListener('mousemove', e => {
      if (RM) return;
      const nx = e.clientX / innerWidth - .5, ny = e.clientY / innerHeight - .5;
      G.to('.a-shapes', { x: nx * 24, y: ny * 16, duration: .8, overwrite: 'auto' });
    });
  }
  function reveal(x, y) {
    const maxR = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y)) + 24;
    const mask = 'radial-gradient(circle at ' + x + 'px ' + y + 'px, transparent var(--r), #000 calc(var(--r) + 2px))';
    intro.style.webkitMaskImage = mask; intro.style.maskImage = mask;
    G.fromTo(intro, { '--r': '0px' }, {
      '--r': maxR + 'px', duration: D(1.0), ease: 'power2.inOut',
      onComplete: () => { intro.style.display = 'none'; state.scene = 'game'; pauseGame(false); showSide(); }
    });
  }
  function showSide() {
    side.classList.add('ready'); markCurrent();
    const mob = window.matchMedia && matchMedia('(max-width:700px)').matches;
    if (G) G.from(mob ? $('.mbar', side) : $('.dock', side), mob
      ? { yPercent: -100, duration: D(.5), ease: 'power3.out', clearProps: 'transform' }
      : { xPercent: 100, duration: D(.6), ease: 'power3.out', clearProps: 'transform' });
  }
  intro && intro.addEventListener('click', e => {
    if (state.scene !== 'intro' || !intro.dataset.ready) return;
    state.scene = 'reveal';
    const m = e.target.closest('.a-machine'); let x = e.clientX, y = e.clientY;
    if (m) { const r = m.getBoundingClientRect(); x = r.left + r.width / 2; y = r.top + r.height / 2; }
    const tl = G.timeline();
    if (m && !RM) tl.to(m, { scaleY: .8, scaleX: 1.1, transformOrigin: '50% 100%', duration: .12, yoyo: true, repeat: 1 });
    tl.add(() => reveal(x, y));
  });

  /* ---------- 獎品展示（抓到有對應作品頁的娃娃後） ---------- */
  const prizeEl = el('div'); prizeEl.id = 'prize'; prizeEl.setAttribute('role', 'dialog'); prizeEl.setAttribute('aria-modal', 'true');
  document.body.appendChild(prizeEl);
  let pv = null;
  const toonMat = c => (typeof toon === 'function' ? toon(c) : new window.THREE.MeshLambertMaterial({ color: c }));
  function startViewer(canvas, spec) {
    const T = window.THREE; if (!T) return null;
    let renderer;
    try { renderer = new T.WebGLRenderer({ canvas, alpha: true, antialias: true }); } catch (e) { return null; }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    const scene = new T.Scene(), cam = new T.PerspectiveCamera(35, 1, .1, 50);
    cam.position.set(0, .15, 5);
    scene.add(new T.AmbientLight(0xffffff, .9));
    const sun = new T.DirectionalLight(0xffffff, .9); sun.position.set(3, 5, 4); scene.add(sun);
    const group = new T.Group(); scene.add(group);
    const m = spec.model || {};
    if (m.kind === 'glb') {
      const loader = (typeof gltfLoader !== 'undefined' && gltfLoader) || (T.GLTFLoader ? new T.GLTFLoader() : null);
      if (loader) loader.load(m.src, g => {
        const o = g.scene, b = new T.Box3().setFromObject(o), s = b.getSize(new T.Vector3()), c = b.getCenter(new T.Vector3()), k = (m.height || 1.6) / s.y;
        o.scale.setScalar(k); o.position.set(-c.x * k, -c.y * k, -c.z * k);
        o.traverse(n => {
          if (!n.isMesh) return;
          const col = n.material && n.material.color ? n.material.color.clone().convertLinearToSRGB().getHex() : 0xffd166;
          const mat = toonMat(col); mat.side = n.material.side; n.material = mat;
        });
        group.add(o);
      });
    } else if (m.kind === 'image') {
      new T.TextureLoader().load(m.src, tex => {
        const h = m.height || 1.8, a = tex.image.width / tex.image.height;
        group.add(new T.Mesh(new T.PlaneGeometry(h * a, h), new T.MeshBasicMaterial({ map: tex, transparent: true, alphaTest: .5, side: T.DoubleSide })));
      });
    }
    group.rotation.set(.12, -.5, 0);
    let dragging = false, lx = 0, ly = 0, raf = 0, last = performance.now();
    const down = e => { dragging = true; lx = e.clientX; ly = e.clientY; try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* 忽略 */ } };
    const move = e => {
      if (!dragging) return;
      group.rotation.y += (e.clientX - lx) * .012;
      group.rotation.x = Math.max(-1, Math.min(1, group.rotation.x + (e.clientY - ly) * .008));
      lx = e.clientX; ly = e.clientY;
    };
    const up = () => { dragging = false; };
    canvas.addEventListener('pointerdown', down); canvas.addEventListener('pointermove', move);
    canvas.addEventListener('pointerup', up); canvas.addEventListener('pointercancel', up);
    const resize = () => {
      const w = canvas.clientWidth || 300, h = canvas.clientHeight || 300;
      renderer.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix();
    };
    resize(); window.addEventListener('resize', resize);
    const loop = now => {
      const dt = Math.min(.05, (now - last) / 1000); last = now;
      if (!dragging && !RM) group.rotation.y += dt * .7;     // 沒在拖曳時慢慢自轉
      renderer.render(scene, cam); raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return { stop() { cancelAnimationFrame(raf); window.removeEventListener('resize', resize); renderer.dispose(); } };
  }
  function showViewer(spec) {
    hideViewer(false);
    const page = W.pages.find(p => p.id === spec.page) || { label: '作品' };
    prizeEl.textContent = '';
    prizeEl.appendChild(el('div', 'pv-tag', '你抓到了'));
    prizeEl.appendChild(el('h2', null, spec.name));
    const cv = el('canvas'); cv.setAttribute('aria-label', spec.name + ' 的 3D 展示，可以拖曳旋轉');
    prizeEl.appendChild(cv);
    prizeEl.appendChild(el('p', 'pv-hint', '拖曳可以旋轉，看看它的樣子'));
    prizeEl.appendChild(el('p', null, spec.blurb || ''));
    const row = el('div', 'row');
    const enter = el('button', 'btn main', '前往「' + page.label + '」 →'); enter.addEventListener('click', () => go(spec.page));
    const again = el('button', 'btn', '再玩一次'); again.addEventListener('click', () => hideViewer(true));
    row.appendChild(enter); row.appendChild(again); prizeEl.appendChild(row);
    prizeEl.classList.add('open'); document.body.classList.add('prize-open'); state.viewerOpen = true; pauseGame(true);
    pv = startViewer(cv, spec);
    if (!pv) cv.replaceWith(el('div', 'pv-fallback', '（這個裝置無法顯示 3D 預覽）'));
    if (G) {
      G.from(prizeEl, { opacity: 0, duration: D(.4) });
      const c2 = prizeEl.querySelector('canvas'); if (c2) G.from(c2, { scale: .5, duration: D(.7), ease: 'back.out(1.5)', clearProps: 'transform' });
      G.from(Array.from(prizeEl.children).filter(n => n.tagName !== 'CANVAS'), { y: 16, opacity: 0, stagger: D(.07), duration: D(.4), delay: D(.2), clearProps: 'opacity,y' });
    }
  }
  function hideViewer(reset) {
    if (!state.viewerOpen) return;
    state.viewerOpen = false;
    if (pv) { pv.stop(); pv = null; }
    prizeEl.classList.remove('open'); document.body.classList.remove('prize-open'); prizeEl.textContent = '';
    pauseGame(false);
    if (reset && window.GameControls) window.GameControls.resetGame();   // 獎品重新掉回機台
  }
  // main.js 在獎品出貨後發出 prize:caught；有設定的獎品由這裡接手，沒設定的維持原本的結果卡。
  window.addEventListener('prize:caught', e => {
    const spec = window.PRIZES && window.PRIZES[e.detail && e.detail.id];
    if (!spec || state.scene !== 'game') return;
    e.preventDefault(); showViewer(spec);
  });

  /* ---------- 啟動 ---------- */
  buildSide();
  pauseGame(true);                // 入場畫面期間先不讓遊戲接受鍵盤操作
  if (!G) {                       // GSAP 載入失敗：不要讓頁面卡住，直接進遊戲、保留基本導覽
    console.warn('GSAP 載入失敗，改用無動畫模式');
    if (intro) intro.style.display = 'none';
    state.scene = 'game'; pauseGame(false); showSide(); return;
  }
  Promise.all($$('[data-img]', intro).map(probe)).then(() => { machineFx(); enter(); });
})();
