import { Publisher } from "@byloth/core";
import type { Callback } from "@byloth/core";

import type Entity from "./entity.js";
import type Component from "./component.js";

interface QueryViewEventsMap<C extends Component[]>
{
    "add": (entity: Entity, components: C) => void;
    "remove": (entity: Entity, components: C) => void;

    "clear": () => void;
}

export interface ReadonlyQueryView<C extends Component[]>
{
    readonly entities: readonly Entity[];
    readonly components: readonly C[];

    readonly size: number;

    get(entity: Entity): C | undefined;
    has(entity: Entity): boolean;

    onAdd(callback: (entity: Entity, components: C) => void): Callback;
    onRemove(callback: (entity: Entity, components: C) => void): Callback;
    onClear(callback: () => void): Callback;
}

export default class QueryView<C extends Component[]> implements ReadonlyQueryView<C>
{
    protected readonly _indices: Map<Entity, number>;
    protected readonly _entities: Entity[];
    protected readonly _components: C[];

    protected readonly _publisher: Publisher<QueryViewEventsMap<C>>;

    public get entities(): readonly Entity[]
    {
        return this._entities;
    }
    public get components(): readonly C[]
    {
        return this._components;
    }

    public get size(): number
    {
        return this._components.length;
    }

    public constructor(iterable?: Iterable<[Entity, C]> | null)
    {
        this._indices = new Map();
        this._entities = [];
        this._components = [];

        this._publisher = new Publisher();

        if (iterable)
        {
            for (const [entity, components] of iterable) { this.set(entity, components); }
        }
    }

    public get(entity: Entity): C | undefined
    {
        const index = this._indices.get(entity);
        if (index === undefined) { return undefined; }

        return this._components[index];
    }
    public has(entity: Entity): boolean
    {
        return this._indices.has(entity);
    }
    public set(entity: Entity, components: C): this
    {
        const existingIndex = this._indices.get(entity);
        if (existingIndex !== undefined)
        {
            this._components[existingIndex] = components;

            return this;
        }

        const index = this._components.length;

        this._components.push(components);
        this._entities.push(entity);
        this._indices.set(entity, index);

        this._publisher.publish("add", entity, components);

        return this;
    }

    public delete(entity: Entity): boolean
    {
        const index = this._indices.get(entity);
        if (index === undefined) { return false; }

        const components = this._components[index];
        const lastIndex = this._components.length - 1;

        if (index !== lastIndex)
        {
            this._components[index] = this._components[lastIndex];
            this._entities[index] = this._entities[lastIndex];

            this._indices.set(this._entities[index], index);
        }

        this._components.pop();
        this._entities.pop();
        this._indices.delete(entity);

        this._publisher.publish("remove", entity, components);

        return true;
    }

    public clear(): void
    {
        const size = this._components.length;

        this._components.length = 0;
        this._entities.length = 0;
        this._indices.clear();

        if (size > 0) { this._publisher.publish("clear"); }
    }

    public onAdd(callback: (entity: Entity, components: C) => void): Callback
    {
        return this._publisher.subscribe("add", callback);
    }
    public onRemove(callback: (entity: Entity, components: C) => void): Callback
    {
        return this._publisher.subscribe("remove", callback);
    }

    public onClear(callback: () => void): Callback
    {
        return this._publisher.subscribe("clear", callback);
    }
}
