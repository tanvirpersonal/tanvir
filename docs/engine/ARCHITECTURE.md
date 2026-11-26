# Engine Architecture

_Analysis date: 2026-11-26. Baseline commit: `9d06026` (23/23 tests passing)._

## 1. What exists today (analysis)

ModelForge 3D is a **no-build, native-ES-module Three.js editor** (~9k lines of JS,
~120 files) deployed as a PWA on GitHub Pages under `/tanvir/`.

| Folder | Role today | Notes |
|---|---|---|
| `index.html`, `main.js` | Bootstrap + all toolbar/keyboard/mobile wiring | `main.js` is a 99-line "god file" with very long lines; a second inline `<script type="module">` in `index.html` boots more systems |
| `core/` (~55 files) | Everything: renderer, scene, camera, controls, selection, transform, history, save/load, import/export, materials, modeling, AI assistant, device/PWA UX | Mixes engine runtime, editor tools and DOM UI in one folder |
| `core/voxel/` (16 files) | Sparse voxel grid, ops, greedy mesher, instanced renderer, collision, block registry, voxel editor | Best-structured and best-tested part of the repo |
| `rocket/` (13 files) | Rocket-part authoring: attachment nodes, reference frames, validation | Domain/game-specific plugin |
| `objects/` (6 files) | Primitive factory (cube, sphere, cylinder, cone, plane) | |
| `ui/` (13 files) | DOM panels: hierarchy, inspector, toolbars, dialogs | |
| `editor/editor.js` | An `Editor` class that is **not imported anywhere** | Dead code / earlier attempt |
| `test/` | 6 `node:test` files, all voxel-related | |
| `docs/` | Status docs for voxel core, RKP v2 format, asset pipeline | |

### Key problems for an engine

1. **No runtime/editor split.** Rendering, game-object state and editor tools all
   live in `core/` and import each other freely (e.g. `core/studioUpgrade.js`
   imports `ui/hierarchy.js`).
2. **Singleton scene module.** `core/scene.js` exports a global `scene`, `renderer`,
   `camera`, `controls`. Nothing can run more than one world, or run headless.
3. **No game loop abstraction.** The render loop is inside `core/scene.js`;
   there is no fixed-timestep update, no system scheduling, no play/stop mode.
4. **No entity/component model.** Objects are raw `THREE.Object3D` with ad-hoc
   `userData`.
5. **Communication is via `window` CustomEvents** (`editor:status`,
   `editor:selection-change`, …), so it's untyped and DOM-bound.
6. **Patch-style "boot" and "fix" modules** (`builderAutoBoot.js`,
   `meshEditAutoBoot.js`, `studioUpgrade.js`, `ui/rocketNodeUiFix.js`) that poll
   or monkey-patch other modules.
7. **Inconsistent `?v=` cache-busting queries** on imports. The same module can load
   twice under different URLs, which creates two copies of its singletons.

## 2. Target layout

```
engine/                  # runtime, no editor code, mostly DOM-free
  core/                  # Engine, Time, EventBus, Logger, plugin registry
  ecs/                   # World, Entity, components, systems, queries
  scene/                 # SceneGraph bridge to THREE, prefab/scene serialization
  render/                # Renderer wrapper, camera, lights, post-processing
  input/                 # Keyboard/mouse/touch/gamepad → actions
  physics/               # collision (voxel collision first), later a physics lib
  assets/                # AssetDatabase, loaders (GLB/GLTF/RKP), importers
  voxel/                 # ← core/voxel/* runtime parts (grid, mesher, renderer)
  audio/                 # later
  platform/              # the ONLY place allowed to touch window/document
  index.js               # public API barrel
editor/                  # authoring tools built on engine/
  app/                   # bootstrap (replaces main.js wiring)
  tools/                 # selection, transform, history, grouping, copy/paste…
  modeling/              # mesh edit / modeling tools
  voxel/                 # voxel editor tools (paint, fill, transforms UI)
  panels/                # ← ui/* (hierarchy, inspector, …)
  io/                    # save/load, RKP, import/export UI
  ai/                    # aiAssistant (Ollama)
plugins/
  rocket/                # ← rocket/* (domain plugin, registers with editor)
  primitives/            # ← objects/*
apps/
  editor/index.html      # later; for now root index.html stays the entry
test/
  engine/  editor/  voxel/
docs/engine/             # this file, ROADMAP.md
```

### Layer rules

- `engine/` → may import only `three` and other `engine/` modules.
- `editor/` → may import `engine/`.
- `plugins/*` → may import `engine/` and `editor/` public APIs.
- Nothing imports `apps/`.
- Only `engine/platform/` and `editor/panels/` touch the DOM.

## 3. File mapping (existing → target)

Moves happen in Phase 2+, a few modules per atomic commit. `?` = check the code before moving.

| Current | Target |
|---|---|
| `core/renderer.js`, `core/camera.js`, `core/lights.js`, `core/grid.js` | `engine/render/` |
| `core/scene.js` | split: `engine/render/` + `engine/scene/` + loop into `engine/core/Engine.js` |
| `core/controls.js`, `core/raycaster.js` | `engine/input/` (raycast helper → `engine/scene/`) |
| `core/textureSystem.js`, `core/materialLibrary.js` | `engine/render/materials/` |
| `core/assetTypes.js`, `core/rkpSchema.js`, `core/rkpValidator.js`, `core/rkpMigration.js` | `engine/assets/rkp/` |
| `core/voxel/{voxelGrid,voxelOps,greedyMesher,greedyRenderer,instancedRenderer,collision,blockRegistry,gridSnap,voxelTransforms,validator}.js` | `engine/voxel/` |
| `core/voxel/{editor,voxel2Controller,previewController,voxelTransformsUI,rkpBridge}.js` | `editor/voxel/` |
| `core/selection.js`, `transform.js`, `history.js`, `grouping.js`, `duplicate.js`, `delete.js`, `copyPaste.js`, `focus.js`, `highlight.js`, `numericTransform.js`, `objectManager.js` | `editor/tools/` |
| `core/meshEdit.js`, `meshModeling.js`, `modelingTools.js`, `modelingUI.js`, `editMode.js`, `builderTools.js` | `editor/modeling/` |
| `core/save.js`, `load.js`, `exporter.js`, `importer.js`, `upload.js`, `rkpIO.js`, `projectPersistence.js`, `productionAsset*.js` | `editor/io/` |
| `core/commandCenter.js`, `recoveryUI.js`, `deviceExperience.js`, `studioUpgrade.js` | `editor/app/` (merge/remove patch modules where possible) |
| `core/aiAssistant.js` | `editor/ai/` |
| `core/builderAutoBoot.js`, `core/meshEditAutoBoot.js` | replace with explicit init in `editor/app/` |
| `ui/*` | `editor/panels/` (`rocket*` panels → `plugins/rocket/ui/`) |
| `rocket/*` | `plugins/rocket/` |
| `objects/*` | `plugins/primitives/` |
| `editor/editor.js` | delete (unused) after confirming |
| `main.js` + inline script in `index.html` | `editor/app/bootstrap.js`; `main.js` becomes a one-line import |
