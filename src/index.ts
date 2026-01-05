export const VERSION = "1.0.26";

export { default as Entity } from "./entity.js";
export { default as Component } from "./component.js";
export { default as System } from "./system.js";
export { default as Resource } from "./resource.js";

export { default as World } from "./world.js";

export { EntityContext, WorldContext } from "./contexts/index.js";
export { AttachmentException, DependencyException } from "./exceptions.js";

export { default as QueryManager } from "./query-manager.js";

export type { Instances, Resourceable, SignalEventsMap } from "./types.js";
