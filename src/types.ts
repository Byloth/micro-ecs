import type { Constructor } from "@byloth/core";
import type Component from "./component.js";

export type Instances<T extends Constructor[]> = T extends [infer F, ...infer R] ?
    [InstanceType<F extends Constructor ? F : never>, ...Instances<R extends Constructor[] ? R : []>] : [];

export interface HiddenProps<T extends object = object> extends Constructor<T>
{
    __μECS_component__: true;
    __μECS_inherits__: Constructor<Component>[]
    __μECS_hierarchy__?: Constructor<Component>[];
}

export type Inherits<T extends Constructor<Component>[]> =
    T extends [infer F, ...infer R] ?

        // eslint-disable-next-line @typescript-eslint/no-empty-object-type
        (F extends Constructor<infer C> ? C : never) & Inherits<R extends Constructor<Component>[] ? R : []> : { };
