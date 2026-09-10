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

## Next

- [ ] Additional themes (Big Penguins, Turtles, …) as selectable packs
- [ ] npm publish / CDN example
- [ ] Reduce bundle size (quantized PNGs)
- [ ] Stronger physics parity with xpenguins-ng toon_core
- [ ] More FSM transition unit tests
