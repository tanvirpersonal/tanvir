import { EventBus } from "./EventBus.js";
import { Time } from "./Time.js";
import { PluginRegistry } from "./Plugin.js";

/** Loop phases, run in this order every frame. */
export const Phase = Object.freeze({
    PRE_UPDATE: "preUpdate",     // input polling, event flush
    FIXED_UPDATE: "fixedUpdate", // physics / deterministic logic (0..n times per frame)
    UPDATE: "update",            // gameplay, animation
    LATE_UPDATE: "lateUpdate",   // camera follow, transform sync
    RENDER: "render",            // draw
});
const PHASE_ORDER = Object.values(Phase);

/**
 * Engine — owns the main loop, Time and the EventBus.
 *
 * Systems are plain objects with any of the phase methods:
 *   { name, order?, preUpdate(ctx), fixedUpdate(ctx), update(ctx), lateUpdate(ctx), render(ctx), init?(engine), dispose?(engine) }
 * `ctx` is `{ engine, time, dt }` (dt = fixedDelta during fixedUpdate).
 *
 * The frame scheduler is injectable so the loop runs in Node tests:
 *   new Engine({ requestFrame: cb => setTimeout(() => cb(Date.now()), 0), cancelFrame: clearTimeout })
 */
export class Engine {
    constructor({ time, events, requestFrame, cancelFrame } = {}) {
        this.time = time ?? new Time();
        this.events = events ?? new EventBus();
        this.systems = [];
        this.plugins = new PluginRegistry(this);
        this.running = false;
        this.paused = false;
        this._frameHandle = null;
        this._requestFrame = requestFrame ?? globalThis.requestAnimationFrame?.bind(globalThis) ?? null;
        this._cancelFrame = cancelFrame ?? globalThis.cancelAnimationFrame?.bind(globalThis) ?? null;
        this._loop = now => {
            if (!this.running) return;
            this.frame(now);
            this._frameHandle = this._requestFrame(this._loop);
        };
    }

    /** Install a plugin (see Plugin.js). Returns the plugin's API. */
    use(plugin, options) {
        return this.plugins.use(plugin, options);
    }

    addSystem(system) {
        if (!system || typeof system !== "object") throw new TypeError("system must be an object");
        if (this.systems.includes(system)) return system;
        system.order ??= 0;
        this.systems.push(system);
        // stable sort by order
        this.systems = this.systems.map((s, i) => [s, i]).sort((a, b) => a[0].order - b[0].order || a[1] - b[1]).map(([s]) => s);
        system.init?.(this);
        this.events.emit("system:added", system);
        return system;
    }

    removeSystem(system) {
        const i = this.systems.indexOf(system);
        if (i < 0) return false;
        this.systems.splice(i, 1);
        system.dispose?.(this);
        this.events.emit("system:removed", system);
        return true;
    }

    getSystem(name) {
        return this.systems.find(s => s.name === name) ?? null;
    }

    start() {
        if (this.running) return;
        if (!this._requestFrame) throw new Error("Engine.start(): no requestFrame available; pass one in the constructor or call frame() manually");
        this.running = true;
        this.time._last = null;
        this.events.emit("engine:start", this);
        this._frameHandle = this._requestFrame(this._loop);
    }

    stop() {
        if (!this.running) return;
        this.running = false;
        if (this._frameHandle !== null) this._cancelFrame?.(this._frameHandle);
        this._frameHandle = null;
        this.events.emit("engine:stop", this);
    }

    setPaused(paused) {
        this.paused = !!paused;
        this.events.emit("engine:pause", this.paused);
    }

    /** Run one frame. `now` is a ms timestamp; omit to advance by exactly one fixedDelta. */
    frame(now) {
        const time = this.time;
        if (now === undefined) time.step(time.fixedDelta);
        else time.tick(now);
        const simulate = !this.paused;

        this._run(Phase.PRE_UPDATE, time.delta);
        if (simulate) {
            const steps = time.consumeFixedSteps();
            for (let i = 0; i < steps; i++) this._run(Phase.FIXED_UPDATE, time.fixedDelta);
            this._run(Phase.UPDATE, time.delta);
            this._run(Phase.LATE_UPDATE, time.delta);
        } else {
            time.accumulator = 0;
        }
        this._run(Phase.RENDER, time.delta);
        this.events.emit("engine:frame", time);
    }

    _run(phase, dt) {
        const ctx = { engine: this, time: this.time, dt };
        for (const system of this.systems) {
            if (system.enabled === false) continue;
            const fn = system[phase];
            if (typeof fn !== "function") continue;
            try {
                fn.call(system, ctx);
            } catch (error) {
                this.events.emit("error", { type: `system:${system.name ?? "anonymous"}:${phase}`, error });
                if (this.events.listenerCount("error") === 0) console.error(error);
            }
        }
    }

    dispose() {
        this.stop();
        this.plugins.clear();
        for (const system of [...this.systems].reverse()) this.removeSystem(system);
        this.events.clear();
    }
}

export { PHASE_ORDER };
