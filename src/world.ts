import { Publisher } from "@byloth/core";
import type { CallbackMap, Constructor, Publishable, ReadonlyMapView, SmartIterator } from "@byloth/core";

import type Entity from "./entity.js";
import type Component from "./component.js";
import type System from "./system.js";

import QueryManager from "./query-manager.js";
import Context from "./context.js";
import type { Instances } from "./types.js";

export interface WorldEventsMap
{
    "entity:component:add": (entity: Entity, component: Component) => void;
    "entity:component:remove": (entity: Entity, component: Component) => void;

    "entity:child:add": (entity: Entity, child: Entity) => void;
    "entity:child:remove": (entity: Entity, child: Entity) => void;

    "entity:tag:add": (entity: Entity, tag: string) => void;
    "entity:tag:remove": (entity: Entity, tag: string) => void;

    "system:add": (system: System) => void;
    "system:remove": (system: System) => void;

    "system:enable": (system: System) => void;
    "system:disable": (system: System) => void;
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export default class World<T extends CallbackMap<T> = { }> implements Publishable<T & WorldEventsMap>
{
    private readonly _contexts: Map<Entity | System, Context>;
    public get contexts(): ReadonlyMap<Entity | System, Context> { return this._contexts; }

    private readonly _entities: Map<number, Entity>;
    public get entities(): ReadonlyMap<number, Entity> { return this._entities; }

    private readonly _systems: System[];
    private readonly _enabledSystems: System[];
    public get systems(): readonly System[] { return this._systems; }

    private readonly _publisher: Publisher<T & WorldEventsMap>;
    private readonly _queryManager: QueryManager;

    private readonly _onEntityChildAdd = (_: Entity, child: Entity): void => { this.addEntity(child); };
    private readonly _onEntityChildRemove = (_: Entity, child: Entity): void => { this.removeEntity(child.id); };

    public readonly _onSystemEnable = (system: System): void => { this._insertSystem(this._enabledSystems, system); };
    public readonly _onSystemDisable = (system: System): void => { this._removeSystem(this._enabledSystems, system); };

    public constructor()
    {
        this._contexts = new Map();
        this._entities = new Map();

        this._systems = [];
        this._enabledSystems = [];

        this._publisher = new Publisher();
        this._queryManager = new QueryManager(this._entities, this._publisher);

        // @ts-expect-error - Parameter type is correct.
        this._publisher.subscribe("entity:child:add", this._onEntityChildAdd);

        // @ts-expect-error - Parameters type is correct.
        this._publisher.subscribe("entity:child:remove", this._onEntityChildRemove);

        // @ts-expect-error - Parameter type is correct.
        this._publisher.subscribe("system:enable", this._onSystemEnable);

        // @ts-expect-error - Parameter type is correct.
        this._publisher.subscribe("system:disable", this._onSystemDisable);
    }

    private _insertSystem(array: System[], system: System): number
    {
        let left = 0;
        let right = array.length;

        while (left < right)
        {
            const middle = Math.floor((left + right) / 2);
            const other = array[middle];

            if (system.priority < other.priority) { right = middle; }
            else { left = middle + 1; }
        }

        array.splice(left, 0, system);

        return left;
    }
    private _removeSystem(array: System[], system: System): number
    {
        const index = array.indexOf(system);
        if (index !== -1) { array.splice(index, 1); }

        return index;
    }

    public pickFirst<C extends Constructor<Component>[], R extends Instances<C> = Instances<C>>(...types: C)
        : R | undefined
    {
        return this._queryManager.pickFirst<C, R>(...types);
    }
    public pickAll<C extends Constructor<Component>[], R extends Instances<C> = Instances<C>>(...types: C)
        : SmartIterator<R>
    {
        return this._queryManager.pickAll<C, R>(...types);
    }

    public query<C extends Constructor<Component>[], R extends Instances<C> = Instances<C>>(...types: C)
        : ReadonlyMapView<Entity, R>
    {
        return this._queryManager.query<C, R>(...types);
    }

    public addEntity(entity: Entity): this
    {
        try
        {
            entity.onAttach(this);
        }
        catch
        {
            // TODO!
            // console.error("Failed to attach entity:", error);

            throw new Error();
        }

        this._entities.set(entity.id, entity);

        entity.components.values()
            // @ts-expect-error - Parameters type is correct.
            .forEach((component) => this._publisher.publish("entity:component:add", entity, component));

        entity.children
            // @ts-expect-error - Parameters type is correct.
            .forEach((child) => this._publisher.publish("entity:child:add", entity, child));

        entity.tags
            // @ts-expect-error - Parameters type is correct.
            .forEach((tag) => this._publisher.publish("entity:tag:add", entity, tag));

        return this;
    }
    public removeEntity(entityId: number): Entity
    {
        const entity = this._entities.get(entityId);
        if (!(entity)) { throw new Error(); }

        entity.components.values()
            // @ts-expect-error - Parameters type is correct.
            .forEach((component) => this._publisher.publish("entity:component:remove", entity, component));

        entity.children
            // @ts-expect-error - Parameters type is correct.
            .forEach((child) => this._publisher.publish("entity:child:remove", entity, child));

        entity.tags
            // @ts-expect-error - Parameters type is correct.
            .forEach((tag) => this._publisher.publish("entity:tag:remove", entity, tag));

        this._entities.delete(entityId);
        entity.onDetach();

        return entity;
    }

    public addSystem(system: System): this
    {
        try
        {
            system.onAttach(this);
        }
        catch
        {
            // TODO!
            // console.error("Failed to attach system:", error);

            throw new Error();
        }

        this._insertSystem(this._systems, system);
        if (system.enabled) { this._insertSystem(this._enabledSystems, system); }

        // @ts-expect-error - Parameter type is correct.
        this._publisher.publish("system:add", system);

        return this;
    }
    public removeSystem(system: System): this
    {
        if (this._removeSystem(this._systems, system) === -1) { throw new Error(); }
        this._removeSystem(this._enabledSystems, system);

        system.onDetach();

        // @ts-expect-error - Parameter type is correct.
        this._publisher.publish("system:remove", system);

        return this;
    }

    public getContext(instance: Entity | System): Context<T>
    {
        if (this._contexts.has(instance)) { throw new Error(); }

        const context = new Context(this._publisher);
        this._contexts.set(instance, context);

        return context;
    }

    // eslint-disable-next-line space-before-function-paren
    public publish<K extends keyof (T & WorldEventsMap)>(
        event: K & string, ...args: Parameters<(T & WorldEventsMap)[K]>): ReturnType<(T & WorldEventsMap)[K]>[]
    {
        return this._publisher.publish(event, ...args);
    }

    public update(deltaTime: number): void
    {
        for (const system of this._enabledSystems)
        {
            system.update(deltaTime);
        }
    }

    public dispose(): void
    {
        this._publisher.clear();
        this._queryManager.dispose();

        for (const system of this._systems.slice()) { system.dispose(); }
        this._systems.length = 0;
        this._enabledSystems.length = 0;

        for (const entity of this._entities.values())
        {
            if (entity.parent) { continue; }
            entity.dispose();
        }

        this._entities.clear();
    }
}
