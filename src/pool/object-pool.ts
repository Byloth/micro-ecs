import { RuntimeException } from "@byloth/core";

export default class ObjectPool<T>
{
    protected readonly _factory: () => T;

    protected readonly _maxSize: number;
    protected readonly _items: T[];

    public get available(): number { return this._items.length; }

    public constructor(factory: () => T, maxSize = 256)
    {
        this._factory = factory;

        this._maxSize = maxSize;
        this._items = [];
    }

    public acquire(): T
    {
        if (this._items.length > 0) { return this._items.pop()!; }

        return this._factory();
    }
    public release(item: T): void
    {
        if (this._items.length >= this._maxSize) { return; }

        if ((import.meta.env.DEV) && (this._items.includes(item)))
        {
            throw new RuntimeException("The item has already been released to this pool.");
        }

        this._items.push(item);
    }

    public preallocate(count: number): void
    {
        const remaining = Math.min(count, this._maxSize - this._items.length);
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
