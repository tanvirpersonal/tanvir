import test from "node:test";
import assert from "node:assert/strict";
import { World, defineComponent, EcsPlugin } from "../../engine/ecs/World.js";
import { Engine } from "../../engine/core/Engine.js";

const Position = defineComponent("Position", () => ({ x: 0, y: 0, z: 0 }));
const Velocity = defineComponent("Velocity", () => ({ x: 0, y: 0, z: 0 }));
const Tag = defineComponent("Tag");

test("add/get/has/remove components with defaults merged", () => {
    const w = new World();
    const e = w.createEntity();
    const p = w.add(e, Position, { x: 5 });
    assert.deepEqual(p, { x: 5, y: 0, z: 0 });
    assert.equal(w.get(e, Position), p);
    assert.ok(w.has(e, Position));
    assert.ok(w.remove(e, Position));
    assert.equal(w.has(e, Position), false);
});

test("component defaults are fresh objects per entity", () => {
    const w = new World();
    const a = w.createEntity(), b = w.createEntity();
    w.add(a, Position).x = 9;
    assert.equal(w.add(b, Position).x, 0);
});

test("query returns entities having all components and is cached until change", () => {
    const w = new World();
    const a = w.createEntity(), b = w.createEntity(), c = w.createEntity();
    w.add(a, Position); w.add(a, Velocity);
    w.add(b, Position);
    w.add(c, Velocity);
    const r1 = w.query(Position, Velocity);
    assert.deepEqual(r1, [a]);
    assert.equal(w.query(Velocity, Position), r1, "same cached array regardless of order");
    w.add(b, Velocity);
    assert.deepEqual([...w.query(Position, Velocity)].sort(), [a, b]);
    assert.deepEqual(w.query(Tag), []);
});

test("unrelated component changes keep cache", () => {
    const w = new World();
    const a = w.createEntity();
    w.add(a, Position);
    const r = w.query(Position);
    w.add(a, Tag);
    assert.equal(w.query(Position), r);
});

test("destroy removes components, recycles id with new generation", () => {
    const w = new World();
    const a = w.createEntity();
    w.add(a, Position);
    const gen = w.generation(a);
    assert.ok(w.destroyEntity(a));
    assert.deepEqual(w.query(Position), []);
    assert.throws(() => w.add(a, Position), /not alive/);
    const b = w.createEntity();
    assert.equal(b, a);
    assert.ok(w.isAlive(b));
    assert.equal(w.isAlive(b, gen), false, "old handle is stale");
    assert.equal(w.get(b, Position), undefined);
});

test("snapshot arrays are safe to mutate the world while iterating", () => {
    const w = new World();
    for (let i = 0; i < 5; i++) w.add(w.createEntity(), Position);
    for (const id of w.query(Position)) w.destroyEntity(id);
    assert.equal(w.entityCount, 0);
});

test("EcsPlugin attaches world to engine and systems can use it", () => {
    const engine = new Engine();
    const world = engine.use(EcsPlugin);
    assert.equal(engine.world, world);
    const e = world.createEntity();
    world.add(e, Position);
    world.add(e, Velocity, { x: 60 });
    engine.addSystem({
        name: "move",
        fixedUpdate({ dt }) {
            for (const id of world.query(Position, Velocity)) world.get(id, Position).x += world.get(id, Velocity).x * dt;
        },
    });
    engine.frame(0);
    engine.frame(1000 / 60 + 0.001);
    assert.ok(Math.abs(world.get(e, Position).x - 1) < 1e-6);
    engine.dispose();
    assert.equal(engine.world, undefined);
});
