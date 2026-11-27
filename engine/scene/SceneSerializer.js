/**
 * SceneSerializer — save/load ECS world data as plain JSON, and embed it in an
 * RKP v2 asset without touching the RKP schema.
 *
 *   const serializer = new SceneSerializer([Transform, Health]);    // components to save
 *   const data = serializer.serialize(world);                       // { format, version, entities: [...] }
 *   const idMap = serializer.deserialize(otherWorld, data);         // Map<savedId, newId>
 *
 *   const asset = embedInRKP(existingRkpAsset, data);               // → asset.customProperties.engineScene
 *   const back  = extractFromRKP(asset);                            // data or null
 *
 * Only registered components are written. Runtime-only components (e.g.
 * Object3DRef holding a THREE object) are never registered, so they are skipped.
 * Custom per-component codecs: `serializer.register(Comp, { save(data), load(json) })`.
 *
 * engine/ must not import core/, so RKP creation/validation stays in core/;
 * these helpers only read/write the `customProperties.engineScene` slot.
 */
export const ENGINE_SCENE_FORMAT = "engine-scene";
export const ENGINE_SCENE_VERSION = 1;
export const RKP_ENGINE_SCENE_KEY = "engineScene";

const clone = value => JSON.parse(JSON.stringify(value));

export class SceneSerializer {
    constructor(components = []) {
        this._byName = new Map(); // name -> { component, save, load }
        for (const component of components) this.register(component);
    }

    register(component, { save = clone, load = clone } = {}) {
        if (this._byName.has(component.name) && this._byName.get(component.name).component !== component) {
            throw new Error(`another component is already registered as "${component.name}"`);
        }
        this._byName.set(component.name, { component, save, load });
        return this;
    }

    serialize(world) {
        const entities = [];
        for (const id of world.entities().sort((a, b) => a - b)) {
            const components = {};
            for (const [name, codec] of this._byName) {
                if (world.has(id, codec.component)) components[name] = codec.save(world.get(id, codec.component));
            }
            if (Object.keys(components).length) entities.push({ id, components });
        }
        return { format: ENGINE_SCENE_FORMAT, version: ENGINE_SCENE_VERSION, entities };
    }

    /**
     * Create entities in `world` from serialized data. Unknown component names
     * are reported via `onUnknown(name, entityId)` and skipped. Returns a Map
     * from saved id to new id.
     */
    deserialize(world, data, { onUnknown } = {}) {
        if (!data || data.format !== ENGINE_SCENE_FORMAT) throw new Error(`not an ${ENGINE_SCENE_FORMAT} payload`);
        if (data.version > ENGINE_SCENE_VERSION) throw new Error(`unsupported ${ENGINE_SCENE_FORMAT} version ${data.version}`);
        if (!Array.isArray(data.entities)) throw new Error("entities must be an array");
        const idMap = new Map();
        for (const entry of data.entities) {
            const id = world.createEntity();
            idMap.set(entry.id, id);
            for (const [name, json] of Object.entries(entry.components ?? {})) {
                const codec = this._byName.get(name);
                if (!codec) { onUnknown?.(name, entry.id); continue; }
                world.add(id, codec.component, codec.load(json));
            }
        }
        return idMap;
    }
}

/** Return a shallow copy of an RKP asset with engine scene data embedded. */
export function embedInRKP(asset, sceneData) {
    if (!asset || typeof asset !== "object") throw new TypeError("asset must be an RKP object");
    return {
        ...asset,
        customProperties: { ...(asset.customProperties ?? {}), [RKP_ENGINE_SCENE_KEY]: clone(sceneData) },
    };
}

/** Read engine scene data from an RKP asset, or null if absent. */
export function extractFromRKP(asset) {
    const data = asset?.customProperties?.[RKP_ENGINE_SCENE_KEY];
    return data && data.format === ENGINE_SCENE_FORMAT ? data : null;
}
