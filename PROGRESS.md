# PROGRESS — resume here

> Every agent: read this first. Take the **first unchecked item in "Next up"**.
> When you finish an item, tick it here and add a line to the session log.
> Claude: commit + push each file right after creating it (see `CLAUDE.md`).

## Phase 0 — Handoff docs
- [x] `CLAUDE.md`
- [x] `AGENTS.md`
- [x] `docs/engine/ARCHITECTURE.md` (analysis + target layout + file mapping)
- [x] `docs/engine/ROADMAP.md`
- [x] `PROGRESS.md`

## Phase 1 — Engine kernel (new files only)
- [x] `engine/core/EventBus.js` + `test/engine/eventBus.test.js`
- [x] `engine/core/Time.js` + `test/engine/time.test.js`
- [x] `engine/core/Engine.js` (loop with fixed/variable/render phases) + `test/engine/engine.test.js`
- [x] `engine/core/Logger.js` + test
- [x] `engine/core/Plugin.js` (plugin registry, `engine.use()`) + test
- [x] `engine/index.js` barrel (add new exports as modules land)
- [x] `engine/README.md` (public API overview)

## Phase 2 — ECS + scene bridge
- [ ] `engine/ecs/World.js` + tests
- [ ] `engine/scene/Object3DComponent.js` + transform sync system
- [ ] Scene serialization wrapper over RKP v2

## Phase 3 — Hook editor onto engine
- [ ] `core/scene.js` drives its loop via `Engine` (keep its exports)
- [ ] Bridge `window` `editor:*` events ↔ `EventBus`
- [ ] `engine/input/` action map, `engine/platform/browser.js`

## Phase 4 — Move code (one atomic commit per cluster, see ROADMAP)
- [ ] `core/voxel/*` runtime → `engine/voxel/`
- [ ] `objects/*` → `plugins/primitives/`
- [ ] `rocket/*` + rocket panels → `plugins/rocket/`
- [ ] render files → `engine/render/`
- [ ] tools → `editor/tools/`
- [ ] modeling → `editor/modeling/`
- [ ] io → `editor/io/`
- [ ] `ui/*` → `editor/panels/`
- [ ] `main.js` + inline boot → `editor/app/bootstrap.js`
- [ ] Remove patch modules (`*AutoBoot.js`, `studioUpgrade.js`, `rocketNodeUiFix.js`)
- [ ] Delete unused `editor/editor.js` (verify no importers first)

## Phase 5–6
See `docs/engine/ROADMAP.md` (play mode, input, physics, audio, player app, export).

## Next up
1. `engine/ecs/World.js` — entities (int ids, recycled), components keyed by
   component definition, `query(A, B)` with cached results, `addSystem` hooks into
   `Engine` via an `EcsPlugin`. Test in `test/engine/world.test.js`.
2. `engine/scene/Object3DComponent.js` + transform sync system (needs `three`;
   test with the `three` npm package or keep it pure-data).

## Session log
<!-- newest last: YYYY-MM-DD — agent — did / half-done / next -->
- 2026-11-26 — Claude — Analyzed repo (ModelForge 3D, 23/23 tests green at `9d06026`). Wrote CLAUDE.md, AGENTS.md, ARCHITECTURE.md, ROADMAP.md, PROGRESS.md. Next: Phase 1 engine kernel.
- 2026-11-26 — Claude — Added engine/core EventBus, Time, Engine (phased loop, injectable scheduler, pause) + tests (38/38 green) and engine/index.js. Nothing in the app uses engine/ yet. Half-done: none. Next: Logger.js.
- 2026-11-27 — Claude — Phase 1 done: Logger, Plugin registry + Engine.use(), barrel exports, engine/README.md (46/46 green). Next: Phase 2 World.js.
