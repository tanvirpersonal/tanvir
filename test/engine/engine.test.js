import test from "node:test";
import assert from "node:assert/strict";
import { Engine, Phase } from "../../engine/core/Engine.js";
import { Time } from "../../engine/core/Time.js";

test("frame() runs phases in order, fixed update per fixed step", () => {
    const engine = new Engine({ time: new Time({ fixedDelta: 0.01 }) });
    const log = [];
    engine.addSystem({
        name: "probe",
        preUpdate: () => log.push(Phase.PRE_UPDATE),
        fixedUpdate: ({ dt }) => log.push(`${Phase.FIXED_UPDATE}:${dt}`),
        update: () => log.push(Phase.UPDATE),
        lateUpdate: () => log.push(Phase.LATE_UPDATE),
        render: () => log.push(Phase.RENDER),
    });
    engine.frame(0);      // first tick: dt 0, no fixed steps
    log.length = 0;
    engine.frame(25);     // 0.025s → 2 fixed steps
    assert.deepEqual(log, ["preUpdate", "fixedUpdate:0.01", "fixedUpdate:0.01", "update", "lateUpdate", "render"]);
});

test("systems are sorted by order and init/dispose are called", () => {
    const engine = new Engine();
    const seen = [];
    const a = { name: "a", order: 10, update: () => seen.push("a"), dispose: () => seen.push("a:dispose") };
    const b = { name: "b", order: -5, init: () => seen.push("b:init"), update: () => seen.push("b") };
    engine.addSystem(a);
    engine.addSystem(b);
    engine.frame();
    assert.deepEqual(seen, ["b:init", "b", "a"]);
    assert.equal(engine.getSystem("a"), a);
    engine.removeSystem(a);
    assert.equal(seen.at(-1), "a:dispose");
});

test("paused engine still renders but does not simulate", () => {
    const engine = new Engine();
    const log = [];
    engine.addSystem({ update: () => log.push("u"), fixedUpdate: () => log.push("f"), render: () => log.push("r") });
    engine.setPaused(true);
    engine.frame();
    assert.deepEqual(log, ["r"]);
});

test("a throwing system emits error and does not stop others", () => {
    const engine = new Engine();
    const errors = [];
    let ran = false;
    engine.events.on("error", e => errors.push(e.type));
    engine.addSystem({ name: "bad", update() { throw new Error("x"); } });
    engine.addSystem({ name: "good", update() { ran = true; } });
    engine.frame();
    assert.ok(ran);
    assert.deepEqual(errors, ["system:bad:update"]);
});

test("start/stop drive frames through the injected scheduler", async () => {
    let now = 0;
    const engine = new Engine({
        requestFrame: cb => setTimeout(() => cb((now += 16)), 0),
        cancelFrame: clearTimeout,
    });
    let frames = 0;
    engine.events.on("engine:frame", () => frames++);
    engine.start();
    await new Promise(r => setTimeout(r, 30));
    engine.stop();
    const after = frames;
    await new Promise(r => setTimeout(r, 20));
    assert.ok(after > 0);
    assert.equal(frames, after);
});
