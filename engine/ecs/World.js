/**
 * Minimal ECS (entity-component-system) for the engine.
 *
 *   const Position = defineComponent("Position", () => ({ x: 0, y: 0, z: 0 }));
 *   const Velocity = defineComponent("Velocity", () => ({ x: 0, y: 0, z: 0 }));
 *
 *   const world = new World();
 *   const e = world.createEntity();
 *   world.add(e, Position, { x: 1 });
 *   world.add(e, Velocity, { x: 2 });
 *   for (const id of world.query(Position, Velocity)) {
 *     world.get(id, Position).x += world.get(id, Velocity).x * dt;
 *   }
 *
 * Entities are integer ids. Destroyed ids are recycled with a bumped generation
 * (see `isAlive`). Components are plain data objects stored per definition.
 * `query()` results are cached and invalidated when a component set changes;
 * the returned array is a snapshot, so it is safe to add/remove while iterating.
 */
let nextComponentId = 1;

export function defineComponent(name, create = () => ({})) {
    if (typeof name !== "string" || !name) throw new TypeError("component name is required");
    if (typeof create !== "function") throw new TypeError("component create must be a function");
    return Object.freeze({ id: nextComponentId++, name, create });
}

export class World {
    constructor({ events } = {}) {
        this.events = events ?? null;
        this._alive = new Set();
        this._generation = [];
        this._free = [];
        this._nextId = 0;
        this._stores = new Map();      // componentId -> Map<entity, data>
        this._components = new Map();  // componentId -> definition
        this._queries = new Map();     // key -> { comps, result|null }
    }

    // ---- entities -------------------------------------------------------
    createEntity() {
        const id = this._free.length ? this._free.pop() : this._nextId++;
        this._generation[id] = (this._generation[id] ?? -1) + 1;
        this._alive.add(id);
        this.events?.emit("ecs:entity-created", id);
        return id;
    }

    destroyEntity(id) {
        if (!this._alive.has(id)) return false;
        for (const store of this._stores.values()) store.delete(id);
        this._alive.delete(id);
        this._free.push(id);
        this._invalidate();
        this.events?.emit("ecs:entity-destroyed", id);
        return true;
    }

    isAlive(id, generation) {
        if (!this._alive.has(id)) return false;
        return generation === undefined || this._generation[id] === generation;
    }

    generation(id) {
        return this._generation[id] ?? -1;
    }

    get entityCount() {
        return this._alive.size;
    }

    entities() {
        return [...this._alive];
    }

    // ---- components -----------------------------------------------------
    add(id, component, data = {}) {
        this._assertAlive(id);
        const value = Object.assign(component.create(), data);
        this._store(component).set(id, value);
        this._invalidate(component.id);
        return value;
    }

    remove(id, component) {
        const removed = this._stores.get(component.id)?.delete(id) ?? false;
        if (removed) this._invalidate(component.id);
        return removed;
    }

    get(id, component) {
        return this._stores.get(component.id)?.get(id);
    }

    has(id, component) {
        return this._stores.get(component.id)?.has(id) ?? false;
    }

    /** Component definitions currently attached to an entity. */
    componentsOf(id) {
        const out = [];
        for (const [cid, store] of this._stores) if (store.has(id)) out.push(this._components.get(cid));
        return out;
    }

    // ---- queries --------------------------------------------------------
    /** Entities that have ALL given components. Returns a cached snapshot array. */
    query(...components) {
        if (components.length === 0) return this.entities();
        const key = components.map(c => c.id).sort((a, b) => a - b).join(",");
        let q = this._queries.get(key);
        if (!q) this._queries.set(key, (q = { ids: new Set(components.map(c => c.id)), comps: components, result: null }));
        if (!q.result) q.result = this._run(q.comps);
        return q.result;
    }

    clear() {
        for (const id of [...this._alive]) this.destroyEntity(id);
    }

    // ---- internals ------------------------------------------------------
    _run(components) {
        const stores = components.map(c => this._stores.get(c.id));
        if (stores.some(s => !s || s.size === 0)) return [];
        stores.sort((a, b) => a.size - b.size);
        const [smallest, ...rest] = stores;
        const result = [];
        for (const id of smallest.keys()) if (rest.every(s => s.has(id))) result.push(id);
        return result;
    }

    _store(component) {
        let store = this._stores.get(component.id);
        if (!store) {
            this._stores.set(component.id, (store = new Map()));
            this._components.set(component.id, component);
        }
        return store;
    }

    _invalidate(componentId) {
        for (const q of this._queries.values()) {
            if (componentId === undefined || q.ids.has(componentId)) q.result = null;
        }
    }

    _assertAlive(id) {
        if (!this._alive.has(id)) throw new Error(`entity ${id} is not alive`);
    }
}

/**
 * EcsPlugin — creates a World on the engine: `engine.use(EcsPlugin)` then
 * `engine.plugins.get("ecs")` (or `engine.world`) returns it.
 */
export const EcsPlugin = Object.freeze({
    name: "ecs",
    install(engine) {
        const world = new World({ events: engine.events });
        engine.world = world;
        return world;
    },
    uninstall(engine) {
        engine.world?.clear();
        delete engine.world;
    },
});
