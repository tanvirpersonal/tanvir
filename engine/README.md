# engine/

The runtime layer of the engine. No editor code here, and no DOM access outside
`engine/platform/`, so every module can be unit-tested with `node --test`.
Import from `engine/index.js`.

## Quick start

```js
import { Engine, definePlugin, createLogger } from "./engine/index.js";

const log = createLogger("Game");
const engine = new Engine(); // uses requestAnimationFrame in the browser

const Spinner = definePlugin({
  name: "spinner",
  install(engine, { speed = 1 }) {
    engine.addSystem({
      name: "spin",
      update({ dt }) { /* rotate things by speed * dt */ },
    });
    return { speed };
  },
});

engine.use(Spinner, { speed: 2 });
engine.events.on("engine:start", () => log.info("running"));
engine.start();
```

## Modules

| Module | What it does |
|---|---|
| `core/EventBus.js` | Sync pub/sub: `on`, `once`, `off`, `emit`. Throwing handlers are isolated and reported on `"error"` |
| `core/Time.js` | `delta`, `elapsed`, `timeScale`, fixed-step accumulator (`consumeFixedSteps`, `alpha`) |
| `core/Engine.js` | Main loop. Systems run in phases: `preUpdate → fixedUpdate×n → update → lateUpdate → render`. Supports `start/stop/setPaused/frame()` and `use(plugin)` |
| `core/Logger.js` | `createLogger(scope)` with levels (`Logger.level = "silent"` in tests) and a swappable `Logger.sink` |
| `core/Plugin.js` | `definePlugin`, `PluginRegistry`: install once, dependency checks, reverse-order uninstall |
| `ecs/World.js` | `defineComponent(name, create)`, `World` (`createEntity/destroyEntity`, `add/get/has/remove`, cached `query(A, B)`), recycled ids with generations; `EcsPlugin` sets `engine.world` |
| `scene/Object3DComponent.js` | `Transform` (pure data), `Object3DRef`, `readTransform/applyTransform`, `createTransformSyncSystem` (Transform → Object3D in `lateUpdate`). No `three` import |
| `scene/ScenePlugin.js` | Depends on `ecs`. `engine.use(ScenePlugin, { root: threeScene })` → `spawn(obj)`, `despawn(id)`, `objectOf`, `entityOf`; sets `engine.scene` |
| `scene/SceneSerializer.js` | `new SceneSerializer([Transform, ...])` → `serialize(world)` / `deserialize(world, data)` (JSON, custom codecs via `register`). `embedInRKP(asset, data)` / `extractFromRKP(asset)` store it at `customProperties.engineScene` in an RKP v2 asset (still validates) |

## Systems

A system is a plain object:
`{ name, order?, enabled?, init?(engine), preUpdate?(ctx), fixedUpdate?(ctx), update?(ctx), lateUpdate?(ctx), render?(ctx), dispose?(engine) }`,
where `ctx = { engine, time, dt }`. Systems with a lower `order` run first.
When the engine is paused, only `preUpdate` and `render` run.

## Engine events

`engine:start`, `engine:stop`, `engine:pause`, `engine:frame`,
`system:added`, `system:removed`, `plugin:installed`, `plugin:removed`, `error`.

## Testing headless

```js
const engine = new Engine();
engine.frame();        // advance exactly one fixedDelta
engine.frame(1000/30); // or pass ms timestamps
```

Status and next steps: `/PROGRESS.md`. Target layout: `/docs/engine/ARCHITECTURE.md`.
