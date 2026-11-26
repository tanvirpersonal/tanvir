import { defineComponent } from "../ecs/World.js";

/**
 * Scene components linking ECS entities to Three.js objects.
 *
 * - `Transform`  — pure data (position, Euler rotation in radians, scale). This is
 *                   the source of truth for gameplay code.
 * - `Object3DRef` — `{ object }` holding a THREE.Object3D (or anything with
 *                   position/rotation/scale exposing `.set(x, y, z)`).
 *
 * `createTransformSyncSystem(world)` copies Transform → Object3D every lateUpdate
 * for entities that have both. This file never imports `three`, so it runs
 * under `node --test` with fake objects.
 */
export const Transform = defineComponent("Transform", () => ({
    position: { x: 0, y: 0, z: 0 },
    rotation: { x: 0, y: 0, z: 0 },
    scale: { x: 1, y: 1, z: 1 },
}));

export const Object3DRef = defineComponent("Object3DRef", () => ({ object: null }));

/** Copy a THREE.Object3D's current transform into Transform data. */
export function readTransform(object, target = Transform.create()) {
    for (const key of ["position", "rotation", "scale"]) {
        const src = object[key];
        target[key].x = src.x;
        target[key].y = src.y;
        target[key].z = src.z;
    }
    return target;
}

/** Write Transform data onto a THREE.Object3D. */
export function applyTransform(transform, object) {
    const { position: p, rotation: r, scale: s } = transform;
    object.position.set(p.x, p.y, p.z);
    object.rotation.set(r.x, r.y, r.z);
    object.scale.set(s.x, s.y, s.z);
}

export function createTransformSyncSystem(world, { order = 1000 } = {}) {
    return {
        name: "transform-sync",
        order,
        lateUpdate() {
            for (const id of world.query(Transform, Object3DRef)) {
                const object = world.get(id, Object3DRef).object;
                if (object) applyTransform(world.get(id, Transform), object);
            }
        },
    };
}
