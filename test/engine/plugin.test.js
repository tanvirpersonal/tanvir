import test from "node:test";
import assert from "node:assert/strict";
import { Engine } from "../../engine/core/Engine.js";
import { definePlugin } from "../../engine/core/Plugin.js";

test("definePlugin validates shape", () => {
    assert.throws(() => definePlugin({ install() {} }), /name/);
    assert.throws(() => definePlugin({ name: "x" }), /install/);
});

test("engine.use installs once, passes options, returns api", () => {
    const engine = new Engine();
    let installs = 0;
    const p = { name: "render", install: (eng, opts) => { installs++; assert.equal(eng, engine); return { quality: opts.quality }; } };
    const api = engine.use(p, { quality: "high" });
    assert.deepEqual(api, { quality: "high" });
    engine.use(p);
    assert.equal(installs, 1);
    assert.equal(engine.plugins.get("render"), api);
    assert.deepEqual(engine.plugins.list(), ["render"]);
});

test("dependencies must be installed first and block removal", () => {
    const engine = new Engine();
    const render = { name: "render", install() {} };
    const voxel = { name: "voxel", dependencies: ["render"], install() {} };
    assert.throws(() => engine.use(voxel), /requires: render/);
    engine.use(render);
    engine.use(voxel);
    assert.throws(() => engine.plugins.remove("render"), /required by voxel/);
    assert.ok(engine.plugins.remove("voxel"));
    assert.ok(engine.plugins.remove("render"));
});

test("dispose uninstalls plugins in reverse order", () => {
    const engine = new Engine();
    const order = [];
    engine.use({ name: "a", install() {}, uninstall: () => order.push("a") });
    engine.use({ name: "b", dependencies: ["a"], install() {}, uninstall: () => order.push("b") });
    engine.dispose();
    assert.deepEqual(order, ["b", "a"]);
});

test("plugin can register systems", () => {
    const engine = new Engine();
    let updated = false;
    engine.use({ name: "s", install: eng => eng.addSystem({ name: "sys", update: () => { updated = true; } }) });
    engine.frame();
    assert.ok(updated);
});
