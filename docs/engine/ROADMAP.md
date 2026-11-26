# Engine Roadmap

Work proceeds in phases. Each phase leaves `main` deployable. Detailed,
tickable items live in `/PROGRESS.md`; this file explains the *why* and the *how*.

## Phase 0 — Handoff docs ✅
`CLAUDE.md`, `AGENTS.md`, `docs/engine/ARCHITECTURE.md`, this file, `PROGRESS.md`.

## Phase 1 — Engine kernel (new files only, nothing moved)
Build `engine/` next to the existing code. Nothing in the app uses it yet, so it
can't break the site.
- `engine/core/EventBus.js` — typed pub/sub, replaces `window` CustomEvents later
- `engine/core/Time.js` — delta, elapsed, fixed-step accumulator, time scale
- `engine/core/Engine.js` — start/stop, fixed update + variable update + render
  phases, pluggable `requestFrame` (so it runs under Node tests)
- `engine/core/Logger.js`
- `engine/core/Plugin.js` — `engine.use(plugin)` registry
- `engine/index.js` — public barrel
- tests in `test/engine/`

## Phase 2 — ECS + scene bridge
- `engine/ecs/World.js` (entities, components, queries, systems with ordering)
- `engine/scene/Object3DComponent.js`: links an entity to a `THREE.Object3D`
- `engine/scene/Transform` sync system
- Scene serialization that wraps the existing RKP v2 format, without replacing it

## Phase 3 — Hook the editor onto the engine
- `core/scene.js` creates its renderer/loop through `Engine` (keep its exports
  so the rest of the app still works)
- Add a bridge from `window` "editor:*" events to `EventBus`, then migrate callers one by one
- Add `engine/input/` (action mapping) and `engine/platform/browser.js`

## Phase 4 — Move code into the target layout
Follow the mapping table in `ARCHITECTURE.md`. Suggested order (least coupled first):
1. `core/voxel/*` runtime → `engine/voxel/` (best tested, so it's the safest start)
2. `objects/*` → `plugins/primitives/`
3. `rocket/*` + rocket UI → `plugins/rocket/`
4. render files → `engine/render/`
5. tools → `editor/tools/`, modeling → `editor/modeling/`, io → `editor/io/`
6. `ui/*` → `editor/panels/`
7. `main.js` + inline boot → `editor/app/bootstrap.js`
8. Remove patch modules (`*AutoBoot.js`, `studioUpgrade.js`, `rocketNodeUiFix.js`)
   by folding their behavior into proper init code.

### Moving existing code safely
1. `git mv old/path.js new/path.js` (one module or a small cluster)
2. Find every importer: `grep -rn "path.js" --include=*.js --include=*.html .`
3. Rewrite those imports. **Drop the `?v=` query** on the moved module and its
   importers, so the module can't be loaded twice.
4. Update `sw.js` precache list if it names the file.
5. `npm test`, then load `index.html` in a browser (or Playwright) and check the
   console has no 404s.
6. Commit the move + rewrites as **one** commit and push.

## Phase 5 — Play mode & runtime features
- Edit/Play/Pause in the editor (snapshot world, run systems, restore)
- Input actions, camera controllers (orbit, fly, follow)
- Physics: voxel collision → integrate a physics library (e.g. Rapier WASM)
- Audio module
- Asset database with GUIDs, hot reload

## Phase 6 — Shipping games
- `apps/player/` — a runtime-only page that loads an exported scene
- Export a game build (scene + assets + player) as a static bundle
- Docs + example game (voxel or rocket)

## Out of scope for now
TypeScript, bundlers, multiplayer. Revisit after Phase 4.
