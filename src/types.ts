import type { Constructor } from "@byloth/core";

export interface Disposable
{
    dispose(): void;
}

export type Instances<T extends Constructor[]> = T extends [infer F, ...infer R] ?
    [InstanceType<F extends Constructor ? F : never>, ...Instances<R extends Constructor[] ? R : []>] : [];
