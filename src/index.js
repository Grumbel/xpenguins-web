/**
 * xpenguins-web — penguins on the DOM
 *
 * Public API (IIFE build attaches to window.XPenguins):
 *   start(options?)
 *   stop()
 *   setNumber(n)
 *   isRunning()
 */

import { collectSolids } from './solids.js';
import { createToon, stepToon, terminateToon, Type } from './toon.js';
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
let timer = 0;
let running = false;
let solids = [];
let solidsAge = 0;
let opts = {
  count: 8,
  blood: true,
  angels: true,
  solidRefreshMs: 500,
};

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

function tick() {
  if (!running) return;
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const now = performance.now();
  if (now - solidsAge > opts.solidRefreshMs) {
    solids = collectSolids();
    solidsAge = now;
  }
  for (const t of toons) {
    stepToon(t, solids, theme, vw, vh, opts);
  }
  const { ctx, canvas } = overlay;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  for (const t of toons) {
    if (!t.active) continue;
    const def = theme.types[t.type];
    if (!def) continue;
    const img = images[t.type] || images[def.file?.replace(/\.png$/, '')];
    // map type name to image key
    const key = t.type === 'exit' ? 'bomber'
      : t.type === 'splat' ? 'splat'
      : t.type === 'action' ? 'reader'
      : t.type;
    drawToon(ctx, images[key] || img, def, t);
  }
  timer = window.setTimeout(() => {
    raf = requestAnimationFrame(tick);
  }, theme.delay || 60);
}

async function start(userOpts = {}) {
  if (running) stop();
  opts = { ...opts, ...userOpts };
  const pack = userOpts.pack || EMBEDDED;
  if (!pack || !pack.theme || !pack.images) {
    throw new Error('xpenguins-web: no embedded theme; build dist bundle or pass pack');
  }
  theme = pack.theme;
  images = await loadImages(pack.images);
  overlay = createOverlay();
  const n = opts.count ?? theme.defaultCount ?? 8;
  toons = [];
  for (let i = 0; i < n; i++) toons.push(createToon(window.innerWidth, theme));
  running = true;
  solids = collectSolids();
  solidsAge = performance.now();
  raf = requestAnimationFrame(tick);
  return api;
}

function stop() {
  running = false;
  if (raf) cancelAnimationFrame(raf);
  if (timer) clearTimeout(timer);
  raf = 0;
  timer = 0;
  // play exit on all then tear down shortly
  if (overlay && theme) {
    for (const t of toons) terminateToon(t, theme);
    const { ctx, canvas } = overlay;
    let frames = 0;
    const finish = () => {
      frames++;
      solids = collectSolids();
      for (const t of toons) stepToon(t, solids, theme, innerWidth, innerHeight, opts);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (const t of toons) {
        const def = theme.types[t.type];
        if (!def) continue;
        const key = t.type === 'exit' ? 'bomber' : t.type === 'angel' ? 'angel' : t.type;
        drawToon(ctx, images[key], def, t);
      }
      if (frames < 40 && toons.some((t) => t.type === Type.EXIT || t.type === Type.ANGEL)) {
        setTimeout(finish, theme.delay || 60);
      } else {
        overlay.destroy();
        overlay = null;
        toons = [];
      }
    };
    finish();
  } else if (overlay) {
    overlay.destroy();
    overlay = null;
  }
}

function setNumber(n) {
  opts.count = Math.max(0, n | 0);
  if (!running || !theme) return;
  while (toons.length < opts.count) toons.push(createToon(innerWidth, theme));
  while (toons.length > opts.count) toons.pop();
}

function isRunning() {
  return running;
}

const api = { start, stop, setNumber, isRunning, collectSolids };

export { start, stop, setNumber, isRunning, collectSolids };
export default api;
