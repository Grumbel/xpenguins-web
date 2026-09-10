/**
 * Collect walkable axis-aligned boxes from the live DOM.
 * Tops of these boxes are ledges; left/right edges can be climbed.
 *
 * Ledge quality prefers elements that look like surfaces (opaque
 * background, border, box-shadow) and skips transparent wrappers and
 * flush-to-viewport-top chrome (walking there draws sprites off-screen).
 */

const SKIP_TAGS = new Set([
  'SCRIPT', 'STYLE', 'LINK', 'META', 'HEAD', 'BR', 'WBR', 'NOSCRIPT',
  'SVG', 'PATH', 'CANVAS', 'VIDEO', 'AUDIO', 'IFRAME',
]);

/** Parse CSS color alpha in [0,1]; unknown → 1. */
export function colorAlpha(cssColor) {
  if (!cssColor || cssColor === 'transparent') return 0;
  const c = cssColor.trim().toLowerCase();
  if (c === 'transparent') return 0;
  let m = c.match(/^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)(?:\s*,\s*([\d.]+))?\s*\)$/);
  if (m) return m[4] !== undefined ? Number(m[4]) : 1;
  m = c.match(/^rgba?\(\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)(?:\s*\/\s*([\d.]+%?))?\s*\)$/);
  if (m) {
    if (m[4] === undefined) return 1;
    return m[4].endsWith('%') ? Number(m[4]) / 100 : Number(m[4]);
  }
  m = c.match(/^#([0-9a-f]{4})$/i);
  if (m) return parseInt(m[1][3] + m[1][3], 16) / 255;
  m = c.match(/^#([0-9a-f]{8})$/i);
  if (m) return parseInt(m[1].slice(6, 8), 16) / 255;
  /* named colors / #rgb / #rrggbb → treat as opaque */
  if (c.startsWith('#') || /^[a-z]+$/.test(c)) return 1;
  return 1;
}

function borderTopPx(st) {
  if (st.borderTopStyle === 'none' || st.borderTopStyle === '') return 0;
  return parseFloat(st.borderTopWidth) || 0;
}

function hasBoxShadow(st) {
  const s = st.boxShadow;
  return !!(s && s !== 'none');
}

/**
 * Visual weight for use as a walkable ledge. Higher is better.
 * Transparent wrappers score 0 and are dropped.
 */
export function ledgeScore(st, rect, vw, vh) {
  let score = 0;
  const bgA = colorAlpha(st.backgroundColor);
  if (bgA >= 0.4) score += 3;
  else if (bgA >= 0.15) score += 1;

  if (st.backgroundImage && st.backgroundImage !== 'none') score += 2;

  const bt = borderTopPx(st);
  if (bt >= 1) score += 2;
  else {
    const bw = parseFloat(st.borderWidth) || 0;
    if (bw >= 1 && st.borderStyle !== 'none') score += 1;
  }

  if (hasBoxShadow(st)) score += 2;

  /* outline can mark cards */
  if (st.outlineStyle && st.outlineStyle !== 'none' && (parseFloat(st.outlineWidth) || 0) >= 1) {
    score += 1;
  }

  /* Huge near-fullscreen nodes are wallpaper, not ledges */
  if (rect.width > vw * 0.95 && rect.height > vh * 0.85) score = 0;

  return score;
}

/**
 * @param {object} [opts]
 * @param {number} [opts.minWidth=40]
 * @param {number} [opts.minHeight=12]
 * @param {number} [opts.minScore=2]  minimum ledgeScore to keep
 * @param {number} [opts.minTop=12]   ignore tops flush with viewport top
 * @param {Element} [opts.root=document.body]
 * @returns {{x:number,y:number,w:number,h:number,score?:number}[]}
 */
export function collectSolids(opts = {}) {
  const minWidth = opts.minWidth ?? 40;
  const minHeight = opts.minHeight ?? 12;
  const minScore = opts.minScore ?? 2;
  const minTop = opts.minTop ?? 12;
  const root = opts.root ?? document.body;
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const candidates = [];

  /* Viewport floor — classic “bottom of the screen” */
  candidates.push({ x: 0, y: vh - 2, w: vw, h: 4, floor: true, score: 99 });

  if (!root) return candidates;

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT);
  let el = walker.currentNode;
  while (el) {
    if (el !== root &&
        !SKIP_TAGS.has(el.tagName) &&
        el.tagName !== 'HTML' && el.tagName !== 'BODY' &&
        !el.hasAttribute('data-xpenguins-ignore')) {
      const st = window.getComputedStyle(el);
      if (st.display !== 'none' && st.visibility !== 'hidden' &&
          Number(st.opacity) !== 0) {
        const r = el.getBoundingClientRect();
        if (r.width >= minWidth && r.height >= minHeight &&
            r.bottom > 0 && r.top < vh && r.right > 0 && r.left < vw) {
          /*
           * Tops flush with the viewport put walkers at y≈-height (mostly
           * off-screen). Skip those tops; fallers pass through into content.
           */
          if (r.top >= minTop) {
            const score = ledgeScore(st, r, vw, vh);
            if (score >= minScore) {
              candidates.push({
                x: r.left,
                y: r.top,
                w: r.width,
                h: r.height,
                score,
              });
            }
          }
        }
      }
    }
    el = walker.nextNode();
  }

  return dedupeLedges(candidates);
}

