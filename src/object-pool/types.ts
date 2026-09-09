type Tail<T extends unknown[]> = T extends [unknown, ...infer R] ? R : never;
export type InitializeArgs<E extends Poolable> = Tail<Parameters<E["initialize"]>>;

export interface ObjectPoolOptions<T = unknown>
{
    readonly maxSize: number;
    isReleasable(item: T): boolean;
}

export interface Poolable<T = unknown>
{
    initialize(parent: T, ...args: unknown[]): void;
    dispose(): void;
}
