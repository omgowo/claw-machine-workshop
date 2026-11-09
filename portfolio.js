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
  const state = { scene: 'intro', current: 'game', busy: false, carousel: null, viewerOpen: false, lightbox: false, vinylClose: null };
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
  function buildHw2Demo(host) {
    const wrap = el('div', 'hw2-demo');
    const canvas = el('canvas', 'hw2-canvas');
    canvas.width = 1024;
    canvas.height = 768;
    canvas.setAttribute('aria-label', 'HW2 Processing 影像旋轉與換圖動畫');
    wrap.appendChild(canvas);
    const controls = el('div', 'hw2-controls');
    controls.appendChild(el('span', null, '自動播放中・按住畫布顯示 girl.png'));
    const source = el('button', 'hw2-source', 'code<>');
    source.type = 'button';
    source.setAttribute('aria-label', '查看 PDE 程式原始碼');
    source.addEventListener('click', () => openCodeViewer('assets/works/hw2/Mydraw.pde'));
    controls.appendChild(source);
    wrap.appendChild(controls);
    host.appendChild(wrap);

    const ctx = canvas.getContext('2d');
    const cat = new Image();
    const girl = new Image();
    cat.src = 'assets/works/hw2/cat.png';
    girl.src = 'assets/works/hw2/girl.png';
    let mouseX = 512, mouseY = 384, showGirl = false, started = false, raf = 0;
    const startedAt = performance.now();

    function pointer(event) {
      const rect = canvas.getBoundingClientRect();
      const point = event.touches ? event.touches[0] : event;
      mouseX = (point.clientX - rect.left) * canvas.width / rect.width;
      mouseY = (point.clientY - rect.top) * canvas.height / rect.height;
    }
    canvas.addEventListener('pointermove', pointer);
    canvas.addEventListener('pointerdown', function (event) {
      pointer(event);
      showGirl = true;
    });
    canvas.addEventListener('pointerup', function () { showGirl = false; });
    canvas.addEventListener('pointercancel', function () { showGirl = false; });
    canvas.addEventListener('pointerleave', function () { showGirl = false; });

    function ellipse(x, y, rx, ry, fill, stroke, lineWidth) {
      ctx.beginPath();
      ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
      if (fill) { ctx.fillStyle = fill; ctx.fill(); }
      if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lineWidth || 1; ctx.stroke(); }
    }
    function drawEar(t) {
      const cx = 350, cy = 265;
      ctx.save();
      ctx.translate(cx, cy + 98);
      ctx.rotate(.349066 * Math.sin(t - .3));
      ctx.fillStyle = '#84746a';
      ellipse(69, -176, 42, 70, '#84746a');
      ellipse(-69, -176, 42, 70, '#84746a');
      ctx.restore();
    }
    function drawHead(t) {
      const cx = 350, cy = 265;
      ctx.save();
      ctx.translate(cx, cy + 105);
      ctx.rotate(.349066 * Math.sin(t));
      ellipse(0, -100, 121.5, 104, '#c4b4af');
      ellipse(0, -100, 72.5, 57.5, '#84746a');
      ellipse(-77, -63, 21, 16, '#d799b3');
      ellipse(76, -63, 21, 16, '#d799b3');
      ellipse(-61, -103, 42, 40, '#dae3f3');
      ellipse(64, -103, 42, 40, '#dae3f3');
      ellipse(-59, -106, 36, 32, '#000');
      ellipse(61, -106, 35, 32, '#000');
      ellipse(-47, -122, 7.5, 7.5, '#fff');
      ellipse(49, -122, 7.5, 7.5, '#fff');
      ctx.strokeStyle = '#412e23';
      ctx.lineWidth = 3;
      [[-150,-64,-115,-66],[-148,-23,-106,-49],[115,-64,150,-60],[103,-45,140,-24]].forEach(function (line) {
        ctx.beginPath();
        ctx.moveTo(line[0], line[1]);
        ctx.lineTo(line[2], line[3]);
        ctx.stroke();
      });
      ctx.restore();
    }
    function drawBall(t) {
      const bx = 500, by = 460, dx = 360 * Math.sin(t);
      ctx.save();
      ctx.translate(bx + dx, by);
      ctx.rotate(dx / 61);
      ctx.translate(-bx, -by);
      ellipse(bx, by, 63.5, 61, '#5b9bd5', '#000', 1.2);
      ctx.strokeStyle = '#1e3c6e';
      ctx.lineWidth = 3;
      [[-55,-4,-25,2,9,-12,16,-39],[-26,24,7,24,39,-4,32,-44],[-44,34,-17,54,35,46,43,15]].forEach(function (b) {
        ctx.beginPath();
        ctx.moveTo(b[0] + bx, b[1] + by);
        ctx.bezierCurveTo(b[2] + bx, b[3] + by, b[4] + bx, b[5] + by, b[6] + bx, b[7] + by);
        ctx.stroke();
      });
      ctx.strokeStyle = '#0072bc';
      ellipse(bx - 81, by - 18, 11.5, 10.5, null, '#0072bc', 1);
      ctx.beginPath();
      ctx.moveTo(bx - 92, by - 16);
      ctx.bezierCurveTo(bx - 87, by + 4, bx - 95, by + 28, bx - 114, by + 39);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(bx - 82, by - 28);
      ctx.bezierCurveTo(bx - 73, by - 34, bx - 61, by - 34, bx - 53, by - 32);
      ctx.stroke();
      ctx.restore();
    }
    function draw(time) {
      const t = (time - startedAt) / 1000;
      ctx.fillStyle = '#fffcd6';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.textAlign = 'center';
      ctx.fillStyle = '#5a3b3b';
      ctx.font = '50px "Noto Serif TC", serif';
      ctx.fillText('2D 點陣彩圖置入與換圖', canvas.width / 2, 50);
      ctx.fillStyle = '#9a76aa';
      ctx.font = '25px "Noto Serif TC", serif';
      ctx.fillText('by 41547006S 程靖庭', canvas.width / 2, 85);
      const active = showGirl ? girl : cat;
      if (active.complete && active.naturalWidth) {
        const size = showGirl ? 200 : 100;
        ctx.drawImage(active, mouseX - size / 2, mouseY - size / 2, size, size);
      }
      ellipse(374, 459, 80, 21, '#bfbfbf');
      ellipse(351, 405, 79.5, 61, '#bfbfbf');
      ellipse(461, 435, 65, 13, '#c4b4af');
      ellipse(351, 405, 79.5, 61, '#c4b4af');
      ellipse(358, 369, 54, 20, '#bba7a1');
      drawEar(t);
      drawHead(t);
      drawBall(t);
      raf = requestAnimationFrame(draw);
    }
    function start() {
      if (started) return;
      started = true;
      raf = requestAnimationFrame(draw);
    }
    cat.onload = girl.onload = start;
    return wrap;
  }
  function buildGrid(p, body) {
    const g = el('div', 'grid');
    p.items.forEach(it => {
      const c = el('div', 'gcard');
      if (it.demo === 'hw2-image-rotate') {
        buildHw2Demo(c);
      } else {
        c.appendChild(thumb(it.img));
      }
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
  function buildModelCards(p, body) {
    const host = el('div', 'model-playlist');
    const stack = el('div', 'vinyl-stack');
    const detail = el('div', 'vinyl-detail');
    const detailTitle = el('strong');
    const detailArtist = el('span');
    detail.appendChild(detailTitle);
    detail.appendChild(detailArtist);
    host.appendChild(stack);
    host.appendChild(detail);
    const cards = [];
    let selected = null;
    let hovered = null;
    let openVersion = 0;
    let delayedOpen = null;
    const loader = window.THREE && window.THREE.GLTFLoader ? new window.THREE.GLTFLoader() : null;

    function renderModel(card, source) {
      if (!loader) {
        card.querySelector('.model-status').textContent = 'GLTFLoader 尚未載入';
        return;
      }
      const canvas = card.querySelector('canvas');
      let renderer;
      try {
        renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
      } catch (error) {
        card.querySelector('.model-status').textContent = '模型預覽無法建立';
        return;
      }
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
      if ('toneMapping' in renderer && THREE.ACESFilmicToneMapping !== undefined) {
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.12;
      }
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(32, 1, .01, 100);
      camera.position.set(0, 0, 3.2);
      const envCanvas = document.createElement('canvas');
      envCanvas.width = 256;
      envCanvas.height = 128;
      const envContext = envCanvas.getContext('2d');
      const envGradient = envContext.createLinearGradient(0, 0, 0, envCanvas.height);
      envGradient.addColorStop(0, '#fff8e9');
      envGradient.addColorStop(.45, '#f4e3c9');
      envGradient.addColorStop(1, '#7b7180');
      envContext.fillStyle = envGradient;
      envContext.fillRect(0, 0, envCanvas.width, envCanvas.height);
      const environment = new THREE.CanvasTexture(envCanvas);
      environment.mapping = THREE.EquirectangularReflectionMapping;
      environment.needsUpdate = true;
      scene.environment = environment;
      scene.add(new THREE.HemisphereLight(0xfff8ec, 0x82758b, 2.25));
      const key = new THREE.DirectionalLight(0xffffff, 1.9);
      key.position.set(2.5, 4.5, 4);
      scene.add(key);
      const rim = new THREE.DirectionalLight(0xbddcff, 1.25);
      rim.position.set(-3.5, 2.2, -3);
      scene.add(rim);
      const group = new THREE.Group();
      scene.add(group);
      let model = null;
      let startedAt = performance.now();
      let dirty = true; // 唱片本身在畫布裡不會動（移動是外層卡片的 CSS），只有需要時才重畫
      loader.load(source, gltf => {
        model = gltf.scene;
        const bounds = new THREE.Box3().setFromObject(model);
        const size = bounds.getSize(new THREE.Vector3());
        const center = bounds.getCenter(new THREE.Vector3());
        const largest = Math.max(size.x, size.y, size.z) || 1;
        model.scale.setScalar(1.45 / largest);
        model.position.set(-center.x * model.scale.x, -center.y * model.scale.y, -center.z * model.scale.z);
        model.traverse(node => {
          if (!node.isMesh) return;
          node.castShadow = true;
          node.receiveShadow = true;
          if (node.material) {
            const materials = Array.isArray(node.material) ? node.material : [node.material];
            materials.forEach(material => { material.needsUpdate = true; });
          }
        });
        group.add(model);
        card.querySelector('.model-status').remove();
        startedAt = performance.now();
        dirty = true;
      }, undefined, () => {
        card.querySelector('.model-status').textContent = '模型載入失敗';
      });
      function frame(time) {
        if (!canvas.isConnected) {
          renderer.dispose();
          return;
        }
        if (dirty) {
          renderer.render(scene, camera);
          dirty = false;
        }
        requestAnimationFrame(frame);
      }
      requestAnimationFrame(frame);
      return renderer;
    }

    function tween(target, vars) {
      if (G) G.to(target, Object.assign({ duration: D(.55), ease: 'power3.out' }, vars));
      else Object.keys(vars).forEach(key => { if (key !== 'duration' && key !== 'ease') target.style[key] = vars[key]; });
    }
    function showDetail(item) {
      detailTitle.textContent = item.title;
      detailArtist.textContent = item.artist || '';
      detail.classList.add('is-visible');
      if (G) G.fromTo(detail, { opacity: 0, x: 18 }, { opacity: 1, x: 0, duration: D(.4), ease: 'power2.out', overwrite: true });
    }
    function hideDetail() {
      if (!detail.classList.contains('is-visible')) return;
      if (G) G.to(detail, { opacity: 0, x: 12, duration: D(.22), ease: 'power2.in', overwrite: true,
        onComplete: () => detail.classList.remove('is-visible') });
      else detail.classList.remove('is-visible');
    }
    function cancelDelayedOpen() {
      openVersion += 1;
      if (delayedOpen) {
        if (G) delayedOpen.kill();
        delayedOpen = null;
      }
    }
    function openSelection(index, item) {
      selected = index;
      hovered = null;
      host.classList.add('is-open');
      cards.forEach(other => other.classList.toggle('is-selected', other === cards[index]));
      showDetail(item);
      layout();
    }
    function layout() {
      const mid = (cards.length - 1) / 2;
      const compact = window.innerWidth <= 700;
      cards.forEach((card, index) => {
        const offset = index - mid;
        const isSelected = selected === index;
        const hoverShift = selected == null && hovered != null
          ? (index < hovered ? -12 : index > hovered ? 16 : 0) : 0;
        const desktopSpread = Math.max(92, Math.min(145, (stack.clientWidth - 210) / 4));
        if (isSelected) {
          tween(card, {
            x: compact ? 0 : 88, y: compact ? 8 : -70, rotation: 0, scale: 1.08, opacity: 1, zIndex: 50,
            filter: 'brightness(1)', pointerEvents: 'auto'
          });
        } else {
          const depth = selected == null ? index : (index < selected ? index : index + 1);
          const arcSpread = compact ? 118 : desktopSpread;
          const arcX = compact ? ((index % 2) ? 118 : -118) : offset * arcSpread;
          const arcY = compact
            ? Math.floor(index / 2) * 250 - 190
            : Math.abs(offset) * 10 - 6;
          const arcRotation = compact ? ((index % 2) ? 4 : -4) : offset * 4.5;
          const isHovered = selected == null && index === hovered;
          tween(card, {
            x: selected == null ? arcX + hoverShift : offset * 8,
            y: selected == null ? arcY + (isHovered ? -18 : 0) : depth * 23 - 28,
            rotation: selected == null ? arcRotation : offset * 2.8,
            scale: selected == null ? (isHovered ? 1.05 : 1) : .76,
            opacity: selected == null ? 1 : .42,
            zIndex: selected == null ? (isHovered ? 60 : index + 1) : depth,
            filter: selected == null ? 'brightness(1)' : 'brightness(.58)',
            pointerEvents: 'auto'
          });
        }
      });
    }
    function closeSelection() {
      cancelDelayedOpen();
      if (selected == null) return false;
      selected = null;
      hovered = null;
      cards.forEach(card => card.classList.remove('is-selected'));
      hideDetail();
      host.classList.remove('is-open');
      layout();
      return true;
    }
    state.vinylClose = closeSelection;

    p.items.forEach((item, index) => {
      const card = el('button', 'model-card vinyl-record');
      card.type = 'button';
      card.dataset.index = String(index);
      const stage = el('span', 'model-stage');
      const canvas = el('canvas');
      canvas.width = 420;
      canvas.height = 420;
      stage.appendChild(canvas);
      stage.appendChild(el('span', 'model-status', '載入模型…'));
      card.appendChild(stage);
      const meta = el('span', 'model-meta');
      meta.appendChild(el('strong', null, item.title));
      meta.appendChild(el('small', null, item.artist || ''));
      card.appendChild(meta);
      card.setAttribute('aria-label', item.title + '，' + item.artist);
      card.addEventListener('mouseenter', () => {
        if (selected == null) { hovered = index; layout(); }
      });
      card.addEventListener('mouseleave', () => {
        if (selected == null && hovered === index) { hovered = null; layout(); }
      });
      card.addEventListener('click', () => {
        if (selected === index) {
          closeSelection();
          return;
        }
        if (selected != null) {
          const version = ++openVersion;
          selected = null;
          hovered = null;
          cards.forEach(other => other.classList.remove('is-selected'));
          hideDetail();
          host.classList.remove('is-open');
          layout();
          const reveal = () => {
            delayedOpen = null;
            if (version === openVersion) openSelection(index, item);
          };
          if (G) delayedOpen = G.delayedCall(D(.42), reveal);
          else window.setTimeout(reveal, 420);
          return;
        }
        openSelection(index, item);
      });
      cards.push(card);
      stack.appendChild(card);
      // 等色塊轉場結束後再一張一張建立 3D 預覽，避免轉場途中卡頓
      window.setTimeout(() => { if (card.isConnected) renderModel(card, item.model); }, 800 + index * 150);
    });
    stack.addEventListener('click', event => {
      if (event.target === stack && selected != null) closeSelection();
    });
    host.addEventListener('click', event => {
      if (event.target === host && selected != null) closeSelection();
    });
    const note = el('p', 'model-playlist-note', '唱片載入後會堆疊展示・hover 抬起，點選抽出');
    body.appendChild(host);
    body.appendChild(note);
    layout();
  }
  function destroyCarousel() { if (state.carousel) { state.carousel.destroy(); state.carousel = null; } }
  /* ---------- PDE 程式碼檢視器 ---------- */
  const codeViewer = el('div');
  codeViewer.id = 'code-viewer';
  codeViewer.setAttribute('role', 'dialog');
  codeViewer.setAttribute('aria-modal', 'true');
  codeViewer.setAttribute('aria-label', 'PDE 程式原始碼');
  document.body.appendChild(codeViewer);
  let codeOpen = false;
  async function openCodeViewer(src) {
    codeViewer.textContent = '';
    const panel = el('div', 'code-panel');
    const head = el('div', 'code-head');
    head.appendChild(el('strong', null, 'Mydraw.pde'));
    const close = el('button', 'code-close', '×');
    close.type = 'button';
    close.setAttribute('aria-label', '關閉程式碼');
    head.appendChild(close);
    const pre = el('pre', 'code-content', '正在載入 PDE 原始碼…');
    panel.appendChild(head);
    panel.appendChild(pre);
    codeViewer.appendChild(panel);
    codeViewer.classList.add('open');
    codeOpen = true;
    close.addEventListener('click', closeCodeViewer);
    try {
      const response = await fetch(src);
      if (!response.ok) throw new Error('HTTP ' + response.status);
      pre.textContent = await response.text();
    } catch (error) {
      pre.textContent = '無法載入 PDE 原始碼。\n\n' + error.message;
    }
    close.focus();
  }
  function closeCodeViewer() {
    if (!codeOpen) return;
    codeOpen = false;
    codeViewer.classList.remove('open');
    codeViewer.textContent = '';
  }
  codeViewer.addEventListener('click', event => {
    if (event.target === codeViewer) closeCodeViewer();
  });

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
    state.vinylClose = null;
    const p = W.pages.find(x => x.id === id); if (!p) return;
    pageEl.textContent = '';
    const head = el('div', 'pg-head');
    const back = el('button', 'pg-back', '← 回到娃娃機'); back.dataset.go = 'game';
    head.appendChild(back); head.appendChild(el('h2', null, p.label)); head.appendChild(el('p', null, p.intro || ''));
    const body = el('div', 'pg-body');
    pageEl.appendChild(head); pageEl.appendChild(body);
    (p.type === 'model-cards' ? buildModelCards
      : p.type === 'cards' ? (window.mountCircularCarousel ? buildCarousel : buildFan)
      : p.type === 'matchbox' ? (window.mountMatchboxCarousel ? buildMatchbox : buildGrid) : buildGrid)(p, body);
    pageEl.scrollTop = 0; pageEl.classList.add('open'); document.body.classList.add('page-open'); pauseGame(true);
    if (G) G.from(pageEl.querySelectorAll('.pg-head > *, .gcard, .fan .card, .mb-host'), { y: 28, opacity: 0, stagger: D(.07), duration: D(.5), delay: D(.3), ease: 'power3.out', clearProps: 'opacity,y' });
  }
  function closePage() { pauseGame(false); state.vinylClose = null; destroyCarousel(); pageEl.classList.remove('open'); document.body.classList.remove('page-open'); pageEl.textContent = ''; }

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
    if (codeOpen) { closeCodeViewer(); return; }
    if (state.lightbox) { closeLightbox(); return; }
    if (state.vinylClose && state.vinylClose()) return;
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
