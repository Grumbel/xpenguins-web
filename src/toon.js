/**
 * Single toon state machine (classic-inspired), with multi-genus themes.
 *
 * Direction convention matches xpenguins-ng / classic XPenguins:
 *   dir 0 = LEFT  (vx negative, sprite strip row 0)
 *   dir 1 = RIGHT (vx positive, sprite strip row 1)
 * Velocity for walkers: speed * (2*dir - 1)
 */

import {
  findSupport, blockedSide, hitCeiling, landOnLedge, canStepUp,
} from './solids.js';

export const Type = {
  FALLER: 'faller',
  WALKER: 'walker',
  TUMBLER: 'tumbler',
  CLIMBER: 'climber',
  FLOATER: 'floater',
  EXIT: 'exit',
  ANGEL: 'angel',
  SPLAT: 'splat',
  EXPLOSION: 'explosion',
  ACTION: 'action',
  ZAPPED: 'zapped',
};

function rand(n) {
  return Math.floor(Math.random() * n);
}

/** Horizontal sign from classic direction: 0→-1 (left), 1→+1 (right). */
function dirSign(dir) {
  return (dir | 0) * 2 - 1;
}

/** Resolve genera list (back-compat with flat theme.types). */
export function themeGenera(theme) {
  if (theme.genera && theme.genera.length) return theme.genera;
  return [{ name: 'default', weight: 1, types: theme.types }];
}

export function pickGenus(theme) {
  const genera = themeGenera(theme);
  let total = 0;
  for (const g of genera) total += g.weight || 1;
  let r = Math.random() * total;
  for (const g of genera) {
    r -= g.weight || 1;
    if (r <= 0) return g;
  }
  return genera[0];
}

export function typeDef(theme, genus, type) {
  if (genus && genus.types && genus.types[type]) return genus.types[type];
  if (theme.types && theme.types[type]) return theme.types[type];
  const g0 = themeGenera(theme)[0];
  return g0.types[type] || g0.types.walker;
}

export function createToon(vw, theme, genus) {
  const g = genus || pickGenus(theme);
  const fall = typeDef(theme, g, Type.FALLER);
  const dir = rand(2);
  return {
    active: true,
    genus: g,
    type: Type.FALLER,
    x: rand(Math.max(1, vw - fall.width)),
    /* Fully above the screen (y + height === 0), same as xpenguins-ng. */
    y: -fall.height,
    vx: dirSign(dir),
    vy: fall.speed,
    dir,
    frame: 0,
    cycle: 0,
    climbSide: 0,
    terminating: false,
  };
}

/**
 * Change type; keep feet planted when height differs (ballooner → walker).
 */
function setType(t, type, theme, keepDir) {
  const prev = typeDef(theme, t.genus, t.type);
  const prevH = prev && prev.height ? prev.height : 0;
  t.type = type;
  const def = typeDef(theme, t.genus, type);
  t.frame = 0;
  t.cycle = 0;
  const dirs = def.directions || 1;
  t.dir = ((t.dir | 0) % dirs + dirs) % dirs;

  if (prevH && def.height && prevH !== def.height) {
    /* Keep feet at the same Y when sprite height changes. */
    t.y += prevH - def.height;
  }

  if (type === Type.FALLER) {
    t.vx = dirSign(t.dir);
    t.vy = def.speed;
  } else if (type === Type.WALKER) {
    t.vy = 0;
    t.vx = dirSign(t.dir) * def.speed;
  } else if (type === Type.TUMBLER) {
    t.vx = dirSign(t.dir) * 0.5;
    t.vy = def.speed;
  } else if (type === Type.CLIMBER) {
    t.vx = 0;
    t.vy = -def.speed;
  } else if (type === Type.FLOATER) {
    t.vx = dirSign(t.dir) * def.speed;
    t.vy = -def.speed * 0.25;
  } else if (type === Type.ANGEL) {
    t.vx = (Math.random() - 0.5) * 2;
    t.vy = -def.speed;
  } else {
    t.vx = 0;
    t.vy = 0;
  }
  void keepDir;
}

