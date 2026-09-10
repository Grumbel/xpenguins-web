# xpenguins-web

Cool little penguins walking along the tops of your **DOM elements**.

Browser companion to [xpenguins-ng](https://github.com/grumbel/xpenguins-ng)
(native X11). Classic toon types (faller, walker, tumbler, climber, floater,
exit, angel, …) are approximated in JavaScript. The embedded **Penguins**
theme includes both **normal** and **skateboarder** genera (weighted
spawn, same idea as xpenguins config `number`). Sprites are PNG strips
embedded in the bundle.

## Quick start

The **runtime is static**: one JS file with embedded sprites. You only need
Node (or Nix) if you change sources and must **rebuild** that file.

```bash
# After a normal git checkout, examples/ already includes the bundle:
#   examples/index.html
#   examples/xpenguins-web.js
#
# Open with any static server, e.g.:
python3 -m http.server -d examples 8080
# → http://127.0.0.1:8080/
#
# Or open examples/index.html in a browser (file:// works; the script is local).
```

Rebuild the bundle after editing `src/` or themes:

```bash
node scripts/build.mjs   # writes dist/ and examples/xpenguins-web.js
# or: nix run .#build
```

Optional helpers (not required to view the demo):

```bash
nix run .#serve          # tiny static server on :8765
nix flake check          # package + unit tests
nix build                # result/share/xpenguins-web/
```

Drop onto any page:

```html
<script src="xpenguins-web.js"></script>
<script>XPenguins.start({ count: 12 });</script>
```

## API

| Call | Meaning |
|------|---------|
| `XPenguins.start({ count, blood, angels, squish })` | Spawn overlay + toons |
| `XPenguins.stop()` | Exit animation then remove overlay |
| `XPenguins.setNumber(n)` | Grow/shrink population |
| `XPenguins.setSquish(on)` | Toggle click-to-squish live (no restart) |
| `XPenguins.setGrab(on)` | Toggle press-drag-release grabbing (default on) |
| `XPenguins.isRunning()` | Boolean |
| `XPenguins.isSquish()` | Whether squish mode is on |
| `XPenguins.isGrab()` | Whether grab mode is on |

Options: `squish: true` enables click-to-squash (click without dragging). `grab: true` (default) lets you pick up toons with press–drag–release; they fall when dropped. Keep page controls at a higher z-index than the overlay so they stay clickable.
`respectReducedMotion: true` (default) skips start when the user prefers reduced motion.
Solids refresh on scroll/resize and via `ResizeObserver` / `MutationObserver`.

Ledges are scored from **visible surfaces** (opaque background, border,
box-shadow). Transparent wrappers are skipped, and tops flush with the
viewport (`top < 12px`) are ignored so toons do not walk on off-screen
chrome. Override with `start({ minTop, minScore })`.

Mark elements that should **not** be ledges:

```html
<div data-xpenguins-ignore>…</div>
```

## Bookmarklet

The full bundle (~80 KiB with sprites) does **not** fit in a bookmark.
Use a tiny **loader** that injects your hosted `xpenguins-web.js`:

1. Host `xpenguins-web.js` (from `dist/` or `examples/`) on any HTTPS origin.
2. Open the demo on that same origin (so the drag-link picks up the right URL),
   **or** edit the URL in the snippet below.
3. Drag **🐧 XPenguins** from the demo page into the bookmarks bar
   (or create a bookmark whose URL is the `javascript:`… string).

Loader template (replace the script URL):

```javascript
javascript:(function(){if(window.XPenguins){XPenguins.start({count:12,grab:true});return;}var s=document.createElement('script');s.src='https://YOUR.CDN/xpenguins-web.js';s.onload=function(){XPenguins.start({count:12,grab:true});};s.onerror=function(){alert('XPenguins: failed to load script');};document.documentElement.appendChild(s);})();
```

Click the bookmark on any page: it loads the script once, then
`XPenguins.start(...)`. Click again to call `start` if already loaded
(restart). Use the page’s own Stop control only on the demo; on foreign
sites call `XPenguins.stop()` from the console if needed.

**Note:** The remote page must allow the script (no strict CSP blocking your
host). `file://` pages often block external scripts.

## Layout

- `src/` — clear modular sources (`solids`, `toon`, `render`, `index`)
- `themes/penguins/` — PNG strips + `theme.json`
- `scripts/build.mjs` — embed PNGs → `dist/xpenguins-web.js`
- `examples/index.html` — demo page
- `PLAN.md`, `TODO.md`, `AGENTS.md` — planning & agent notes

## License

GPL-2.0-or-later. Penguin art from the historical XPenguins **Penguins**
theme (Robin Hogan et al.; see upstream theme `about`).
