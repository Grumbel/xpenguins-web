/**
 * xpenguins-web — penguins on the DOM
 *
 * Public API (IIFE build attaches to window.XPenguins):
 *   start(options?)
 *   stop()
 *   setNumber(n)
 *   setSquish(on)
 *   setGrab(on)
 *   isRunning()
 *   isSquish()
 *   isGrab()
 */

import { collectSolids } from './solids.js';
import {
  createToon, stepToon, terminateToon, squishToon, hitToon, typeDef, Type,
} from './toon.js';
import { createOverlay, drawToon } from './render.js';

/** Filled by build.mjs with { theme, images: { walker: dataURL, ... } } */
export const EMBEDDED = typeof __XPENGUINS_EMBEDDED__ !== 'undefined'
  ? __XPENGUINS_EMBEDDED__
  : null;

let overlay = null;
let toons = [];
let images = {};
let theme = null;
let raf = 0;
let running = false;
let solids = [];
let lastSolids = 0;
let lastFrame = 0;
let observers = [];
/** Bumps on every stop/start so async exit animations cannot clobber a new run. */
let session = 0;

/** Active pointer drag (one toon at a time). */
let drag = null;

let opts = {
  count: 8,
  blood: true,
  angels: true,
  squish: false,
  /** Pick up toons with press, drag, release (default on). */
  grab: true,
  /** Pixels of movement before a press counts as a drag, not a click-squish. */
  dragThreshold: 6,
  solidRefreshMs: 400,
  respectReducedMotion: true,
  minTop: 12,
  minScore: 2,
};

function spriteKey(def) {
  if (!def || !def.file) return null;
  return def.file.replace(/\.png$/i, '');
}

function loadImages(map) {
  const entries = Object.entries(map);
  return Promise.all(entries.map(([key, url]) => new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve([key, img]);
    img.onerror = () => reject(new Error('Failed to load sprite ' + key));
    img.src = url;
  }))).then((pairs) => {
    const out = {};
    for (const [k, v] of pairs) out[k] = v;
    return out;
  });
}

function refreshSolids() {
  solids = collectSolids({
    minTop: opts.minTop,
    minScore: opts.minScore,
  });
  lastSolids = performance.now();
}

function wantsPointer() {
  return !!(opts.grab || opts.squish);
}

/**
 * Canvas stays pointer-events:none so the page (text selection, links, forms)
 * keeps working. Hits are done from document capture; only clicks on a toon
 * are claimed.
 */
function syncPointerMode() {
  if (!overlay) return;
  overlay.setInteractive(false, { cursor: 'default' });
}

function toonUnder(px, py) {
  if (!theme) return null;
  for (let i = toons.length - 1; i >= 0; i--) {
    const t = toons[i];
    if (!t.active || t.terminating || t.held) continue;
    if (t.type === Type.EXIT || t.type === Type.ANGEL ||
        t.type === Type.SPLAT || t.type === Type.EXPLOSION ||
        t.type === Type.ZAPPED) continue;
    if (hitToon(t, theme, px, py)) return t;
  }
  return null;
}

function uiTarget(el) {
  if (!el || !el.closest) return false;
  return !!el.closest(
    'button, a, input, textarea, select, label, summary, [data-xpenguins-ignore], [contenteditable="true"]',
  );
}

function releaseDrag(asSquish) {
  if (!drag) return;
  const { toon, pointerId } = drag;
  try {
    if (typeof window !== 'undefined' && window.releasePointerCapture) {
      /* capture was on documentElement when available */
    }
  } catch (_) { /* ignore */ }
  void pointerId;

  toon.held = false;
  if (asSquish && opts.squish) {
    squishToon(toon, theme, opts);
  } else {
    toon.type = Type.FALLER;
    const def = typeDef(theme, toon.genus, Type.FALLER);
    toon.frame = 0;
    toon.cycle = 0;
    toon.vx = 0;
    toon.vy = def.speed || 3;
  }
  drag = null;
  if (typeof document !== 'undefined') {
    document.documentElement.style.cursor = '';
    document.body && (document.body.style.userSelect = '');
  }
}

