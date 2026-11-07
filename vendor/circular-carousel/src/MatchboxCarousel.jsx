/* Matchbox Carousel（來源：21st.dev 提供的 matchbox-carousel.tsx，已去除 TypeScript 型別以便直接打包）。
   本專案修改兩處：(1) 動畫預設不理會系統「減少動態」，網址加 ?motion=reduced 才關閉；(2) 移除 css() 裡會把所有轉場歸零的 reduced-motion 規則。
   授權：提供的文字未標示授權，僅供個人作品集使用，請到原頁面確認。 */
import * as React from "react";

const TINTS = ["#C8553D", "#2F4B7C", "#E2B13C", "#5A7D5A", "#1F1D1B", "#D98CA2", "#3E8A95"];
const CLOSE = 380;
const SHIFT = 560;
const OPEN = 620;
const EASE = "cubic-bezier(.32,.08,.18,1)";
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const mod = (n, m) => ((n % m) + m) % m;
const offset = (i, at, N, half) => {
  const k = mod(i - at, N);
  return k > N - 1 - half ? k - N : k;
};
const useIso = typeof window === "undefined" ? React.useEffect : React.useLayoutEffect;

export default function MatchboxCarousel({
  items, view = "angle", table = "#E6DED2", ink = "#2A2622", autoplay = true, interval = 4.5,
  defaultIndex = 0, onIndexChange, showControls = true, label = "Projects", className, style, onKeyDown, ...rest
}) {
  const N = items.length;
  const root = React.useRef(null);
  const scope = "mbx" + React.useId().replace(/[^a-zA-Z0-9]/g, "");
  const [box, setBox] = React.useState({ w: 1000, h: 620 });
  const [calm, setCalm] = React.useState(false);
  const [index, setIndex] = React.useState(() => mod(defaultIndex, Math.max(1, N)));
  const [seq, setSeq] = React.useState(0);
  const [pos, setPos] = React.useState({ shown: index, from: index });
  const [open, setOpen] = React.useState(true);
  const [moving, setMoving] = React.useState(false);
  const [held, setHeld] = React.useState(false);
  const [seen, setSeen] = React.useState(false);
  const [hidden, setHidden] = React.useState(false);
  const busyUntil = React.useRef(0);
  const indexRef = React.useRef(index);
  const timers = React.useRef([]);
  React.useEffect(() => () => timers.current.forEach(clearTimeout), []);

  useIso(() => {
    const el = root.current;
    if (!el) return;
    const read = () => {
      const w = el.offsetWidth;
      const h = el.offsetHeight;
      if (w > 0 && h > 0) setBox((b) => (b.w === w && b.h === h ? b : { w, h }));
    };
    read();
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(read);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  React.useEffect(() => {
    setCalm(/[?&]motion=reduced\b/.test(window.location.search));
  }, []);

  const go = React.useCallback(
    (dir, to) => {
      if (N < 2) return;
      const busy = calm ? 300 : CLOSE + SHIFT + OPEN * 0.6;
      const wait = Math.max(0, busyUntil.current - Date.now());
      const run = () => {
        const n = mod(to ?? indexRef.current + dir, N);
        if (n === indexRef.current) return;
        busyUntil.current = Date.now() + busy;
        indexRef.current = n;
        setIndex(n);
        setSeq((s) => s + 1);
        onIndexChange?.(n);
        const land = () => setPos((p) => ({ shown: n, from: p.shown }));
        if (calm) return land();
        setOpen(false);
        timers.current.push(
          setTimeout(() => { setMoving(true); land(); }, CLOSE),
          setTimeout(() => { setMoving(false); setOpen(true); }, CLOSE + SHIFT)
        );
      };
      if (wait > 0 && wait < busy) setTimeout(run, wait);
      else run();
    },
    [N, calm, onIndexChange]
  );
  const next = React.useCallback(() => go(1), [go]);
  const prev = React.useCallback(() => go(-1), [go]);

  React.useEffect(() => {
    if (!autoplay) return;
    const el = root.current;
    let io;
    if (el && typeof IntersectionObserver !== "undefined") {
      io = new IntersectionObserver(([e]) => setSeen(e.isIntersecting && e.intersectionRatio > 0.35), { threshold: [0, 0.35, 0.6] });
      io.observe(el);
    } else setSeen(true);
    const vis = () => setHidden(document.visibilityState === "hidden");
    vis();
    document.addEventListener("visibilitychange", vis);
    return () => { io?.disconnect(); document.removeEventListener("visibilitychange", vis); };
  }, [autoplay]);

  React.useEffect(() => {
    if (!autoplay || held || !seen || hidden || N < 2) return;
    const t = setTimeout(next, clamp(interval, 1.5, 20) * 1000);
    return () => clearTimeout(t);
  }, [autoplay, interval, held, seen, hidden, seq, N, next]);

  const g = layout(box.w, box.h, view);
  const drag = useDrag({ onNext: next, onPrev: prev, reach: g.P, enabled: N > 1 });
  const half = Math.floor((N - 1) / 2);
  const current = items[index];

  const boxes = items.map((it, i) => {
    const k = offset(i, pos.shown, N, half);
    const jump = Math.abs(offset(i, pos.from, N, half) - k) > 1;
    const active = k === 0;
    const amount = open ? 1 : 0;
    const x = g.x0 + k * g.P + (!g.up && k > 0 ? g.slide * amount : 0) + drag.offset;
    const far = Math.abs(k) > 2;
    const tint = it.tint || TINTS[i % TINTS.length];
    const out = active ? g.slide * amount : 0;
    const speed = active && !open ? CLOSE : OPEN;
    return (
      <div
        key={i} role="group" aria-roledescription="slide" aria-label={`${i + 1} of ${N}: ${it.title}`} aria-hidden={!active}
        onClick={() => !active && !drag.wasDrag() && go(k > 0 ? 1 : -1, i)}
        className={active ? "mbx-box mbx-on" : "mbx-box"}
        style={{
          position: "absolute", left: 0, top: 0, width: g.bw, height: g.bd, transformStyle: "preserve-3d",
          transform: `translate3d(${x - g.bw / 2}px, ${g.y0 - g.bd / 2}px, 0)`,
          transition: jump || drag.offset ? "none" : `transform ${moving ? SHIFT : OPEN}ms ${EASE}, opacity .4s`,
          opacity: far ? 0 : 1, cursor: active ? "default" : "pointer", pointerEvents: far ? "none" : "auto",
        }}
      >
        <div style={{
          position: "absolute", left: -g.bw * 0.05, top: -g.bd * 0.02, width: g.bw * 1.1 + (g.up ? 0 : out), height: g.bd * 1.08 + (g.up ? out : 0),
          borderRadius: g.m * 0.04, background: "rgba(48,32,18,.30)", filter: `blur(${g.m * 0.035}px)`,
          transform: `translateZ(0.5px) translate(${g.bw * 0.02}px, ${g.bd * 0.05}px)`,
          transition: `width ${speed}ms ${EASE}, height ${speed}ms ${EASE}`,
        }} />
        <Tray g={g} it={it} out={out} speed={speed} active={active} wasDrag={drag.wasDrag} />
        <Sleeve g={g} it={it} n={i + 1} tint={tint} />
      </div>
    );
  });

  return (
    <div
      ref={root} role="region" aria-roledescription="carousel" aria-label={label} tabIndex={0}
      className={[scope, className].filter(Boolean).join(" ")}
      onKeyDown={(e) => {
        onKeyDown?.(e);
        if (e.key === "ArrowLeft") { e.preventDefault(); prev(); }
        else if (e.key === "ArrowRight") { e.preventDefault(); next(); }
      }}
      onPointerEnter={(e) => e.pointerType === "mouse" && setHeld(true)}
      onPointerLeave={(e) => e.pointerType === "mouse" && setHeld(false)}
      onFocus={() => setHeld(true)}
      onBlur={(e) => !e.currentTarget.contains(e.relatedTarget) && setHeld(false)}
      {...drag.bind}
      {...rest}
      style={{ position: "relative", width: "100%", aspectRatio: box.w < 640 ? "3 / 4" : "16 / 10", overflow: "hidden", background: table, touchAction: "pan-y", userSelect: "none", fontFamily: "inherit", ...style }}
    >
      <style>{css(scope)}</style>
      <div aria-hidden="true" style={{ position: "absolute", inset: 0, pointerEvents: "none",
        background: "radial-gradient(90% 70% at 50% 42%, rgba(255,255,255,.26), transparent 70%), radial-gradient(140% 100% at 50% 50%, transparent 55%, rgba(60,40,20,.14))" }} />
      <div style={{ position: "absolute", inset: 0, perspective: g.persp, perspectiveOrigin: "50% 20%" }}>
        <div style={{ position: "absolute", left: 0, top: g.cy, width: 0, height: 0, transformStyle: "preserve-3d", transform: `rotateX(${g.tilt}deg)` }}>{boxes}</div>
      </div>
      {showControls && N > 1 ? (
        <div style={{ position: "absolute", zIndex: 5, left: "50%", bottom: Math.max(14, box.h * 0.05), transform: "translateX(-50%)", display: "flex", alignItems: "center", gap: 10, color: ink }}>
          <span aria-hidden="true" style={{ fontSize: 13, fontVariantNumeric: "tabular-nums", letterSpacing: "0.02em", marginRight: 6, whiteSpace: "nowrap" }}>
            {String(index + 1).padStart(2, "0")} <span style={{ opacity: 0.45 }}>/ {String(N).padStart(2, "0")}</span>
          </span>
          <Arrow dir={-1} onClick={prev} />
          <Arrow dir={1} onClick={next} />
        </div>
      ) : null}
      <div className="mbx-sr" aria-live="polite">{current ? `${current.title}, ${index + 1} of ${N}` : ""}</div>
    </div>
  );
}

function Arrow({ dir, onClick }) {
  return (
    <button type="button" className="mbx-btn" aria-label={dir < 0 ? "Previous" : "Next"} onClick={onClick}>
      <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" style={{ transform: dir < 0 ? "none" : "scaleX(-1)" }}>
        <path d="M10 3 5 8l5 5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );
}

function layout(W, H, view) {
  const tilt = view === "flat" ? 0 : view === "low" ? 48 : 30;
  const up = W / H < 0.9;
  const fore = Math.cos((tilt * Math.PI) / 180);
  let bw, bd;
  if (up) {
    bd = Math.max(60, Math.min((H * 0.66) / (1.93 * fore), (W * 0.66) / 0.68));
    bw = bd * 0.68;
  } else {
    bw = Math.max(60, Math.min(W * 0.4, (H * 0.6) / 0.68, (W * 0.86) / 1.93));
    bd = bw * 0.68;
  }
  const m = Math.max(bw, bd);
  const slide = m * 0.93;
  return { up, bw, bd, m, t: m * 0.2, slide, P: bw * 1.16, x0: up ? W / 2 : W / 2 - slide / 2, y0: up ? -slide / 2 : 0, cy: H * (up ? 0.45 : 0.46), tilt, persp: Math.max(W, H) * 2.2, e: Math.max(1.5, m * 0.012) };
}

function Sleeve({ g, it, n, tint }) {
  const ink = readable(tint);
  const short = Math.min(g.bw, g.bd);
  const pad = short * 0.09;
  const small = short * 0.062;
  const title = Math.min(g.bd * 0.24, short * 0.3, (g.bw * 1.45) / Math.max(4, it.title.length + 1));
  const side = shade(tint, -0.18);
  return (
    <>
      {g.up ? (
        <div style={{ position: "absolute", left: 0, top: g.bd, width: g.bw, height: g.t, transformOrigin: "50% 0", transform: `translateZ(${g.t}px) rotateX(-90deg)`, boxSizing: "border-box", border: `${g.e}px solid ${side}`, borderBottom: "none", backfaceVisibility: "hidden" }} />
      ) : (
        <div style={{ position: "absolute", left: 0, top: g.bd, width: g.bw, height: g.t, transformOrigin: "50% 0", transform: `translateZ(${g.t}px) rotateX(-90deg)`, background: side, backfaceVisibility: "hidden" }}>
          <div style={{ position: "absolute", left: g.bw * 0.03, right: g.bw * 0.03, top: "22%", bottom: "22%", borderRadius: 2, background: "#5A4232",
            backgroundImage: "radial-gradient(rgba(255,255,255,.18) 0.6px, transparent 0.8px), radial-gradient(rgba(0,0,0,.35) 0.6px, transparent 0.8px)",
            backgroundSize: "3px 3px, 4px 4px", backgroundPosition: "0 0, 1px 2px" }} />
        </div>
      )}
      <div style={{ position: "absolute", inset: 0, transform: `translateZ(${g.t}px)`, background: `linear-gradient(160deg, ${shade(tint, 0.08)}, ${tint} 45%, ${shade(tint, -0.08)})`, color: ink, borderRadius: g.m * 0.006, padding: pad, boxSizing: "border-box", overflow: "hidden", boxShadow: `inset 0 ${Math.max(1, g.m * 0.003)}px 0 rgba(255,255,255,.18)` }}>
        <div style={{ position: "absolute", inset: pad * 0.55, border: `1px solid ${ink}`, opacity: 0.38, borderRadius: g.m * 0.004 }} />
        <div style={{ position: "relative", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: small * 0.96, letterSpacing: "0.14em", textTransform: "uppercase", opacity: 0.85 }}>
            <span>No. {String(n).padStart(2, "0")}</span>
            <span style={{ width: short * 0.16, height: short * 0.16, borderRadius: "50%", border: `1px solid ${ink}`, display: "grid", placeItems: "center", fontSize: short * 0.075, letterSpacing: 0, opacity: 0.9 }}>{it.title.slice(0, 1)}</span>
          </div>
          <div style={{ fontSize: title, lineHeight: 0.95, letterSpacing: "-0.02em", fontWeight: 650, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{it.title}</div>
          <div style={{ fontSize: small, letterSpacing: "0.04em", opacity: 0.78, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{it.detail}</div>
        </div>
      </div>
    </>
  );
}

function Tray({ g, it, out, speed, active, wasDrag }) {
  const e = g.e;
  const tw = g.bw - e * 2;
  const td = g.bd - e * 2;
  const th = g.t * 0.62;
  const paper = "#F2EDE5";
  const inner = "#E3DACB";
  return (
    <div className="mbx-tray" style={{ position: "absolute", left: e, top: e, width: tw, height: td, transformStyle: "preserve-3d", transform: g.up ? `translate3d(0, ${out}px, 0)` : `translate3d(${out}px, 0, 0)`, transition: `transform ${speed}ms ${EASE}` }}>
      <div style={{ position: "absolute", inset: 0, transform: `translateZ(${e}px)`, background: inner, overflow: "hidden" }}>
        <img src={it.src} alt={it.alt ?? it.title} draggable={false} decoding="async" style={{ position: "absolute", inset: e * 0.6, width: `calc(100% - ${e * 1.2}px)`, height: `calc(100% - ${e * 1.2}px)`, objectFit: "cover" }} />
        <div style={{ position: "absolute", inset: 0, pointerEvents: "none", background: "linear-gradient(rgba(40,26,14,.28), transparent 16%), linear-gradient(90deg, rgba(40,26,14,.16), transparent 5%, transparent 95%, rgba(40,26,14,.16))" }} />
        {active && it.href ? <a className="mbx-link" href={it.href} aria-label={[it.title, it.detail].filter(Boolean).join(", ")} onClick={(ev) => wasDrag() && ev.preventDefault()} draggable={false} /> : null}
      </div>
      <div style={{ position: "absolute", left: 0, top: 0, width: tw, height: th, transformOrigin: "50% 0", transform: "rotateX(-90deg)", background: `linear-gradient(${shade(inner, -0.12)}, ${inner})`, backfaceVisibility: "hidden" }} />
      <div style={{ position: "absolute", left: tw, top: 0, width: th, height: td, transformOrigin: "0 50%", transform: "rotateY(-90deg)", background: `linear-gradient(90deg, ${shade(inner, -0.22)}, ${shade(inner, -0.1)})`, backfaceVisibility: "hidden" }} />
      <div style={{ position: "absolute", left: 0, top: 0, width: th, height: td, transformOrigin: "0 50%", transform: `translateZ(${th}px) rotateY(90deg)`, background: `linear-gradient(90deg, ${shade(inner, -0.1)}, ${shade(inner, -0.22)})`, backfaceVisibility: "hidden" }} />
      <div style={{ position: "absolute", left: 0, top: td, width: tw, height: th, transformOrigin: "50% 0", transform: `translateZ(${th}px) rotateX(-90deg)`, background: `linear-gradient(${paper}, ${shade(paper, -0.06)})`, backfaceVisibility: "hidden" }} />
      <div style={{ position: "absolute", left: 0, top: td - e, width: tw, height: e, transform: `translateZ(${th}px)`, background: shade(paper, 0.4) }} />
    </div>
  );
}

function useDrag(o) {
  const [d, setD] = React.useState(0);
  const start = React.useRef(null);
  const moved = React.useRef(false);
  const end = (e) => {
    const s = start.current;
    start.current = null;
    if (!s || s.id !== e.pointerId) return;
    const delta = e.clientX - s.x;
    const v = delta / Math.max(1, Date.now() - s.t);
    setD(0);
    if (!s.locked) return;
    if (delta < -o.reach / 3 || v < -0.5) o.onNext();
    else if (delta > o.reach / 3 || v > 0.5) o.onPrev();
  };
  return {
    offset: d,
    wasDrag: () => moved.current,
    bind: !o.enabled ? {} : {
      onPointerDown: (e) => {
        if (e.button !== 0) return;
        start.current = { x: e.clientX, y: e.clientY, t: Date.now(), id: e.pointerId, locked: null };
        moved.current = false;
      },
      onPointerMove: (e) => {
        const s = start.current;
        if (!s || s.id !== e.pointerId) return;
        const dx = e.clientX - s.x;
        const dy = e.clientY - s.y;
        if (s.locked === null && Math.hypot(dx, dy) > 6) {
          s.locked = Math.abs(dx) > Math.abs(dy);
          if (s.locked) {
            moved.current = true;
            try { e.currentTarget.setPointerCapture(e.pointerId); } catch {}
          } else start.current = null;
        }
        if (s.locked) setD(dx);
      },
      onPointerUp: end,
      onPointerCancel: end,
    },
  };
}

function readable(hex) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex);
  if (!m) return "#FBF8F3";
  const n = parseInt(m[1], 16);
  const l = (0.2126 * ((n >> 16) & 255) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255)) / 255;
  return l > 0.6 ? "#1E1B18" : "#FBF8F3";
}

function shade(hex, k) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex);
  if (!m) return hex;
  const n = parseInt(m[1], 16);
  const c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => Math.round(clamp(k >= 0 ? v + (255 - v) * k : v * (1 + k), 0, 255)));
  return `rgb(${c[0]}, ${c[1]}, ${c[2]})`;
}

const css = (s) => `
.${s}{outline:none;-webkit-tap-highlight-color:transparent}
.${s}:focus-visible{box-shadow:inset 0 0 0 2px #2B6CF6}
.${s} .mbx-btn{all:unset;box-sizing:border-box;width:44px;height:44px;border-radius:50%;border:1px solid currentColor;display:grid;place-items:center;cursor:pointer;opacity:.78;transition:opacity .2s,transform .2s}
.${s} .mbx-btn:hover{opacity:1;transform:scale(1.04)}
.${s} .mbx-btn:active{transform:scale(.96)}
.${s} .mbx-btn:focus-visible{opacity:1;box-shadow:0 0 0 2px #2B6CF6}
.${s} .mbx-link{position:absolute;inset:0;z-index:2}
.${s} .mbx-link:focus-visible{box-shadow:inset 0 0 0 2px #2B6CF6}
.${s} .mbx-sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
.${s} img{-webkit-user-drag:none;user-select:none}
.${s} .mbx-box:not(.mbx-on):hover .mbx-tray{transform:translate3d(6%,0,0)!important}
`;
