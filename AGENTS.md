# AGENTS.md — xpenguins-web

Guidance for humans and coding agents working on this repo.

## What this is

Browser port of the xpenguins idea: animated toons walk on DOM geometry.
Companion to **xpenguins-ng** (native X11). Keep behaviour understandable
relative to classic types (`faller`, `walker`, `climber`, …).

## Hard rules

1. **Do not** check in generated `dist/` noise without rebuilding deliberately;
   the flake / `npm run build` must be able to recreate the bundle.
2. **Preserve theme geometry** when adding frames: strip layout is
   `frameIndex * width` on X, `direction * height` on Y (same as XPenguins).
3. **Keep the public API small**: `XPenguins.start(opts)`, `stop()`,
   `setNumber(n)`, optional `cycleTheme()` later.
4. **Single-file distribution** is a product goal — avoid runtime fetches for
   default theme sprites.
5. License stays **GPL-2.0-or-later** unless art requires a dual note.

## Style

- Clear, boring JavaScript (ES2020+), no framework dependency in the runtime
  bundle.
- Prefer readable state machines over clever one-liners.
- Comment non-obvious physics (why a ledge is rejected, climb vs turn).

## Build

```bash
nix build          # or: node scripts/build.mjs
```

Outputs `dist/xpenguins-web.js`.

## Testing

Open `examples/index.html` via a local static server (file:// may block
nothing here since assets are embedded, but a server is still fine):

```bash
npx serve examples
# or python -m http.server -d examples
```

## Related trees

- Native: `xpenguins-ng` (XShape overlay, system tray)
- Historical: Robin Hogan XPenguins 2.2
- Parallel modern X11+GTK: RatRabbit xpenguins 3.2.x
