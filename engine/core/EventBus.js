/**
 * EventBus — synchronous publish/subscribe used by the engine and editor.
 * DOM-free so it runs under `node --test`. Will replace `window` CustomEvents
 * ("editor:*") over time; see docs/engine/ROADMAP.md Phase 3.
 */
export class EventBus {
    #handlers = new Map();

    /** Subscribe. Returns an unsubscribe function. */
    on(type, handler) {
        if (typeof handler !== "function") throw new TypeError("handler must be a function");
        let set = this.#handlers.get(type);
        if (!set) this.#handlers.set(type, (set = new Set()));
        set.add(handler);
        return () => this.off(type, handler);
    }

    /** Subscribe for a single emission. */
    once(type, handler) {
        const off = this.on(type, payload => {
            off();
            handler(payload);
        });
        return off;
    }

    off(type, handler) {
        const set = this.#handlers.get(type);
        if (!set) return false;
        const removed = set.delete(handler);
        if (set.size === 0) this.#handlers.delete(type);
        return removed;
    }

    /**
     * Emit an event. Handlers run in subscription order. A handler that throws
     * does not stop the others; errors are reported via the "error" event (or
     * console.error when nobody listens to "error").
     */
    emit(type, payload) {
        const set = this.#handlers.get(type);
        if (!set) return 0;
        let count = 0;
        for (const handler of [...set]) {
            try {
                handler(payload);
            } catch (error) {
                if (type !== "error" && this.listenerCount("error") > 0) this.emit("error", { type, error });
                else console.error(`[EventBus] handler for "${type}" threw`, error);
            }
            count++;
        }
        return count;
    }

    listenerCount(type) {
        return this.#handlers.get(type)?.size ?? 0;
    }

    clear(type) {
        if (type === undefined) this.#handlers.clear();
        else this.#handlers.delete(type);
    }
}
