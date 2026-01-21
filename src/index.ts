export const VERSION = "1.0.27";

export { default as Entity } from "./entity.js";
export { default as Component } from "./component.js";
export { default as System } from "./system.js";
export { default as Resource } from "./resource.js";

export { default as World } from "./world.js";

export { EntityContext, WorldContext } from "./contexts/index.js";
export { AttachmentException, DependencyException } from "./exceptions.js";

export { QueryManager, QueryView } from "./query/index.js";
export type { ReadonlyQueryView } from "./query/view.js";

export type {
    EntityType,
    ComponentType,
    SystemType,
    ResourceType,
    Instances,
    Resourceable,
    SignalEventsMap

} from "./types.js";
