# xpenguins-web — plan

## Goal

Port the spirit of xpenguins-ng to the browser: penguins (and themed toons)
walk on **DOM elements** the way classic xpenguins walked on X11 windows.
Ship as a single drop-in `.js` with embedded PNG sprites so any page can
activate it with one script tag (or a bookmarklet that loads that script).

## Architecture

1. **Overlay canvas** — `position: fixed; inset: 0; pointer-events: none`
   (optional click-through disable for squish).
2. **Solids** — periodically sample visible DOM boxes (`getBoundingClientRect`),
   treat top edges as walkable ledges (filter tiny / full-viewport noise).
3. **Toon FSM** — faller → walker / tumbler / climber / floater → death
   (splat, exit, angel) mirroring the classic type set.
4. **Sprites** — horizontal strips (frame × direction), drawn with
   `drawImage`; theme JSON describes geometry.
5. **Bundle** — Node build reads `themes/*/`, base64-embeds PNGs, emits
   `dist/xpenguins-web.js` IIFE exposing `window.XPenguins`.

## Non-goals (v1)

- Full multi-genus skateboarder parity (can add as second theme later)
- Wayland / X11 interop
- Pixel-perfect physics match with toon_core.c

## Bookmarklet

Bookmarklets have practical size limits. Prefer:

```js
javascript:(function(){var s=document.createElement('script');s.src='https://example.com/xpenguins-web.js';s.onload=function(){XPenguins.start()};document.documentElement.appendChild(s)})();
```

Self-contained data-URI bookmarklets only work for a minimal sprite set.

## License

GPL-2.0-or-later (same family as xpenguins / xpenguins-ng). Art from the
Penguins theme remains under the original theme terms.