function onPointerDown(ev) {
  if (!running || !theme || !wantsPointer()) return;
  if (ev.button != null && ev.button !== 0) return;
  if (uiTarget(ev.target)) return;

  const t = toonUnder(ev.clientX, ev.clientY);
  if (!t) return; /* miss → normal page interaction */

  ev.preventDefault();
  ev.stopPropagation();
  drag = {
    toon: t,
    pointerId: ev.pointerId,
    startX: ev.clientX,
    startY: ev.clientY,
    offsetX: ev.clientX - t.x,
    offsetY: ev.clientY - t.y,
    moved: false,
  };
  t.held = true;
  t.vx = 0;
  t.vy = 0;
  try {
    ev.target.setPointerCapture?.(ev.pointerId);
  } catch (_) { /* ignore */ }
  if (typeof document !== 'undefined') {
    document.documentElement.style.cursor = 'grabbing';
    if (document.body) document.body.style.userSelect = 'none';
  }
}

function onPointerMove(ev) {
  if (!drag || drag.pointerId !== ev.pointerId) return;
  const { toon } = drag;
  const dx = ev.clientX - drag.startX;
  const dy = ev.clientY - drag.startY;
  if (!drag.moved && (dx * dx + dy * dy) >= opts.dragThreshold * opts.dragThreshold) {
    drag.moved = true;
  }
  toon.x = ev.clientX - drag.offsetX;
  toon.y = ev.clientY - drag.offsetY;
  toon.held = true;
  toon.vx = 0;
  toon.vy = 0;
  ev.preventDefault();
}

function onPointerUp(ev) {
  if (!drag || drag.pointerId !== ev.pointerId) return;
  const wasClick = !drag.moved;
  const shouldSquish = wasClick && opts.squish;
  releaseDrag(shouldSquish);
}

function onPointerCancel(ev) {
  if (!drag || (ev && drag.pointerId !== ev.pointerId)) return;
  releaseDrag(false);
}

let pointerBound = false;
function bindPointerListeners(on) {
  if (typeof document === 'undefined') return;
  const optsCap = { capture: true, passive: false };
  if (pointerBound) {
    document.removeEventListener('pointerdown', onPointerDown, optsCap);
    document.removeEventListener('pointermove', onPointerMove, optsCap);
    document.removeEventListener('pointerup', onPointerUp, optsCap);
    document.removeEventListener('pointercancel', onPointerCancel, optsCap);
    pointerBound = false;
  }
  if (on) {
    document.addEventListener('pointerdown', onPointerDown, optsCap);
    document.addEventListener('pointermove', onPointerMove, optsCap);
    document.addEventListener('pointerup', onPointerUp, optsCap);
    document.addEventListener('pointercancel', onPointerCancel, optsCap);
    pointerBound = true;
  }
  syncPointerMode();
}

function drawAll() {
  if (!overlay) return;
  const { ctx, canvas } = overlay;
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.restore();
  for (const t of toons) {
    if (!t.active) continue;
    const def = typeDef(theme, t.genus, t.type);
    if (!def) continue;
    const key = spriteKey(def);
    drawToon(ctx, images[key], def, t);
  }
}

function tick(now) {
  if (!running) return;
  raf = requestAnimationFrame(tick);

  const delay = theme.delay || 60;
  if (now - lastFrame < delay) return;
  lastFrame = now;

  const vw = window.innerWidth;
  const vh = window.innerHeight;
  if (now - lastSolids > opts.solidRefreshMs) refreshSolids();

  for (const t of toons) {
    if (t.held) continue;
    stepToon(t, solids, theme, vw, vh, opts);
  }
  drawAll();
}

function attachObservers() {
  detachObservers();
  const refresh = () => { if (running) refreshSolids(); };
  window.addEventListener('resize', refresh);
  window.addEventListener('scroll', refresh, true);
  observers.push(() => {
    window.removeEventListener('resize', refresh);
    window.removeEventListener('scroll', refresh, true);
  });
  if (typeof ResizeObserver !== 'undefined') {
    const ro = new ResizeObserver(refresh);
    ro.observe(document.documentElement);
    observers.push(() => ro.disconnect());
  }
  if (typeof MutationObserver !== 'undefined' && document.body) {
    const mo = new MutationObserver(refresh);
    mo.observe(document.body, {
      childList: true, subtree: true, attributes: true,
      attributeFilter: ['style', 'class', 'hidden'],
    });
    observers.push(() => mo.disconnect());
  }
}

