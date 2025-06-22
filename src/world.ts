import { Publisher, ReferenceException } from "@byloth/core";
import type { CallbackMap, Constructor, InternalsEventsMap, ReadonlyMapView, SmartIterator } from "@byloth/core";

import type Entity from "./entity.js";
import type Component from "./component.js";
import System from "./system.js";

import QueryManager from "./query-manager.js";
import type { Instances, SignalEventsMap, WorldEventsMap } from "./types.js";
import { AttachmentException } from "./exceptions.js";
import Context from "./context.js";

type W = WorldEventsMap & SignalEventsMap;
type P = W & InternalsEventsMap;

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export default class World<T extends CallbackMap<T> = { }>
{
    private readonly _entities: Map<number, Entity>;
    public get entities(): ReadonlyMap<number, Entity> { return this._entities; }

    private readonly _systems: System[];
    private readonly _enabledSystems: System[];
    public get systems(): readonly System[] { return this._systems; }

    private readonly _publisher: Publisher;
    private readonly _contexts: Map<System, Context<CallbackMap>>;

    private readonly _queryManager: QueryManager;

    public constructor()
    {
        this._entities = new Map();

        this._systems = [];
        this._enabledSystems = [];

        this._publisher = new Publisher();
        this._contexts = new Map();

        this._queryManager = new QueryManager(this._entities, this._publisher);
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

    protected _addChildEntity<E extends Entity>(parent: Entity, child: E): void
    {
        this.addEntity(child);

        this._publisher.publish("entity:child:add", parent, child);
    }
    protected _removeChildEntity(parent: Entity, child: Entity): void
    {
        this.removeEntity(child.id);

        this._publisher.publish("entity:child:remove", parent, child);
    }

    protected _enableSystem(system: System): void
    {
        this._insertSystem(this._enabledSystems, system);

        this._publisher.publish("system:enable", system);
    }
    protected _disableSystem(system: System): void
    {
        this._removeSystem(this._enabledSystems, system);

        this._publisher.publish("system:disable", system);
    }

    public addEntity<E extends Entity>(entity: E): E
    {
        try
        {
            entity.onAttach(this);
        }
        catch (error)
        {
            throw new AttachmentException("It wasn't possible to attach this entity to the world.", error);
        }

        this._entities.set(entity.id, entity);

        for (const component of entity.components.values())
        {
            this._publisher.publish("entity:component:add", entity, component);
        }

        for (const child of entity.children.values())
        {
            this._addChildEntity(entity, child);
        }

        return entity;
    }
    public removeEntity(entityId: number): Entity
    {
        const entity = this._entities.get(entityId);
        if (!(entity)) { throw new ReferenceException(`The entity with ID ${entityId} doesn't exist.`); }

        for (const child of entity.children.values())
        {
            this._removeChildEntity(entity, child);
        }

        for (const component of entity.components.values())
        {
            this._publisher.publish("entity:component:remove", entity, component);
        }

        this._entities.delete(entityId);
        entity.onDetach();

        return entity;
    }

    public getComponent<C extends Constructor<Component>, R extends InstanceType<C> = InstanceType<C>>(type: C)
        : R | undefined
    {
        return this._queryManager.pickOne<C, R>(type);
    }
    public getComponents<C extends Constructor<Component>[], R extends Instances<C> = Instances<C>>(...types: C)
        : R | undefined
    {
        return this._queryManager.findFirst<C, R>(...types);
    }

    public findComponents<C extends Constructor<Component>[], R extends Instances<C> = Instances<C>>(...types: C)
        : SmartIterator<R>
    {
        return this._queryManager.findAll<C, R>(...types);
    }

    public getComponentView<C extends Constructor<Component>[], R extends Instances<C> = Instances<C>>(...types: C)
        : ReadonlyMapView<Entity, R>
    {
        return this._queryManager.getView<C, R>(...types);
    }

    public addSystem<S extends System>(system: S): S
    {
        try
        {
            system.onAttach(this);
        }
        catch (error)
        {
            throw new AttachmentException("It wasn't possible to attach this system to the world.", error);
        }

        this._insertSystem(this._systems, system);
        if (system.enabled) { this._insertSystem(this._enabledSystems, system); }

        this._publisher.publish("system:add", system);

        return system;
    }
    public removeSystem(system: System): this
    {
        if (this._removeSystem(this._systems, system) === -1)
        {
            throw new ReferenceException("The system doesn't exist in the world.");
        }

        this._removeSystem(this._enabledSystems, system);

        system.onDetach();

        const context = this._contexts.get(system);
        if (context)
        {
            context.dispose();

            this._contexts.delete(system);
        }

        this._publisher.publish("system:remove", system);

        return this;
    }

    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    public getContext<U extends CallbackMap<U> = { }>(instance: System): Context<U & T>
    {
        let context = this._contexts.get(instance);
        if (context) { return context; }

        const scope = this._publisher.createScope();
        context = new Context(scope);

        this._contexts.set(instance, context);

        return context;
    }

    public emit<K extends keyof T>(event: K & string, ...args: Parameters<T[K]>): ReturnType<T[K]>[];
    public emit<K extends keyof P>(event: K & string, ...args: Parameters<P[K]>): ReturnType<P[K]>[];
    public emit(event: string, ...args: unknown[]): unknown[]
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
        this._queryManager.dispose();

        for (const system of this._systems)
        {
            system.onDetach();
            system.dispose();
        }

        this._systems.length = 0;
        this._enabledSystems.length = 0;

        for (const entity of this._entities.values())
        {
            if (entity.parent) { continue; }

            entity.onDetach();
            entity.dispose();
        }

        this._entities.clear();

        for (const context of this._contexts.values())
        {
            context.dispose();
        }

        this._contexts.clear();
        this._publisher.clear();
    }
}
