import test from "node:test";
import assert from "node:assert/strict";
import { Time } from "../../engine/core/Time.js";

test("first tick has zero delta, later ticks measure seconds", () => {
    const t = new Time();
    assert.equal(t.tick(1000), 0);
    assert.ok(Math.abs(t.tick(1016) - 0.016) < 1e-9);
    assert.equal(t.frame, 2);
});

test("delta is clamped by maxDelta", () => {
    const t = new Time({ maxDelta: 0.1 });
    t.step(5);
    assert.equal(t.delta, 0.1);
});

test("timeScale scales delta but not unscaledDelta", () => {
    const t = new Time();
    t.timeScale = 0.5;
    t.step(0.1);
    assert.equal(t.delta, 0.05);
    assert.equal(t.unscaledDelta, 0.1);
});

test("fixed steps accumulate and leave remainder", () => {
    const t = new Time({ fixedDelta: 0.01 });
    t.step(0.035);
    assert.equal(t.consumeFixedSteps(), 3);
    assert.ok(Math.abs(t.accumulator - 0.005) < 1e-9);
    assert.ok(t.alpha > 0.49 && t.alpha < 0.51);
});

test("fixed steps are capped and backlog dropped", () => {
    const t = new Time({ fixedDelta: 0.01, maxDelta: 1, maxFixedSteps: 4 });
    t.step(0.5);
    assert.equal(t.consumeFixedSteps(), 4);
    assert.equal(t.accumulator, 0);
});