function detachObservers() {
  while (observers.length) observers.pop()();
}

function destroyOverlayNow() {
  if (!overlay) return;
  bindPointerListeners(false);
  if (drag) {
    drag.toon.held = false;
    drag = null;
  }
  overlay.destroy();
  overlay = null;
}

async function start(userOpts = {}) {
  if (running || overlay) {
    session += 1;
    running = false;
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
    detachObservers();
    destroyOverlayNow();
    toons = [];
  }

  opts = { ...opts, ...userOpts };

  if (opts.respectReducedMotion !== false &&
      typeof matchMedia === 'function' &&
      matchMedia('(prefers-reduced-motion: reduce)').matches) {
    console.info('[xpenguins-web] prefers-reduced-motion: not starting');
    return api;
  }

  const pack = userOpts.pack || EMBEDDED;
  if (!pack || !pack.theme || !pack.images) {
    throw new Error('xpenguins-web: no embedded theme; build dist bundle or pass pack');
  }
  theme = pack.theme;
  images = await loadImages(pack.images);

  const mySession = session;
  overlay = createOverlay({ interactive: false });
  bindPointerListeners(true);

  const n = opts.count ?? theme.defaultCount ?? 8;
  opts.count = n;
  toons = [];
  for (let i = 0; i < n; i++) toons.push(createToon(window.innerWidth, theme));

  if (mySession !== session) {
    destroyOverlayNow();
    toons = [];
    return api;
  }

  running = true;
  refreshSolids();
  lastFrame = 0;
  attachObservers();
  syncPointerMode();
  raf = requestAnimationFrame(tick);
  return api;
}

function stop() {
  if (!running && !overlay) return;
  const mySession = ++session;
  running = false;
  if (raf) cancelAnimationFrame(raf);
  raf = 0;
  detachObservers();
  if (drag) releaseDrag(false);

  if (overlay && theme) {
    bindPointerListeners(false);
    for (const t of toons) {
      t.held = false;
      if (t.active) terminateToon(t, theme);
    }
    let frames = 0;
    const maxFrames = 40;
    const finish = () => {
      if (mySession !== session) return;
      frames++;
      for (const t of toons) {
        if (t.active) stepToon(t, solids, theme, window.innerWidth, window.innerHeight, opts);
      }
      drawAll();
      const stillPlaying = toons.some((t) => t.active);
      if (stillPlaying && frames < maxFrames) {
        setTimeout(finish, theme.delay || 60);
      } else if (mySession === session) {
        destroyOverlayNow();
        toons = [];
        theme = null;
      }
    };
    finish();
  } else {
    destroyOverlayNow();
    toons = [];
  }
}

function setNumber(n) {
  opts.count = Math.max(0, n | 0);
  if (!running || !theme) return;
  while (toons.length < opts.count) toons.push(createToon(window.innerWidth, theme));
  while (toons.length > opts.count) toons.pop();
}

/**
 * Enable or disable click-to-squish (click without dragging).
 * Does not require a restart; UI chrome should sit above the overlay z-index.
 */
function setSquish(on) {
  opts.squish = !!on;
  if (drag && !opts.squish) {
    /* keep current drag; only affects click-release behaviour */
  }
  syncPointerMode();
  bindPointerListeners(running && wantsPointer());
  return opts.squish;
}

function setGrab(on) {
  opts.grab = !!on;
  if (!opts.grab && drag) releaseDrag(false);
  syncPointerMode();
  bindPointerListeners(running && wantsPointer());
  return opts.grab;
}

function isRunning() {
  return running;
}

function isSquish() {
  return !!opts.squish;
}

function isGrab() {
  return !!opts.grab;
}

const api = {
  start,
  stop,
  setNumber,
  setSquish,
  setGrab,
  isRunning,
  isSquish,
  isGrab,
  collectSolids,
};

export {
  start, stop, setNumber, setSquish, setGrab, isRunning, isSquish, isGrab, collectSolids,
};
export default api;
