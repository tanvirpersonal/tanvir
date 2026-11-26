import test from "node:test";
import assert from "node:assert/strict";
import { Logger, createLogger } from "../../engine/core/Logger.js";

function capture(fn) {
    const lines = [];
    const prev = { level: Logger.level, sink: Logger.sink };
    Logger.sink = { debug: (...a) => lines.push(["debug", ...a]), info: (...a) => lines.push(["info", ...a]), warn: (...a) => lines.push(["warn", ...a]), error: (...a) => lines.push(["error", ...a]) };
    try { fn(); } finally { Object.assign(Logger, prev); }
    return lines;
}

test("prefixes messages with scope", () => {
    const lines = capture(() => createLogger("Render").info("hi", 1));
    assert.deepEqual(lines, [["info", "[Render]", "hi", 1]]);
});

test("respects global level threshold", () => {
    const lines = capture(() => {
        Logger.level = "warn";
        const log = createLogger("X");
        log.debug("a"); log.info("b"); log.warn("c"); log.error("d");
    });
    assert.deepEqual(lines.map(l => l[0]), ["warn", "error"]);
});

test("silent suppresses everything; child extends scope", () => {
    const silent = capture(() => { Logger.level = "silent"; createLogger("X").error("e"); });
    assert.equal(silent.length, 0);
    const child = capture(() => createLogger("Assets").child("GLB").warn("w"));
    assert.equal(child[0][1], "[Assets:GLB]");
});
