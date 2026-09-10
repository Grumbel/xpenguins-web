/**
 * Full-viewport canvas overlay.
 *
 * Always pointer-events:none — hit-testing is done from document listeners
 * so text selection and page UI keep working. Drawing still covers the viewport.
 */

export function createOverlay(opts = {}) {
  const canvas = document.createElement('canvas');
  canvas.setAttribute('data-xpenguins-canvas', '1');
  canvas.setAttribute('data-xpenguins-ignore', '1');
  const interactive = !!opts.interactive;
  canvas.style.cssText = [
    'position:fixed',
    'left:0',
    'top:0',
    'width:100vw',
    'height:100vh',
    'z-index:2147483645',
    'pointer-events:none',
    'image-rendering:pixelated',
    'cursor:' + ('default'),
  ].join(';');
  document.documentElement.appendChild(canvas);
  const ctx = canvas.getContext('2d');
  function resize() {
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.floor(window.innerWidth * dpr);
    canvas.height = Math.floor(window.innerHeight * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  resize();
  window.addEventListener('resize', resize);
  return {
    canvas,
    ctx,
    resize,
    setInteractive(_on, style = {}) {
      /* Canvas never captures pointers; page stays usable. */
      canvas.style.pointerEvents = 'none';
      canvas.style.cursor = style.cursor || 'default';
    },
    destroy() {
      window.removeEventListener('resize', resize);
      canvas.remove();
    },
  };
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {HTMLImageElement} img
 * @param {object} def theme type def
 * @param {object} t toon
 */
export function drawToon(ctx, img, def, t) {
  if (!img || !img.complete) return;
  const w = def.width;
  const h = def.height;
  const dir = Math.min(t.dir | 0, Math.max(0, (def.directions || 1) - 1));
  const fr = (t.frame | 0) % Math.max(1, def.frames);
  const sx = fr * w;
  const sy = dir * h;
  ctx.drawImage(img, sx, sy, w, h, Math.round(t.x), Math.round(t.y), w, h);
}
