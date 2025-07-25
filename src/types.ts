import type { Callback, Constructor } from "@byloth/core";

import type Entity from "./entity.js";
import type Component from "./component.js";
import type System from "./system.js";

export type Instances<T extends Constructor[]> = T extends [infer F, ...infer R] ?
    [InstanceType<F extends Constructor ? F : never>, ...Instances<R extends Constructor[] ? R : []>] : [];

export interface WorldEventsMap
{
    "entity:component:enable": (entity: Entity, component: Component) => void;
    "entity:component:disable": (entity: Entity, component: Component) => void;
}

type EntitySignalEventsMap<T extends unknown[]> = Record<`entity:${number}:${string}`, Callback<[Entity, ...T]>>;
type ComponentSignalEventsMap<T extends unknown[]> =
    Record<`component:${number}:${string}`, Callback<[Component, ...T]>>;

type SystemSignalEventsMap<T extends unknown[]> = Record<`system:${number}:${string}`, Callback<[System, ...T]>>;

export type SignalEventsMap<T extends unknown[] = unknown[]> =
    EntitySignalEventsMap<T> & ComponentSignalEventsMap<T> & SystemSignalEventsMap<T>;
