# TODO — xpenguins-web

## Done

- [x] Project scaffold (PLAN, AGENTS, README, flake)
- [x] Convert Penguins XPMs → PNG strips
- [x] Core engine: solids from DOM, fall / walk / tumble / climb / float
- [x] Death sequences: splat, exit (bomber), angel
- [x] Canvas overlay renderer
- [x] Build script → single `dist/xpenguins-web.js` with embedded assets
- [x] Example `examples/index.html`
- [x] Bookmarklet recipe in README

## Done (continued)

- [x] ResizeObserver / MutationObserver / scroll for dynamic solids
- [x] rAF loop gated by theme `delay`
- [x] Squish on click (`squish: true`)
- [x] `prefers-reduced-motion` respect (default on)
- [x] Basic geometry unit tests (`npm test`)

## Done (continued)

- [x] Skateboarder genus (weighted spawn with normal)
- [x] Theme `genera[]` + per-genus sprite maps
- [x] Genus-aware typeDef / image keys from `file`
- [x] Tests for genera and ballooner/skateboarder mapping

## Done (physics parity tip)

- [x] **Direction convention** matches classic xpenguins-ng: dir 0 = LEFT
      (−vx), dir 1 = RIGHT (+vx). Fixes skateboarder (and walkers) moving
      opposite to their sprite facing.
- [x] **Landing** uses `landOnLedge`: feet must cross a solid top from above
      in the same frame. Stops fallers spawned at `y = -height` from
      instantly gluing to page headers with `top ≈ 0` (“stuck at the top”).
- [x] Fallers drift slightly horizontally while falling (classic ±1 px).
- [x] Unit tests for cross-ledge landing and the spawn false-positive case.

## Done (flake apps)

- [x] `flake.nix` apps: `serve` (default), `demo`, `build`, `test`
      - `nix run .#serve` / `nix run` — auto-build dist if missing, then static server
      - `nix run .#demo` — force rebuild then serve
      - `nix run .#build` / `nix run .#test`

## Done (ledges + squish)

- [x] Scored ledges: opaque bg / border / box-shadow; skip transparent wraps
- [x] Ignore flush viewport-top tops (`minTop`, default 12) — no off-screen walkers
- [x] Dedupe nested same-top boxes
- [x] `setSquish(on)` / `isSquish()` — live toggle without stop/start race
- [x] Session token so async exit cannot destroy a new run
- [x] Keep feet planted when sprite height changes (ballooner → walker)
- [x] Walker step-up attempt before turn/climb
- [x] Example uses `setSquish`; build exports new API

## Next

- [ ] Additional themes (Big Penguins, Turtles, …) as selectable packs
- [ ] npm publish / CDN example
- [ ] Reduce bundle size (quantized PNGs)
- [ ] Stronger physics parity with xpenguins-ng toon_core (step-up jumps,
      window associations, squashed-by-window)
- [ ] More FSM transition unit tests
- [ ] Climber / floater edge cases vs nested DOM boxes

## Handoff notes (2026-09-10)

**Tip:** ledge scoring + `setSquish`. Header flush with the top is no longer
a walkable top (sprites would sit at y≈-height). Cards/footer with real
surfaces remain ledges.

```bash
git pull …/xpenguins-web-003-….bundle HEAD
node scripts/build.mjs && node scripts/serve.mjs
```

Toggle Squish should switch pointer capture immediately without restarting.
