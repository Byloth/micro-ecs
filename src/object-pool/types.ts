type Tail<T extends unknown[]> = T extends [unknown, ...infer R] ? R : never;
export type InitializeArgs<E extends Poolable> = Tail<Parameters<E["initialize"]>>;

export interface ObjectPoolOptions
{
    readonly maxSize: number;
}

export interface Poolable<T = unknown>
{
    readonly isDisposed: boolean;

    initialize(parent: T, ...args: unknown[]): void;
    dispose(): void;
}