function makeWalker(t, theme) {
  setType(t, Type.WALKER, theme, true);
  if (typeDef(theme, t.genus, Type.ACTION) && rand(100) === 0) {
    setType(t, Type.ACTION, theme, true);
  }
}

export function stepToon(t, solids, theme, vw, vh, opts) {
  if (!t.active) return;

  const def = typeDef(theme, t.genus, t.type);
  const w = def.width;
  const h = def.height;

  /* Classic ToonAdvance: one sprite frame per physics tick when active. */
  {
    const nframes = Math.max(1, def.frames | 0);
    t.frame += 1;
    if (t.frame >= nframes) {
      t.frame = 0;
      t.cycle = (t.cycle | 0) + 1;
    }
  }

  if (t.type === Type.EXIT || t.type === Type.SPLAT || t.type === Type.EXPLOSION ||
      t.type === Type.ZAPPED) {
    /* Finished a non-looping death strip once (cycle flipped after last frame). */
    if (t.cycle >= 1) {
      const hasAngel = !!typeDef(theme, t.genus, Type.ANGEL);
      if (opts.angels !== false && hasAngel) {
        setType(t, Type.ANGEL, theme, true);
      } else {
        Object.assign(t, createToon(vw, theme));
      }
    }
    return;
  }

  if (t.type === Type.ANGEL) {
    t.x += t.vx;
    t.y += t.vy;
    if (t.y + h < -10) Object.assign(t, createToon(vw, theme));
    return;
  }

  if (t.type === Type.ACTION) {
    const loop = def.loop != null ? def.loop : -4;
    if (loop < 0) {
      if (rand(-loop) === 0) setType(t, Type.WALKER, theme, true);
    } else if ((t.cycle | 0) >= loop) {
      setType(t, Type.WALKER, theme, true);
    }
    const support = findSupport(solids, t.x, t.y, w, h, 5);
    if (!support) {
      setType(t, Type.TUMBLER, theme, true);
    } else {
      t.y = support.y - h;
    }
    return;
  }

  if (t.type === Type.TUMBLER || t.type === Type.FALLER) {
    const term = def.terminalVelocity || (t.type === Type.FALLER ? 12 : 8);
    const acc = def.acceleration != null ? def.acceleration : (t.type === Type.TUMBLER ? 1 : 0);
    if (acc && t.vy < term) {
      t.vy = Math.min(term, t.vy + acc * 0.25);
    }
  } else if (t.type === Type.WALKER && def.acceleration) {
    const cap = def.terminalVelocity || 12;
    const s = dirSign(t.dir);
    const next = Math.abs(t.vx) + def.acceleration * 0.05;
    t.vx = s * Math.min(cap, next);
  }

  const prevY = t.y;
  const prevFoot = prevY + h;

  t.x += t.vx;
  t.y += t.vy;

  if (t.x < -w) t.x = vw;
  if (t.x > vw) t.x = -w;

  if (t.type === Type.FALLER || t.type === Type.TUMBLER) {
    const ceil = hitCeiling(solids, t.x, t.y, w, h);
    if (ceil && t.vy < 0) {
      setType(t, Type.FALLER, theme, true);
      t.vy = Math.abs(typeDef(theme, t.genus, Type.FALLER).speed);
      return;
    }
    const landed = landOnLedge(solids, t.x, prevFoot, t.y + h, w, 6);
    if (landed) {
      t.y = landed.y - h;
      if (t.type === Type.TUMBLER && t.vy > 5 && rand(3) === 0) {
        setType(t, opts.blood === false ? Type.EXPLOSION : Type.SPLAT, theme, true);
        return;
      }
      makeWalker(t, theme);
      /* After height adjust in setType, re-snap feet to ledge. */
      const wd = typeDef(theme, t.genus, t.type);
      t.y = landed.y - wd.height;
      return;
    }
    if (t.y > vh + 40) Object.assign(t, createToon(vw, theme));
    return;
  }

  if (t.type === Type.WALKER) {
    const support = findSupport(solids, t.x, t.y, w, h, 5);
    if (!support) {
      setType(t, Type.TUMBLER, theme, true);
      return;
    }
    t.y = support.y - h;
    const side = dirSign(t.dir);
    const block = blockedSide(solids, t.x, t.y, w, h, side);
    if (block) {
      /* Classic: try a small step-up onto a higher ledge before turning. */
      const rise = 8;
      if (canStepUp(solids, t.x, t.y, w, h, side, rise)) {
        const upSupport = findSupport(solids, t.x + side * 3, t.y - rise, w, h, 6);
        if (upSupport && upSupport.y < support.y - 2) {
          t.y = upSupport.y - h;
          t.x += side * Math.min(4, Math.abs(t.vx) || 2);
          return;
        }
      }
      const r = rand(8);
      if (r < 2 && typeDef(theme, t.genus, Type.CLIMBER)) {
        t.climbSide = side;
        setType(t, Type.CLIMBER, theme, true);
        t.x = side > 0 ? block.x - w : block.x + block.w;
      } else if (r < 3 && typeDef(theme, t.genus, Type.FLOATER)) {
        t.dir = 1 - t.dir;
        setType(t, Type.FLOATER, theme, true);
      } else {
        t.dir = 1 - t.dir;
        t.vx = dirSign(t.dir) * def.speed;
      }
      return;
    }
    const cx = t.x + w / 2;
    if (cx < support.x + 2 || cx > support.x + support.w - 2) {
      if (rand(2) === 0) setType(t, Type.TUMBLER, theme, true);
      else {
        t.dir = 1 - t.dir;
        t.vx = dirSign(t.dir) * def.speed;
      }
    }
    return;
  }

  if (t.type === Type.CLIMBER) {
    const side = t.climbSide || dirSign(t.dir);
    const block = blockedSide(solids, t.x - side * 2, t.y, w, h, side);
    if (!block) {
      setType(t, Type.FALLER, theme, true);
      return;
    }
    t.x = side > 0 ? block.x - w : block.x + block.w;
    if (t.y + h <= block.y + 2) {
      t.y = block.y - h;
      t.dir = side > 0 ? 1 : 0;
      setType(t, Type.WALKER, theme, true);
      return;
    }
    if (t.y < -h) Object.assign(t, createToon(vw, theme));
    return;
  }

  if (t.type === Type.FLOATER) {
    if (t.y < -h) Object.assign(t, createToon(vw, theme));
    const support = findSupport(solids, t.x, t.y, w, h, 3);
    if (support) {
      t.y = support.y - h;
      makeWalker(t, theme);
    }
  }
}

export function terminateToon(t, theme) {
  t.terminating = true;
  setType(t, Type.EXIT, theme, true);
}

export function squishToon(t, theme, opts) {
  if (!t.active || t.terminating) return;
  if (t.type === Type.EXIT || t.type === Type.ANGEL ||
      t.type === Type.SPLAT || t.type === Type.EXPLOSION ||
      t.type === Type.ZAPPED) return;
  /* Classic: mouse hit → zapped when blood on, else explosion. */
  if (opts && opts.blood === false) {
    setType(t, Type.EXPLOSION, theme, true);
  } else {
    const z = t.genus && t.genus.types && t.genus.types[Type.ZAPPED];
    if (z) setType(t, Type.ZAPPED, theme, true);
    else setType(t, Type.SPLAT, theme, true);
  }
}

export function hitToon(t, theme, px, py) {
  const def = typeDef(theme, t.genus, t.type);
  return px >= t.x && px <= t.x + def.width &&
    py >= t.y && py <= t.y + def.height;
}
