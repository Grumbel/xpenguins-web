# AGENTS.md — xpenguins-web

Guidance for humans and coding agents working on this repo.

## What this is

Browser port of the xpenguins idea: animated toons walk on DOM geometry.
Companion to **xpenguins-ng** (native X11). Keep behaviour understandable
relative to classic types (`faller`, `walker`, `climber`, …).

## Hard rules

1. **Do not** check in generated bundle noise without rebuilding deliberately;
   the flake / `npm run build` must be able to recreate
   `dist/xpenguins-web.js` and `examples/xpenguins-web.js`.
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

## Build vs run

Node (or Nix) is only for **building** the embeddable bundle. The demo and
drop-in script are plain static files.

```bash
node scripts/build.mjs   # or: nix run .#build
# → dist/xpenguins-web.js
# → examples/xpenguins-web.js  (same bytes; demo is self-contained)
```

## Testing

```bash
python3 -m http.server -d examples 8080
# → http://127.0.0.1:8080/
```

`file://` also works because sprites are embedded in the JS (no fetches).

## Related trees

- Native: `xpenguins-ng` (XShape overlay, system tray)
- Historical: Robin Hogan XPenguins 2.2
- Parallel modern X11+GTK: RatRabbit xpenguins 3.2.x
