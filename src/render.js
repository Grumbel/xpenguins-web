/**
 * Full-viewport canvas overlay.
 */

export function createOverlay() {
  const canvas = document.createElement('canvas');
  canvas.setAttribute('data-xpenguins-canvas', '1');
  canvas.style.cssText = [
    'position:fixed',
    'left:0',
    'top:0',
    'width:100vw',
    'height:100vh',
    'z-index:2147483646',
    'pointer-events:none',
    'image-rendering:pixelated',
  ].join(';');
  document.documentElement.appendChild(canvas);
  const ctx = canvas.getContext('2d');
  function resize() {
    canvas.width = window.innerWidth * devicePixelRatio;
    canvas.height = window.innerHeight * devicePixelRatio;
    ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
  }
  resize();
  window.addEventListener('resize', resize);
  return {
    canvas,
    ctx,
    resize,
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
  const dir = Math.min(t.dir, (def.directions || 1) - 1);
  const fr = t.frame % Math.max(1, def.frames);
  const sx = fr * w;
  const sy = dir * h;
  ctx.drawImage(img, sx, sy, w, h, Math.round(t.x), Math.round(t.y), w, h);
}
