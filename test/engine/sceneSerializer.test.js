import test from "node:test";
import assert from "node:assert/strict";
import { World, defineComponent } from "../../engine/ecs/World.js";
import { Transform, Object3DRef } from "../../engine/scene/Object3DComponent.js";
import { SceneSerializer, embedInRKP, extractFromRKP } from "../../engine/scene/SceneSerializer.js";
import { createRKPAsset } from "../../core/rkpSchema.js";
import { validateRKP } from "../../core/rkpValidator.js";

const Health = defineComponent("Health", () => ({ hp: 100 }));

function makeWorld() {
    const w = new World();
    const a = w.createEntity();
    w.add(a, Transform).position.x = 3;
    w.add(a, Health, { hp: 42 });
    w.add(a, Object3DRef, { object: { not: "serializable" } });
    const b = w.createEntity();
    w.add(b, Transform);
    w.createEntity(); // no registered components → skipped
    return w;
}

test("serialize writes only registered components, as JSON-safe copies", () => {
    const s = new SceneSerializer([Transform, Health]);
    const data = s.serialize(makeWorld());
    assert.equal(data.entities.length, 2);
    assert.equal(data.entities[0].components.Health.hp, 42);
    assert.equal(data.entities[0].components.Object3DRef, undefined);
    assert.deepEqual(JSON.parse(JSON.stringify(data)), data);
});

test("deserialize round-trips into a new world", () => {
    const s = new SceneSerializer([Transform, Health]);
    const data = s.serialize(makeWorld());
    const w2 = new World();
    const idMap = s.deserialize(w2, data);
    assert.equal(idMap.size, 2);
    const a2 = idMap.get(data.entities[0].id);
    assert.equal(w2.get(a2, Transform).position.x, 3);
    assert.equal(w2.get(a2, Health).hp, 42);
    assert.deepEqual(s.serialize(w2).entities.map(e => e.components), data.entities.map(e => e.components));
});

test("unknown components are reported and skipped; bad payloads throw", () => {
    const full = new SceneSerializer([Transform, Health]).serialize(makeWorld());
    const partial = new SceneSerializer([Transform]);
    const unknown = [];
    const w = new World();
    partial.deserialize(w, full, { onUnknown: name => unknown.push(name) });
    assert.deepEqual(unknown, ["Health"]);
    assert.throws(() => partial.deserialize(w, { format: "nope" }), /not an engine-scene/);
    assert.throws(() => partial.deserialize(w, { ...full, version: 99 }), /unsupported/);
});

test("custom codecs are used", () => {
    const s = new SceneSerializer().register(Health, { save: d => d.hp, load: hp => ({ hp }) });
    const w = new World();
    w.add(w.createEntity(), Health, { hp: 7 });
    const data = s.serialize(w);
    assert.equal(data.entities[0].components.Health, 7);
    const w2 = new World();
    s.deserialize(w2, data);
    assert.equal(w2.get(w2.entities()[0], Health).hp, 7);
});

test("embed/extract keeps the RKP asset valid", () => {
    const data = new SceneSerializer([Transform, Health]).serialize(makeWorld());
    const asset = createRKPAsset({ name: "Test", type: "model" });
    const withScene = embedInRKP(asset, data);
    assert.equal(asset.customProperties.engineScene, undefined, "original not mutated");
    assert.deepEqual(extractFromRKP(withScene), data);
    assert.equal(extractFromRKP(asset), null);
    const result = validateRKP(withScene);
    assert.equal(result.valid, true, JSON.stringify(result.errors));
});
