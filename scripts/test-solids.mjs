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

if (failed) process.exit(1);
console.log('All tests passed');
