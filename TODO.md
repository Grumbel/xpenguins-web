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

## Next

- [ ] Skateboarder genus / multi-theme loader
- [ ] ResizeObserver / MutationObserver for dynamic layout
- [ ] Prefer `requestAnimationFrame` timing tuned to theme `delay`
- [ ] Squish on click (temporary `pointer-events: auto`)
- [ ] npm publish / CDN example
- [ ] Reduce bundle size (quantized PNGs, subset of frames)
- [ ] Respect `prefers-reduced-motion`
- [ ] Unit tests for ledge detection and FSM transitions
