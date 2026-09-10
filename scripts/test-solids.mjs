/**
 * Geometry + genus helpers (no DOM).
 */

function findSupport(solids, x, y, w, h, slop = 3) {
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

function blockedSide(solids, x, y, w, h, dir) {
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

function landOnLedge(solids, x, prevFoot, newFoot, w, slop = 4) {
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

function colorAlpha(cssColor) {
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
  if (c.startsWith('#') || /^[a-z]+$/.test(c)) return 1;
  return 1;
}

function ledgeScore(st, rect, vw, vh) {
  let score = 0;
  const bgA = colorAlpha(st.backgroundColor);
  if (bgA >= 0.4) score += 3;
  else if (bgA >= 0.15) score += 1;
  if (st.backgroundImage && st.backgroundImage !== 'none') score += 2;
  const bt = (st.borderTopStyle === 'none' || st.borderTopStyle === '')
    ? 0 : (parseFloat(st.borderTopWidth) || 0);
  if (bt >= 1) score += 2;
  if (st.boxShadow && st.boxShadow !== 'none') score += 2;
  if (rect.width > vw * 0.95 && rect.height > vh * 0.85) score = 0;
  return score;
}

function dedupeLedges(solids) {
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

function themeGenera(theme) {
  if (theme.genera && theme.genera.length) return theme.genera;
  return [{ name: 'default', weight: 1, types: theme.types }];
}

function typeDef(theme, genus, type) {
  if (genus && genus.types && genus.types[type]) return genus.types[type];
  const g0 = themeGenera(theme)[0];
  return g0.types[type] || g0.types.walker;
}

let failed = 0;
function assert(cond, msg) {
  if (!cond) {
    console.error('FAIL', msg);
    failed++;
  } else console.log('ok', msg);
}

const ledge = { x: 100, y: 200, w: 300, h: 40 };
assert(!!findSupport([ledge], 150, 170, 30, 30, 3), 'standing on ledge');
assert(!findSupport([ledge], 150, 100, 30, 30, 3), 'too high above ledge');
assert(!!blockedSide([ledge], 70, 200, 30, 30, 1), 'blocked walking into left face');
assert(!blockedSide([ledge], 200, 180, 30, 30, 1), 'not blocked in open air');

assert(!!landOnLedge([ledge], 150, 195, 205, 30), 'cross ledge from above');
assert(!landOnLedge([{ x: 0, y: 0, w: 800, h: 80 }], 150, 0, 3, 30), 'spawn at top does not false-land');
assert(!landOnLedge([ledge], 150, 210, 220, 30), 'already below ledge does not land');

assert(colorAlpha('transparent') === 0, 'transparent alpha 0');
assert(colorAlpha('rgba(0,0,0,0)') === 0, 'rgba alpha 0');
assert(colorAlpha('rgb(30, 58, 95)') === 1, 'rgb opaque');
assert(colorAlpha('rgba(255,255,255,0.5)') === 0.5, 'rgba 0.5');
assert(colorAlpha('#1e3a5f') === 1, 'hex opaque');

const opaqueCard = ledgeScore(
  { backgroundColor: 'rgb(255,255,255)', borderTopStyle: 'none', borderTopWidth: '0', boxShadow: '0 2px 8px rgba(0,0,0,.08)', backgroundImage: 'none' },
  { width: 400, height: 80 }, 800, 600,
);
assert(opaqueCard >= 2, 'opaque card scores as ledge (' + opaqueCard + ')');

const transparentWrap = ledgeScore(
  { backgroundColor: 'rgba(0,0,0,0)', borderTopStyle: 'none', borderTopWidth: '0', boxShadow: 'none', backgroundImage: 'none' },
  { width: 400, height: 80 }, 800, 600,
);
assert(transparentWrap < 2, 'transparent wrapper rejected (' + transparentWrap + ')');

const borderOnly = ledgeScore(
  { backgroundColor: 'transparent', borderTopStyle: 'solid', borderTopWidth: '2px', boxShadow: 'none', backgroundImage: 'none' },
  { width: 200, height: 40 }, 800, 600,
);
assert(borderOnly >= 2, 'border-top alone is a ledge (' + borderOnly + ')');

const deduped = dedupeLedges([
  { x: 100, y: 150, w: 400, h: 80, score: 5 },
  { x: 110, y: 152, w: 200, h: 40, score: 3 },
  { x: 0, y: 598, w: 800, h: 4, floor: true, score: 99 },
]);
assert(deduped.filter((s) => !s.floor).length === 1, 'dedupe nested same-top');
assert(deduped.some((s) => s.floor), 'floor kept');

const theme = JSON.parse(
  await import('fs').then((fs) =>
    fs.promises.readFile(new URL('../themes/penguins/theme.json', import.meta.url), 'utf8')),
);
assert(themeGenera(theme).length === 2, 'two genera');
const skater = theme.genera.find((g) => g.name === 'skateboarder');
assert(!!skater, 'skateboarder genus present');
assert(typeDef(theme, skater, 'faller').file === 'ballooner.png', 'skater faller is ballooner');
assert(typeDef(theme, skater, 'walker').frames === 1, 'skater walker single frame');
assert(typeDef(theme, theme.genera[0], 'walker').file === 'walker.png', 'normal walker');


assert(typeDef(theme, skater, 'floater').file === 'superpenguin.png',
  'skater floater is superpenguin (superman)');
assert(typeDef(theme, skater, 'action0').file === 'digger.png', 'skater action0 digger');
assert(typeDef(theme, theme.genera[0], 'action0').file === 'reader.png', 'normal action0 reader');
assert(typeDef(theme, theme.genera[0], 'exit').file === 'bomber.png', 'normal exit bomber');
assert(typeDef(theme, skater, 'faller').file === 'ballooner.png', 'skater faller ballooner');
assert(typeDef(theme, skater, 'climber').file === 'climber_skateboarder.png', 'skater climber');
/* action1 digger on normal is extra vs classic (classic only has digger on skater) */
const n0 = theme.genera[0];
if (n0.types.action1) {
  assert(n0.types.action1.file === 'digger.png', 'normal action1 digger (web extra)');
}

if (failed) process.exit(1);
console.log('All tests passed');
