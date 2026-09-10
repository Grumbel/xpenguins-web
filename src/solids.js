/**
 * Collect walkable axis-aligned boxes from the live DOM.
 * Tops of these boxes are ledges; left/right edges can be climbed.
 */

const SKIP_TAGS = new Set([
  'SCRIPT', 'STYLE', 'LINK', 'META', 'HEAD', 'BR', 'WBR', 'NOSCRIPT',
]);

/**
 * @param {object} [opts]
 * @param {number} [opts.minWidth=40]
 * @param {number} [opts.minHeight=12]
 * @param {Element} [opts.root=document.body]
 * @returns {{x:number,y:number,w:number,h:number}[]}
 */
export function collectSolids(opts = {}) {
  const minWidth = opts.minWidth ?? 40;
  const minHeight = opts.minHeight ?? 12;
  const root = opts.root ?? document.body;
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const out = [];

  // Viewport floor — classic “bottom of the screen”
  out.push({ x: 0, y: vh - 2, w: vw, h: 4, floor: true });

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT);
  let el = walker.currentNode;
  while (el) {
    if (el === root || !SKIP_TAGS.has(el.tagName)) {
      if (el.tagName !== 'HTML' && el.tagName !== 'BODY' &&
          !el.hasAttribute('data-xpenguins-ignore')) {
        const st = window.getComputedStyle(el);
        if (st.display !== 'none' && st.visibility !== 'hidden' &&
            st.opacity !== '0') {
          const r = el.getBoundingClientRect();
          if (r.width >= minWidth && r.height >= minHeight &&
              r.bottom > 0 && r.top < vh && r.right > 0 && r.left < vw) {
            // Reject near full-viewport wallpaper-like nodes
            if (!(r.width > vw * 0.95 && r.height > vh * 0.9)) {
              out.push({
                x: r.left,
                y: r.top,
                w: r.width,
                h: r.height,
              });
            }
          }
        }
      }
    }
    el = walker.nextNode();
  }
  return out;
}

/** Foot resting on a ledge? */
export function findSupport(solids, x, y, w, h, slop = 3) {
  const footY = y + h;
  const cx = x + w / 2;
  let best = null;
  for (const s of solids) {
    if (cx < s.x || cx > s.x + s.w) continue;
    const top = s.y;
    if (footY >= top - slop && footY <= top + slop + 2) {
      if (!best || top < best.y) best = s;
    }
  }
  return best;
}

/**
 * True landing: feet crossed a solid top this frame (prevFoot above, newFoot
 * at/below). Prevents fallers spawned at y=-height from instantly "landing"
 * on solids whose top is ≈0 (page headers flush with the viewport).
 *
 * @returns {object|null} the solid landed on (highest top that was crossed)
 */
export function landOnLedge(solids, x, prevFoot, newFoot, w, slop = 4) {
  if (newFoot <= prevFoot) return null; /* not falling */
  const cx = x + w / 2;
  let best = null;
  for (const s of solids) {
    if (cx < s.x || cx > s.x + s.w) continue;
    const top = s.y;
    /* Feet were strictly above the ledge, then reach or pass it. */
    if (prevFoot < top - 0.5 && newFoot >= top - slop) {
      if (!best || top < best.y) best = s;
    }
  }
  return best;
}

/** Hit a solid while falling (head or body). */
export function hitCeiling(solids, x, y, w, h) {
  const head = y;
  const cx = x + w / 2;
  for (const s of solids) {
    if (s.floor) continue;
    if (cx < s.x || cx > s.x + s.w) continue;
    const bottom = s.y + s.h;
    if (head <= bottom && head >= bottom - 8 && y + h > s.y) return s;
  }
  return null;
}

/** Horizontal block in walk direction. */
export function blockedSide(solids, x, y, w, h, dir) {
  const probeX = dir > 0 ? x + w + 1 : x - 1;
  const midY = y + h * 0.5;
  for (const s of solids) {
    if (s.floor) continue;
    if (midY < s.y || midY > s.y + s.h) continue;
    if (dir > 0 && probeX >= s.x && probeX <= s.x + 4) return s;
    if (dir < 0 && probeX <= s.x + s.w && probeX >= s.x + s.w - 4) return s;
  }
  return null;
}
