export const VERSION = "1.0.12";

import Entity from "./entity.js";
import Component from "./component.js";
import System from "./system.js";
export { Entity, Component, System };

import World from "./world.js";
export { World };

export { AdoptionException, AttachmentException } from "./exceptions.js";

import Context from "./context.js";
export { Context };

import QueryManager from "./query-manager.js";
export { QueryManager };

export type { Instances, WorldEventsMap } from "./types.js";
