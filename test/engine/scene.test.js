import test from "node:test";
import assert from "node:assert/strict";
import { Engine } from "../../engine/core/Engine.js";
import { EcsPlugin } from "../../engine/ecs/World.js";
import { Transform, readTransform, applyTransform } from "../../engine/scene/Object3DComponent.js";
import { ScenePlugin } from "../../engine/scene/ScenePlugin.js";

const vec = (x = 0, y = 0, z = 0) => ({ x, y, z, set(a, b, c) { this.x = a; this.y = b; this.z = c; } });
const fakeObject = () => ({ position: vec(1, 2, 3), rotation: vec(0, 0.5, 0), scale: vec(1, 1, 1) });
const fakeRoot = () => ({ children: [], add(o) { this.children.push(o); }, remove(o) { this.children = this.children.filter(c => c !== o); } });

function setup() {
    const engine = new Engine();
    engine.use(EcsPlugin);
    const root = fakeRoot();
    const scene = engine.use(ScenePlugin, { root });
    return { engine, root, scene };
}

test("read/apply transform round-trip", () => {
    const obj = fakeObject();
    const t = readTransform(obj);
    assert.deepEqual(t.position, { x: 1, y: 2, z: 3 });
    t.scale.x = 4;
    applyTransform(t, obj);
    assert.equal(obj.scale.x, 4);
});

test("ScenePlugin requires ecs and a root", () => {
    const engine = new Engine();
    assert.throws(() => engine.use(ScenePlugin, { root: fakeRoot() }), /requires: ecs/);
    engine.use(EcsPlugin);
    assert.throws(() => engine.use(ScenePlugin, {}), /root/);
});

test("spawn adds object to root and reads its transform", () => {
    const { engine, root, scene } = setup();
    const obj = fakeObject();
    const id = scene.spawn(obj);
    assert.deepEqual(root.children, [obj]);
    assert.equal(scene.objectOf(id), obj);
    assert.equal(scene.entityOf(obj), id);
    assert.deepEqual(engine.world.get(id, Transform).position, { x: 1, y: 2, z: 3 });
});

test("spawn with transform override; lateUpdate syncs data to object", () => {
    const { engine, scene } = setup();
    const obj = fakeObject();
    const id = scene.spawn(obj, { position: { y: 10 } });
    assert.equal(engine.world.get(id, Transform).position.y, 10);
    engine.world.get(id, Transform).position.x = 7;
    engine.frame();
    assert.equal(obj.position.x, 7);
    assert.equal(obj.position.y, 10);
});

test("despawn or destroyEntity detaches object", () => {
    const { engine, root, scene } = setup();
    const a = scene.spawn(fakeObject());
    const b = scene.spawn(fakeObject());
    scene.despawn(a);
    engine.world.destroyEntity(b);
    assert.equal(root.children.length, 0);
    assert.equal(scene.count, 0);
});

test("engine.dispose removes objects and plugin state", () => {
    const { engine, root, scene } = setup();
    scene.spawn(fakeObject());
    engine.dispose();
    assert.equal(root.children.length, 0);
    assert.equal(engine.scene, undefined);
    assert.equal(engine.world, undefined);
});
