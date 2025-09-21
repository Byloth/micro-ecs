export const VERSION = "1.0.21";

import Entity from "./entity.js";
import Component from "./component.js";
import System from "./system.js";
import Resource from "./resource.js";
export { Entity, Component, System, Resource };

import World from "./world.js";
export { World };

export { EntityContext, WorldContext } from "./contexts/index.js";
export { AdoptionException, AttachmentException, DependencyException, HierarchyException } from "./exceptions.js";

import QueryManager from "./query-manager.js";
export { QueryManager };

export type { Instances, SignalEventsMap, WorldEventsMap } from "./types.js";
