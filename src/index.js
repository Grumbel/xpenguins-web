/**
 * xpenguins-web — penguins on the DOM
 *
 * Public API (IIFE build attaches to window.XPenguins):
 *   start(options?)
 *   stop()
 *   setNumber(n)
 *   setSquish(on)
 *   isRunning()
 *   isSquish()
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
let opts = {
  count: 8,
  blood: true,
  angels: true,
  squish: false,
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

function onPointerDown(ev) {
  if (!opts.squish || !theme || !running) return;
  const px = ev.clientX;
  const py = ev.clientY;
  for (let i = toons.length - 1; i >= 0; i--) {
    const t = toons[i];
    if (hitToon(t, theme, px, py)) {
      squishToon(t, theme, opts);
      break;
    }
  }
}

function bindSquishListener(on) {
  if (!overlay) return;
  overlay.canvas.removeEventListener('pointerdown', onPointerDown);
  if (on) overlay.canvas.addEventListener('pointerdown', onPointerDown);
  overlay.setInteractive(!!on);
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

/**
 * Tear down overlay immediately (cancel any in-flight exit animation).
 */
function destroyOverlayNow() {
  if (!overlay) return;
  overlay.canvas.removeEventListener('pointerdown', onPointerDown);
  overlay.destroy();
  overlay = null;
}

async function start(userOpts = {}) {
  /* Cancel previous session completely before starting a new one. */
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
  overlay = createOverlay({ interactive: !!opts.squish });
  bindSquishListener(!!opts.squish);

  const n = opts.count ?? theme.defaultCount ?? 8;
  opts.count = n;
  toons = [];
  for (let i = 0; i < n; i++) toons.push(createToon(window.innerWidth, theme));

  if (mySession !== session) {
    /* Superseded by another start/stop while images loaded. */
    destroyOverlayNow();
    toons = [];
    return api;
  }

  running = true;
  refreshSolids();
  lastFrame = 0;
  attachObservers();
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

  if (overlay && theme) {
    bindSquishListener(false);
    for (const t of toons) terminateToon(t, theme);
    let frames = 0;
    const finish = () => {
      if (mySession !== session) return; /* superseded */
      frames++;
      refreshSolids();
      for (const t of toons) {
        stepToon(t, solids, theme, window.innerWidth, window.innerHeight, opts);
      }
      drawAll();
      const dying = toons.some(
        (t) => t.type === Type.EXIT || t.type === Type.ANGEL ||
          t.type === Type.SPLAT || t.type === Type.EXPLOSION,
      );
      if (frames < 48 && dying) {
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
 * Enable or disable click-to-squish without restarting the animation.
 * Fixes the example “Toggle squish” control that previously stop/start raced.
 */
function setSquish(on) {
  opts.squish = !!on;
  if (!overlay) return opts.squish;
  bindSquishListener(opts.squish);
  return opts.squish;
}

function isRunning() {
  return running;
}

function isSquish() {
  return !!opts.squish;
}

const api = {
  start,
  stop,
  setNumber,
  setSquish,
  isRunning,
  isSquish,
  collectSolids,
};

export {
  start, stop, setNumber, setSquish, isRunning, isSquish, collectSolids,
};
export default api;
