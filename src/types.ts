import type { Callback, Constructor } from "@byloth/core";

import type Entity from "./entity.js";
import type Component from "./component.js";
import type System from "./system.js";
import type Resource from "./resource.js";

export type Instances<T extends Constructor[]> = T extends [infer F, ...infer R] ?
    [InstanceType<F extends Constructor ? F : never>, ...Instances<R extends Constructor[] ? R : []>] : [];

export type Resourceable<S extends System> = Omit<S, "update">;

type EntitySignalEventsMap<T extends unknown[]> = Record<`entity:${number}:${string}`, Callback<[Entity, ...T]>>;
type ComponentSignalEventsMap<T extends unknown[]> =
    Record<`component:${number}:${string}`, Callback<[Component, ...T]>>;

type SystemSignalEventsMap<T extends unknown[]> = Record<`system:${number}:${string}`, Callback<[System, ...T]>>;
type ResourceSignalEventsMap<T extends unknown[]> = Record<`resource:${number}:${string}`, Callback<[Resource, ...T]>>;

export type SignalEventsMap<T extends unknown[] = unknown[]> =
    EntitySignalEventsMap<T> & ComponentSignalEventsMap<T> & SystemSignalEventsMap<T> & ResourceSignalEventsMap<T>;
