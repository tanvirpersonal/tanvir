import { Transform, Object3DRef, readTransform, createTransformSyncSystem } from "./Object3DComponent.js";

/**
 * ScenePlugin — bridges the ECS world to a Three.js scene graph.
 *
 *   engine.use(EcsPlugin);
 *   const sceneApi = engine.use(ScenePlugin, { root: threeScene });
 *   const id = sceneApi.spawn(mesh);            // entity with Transform + Object3DRef, mesh added to root
 *   engine.world.get(id, Transform).position.y = 2; // synced to mesh in lateUpdate
 *   sceneApi.despawn(id);                       // removes mesh from root and destroys entity
 *
 * Destroying a spawned entity any other way (world.destroyEntity) also detaches
 * its object. `root` must provide `add(obj)` / `remove(obj)` (THREE.Scene/Group do).
 */
export const ScenePlugin = Object.freeze({
    name: "scene",
    dependencies: ["ecs"],
    install(engine, { root } = {}) {
        if (!root || typeof root.add !== "function" || typeof root.remove !== "function") {
            throw new TypeError('ScenePlugin needs options.root with add()/remove() (e.g. a THREE.Scene)');
        }
        const world = engine.world;
        const spawned = new Map(); // entity -> object

        const onDestroyed = id => {
            const object = spawned.get(id);
            if (!object) return;
            spawned.delete(id);
            root.remove(object);
        };
        const offDestroyed = engine.events.on("ecs:entity-destroyed", onDestroyed);
        const syncSystem = engine.addSystem(createTransformSyncSystem(world));

        const api = {
            root,
            spawn(object, transform) {
                const id = world.createEntity();
                const t = world.add(id, Transform);
                readTransform(object, t);
                if (transform) {
                    for (const key of ["position", "rotation", "scale"]) Object.assign(t[key], transform[key]);
                }
                world.add(id, Object3DRef, { object });
                spawned.set(id, object);
                root.add(object);
                engine.events.emit("scene:spawned", { id, object });
                return id;
            },
            despawn(id) {
                return world.destroyEntity(id);
            },
            objectOf(id) {
                return world.get(id, Object3DRef)?.object ?? null;
            },
            entityOf(object) {
                for (const [id, obj] of spawned) if (obj === object) return id;
                return null;
            },
            get count() {
                return spawned.size;
            },
            _dispose() {
                offDestroyed();
                engine.removeSystem(syncSystem);
                for (const object of spawned.values()) root.remove(object);
                spawned.clear();
            },
        };
        engine.scene = api;
        return api;
    },
    uninstall(engine) {
        engine.scene?._dispose();
        delete engine.scene;
    },
});
