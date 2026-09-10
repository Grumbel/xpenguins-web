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

## Next

- [ ] Additional themes (Big Penguins, Turtles, …) as selectable packs
- [ ] npm publish / CDN example
- [ ] Reduce bundle size (quantized PNGs)
- [ ] Stronger physics parity with xpenguins-ng toon_core (step-up jumps,
      window associations, squashed-by-window)
- [ ] More FSM transition unit tests
- [ ] Climber / floater edge cases vs nested DOM boxes

## Handoff notes (2026-09-10)

**Tip focus:** fix reported bugs — falling stuck at top, skateboard wrong
direction, odd left-side falls.

Root causes were inverted walker velocity vs sprite rows, and
`findSupport` treating “feet near any top edge” as a land even at spawn.

Verify with:

```bash
node scripts/build.mjs
node scripts/serve.mjs
# open http://127.0.0.1:8765/examples/index.html → Start
```

Penguins should fall from above the header, land on cards / footer, and
skateboarders should face the way they move.
