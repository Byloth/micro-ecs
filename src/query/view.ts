import { EventEmitter, ReferenceException } from "@byloth/core";
import type { Callback } from "@byloth/core";

import type Entity from "../entity.js";
import type Component from "../component.js";

interface QueryViewEventsMap<C extends Component[]>
{
    "add": (entity: Entity, components: C, index: number) => void;
    "remove": (entity: Entity, components: C, index: number) => void;

    "clear": () => void;
}

export interface ReadonlyQueryView<C extends Component[]>
{
    readonly isDisposed: boolean;

    readonly entities: readonly Entity[];
    readonly components: readonly C[];

    readonly size: number;

    get(entity: Entity): C | undefined;
    has(entity: Entity): boolean;

    [Symbol.iterator](): Iterator<[Entity, C]>;

    onAdd(callback: (entity: Entity, components: C, index: number) => void): Callback;
    onRemove(callback: (entity: Entity, components: C, index: number) => void): Callback;
    onClear(callback: () => void): Callback;
}

export default class QueryView<C extends Component[]> implements ReadonlyQueryView<C>
{
    protected _isDisposed: boolean;
    public get isDisposed(): boolean { return this._isDisposed; }

    protected readonly _indexes: Map<Entity, number>;

    protected readonly _entities: Entity[];
    public get entities(): readonly Entity[] { return this._entities; }

    protected readonly _components: C[];
    public get components(): readonly C[] { return this._components; }

    public get size(): number { return this._components.length; }

    protected readonly _emitter: EventEmitter<QueryViewEventsMap<C>>;

    public constructor(iterable?: Iterable<[Entity, C]> | null)
    {
        this._isDisposed = false;

        this._indexes = new Map();
        this._entities = [];
        this._components = [];

        this._emitter = new EventEmitter();

        if (iterable)
        {
            for (const [entity, components] of iterable) { this.set(entity, components); }
        }
    }

    public get(entity: Entity): C | undefined
    {
        const index = this._indexes.get(entity);
        if (index === undefined) { return undefined; }

        return this._components[index];
    }
    public has(entity: Entity): boolean
    {
        return this._indexes.has(entity);
    }
    public set(entity: Entity, components: C): this
    {
        if ((import.meta.env.DEV) && (this._indexes.has(entity)))
        {
            throw new ReferenceException("The entity already exists in the view.");
        }

        const index = this.size;

        this._components.push(components);
        this._entities.push(entity);
        this._indexes.set(entity, index);

        this._emitter.emit("add", entity, components, index);

        return this;
    }

    public delete(entity: Entity): boolean
    {
        const index = this._indexes.get(entity);
        if (index === undefined) { return false; }

        const components = this._components[index];

        const lastComponent = this._components.pop()!;
        const lastEntity = this._entities.pop()!;

        if (index < this._components.length)
        {
            this._components[index] = lastComponent;
            this._entities[index] = lastEntity;

            this._indexes.set(lastEntity, index);
        }

        this._indexes.delete(entity);
        this._emitter.emit("remove", entity, components, index);

        return true;
    }

    public clear(): void
    {
        const { size } = this;

        this._components.length = 0;
        this._entities.length = 0;
        this._indexes.clear();

        if (size > 0) { this._emitter.emit("clear"); }
    }

    public *[Symbol.iterator](): Iterator<[Entity, C]>
    {
        for (let i = 0; i < this.size; i += 1)
        {
            yield [this._entities[i], this._components[i]];
        }
    }

    public onAdd(callback: (entity: Entity, components: C, index: number) => void): Callback
    {
        if ((import.meta.env.DEV) && (this._isDisposed))
        {
            throw new ReferenceException("The view has been disposed.");
        }

        return this._emitter.on("add", callback);
    }
    public onRemove(callback: (entity: Entity, components: C, index: number) => void): Callback
    {
        if ((import.meta.env.DEV) && (this._isDisposed))
        {
            throw new ReferenceException("The view has been disposed.");
        }

        return this._emitter.on("remove", callback);
    }

    public onClear(callback: () => void): Callback
    {
        if ((import.meta.env.DEV) && (this._isDisposed))
        {
            throw new ReferenceException("The view has been disposed.");
        }

        return this._emitter.on("clear", callback);
    }

    public dispose(): void
    {
        if ((import.meta.env.DEV) && (this._isDisposed))
        {
            throw new ReferenceException("The view has already been disposed.");
        }

        this.clear();
        this._emitter.clear();

        this._isDisposed = true;
    }
}
