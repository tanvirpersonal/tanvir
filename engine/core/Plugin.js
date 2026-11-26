/**
 * Plugins — the unit of extension for the engine (render, physics, voxel,
 * rocket parts, editor tools…).
 *
 *   export const VoxelPlugin = definePlugin({
 *     name: "voxel",
 *     dependencies: ["render"],
 *     install(engine, options) { engine.addSystem(...); return api; },
 *     uninstall(engine) { ... },
 *   });
 *   engine.use(VoxelPlugin, { chunkSize: 32 });
 *   engine.plugins.get("voxel"); // → api returned by install (or the plugin)
 */
export function definePlugin(plugin) {
    if (!plugin || typeof plugin !== "object") throw new TypeError("plugin must be an object");
    if (typeof plugin.name !== "string" || !plugin.name) throw new TypeError("plugin.name is required");
    if (typeof plugin.install !== "function") throw new TypeError(`plugin "${plugin.name}" needs an install(engine, options) function`);
    return Object.freeze({ dependencies: [], ...plugin });
}

export class PluginRegistry {
    #engine;
    #installed = new Map(); // name -> { plugin, api }

    constructor(engine) {
        this.#engine = engine;
    }

    use(plugin, options = {}) {
        plugin = definePlugin(plugin);
        if (this.#installed.has(plugin.name)) return this.get(plugin.name);
        const missing = plugin.dependencies.filter(dep => !this.#installed.has(dep));
        if (missing.length) throw new Error(`plugin "${plugin.name}" requires: ${missing.join(", ")} (install them first)`);
        const api = plugin.install(this.#engine, options);
        this.#installed.set(plugin.name, { plugin, api: api ?? plugin });
        this.#engine.events?.emit("plugin:installed", plugin.name);
        return this.get(plugin.name);
    }

    remove(name) {
        const entry = this.#installed.get(name);
        if (!entry) return false;
        const dependents = [...this.#installed.values()].filter(e => e.plugin.dependencies.includes(name)).map(e => e.plugin.name);
        if (dependents.length) throw new Error(`cannot remove "${name}": required by ${dependents.join(", ")}`);
        entry.plugin.uninstall?.(this.#engine);
        this.#installed.delete(name);
        this.#engine.events?.emit("plugin:removed", name);
        return true;
    }

    has(name) {
        return this.#installed.has(name);
    }

    get(name) {
        return this.#installed.get(name)?.api ?? null;
    }

    /** Installed plugin names in install order. */
    list() {
        return [...this.#installed.keys()];
    }

    /** Uninstall everything in reverse install order. */
    clear() {
        for (const name of this.list().reverse()) {
            this.#installed.get(name).plugin.uninstall?.(this.#engine);
            this.#installed.delete(name);
        }
    }
}
