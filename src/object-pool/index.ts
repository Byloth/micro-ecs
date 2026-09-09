import { RuntimeException } from "@byloth/core";
import type { ObjectPoolOptions } from "./types.js";

export default class ObjectPool<T>
{
    public static get DefaultOptions(): ObjectPoolOptions
    {
        return {
            maxSize: 256,
            isReleasable: () => true
        };
    }

    protected readonly _factory: () => T;

    protected readonly _items: T[];
    protected readonly _options: ObjectPoolOptions<T>;

    public get available(): number { return this._items.length; }

    public constructor(factory: () => T, options: Partial<ObjectPoolOptions<T>> = { })
    {
        this._factory = factory;

        this._items = [];
        this._options = { ...ObjectPool.DefaultOptions, ...options };
    }

    public acquire(): T
    {
        if (this._items.length > 0) { return this._items.pop()!; }

        return this._factory();
    }
    public release(item: T): void
    {
        if (import.meta.env.DEV)
        {
            if (!(this._options.isReleasable(item)))
            {
                throw new RuntimeException("The item isn't ready to be released to this pool.");
            }
            if (this._items.includes(item))
            {
                throw new RuntimeException("The item has already been released to this pool.");
            }
        }

        if (this._items.length >= this._options.maxSize) { return; }

        this._items.push(item);
    }

    public preallocate(count: number): void
    {
        const remaining = Math.min(count, this._options.maxSize - this._items.length);
        for (let i = 0; i < remaining; i += 1)
        {
            this._items.push(this._factory());
        }
    }

    public clear(): void
    {
        this._items.length = 0;
    }
}
