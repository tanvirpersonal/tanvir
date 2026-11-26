import test from "node:test";
import assert from "node:assert/strict";
import { EventBus } from "../../engine/core/EventBus.js";

test("on/emit delivers payload in subscription order", () => {
    const bus = new EventBus();
    const calls = [];
    bus.on("a", p => calls.push(["1", p]));
    bus.on("a", p => calls.push(["2", p]));
    assert.equal(bus.emit("a", 5), 2);
    assert.deepEqual(calls, [["1", 5], ["2", 5]]);
});

test("unsubscribe function and off remove handlers", () => {
    const bus = new EventBus();
    let n = 0;
    const off = bus.on("a", () => n++);
    off();
    bus.emit("a");
    assert.equal(n, 0);
    assert.equal(bus.listenerCount("a"), 0);
});

test("once fires a single time", () => {
    const bus = new EventBus();
    let n = 0;
    bus.once("a", () => n++);
    bus.emit("a");
    bus.emit("a");
    assert.equal(n, 1);
});

test("a throwing handler does not block others and reports to error event", () => {
    const bus = new EventBus();
    const errors = [];
    let reached = false;
    bus.on("error", e => errors.push(e.type));
    bus.on("a", () => { throw new Error("boom"); });
    bus.on("a", () => { reached = true; });
    bus.emit("a");
    assert.ok(reached);
    assert.deepEqual(errors, ["a"]);
});

test("clear removes all handlers", () => {
    const bus = new EventBus();
    bus.on("a", () => {});
    bus.on("b", () => {});
    bus.clear();
    assert.equal(bus.listenerCount("a") + bus.listenerCount("b"), 0);
});
