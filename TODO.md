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

- [x] `flake.nix` apps: `serve` (default), `build`
- [x] `checks`: package build + unit tests via `nix flake check`
      (no separate `#demo` / `#test` apps — they duplicated serve/check)

## Done (ledges + squish)

- [x] Scored ledges: opaque bg / border / box-shadow; skip transparent wraps
- [x] Ignore flush viewport-top tops (`minTop`, default 12) — no off-screen walkers
- [x] Dedupe nested same-top boxes
- [x] `setSquish(on)` / `isSquish()` — live toggle without stop/start race
- [x] Session token so async exit cannot destroy a new run
- [x] Keep feet planted when sprite height changes (ballooner → walker)
- [x] Walker step-up attempt before turn/climb
- [x] Example uses `setSquish`; build exports new API


## Done (animation + zapped)

- [x] Sprite frame advances every physics tick (was every 2nd → walk cycle half speed)
- [x] `cycle` counter for action loops (classic `loop` ≥ 0)
- [x] Theme `zapped` type; click-squish uses zapped when blood on

## Gap vs xpenguins-ng (still missing / partial)

**Present (web):** faller, walker, tumbler, climber, floater, exit, angel, splat,
explosion, action, zapped; dual genera (normal + skateboarder); blood/angels;
DOM solids + floor; squish; reduced-motion; observers.

**Missing or weak:**

| Feature | Notes |
|---------|--------|
| Runner type | Classic faster walker; theme has no runner pixmap |
| Squashed | Window mapped on top of toon (`TOON_HERE`); no direct DOM analogue |
| Multi-action 0–5 | Only single `action` (reader / digger) |
| Theme cycle | ng tray cycles theme packs; web is one embedded pack |
| Extra themes | Big Penguins, Turtles, Bill, Classic_Penguins not ported |
| Window association | Toons stick to moving windows; we only re-sample solids |
| Step-up / partial move | Simplified; no pixel-wise ToonAdvance |
| Edge block modes | ng `TOON_EDGEBLOCK` / side-bottom flags |
| Pause | ng can pause the frame loop |
| Config number per genus | weights approximate; no exact `number` quotas |
| conf flags | `NOCYCLE`, `INVULNERABLE`, `NOBLOCK` not modeled |
| pref_direction / pref_climb | tumble-off memory for climb preference |

**N/A on web:** X11 tray, root/overlay drawing modes, XShape, signals.

## Done (playground demo)

- [x] Example page: staggered shelves, tower, pillar, gaps so walkers
      actually hit walls (climb) and drop off ends (tumble)

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
