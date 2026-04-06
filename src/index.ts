export const VERSION = "1.0.33";

export { default as Entity } from "./entity.js";
export { default as Component } from "./component.js";
export { default as System } from "./system.js";
export { default as Resource } from "./resource.js";

export { default as World } from "./world.js";

export { EntityContext, WorldContext } from "./contexts/index.js";
export { DependencyException } from "./exceptions.js";

export { QueryManager, QueryView } from "./query/index.js";
export type { ReadonlyQueryView } from "./query/index.js";

export { default as ObjectPool } from "./object-pool/index.js";
export type { default as Poolable, InitializeArgs } from "./object-pool/types.js";

export type {
    EntityType,
    ComponentType,
    SystemType,
    ResourceType,
    Instances,
    Resourceable,
    SignalEventsMap

} from "./types.js";
