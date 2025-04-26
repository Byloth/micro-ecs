export const VERSION = "1.0.1";

import Entity from "./entity.js";
import Component from "./component.js";
import System from "./system.js";

export { Entity, Component, System };

import World from "./world.js";

export { World };
export type { WorldEventsMap } from "./world.js";

import QueryManager from "./query/index.js";
import View from "./query/view.js";

export { QueryManager, View };
export { hasComponent, hasTag, and, or, not } from "./query/index.js";
export { Condition, HasComponent, HasTag, And, Or, Not } from "./query/conditions.js";
export type { ReadonlyView, ViewEventsMap } from "./query/view.js";
