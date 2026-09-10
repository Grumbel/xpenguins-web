/**
 * Single toon state machine (classic-inspired).
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

export function createToon(vw, theme) {
  const tw = theme.types.faller.width;
  return {
    active: true,
    type: Type.FALLER,
    x: rand(Math.max(1, vw - tw)),
    y: -theme.types.faller.height,
    vx: 0,
    vy: theme.types.faller.speed,
    dir: rand(2), // 0 left-facing row often = right in strips; we use 0=right,1=left
    frame: 0,
    frameAcc: 0,
    climbSide: 0,
    actionLoops: 0,
    terminating: false,
  };
}

function setType(t, type, theme, keepDir) {
  t.type = type;
  const def = theme.types[type] || theme.types.walker;
  t.frame = 0;
  t.frameAcc = 0;
  if (!keepDir) t.dir = t.dir % (def.directions || 1);
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
    t.vy = -def.speed * 0.3;
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

  const def = theme.types[t.type] || theme.types.walker;
  const w = def.width;
  const h = def.height;

  // Animate frames
  t.frameAcc += 1;
  const frameDelay = 2;
  if (t.frameAcc >= frameDelay) {
    t.frameAcc = 0;
    t.frame = (t.frame + 1) % Math.max(1, def.frames);
  }

  if (t.type === Type.EXIT || t.type === Type.SPLAT || t.type === Type.EXPLOSION) {
    if (t.frame >= def.frames - 1 && t.frameAcc === 0) {
      if (opts.angels && theme.types.angel) {
        setType(t, Type.ANGEL, theme, true);
      } else {
        // Respawn
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
    if (def.loop < 0 && rand(-def.loop) === 0) {
      setType(t, Type.WALKER, theme, true);
    }
    return;
  }

  // Integrate
  if (t.type === Type.TUMBLER) {
    t.vy = Math.min(
      (def.terminalVelocity || 8),
      t.vy + (def.acceleration || 1) * 0.15,
    );
  }
  t.x += t.vx;
  t.y += t.vy;

  // World bounds
  if (t.x < -w) t.x = vw;
  if (t.x > vw) t.x = -w;

  if (t.type === Type.FALLER || t.type === Type.TUMBLER) {
    const ceil = hitCeiling(solids, t.x, t.y, w, h);
    if (ceil && t.vy < 0) {
      setType(t, Type.FALLER, theme, true);
      t.vy = Math.abs(theme.types.faller.speed);
    }
    const support = findSupport(solids, t.x, t.y, w, h, 4);
    if (support) {
      t.y = support.y - h;
      if (t.type === Type.TUMBLER && t.vy > 5 && rand(3) === 0) {
        setType(t, Type.SPLAT, theme, true);
        return;
      }
      setType(t, Type.WALKER, theme, true);
      // occasional idle action
      if (theme.types.action && rand(40) === 0) {
        setType(t, Type.ACTION, theme, true);
      }
    } else if (t.y > vh + 20) {
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
      if (r === 0) {
        setType(t, Type.FLOATER, theme, true);
      } else if (r <= 2) {
        t.climbSide = t.dir === 0 ? 1 : -1;
        setType(t, Type.CLIMBER, theme, true);
        t.x = t.dir === 0 ? block.x - w : block.x + block.w;
      } else {
        t.dir = 1 - t.dir;
        t.vx = (t.dir === 0 ? 1 : -1) * def.speed;
      }
    }
    // end of ledge
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
    // stick to wall x
    const block = blockedSide(solids, t.x - side * 2, t.y, w, h, side);
    if (!block) {
      setType(t, Type.FALLER, theme, true);
      return;
    }
    t.x = side > 0 ? block.x - w : block.x + block.w;
    if (t.y + h <= block.y + 2) {
      // reached top → walk
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
