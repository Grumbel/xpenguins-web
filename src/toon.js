/**
 * Single toon state machine (classic-inspired), with multi-genus themes.
 */

import { findSupport, blockedSide, hitCeiling } from './solids.js';

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
};

function rand(n) {
  return Math.floor(Math.random() * n);
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
  return {
    active: true,
    genus: g,
    type: Type.FALLER,
    x: rand(Math.max(1, vw - fall.width)),
    y: -fall.height,
    vx: 0,
    vy: fall.speed,
    dir: rand(2),
    frame: 0,
    frameAcc: 0,
    climbSide: 0,
    terminating: false,
  };
}

function setType(t, type, theme, keepDir) {
  t.type = type;
  const def = typeDef(theme, t.genus, type);
  t.frame = 0;
  t.frameAcc = 0;
  const dirs = def.directions || 1;
  if (!keepDir) t.dir = t.dir % dirs;
  else t.dir = t.dir % dirs;

  if (type === Type.FALLER) {
    t.vx = 0;
    t.vy = def.speed;
  } else if (type === Type.WALKER) {
    t.vy = 0;
    t.vx = (t.dir === 0 ? 1 : -1) * def.speed;
  } else if (type === Type.TUMBLER) {
    t.vx = (t.dir === 0 ? 1 : -1) * 0.5;
    t.vy = def.speed;
  } else if (type === Type.CLIMBER) {
    t.vx = 0;
    t.vy = -def.speed;
  } else if (type === Type.FLOATER) {
    t.vx = (t.dir === 0 ? 1 : -1) * def.speed;
    t.vy = -def.speed * 0.25;
  } else if (type === Type.ANGEL) {
    t.vx = (Math.random() - 0.5) * 2;
    t.vy = -def.speed;
  } else {
    t.vx = 0;
    t.vy = 0;
  }
}

export function stepToon(t, solids, theme, vw, vh, opts) {
  if (!t.active) return;

  const def = typeDef(theme, t.genus, t.type);
  const w = def.width;
  const h = def.height;

  t.frameAcc += 1;
  const frameDelay = 2;
  if (t.frameAcc >= frameDelay) {
    t.frameAcc = 0;
    t.frame = (t.frame + 1) % Math.max(1, def.frames);
  }

  if (t.type === Type.EXIT || t.type === Type.SPLAT || t.type === Type.EXPLOSION) {
    if (t.frame >= def.frames - 1 && t.frameAcc === 0) {
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
    const loop = def.loop || -4;
    if (loop < 0 && rand(-loop) === 0) {
      setType(t, Type.WALKER, theme, true);
    }
    return;
  }

  if (t.type === Type.TUMBLER) {
    t.vy = Math.min(
      def.terminalVelocity || 8,
      t.vy + (def.acceleration || 1) * 0.15,
    );
  } else if (t.type === Type.WALKER && def.acceleration) {
    const cap = def.terminalVelocity || 12;
    const sign = t.dir === 0 ? 1 : -1;
    t.vx = Math.sign(t.vx || sign) *
      Math.min(cap, Math.abs(t.vx) + def.acceleration * 0.05);
  }

  t.x += t.vx;
  t.y += t.vy;

  if (t.x < -w) t.x = vw;
  if (t.x > vw) t.x = -w;

  if (t.type === Type.FALLER || t.type === Type.TUMBLER) {
    const ceil = hitCeiling(solids, t.x, t.y, w, h);
    if (ceil && t.vy < 0) {
      setType(t, Type.FALLER, theme, true);
      t.vy = Math.abs(typeDef(theme, t.genus, Type.FALLER).speed);
    }
    const support = findSupport(solids, t.x, t.y, w, h, 4);
    if (support) {
      t.y = support.y - h;
      if (t.type === Type.TUMBLER && t.vy > 5 && rand(3) === 0) {
        setType(t, opts.blood === false ? Type.EXPLOSION : Type.SPLAT, theme, true);
        return;
      }
      setType(t, Type.WALKER, theme, true);
      if (typeDef(theme, t.genus, Type.ACTION) && rand(40) === 0) {
        setType(t, Type.ACTION, theme, true);
      }
    } else if (t.y > vh + 40) {
      Object.assign(t, createToon(vw, theme));
    }
    return;
  }

  if (t.type === Type.WALKER) {
    const support = findSupport(solids, t.x, t.y, w, h, 5);
    if (!support) {
      setType(t, Type.TUMBLER, theme, true);
      return;
    }
    t.y = support.y - h;
    const block = blockedSide(solids, t.x, t.y, w, h, t.dir === 0 ? 1 : -1);
    if (block) {
      const r = rand(5);
      if (r === 0) setType(t, Type.FLOATER, theme, true);
      else if (r <= 2) {
        t.climbSide = t.dir === 0 ? 1 : -1;
        setType(t, Type.CLIMBER, theme, true);
        t.x = t.dir === 0 ? block.x - w : block.x + block.w;
      } else {
        t.dir = 1 - t.dir;
        t.vx = (t.dir === 0 ? 1 : -1) * def.speed;
      }
    }
    const cx = t.x + w / 2;
    if (cx < support.x + 2 || cx > support.x + support.w - 2) {
      if (rand(2) === 0) setType(t, Type.TUMBLER, theme, true);
      else {
        t.dir = 1 - t.dir;
        t.vx = (t.dir === 0 ? 1 : -1) * def.speed;
      }
    }
    return;
  }

  if (t.type === Type.CLIMBER) {
    const side = t.climbSide || (t.dir === 0 ? 1 : -1);
    const block = blockedSide(solids, t.x - side * 2, t.y, w, h, side);
    if (!block) {
      setType(t, Type.FALLER, theme, true);
      return;
    }
    t.x = side > 0 ? block.x - w : block.x + block.w;
    if (t.y + h <= block.y + 2) {
      t.y = block.y - h;
      t.dir = side > 0 ? 0 : 1;
      setType(t, Type.WALKER, theme, true);
    }
    if (t.y < -h) Object.assign(t, createToon(vw, theme));
    return;
  }

  if (t.type === Type.FLOATER) {
    if (t.y < -h) Object.assign(t, createToon(vw, theme));
    const support = findSupport(solids, t.x, t.y, w, h, 3);
    if (support) {
      t.y = support.y - h;
      setType(t, Type.WALKER, theme, true);
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
      t.type === Type.SPLAT || t.type === Type.EXPLOSION) return;
  if (opts && opts.blood === false) setType(t, Type.EXPLOSION, theme, true);
  else setType(t, Type.SPLAT, theme, true);
}

export function hitToon(t, theme, px, py) {
  const def = typeDef(theme, t.genus, t.type);
  return px >= t.x && px <= t.x + def.width &&
    py >= t.y && py <= t.y + def.height;
}
