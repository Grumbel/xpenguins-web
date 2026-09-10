# xpenguins-web

Cool little penguins walking along the tops of your **DOM elements**.

Browser companion to [xpenguins-ng](https://github.com/grumbel/xpenguins-ng)
(native X11). Classic toon types (faller, walker, tumbler, climber, floater,
exit, angel, …) are approximated in JavaScript; sprites come from the
**Penguins** theme converted to PNG and **embedded** in a single file.

## Quick start

```bash
node scripts/build.mjs
node scripts/serve.mjs
# open http://127.0.0.1:8765/examples/index.html
```

Or with Nix:

```bash
nix develop   # node + imagemagick
node scripts/build.mjs
```

Drop onto any page:

```html
<script src="xpenguins-web.js"></script>
<script>XPenguins.start({ count: 12 });</script>
```

## API

| Call | Meaning |
|------|---------|
| `XPenguins.start({ count, blood, angels })` | Spawn overlay + toons |
| `XPenguins.stop()` | Exit animation then remove overlay |
| `XPenguins.setNumber(n)` | Grow/shrink population |
| `XPenguins.isRunning()` | Boolean |

Mark elements that should **not** be ledges:

```html
<div data-xpenguins-ignore>…</div>
```

## Bookmarklet

Bookmarklets cannot reasonably inline a full sprite sheet (tens of KiB).
Use a **loader** bookmarklet pointing at your hosted bundle:

```javascript
javascript:(function(){if(window.XPenguins){XPenguins.start();return;}var s=document.createElement('script');s.src='https://YOUR.CDN/xpenguins-web.js';s.onload=function(){XPenguins.start({count:10});};document.documentElement.appendChild(s);})();
```

Self-contained data-URI bookmarklets are only viable for a tiny subset of
frames; not recommended for the full theme.

## Layout

- `src/` — clear modular sources (`solids`, `toon`, `render`, `index`)
- `themes/penguins/` — PNG strips + `theme.json`
- `scripts/build.mjs` — embed PNGs → `dist/xpenguins-web.js`
- `examples/index.html` — demo page
- `PLAN.md`, `TODO.md`, `AGENTS.md` — planning & agent notes

## License

GPL-2.0-or-later. Penguin art from the historical XPenguins **Penguins**
theme (Robin Hogan et al.; see upstream theme `about`).