/**
 * Drop nested / nearly identical tops — keep the higher-scoring, wider ledge.
 */
export function dedupeLedges(solids) {
  const floors = solids.filter((s) => s.floor);
  const rest = solids.filter((s) => !s.floor)
    .sort((a, b) => (b.score - a.score) || (b.w - a.w));

  const kept = [];
  for (const s of rest) {
    const dominates = kept.some((k) => {
      const sameTop = Math.abs(k.y - s.y) < 6;
      const overlapX = Math.min(k.x + k.w, s.x + s.w) - Math.max(k.x, s.x);
      const minW = Math.min(k.w, s.w);
      return sameTop && minW > 0 && overlapX > minW * 0.6;
    });
    if (!dominates) kept.push(s);
  }
  return floors.concat(kept);
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
 * on solids whose top is ≈0.
 */
export function landOnLedge(solids, x, prevFoot, newFoot, w, slop = 4) {
  if (newFoot <= prevFoot) return null;
  const cx = x + w / 2;
  let best = null;
  for (const s of solids) {
    if (cx < s.x || cx > s.x + s.w) continue;
    const top = s.y;
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

/**
 * Horizontal block in walk direction.
 * True when the toon's leading edge has reached or entered the solid face
 * (not only a 4px-thin band — walkers used to skip past the face in one step).
 */
export function blockedSide(solids, x, y, w, h, dir) {
  const midY = y + h * 0.5;
  const lead = dir > 0 ? x + w : x;
  for (const s of solids) {
    if (s.floor) continue;
    if (midY < s.y || midY > s.y + s.h) continue;
    if (dir > 0) {
      /* Walking right: leading edge at/past left face, body not fully past solid */
      if (lead >= s.x - 1 && x < s.x + s.w) return s;
    } else {
      if (lead <= s.x + s.w + 1 && x + w > s.x) return s;
    }
  }
  return null;
}

/**
 * Classic step-up: is the path clear a few pixels up and forward?
 * Used when a walker is blocked at foot level.
 */
export function canStepUp(solids, x, y, w, h, dir, rise = 8) {
  const nx = x + (dir > 0 ? 2 : -2);
  const ny = y - rise;
  if (blockedSide(solids, nx, ny, w, h, dir)) return false;
  /* Still need something under the new feet, or empty air is ok for one step */
  return true;
}

/**
 * Vertical wall face still beside the toon for climbing.
 * Unlike blockedSide (mid-body probe), this keeps a grip while any of the
 * body still overlaps the solid in Y — so climbers are not dropped the
 * instant their midpoint passes the top edge.
 *
 * @param {number} side  +1 = wall on the right, -1 = wall on the left
 * @returns {object|null} solid being climbed
 */
export function wallBeside(solids, x, y, w, h, side, grip = 4) {
  const probeX = side > 0 ? x + w + 1 : x - 1;
  const bodyTop = y;
  const bodyBot = y + h;
  let best = null;
  for (const s of solids) {
    if (s.floor) continue;
    /* Horizontal contact with the near face */
    let faceHit = false;
    if (side > 0) {
      faceHit = probeX >= s.x - 1 && probeX <= s.x + grip;
    } else {
      faceHit = probeX <= s.x + s.w + 1 && probeX >= s.x + s.w - grip;
    }
    if (!faceHit) continue;
    /* Vertical overlap: feet still at or below top, head not fully below bottom */
    if (bodyBot < s.y - 2) continue; /* already above the wall */
    if (bodyTop > s.y + s.h) continue; /* fully below the wall */
    if (!best || s.y < best.y) best = s; /* prefer higher top when overlapping */
  }
  return best;
}
