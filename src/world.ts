import { Publisher, ReferenceException } from "@byloth/core";
import type { CallbackMap, Constructor, InternalsEventsMap, ReadonlyMapView, SmartIterator } from "@byloth/core";

import type Entity from "./entity.js";
import type Component from "./component.js";
import System from "./system.js";

import QueryManager from "./query-manager.js";
import type { Instances, SignalEventsMap, WorldEventsMap } from "./types.js";
import { AttachmentException, HierarchyException } from "./exceptions.js";
import Context from "./context.js";

type W = WorldEventsMap & SignalEventsMap;
type P = W & InternalsEventsMap;

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export default class World<T extends CallbackMap<T> = { }>
{
    private readonly _entities: Map<number, Entity>;
    public get entities(): ReadonlyMap<number, Entity> { return this._entities; }

    private readonly _systems: Map<Constructor<System>, System>;
    private readonly _enabledSystems: System[];
    public get systems(): ReadonlyMap<Constructor<System>, System> { return this._systems; }

    private readonly _publisher: Publisher;
    private readonly _contexts: Map<System, Context<CallbackMap>>;

    private readonly _queryManager: QueryManager;

    public constructor()
    {
        this._entities = new Map();

        this._systems = new Map();
        this._enabledSystems = [];

        this._publisher = new Publisher();
        this._contexts = new Map();

        this._queryManager = new QueryManager(this._entities, this._publisher);
    }

    private _addEntity(entity: Entity, enable = true): Entity
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
        for (const child of entity.children.values())
        {
            this._addEntity(child, entity.enabled);
        }

        if (entity["_enabled"] && enable) { this._enableEntity(entity); }

        return entity;
    }

    public _removeEntity(entity: Entity, enabled = true): Entity
    {
        if (entity["_enabled"], enabled) { this._disableEntity(entity); }

        for (const child of entity.children.values())
        {
            this._removeEntity(child, entity.enabled);
        }

        this._entities.delete(entity.id);
        entity.onDetach();

        return entity;
    }

    private _enableEntity(entity: Entity): void
    {
        for (const component of entity.components.values())
        {
            if (!(component.enabled)) { continue; }

            this._enableComponent(component);
        }

        for (const child of entity.children.values())
        {
            if (!(child.enabled)) { continue; }

            this._enableEntity(child);
        }
    }
    private _disableEntity(entity: Entity): void
    {
        for (const component of entity.components.values())
        {
            if (!(component.enabled)) { continue; }

            this._disableComponent(component);
        }

        for (const child of entity.children.values())
        {
            if (!(child.enabled)) { continue; }

            this._disableEntity(child);
        }
    }

    private _enableComponent(component: Component): void
    {
        this._publisher.publish("entity:component:enable", component.entity!, component);
    }
    private _disableComponent(component: Component): void
    {
        this._publisher.publish("entity:component:disable", component.entity!, component);
    }

    private _enableSystem(system: System): void
    {
        let left = 0;
        let right = this._enabledSystems.length;

        while (left < right)
        {
            const middle = Math.floor((left + right) / 2);
            const other = this._enabledSystems[middle];

            if (system.priority < other.priority) { right = middle; }
            else { left = middle + 1; }
        }

        this._enabledSystems.splice(left, 0, system);
    }
    private _disableSystem(system: System): void
    {
        const index = this._enabledSystems.indexOf(system);
        if (index === -1) { return; }

        this._enabledSystems.splice(index, 1);
    }

    public addEntity<E extends Entity>(entity: E): E
    {
        if (this._entities.has(entity.id)) { throw new ReferenceException("The entity already exists in the world."); }

        if (entity.parent)
        {
            throw new HierarchyException(
                "Child entities cannot be added directly to the world. Operate on the parent entity instead."
            );
        }

        this._addEntity(entity);

        return entity;
    }

    public removeEntity<E extends Entity = Entity>(entityId: number): E;
    public removeEntity<E extends Entity>(entity: E): E;
    public removeEntity<E extends Entity>(entity: number | E): E
    {
        const entityId = (typeof entity === "number") ? entity : entity.id;

        const _entity = this._entities.get(entityId) as E | undefined;
        if (!(_entity)) { throw new ReferenceException("The entity doesn't exist in the world."); }

        if (_entity.parent)
        {
            throw new HierarchyException(
                "Child entities cannot be removed directly from the world. Operate on the parent entity instead."
            );
        }

        this._removeEntity(_entity);

        return _entity;
    }

    public getFirstComponent<C extends Constructor<Component>, R extends InstanceType<C> = InstanceType<C>>(type: C)
        : R | undefined
    {
        return this._queryManager.pickOne<C, R>(type);
    }
    public getFirstComponents<C extends Constructor<Component>[], R extends Instances<C> = Instances<C>>(...types: C)
        : R | undefined
    {
        return this._queryManager.findFirst<C, R>(...types);
    }

    public findAllComponents<C extends Constructor<Component>[], R extends Instances<C> = Instances<C>>(...types: C)
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
        const type = system.constructor as Constructor<System>;
        if (this._systems.has(type)) { throw new ReferenceException("The system already exists in the world."); }

        try
        {
            system.onAttach(this);
        }
        catch (error)
        {
            throw new AttachmentException("It wasn't possible to attach this system to the world.", error);
        }

        this._systems.set(type, system);
        if (system.enabled) { this._enableSystem(system); }

        return system;
    }

    public removeSystem<S extends System>(type: Constructor<S>): S;
    public removeSystem<S extends System>(system: S): S;
    public removeSystem<S extends System>(system: Constructor<S> | S): S
    {
        const type = (typeof system === "function") ? system : system.constructor as Constructor<System>;

        const _system = this._systems.get(type) as S | undefined;
        if (!(_system)) { throw new ReferenceException("The system doesn't exist in the world."); }

        const context = this._contexts.get(_system);
        if (context)
        {
            context.dispose();

            this._contexts.delete(_system);
        }

        this._disableSystem(_system);
        this._systems.delete(_system.constructor as Constructor<System>);

        _system.onDetach();

        return _system;
    }

    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    public getContext<U extends CallbackMap<U> = { }>(instance: System): Context<U & T>
    {
        let context = this._contexts.get(instance);
        if (context) { return context; }

        const scope = this._publisher.createScope();
        context = new Context(scope);
        context.once("__internals__:clear", () => this._contexts.delete(instance));

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

        for (const system of this._systems.values())
        {
            system.onDetach();
            system.dispose();
        }

        this._systems.clear();
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
