import type { Callback, Constructor } from "@byloth/core";

import type Entity from "./entity.js";
import type Component from "./component.js";
import type System from "./system.js";

export interface __World__
{
    _enabledSystems: System[];

    _addEntity(parent: Entity): void;
    _removeEntity(parent: Entity): void;

    _enableEntity(entity: Entity): void;
    _disableEntity(entity: Entity): void;

    _enableComponent(component: Component): void;
    _disableComponent(component: Component): void;

    _enableSystem(system: System): void;
    _disableSystem(system: System): void;
}

export type Instances<T extends Constructor[]> = T extends [infer F, ...infer R] ?
    [InstanceType<F extends Constructor ? F : never>, ...Instances<R extends Constructor[] ? R : []>] : [];

export interface WorldEventsMap
{
    "entity:component:enable": (entity: Entity, component: Component) => void;
    "entity:component:disable": (entity: Entity, component: Component) => void;
}

type EntitySignalEventMap<T extends unknown[]> = Record<`entity:${number}:${string}`, Callback<[Entity, ...T]>>;
type ComponentSignalEventMap<T extends unknown[]> =
    Record<`component:${number}:${string}`, Callback<[Component, ...T]>>;

type SystemSignalEventMap<T extends unknown[]> = Record<`system:${number}:${string}`, Callback<[System, ...T]>>;

export type SignalEventsMap<T extends unknown[] = unknown[]> =
    EntitySignalEventMap<T> & ComponentSignalEventMap<T> & SystemSignalEventMap<T>;
