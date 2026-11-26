/**
 * Time — frame timing for the engine loop.
 * - delta / unscaledDelta in seconds (clamped by maxDelta to avoid spiral-of-death)
 * - fixed-step accumulator: consumeFixedSteps() returns how many fixed updates to run
 * - timeScale for slow-motion / pause (timeScale 0)
 */
export class Time {
    constructor({ fixedDelta = 1 / 60, maxDelta = 0.25, maxFixedSteps = 8 } = {}) {
        this.fixedDelta = fixedDelta;
        this.maxDelta = maxDelta;
        this.maxFixedSteps = maxFixedSteps;
        this.timeScale = 1;
        this.reset();
    }

    reset() {
        this.delta = 0;
        this.unscaledDelta = 0;
        this.elapsed = 0;
        this.unscaledElapsed = 0;
        this.frame = 0;
        this.accumulator = 0;
        this._last = null;
    }

    /** Advance using an absolute timestamp in milliseconds (e.g. rAF / performance.now()). */
    tick(nowMs) {
        const raw = this._last === null ? 0 : Math.max(0, (nowMs - this._last) / 1000);
        this._last = nowMs;
        return this.step(raw);
    }

    /** Advance by a delta in seconds. */
    step(seconds) {
        const unscaled = Math.min(seconds, this.maxDelta);
        this.unscaledDelta = unscaled;
        this.delta = unscaled * this.timeScale;
        this.unscaledElapsed += unscaled;
        this.elapsed += this.delta;
        this.accumulator += this.delta;
        this.frame++;
        return this.delta;
    }

    /** Number of fixed steps to run this frame; drains the accumulator. */
    consumeFixedSteps() {
        let steps = Math.floor(this.accumulator / this.fixedDelta);
        if (steps > this.maxFixedSteps) {
            steps = this.maxFixedSteps;
            this.accumulator = 0; // drop backlog rather than spiral
        } else {
            this.accumulator -= steps * this.fixedDelta;
        }
        return steps;
    }

    /** Interpolation factor (0..1) between the last two fixed steps, for rendering. */
    get alpha() {
        return this.fixedDelta > 0 ? this.accumulator / this.fixedDelta : 0;
    }
}
