import type { Callback, Constructor } from "@byloth/core";

import type Entity from "./entity.js";
import type Component from "./component.js";
import type System from "./system.js";

export type Instances<T extends Constructor[]> = T extends [infer F, ...infer R] ?
    [InstanceType<F extends Constructor ? F : never>, ...Instances<R extends Constructor[] ? R : []>] : [];

export interface WorldEventsMap
{
    "entity:component:add": (entity: Entity, component: Component) => void;
    "entity:component:remove": (entity: Entity, component: Component) => void;

    "entity:child:add": (entity: Entity, child: Entity) => void;
    "entity:child:remove": (entity: Entity, child: Entity) => void;

    "system:add": (system: System) => void;
    "system:remove": (system: System) => void;

    "system:enable": (system: System) => void;
    "system:disable": (system: System) => void;
}

type EntitySignalEventMap<T extends unknown[]> = Record<`entity:${number}:${string}`, Callback<[Entity, ...T]>>;
type ComponentSignalEventMap<T extends unknown[]> =
    Record<`component:${number}:${string}`, Callback<[Component, ...T]>>;

type SystemSignalEventMap<T extends unknown[]> = Record<`system:${number}:${string}`, Callback<[System, ...T]>>;

export type SignalEventsMap<T extends unknown[] = unknown[]> =
    EntitySignalEventMap<T> & ComponentSignalEventMap<T> & SystemSignalEventMap<T>;
