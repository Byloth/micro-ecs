export const VERSION = "1.0.4";

import Entity from "./entity.js";
import Component from "./component.js";
import System from "./system.js";
export { Entity, Component, System };

import World from "./world.js";
export { World };
export type { WorldEventsMap } from "./world.js";

import QueryManager from "./query-manager.js";
export { QueryManager };

export type { Inherits } from "./types.js";
