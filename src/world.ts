import { Publisher, ReferenceException } from "@byloth/core";
import type { CallbackMap, InternalsEventsMap, SmartIterator } from "@byloth/core";

import Entity from "./entity.js";
import type Component from "./component.js";
import type System from "./system.js";
import type Resource from "./resource.js";

import WorldContext from "./contexts/world.js";
import { DependencyException } from "./exceptions.js";

import ObjectPool from "./object-pool/index.js";
import type { InitializeArgs } from "./object-pool/types.js";

import { QueryManager } from "./query/index.js";
import type { ReadonlyQueryView } from "./query/view.js";

import type { ComponentType, EntityType, Instances, ResourceType, SignalEventsMap, SystemType } from "./types.js";

type P = SignalEventsMap & InternalsEventsMap;

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export default class World<T extends CallbackMap<T> = { }>
{
    protected readonly _componentPools: Map<ComponentType, ObjectPool<Component>>;
    protected readonly _entityPools: Map<EntityType, ObjectPool<Entity>>;

    protected readonly _entities: Map<number, Entity>;

    protected readonly _resources: Map<ResourceType, Resource>;
    public get resources(): ReadonlyMap<ResourceType, Resource> { return this._resources; }

    protected readonly _systems: Map<SystemType, System>;
    protected readonly _enabledSystems: System[];
    public get systems(): ReadonlyMap<SystemType, System> { return this._systems; }

    protected readonly _contexts: Map<System, WorldContext<CallbackMap>>;
    protected readonly _dependencies: Map<Resource, Set<System>>;

    protected readonly _queryManager: QueryManager;
    protected readonly _publisher: Publisher;

    protected readonly _onContextDispose = (context: WorldContext): void =>
    {
        const system = context["_system"];

        for (const dependency of context.dependencies)
        {
            const dependants = this._dependencies.get(dependency)!;
            dependants.delete(system);

            if (dependants.size === 0) { this._dependencies.delete(dependency); }
        }

        this._contexts.delete(system);
    };

    public constructor()
    {
        this._componentPools = new Map();
        this._entityPools = new Map();

        this._entities = new Map();
        this._resources = new Map();

        this._systems = new Map();
        this._enabledSystems = [];

        this._contexts = new Map();
        this._dependencies = new Map();

        this._queryManager = new QueryManager(this._entities);
        this._publisher = new Publisher();
    }

    protected _getComponentPool<C extends Component>(Type: ComponentType<C>): ObjectPool<C>
    {
        let pool = this._componentPools.get(Type) as ObjectPool<C> | undefined;
        if (pool) { return pool; }

        pool = new ObjectPool(() => new Type());

        this._componentPools.set(Type, pool);

        return pool;
    }
    protected _getEntityPool<E extends Entity>(Type: EntityType<E>): ObjectPool<E>
    {
        let pool = this._entityPools.get(Type) as ObjectPool<E> | undefined;
        if (pool) { return pool; }

        pool = new ObjectPool(() => new Type());

        this._entityPools.set(Type, pool);

        return pool;
    }

    protected _enableEntity(entity: Entity): void
    {
        for (const component of entity["_components"].values())
        {
            if (!(component.isEnabled)) { continue; }

            this._enableEntityComponent(entity, component);
        }
    }
    protected _disableEntity(entity: Entity): void
    {
        for (const component of entity["_components"].values())
        {
            if (!(component.isEnabled)) { continue; }

            this._disableEntityComponent(entity, component);
        }
    }

    protected _enableEntityComponent(entity: Entity, component: Component): void
    {
        this._queryManager["_onEntityComponentEnable"](entity, component);
    }
    protected _disableEntityComponent(entity: Entity, component: Component): void
    {
        this._queryManager["_onEntityComponentDisable"](entity, component);
    }

    protected _enableSystem(system: System): void
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
    protected _disableSystem(system: System): void
    {
        const index = this._enabledSystems.indexOf(system);
        if (index === -1) { return; }

        this._enabledSystems.splice(index, 1);
    }

    protected _addDependency(system: System, Type: ResourceType): Resource
    {
        const dependency = this._resources.get(Type);
        if ((import.meta.env.DEV) && !(dependency))
        {
            throw new DependencyException("The dependency doesn't exist in the world.");
        }

        const dependants = this._dependencies.get(dependency!);
        if (dependants)
        {
            if ((import.meta.env.DEV) && (dependants.has(system)))
            {
                throw new DependencyException("The dependant already depends on this resource.");
            }

            dependants.add(system);
        }
        else { this._dependencies.set(dependency!, new Set([system])); }

        return dependency!;
    }
    protected _removeDependency(system: System, Type: ResourceType): Resource
    {
        const dependency = this._resources.get(Type)!;
        const dependants = this._dependencies.get(dependency);
        if ((import.meta.env.DEV) && !(dependants?.delete(system)))
        {
            throw new DependencyException("The dependant doesn't depend on this resource.");
        }

        if (dependants!.size === 0) { this._dependencies.delete(dependency); }

        return dependency;
    }

    public createEntity<E extends Entity>(Type?: EntityType<E>, ...args: InitializeArgs<E>): E
    {
        const pool = this._getEntityPool((Type ?? Entity) as EntityType<E>);
        const entity = pool.acquire() as E;

        entity.initialize(this, ...args as InitializeArgs<Entity>);

        this._entities.set(entity.id, entity);

        if (entity.isEnabled) { this._enableEntity(entity); }
        return entity;
    }

    public hasEntity(entityId: number): boolean { return this._entities.has(entityId); }
    public getEntity<E extends Entity>(entityId: number): E
    {
        const entity = this._entities.get(entityId) as E | undefined;
        if ((import.meta.env.DEV) && !(entity))
        {
            throw new ReferenceException("The entity doesn't exist in the world.");
        }

        return entity!;
    }

    public destroyEntity(entityId: number): void;
    public destroyEntity(entity: Entity): void;
    public destroyEntity(entity: number | Entity): void
    {
        const entityId = (typeof entity === "number") ? entity : entity.id;

        const _entity = this._entities.get(entityId);
        if ((import.meta.env.DEV) && !(_entity))
        {
            throw new ReferenceException("The entity doesn't exist in the world.");
        }

        if (_entity!.isEnabled) { this._disableEntity(_entity!); }
        this._entities.delete(_entity!.id);

        try { _entity!.dispose(); }
        catch (error)
        {
            if (import.meta.env.DEV)
            {
                // eslint-disable-next-line no-console
                console.warn("An error occurred while disposing this entity.\n\nSuppressed", error);
            }
        }

        this._getEntityPool(_entity!.constructor as EntityType)
            .release(_entity!);
    }

    public getFirstComponent<C extends ComponentType, R extends InstanceType<C> = InstanceType<C>>(
        Type: C
    ): R | undefined
    {
        return this._queryManager.pickOne<C, R>(Type);
    }
    public getFirstComponents<C extends ComponentType[], R extends Instances<C> = Instances<C>>(
        ...Types: C
    ): R | undefined
    {
        return this._queryManager.findFirst<C, R>(...Types);
    }

    public findAllComponents<C extends ComponentType[], R extends Instances<C> = Instances<C>>(
        ...Types: C
    ): SmartIterator<R>
    {
        return this._queryManager.findAll<C, R>(...Types);
    }

    public getComponentView<C extends ComponentType[], R extends Instances<C> = Instances<C>>(
        ...Types: C
    ): ReadonlyQueryView<R>
    {
        return this._queryManager.getView<C, R>(...Types);
    }

    public addResource<R extends Resource>(resource: R): R
    {
        const Type = resource.constructor as ResourceType;
        if ((import.meta.env.DEV) && (this._resources.has(Type)))
        {
            throw new ReferenceException("The resource already exists in the world.");
        }

        resource.initialize(this);

        this._resources.set(Type, resource);

        return resource;
    }

    public removeResource<R extends Resource>(Type: ResourceType<R>): R;
    public removeResource<R extends Resource>(resource: R): R;
    public removeResource<R extends Resource>(resource: ResourceType<R> | R): R
    {
        const Type = (typeof resource === "function") ? resource : resource.constructor as ResourceType;

        const _resource = this._resources.get(Type) as R | undefined;

        if (import.meta.env.DEV)
        {
            if (!(_resource)) { throw new ReferenceException("The resource doesn't exist in the world."); }
            if (this._dependencies.has(_resource))
            {
                throw new DependencyException(
                    "The resource has dependants and cannot be removed. Remove them first."
                );
            }
        }

        this._resources.delete(Type);

        try { _resource!.dispose(); }
        catch (error)
        {
            if (import.meta.env.DEV)
            {
                // eslint-disable-next-line no-console
                console.warn("An error occurred while disposing this resource.\n\nSuppressed", error);
            }
        }

        return _resource!;
    }

    public addSystem<S extends System>(system: S): S
    {
        const Type = system.constructor as SystemType;
        if ((import.meta.env.DEV) && (this._systems.has(Type)))
        {
            throw new ReferenceException("The system already exists in the world.");
        }

        system.initialize(this);

        this._systems.set(Type, system);
        if (system.isEnabled) { this._enableSystem(system); }

        return system;
    }

    public removeSystem<S extends System>(Type: SystemType<S>): S;
    public removeSystem<S extends System>(system: S): S;
    public removeSystem<S extends System>(system: SystemType<S> | S): S
    {
        const Type = (typeof system === "function") ? system : system.constructor as SystemType;

        const _system = this._systems.get(Type) as S | undefined;
        if ((import.meta.env.DEV) && !(_system))
        {
            throw new ReferenceException("The system doesn't exist in the world.");
        }

        const context = this._contexts.get(_system!);
        if (context)
        {
            try { context.dispose(); }
            catch (error)
            {
                if (import.meta.env.DEV)
                {
                    // eslint-disable-next-line no-console
                    console.warn("An error occurred while disposing the context of the system.\n\nSuppressed", error);
                }
            }

            this._contexts.delete(_system!);
        }

        if (_system!.isEnabled) { this._disableSystem(_system!); }
        this._systems.delete(Type);

        try { _system!.dispose(); }
        catch (error)
        {
            if (import.meta.env.DEV)
            {
                // eslint-disable-next-line no-console
                console.warn("An error occurred while disposing this system.\n\nSuppressed", error);
            }
        }

        return _system!;
    }

    public addService<S extends System>(service: S): S
    {
        const Type = service.constructor as ResourceType & SystemType;
        if (import.meta.env.DEV)
        {
            if (this._resources.has(Type))
            {
                throw new ReferenceException("The service has already been added as a resource in the world.");
            }
            if (this._systems.has(Type))
            {
                throw new ReferenceException("The service has already been added as a system in the world.");
            }
        }

        service.initialize(this);

        this._resources.set(Type, service);
        this._systems.set(Type, service);

        if (service.isEnabled) { this._enableSystem(service); }

        return service;
    }

    public removeService<S extends System>(Type: SystemType<S>): S;
    public removeService<S extends System>(service: S): S;
    public removeService<S extends System>(service: SystemType<S> | S): S
    {
        const Type = ((typeof service === "function") ? service : service.constructor) as
            ResourceType & SystemType;

        const _service = this._systems.get(Type) as S | undefined;
        if (import.meta.env.DEV)
        {
            if (!(_service))
            {
                throw new ReferenceException("The service doesn't exist in the world as a system.");
            }
            if (!(this._resources.has(Type)))
            {
                throw new ReferenceException("The service doesn't exist in the world as a resource.");
            }
        }

        const context = this._contexts.get(_service!);
        if (context)
        {
            try { context.dispose(); }
            catch (error)
            {
                if (import.meta.env.DEV)
                {
                    // eslint-disable-next-line no-console
                    console.warn("An error occurred while disposing the context of the service.\n\nSuppressed", error);
                }
            }

            this._contexts.delete(_service!);
        }

        if (_service!.isEnabled) { this._disableSystem(_service!); }

        this._systems.delete(Type);
        this._resources.delete(Type);

        try { _service!.dispose(); }
        catch (error)
        {
            if (import.meta.env.DEV)
            {
                // eslint-disable-next-line no-console
                console.warn("An error occurred while disposing this service.\n\nSuppressed", error);
            }
        }

        return _service!;
    }

    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    public getContext<U extends CallbackMap<U> = { }>(system: System): WorldContext<U & T>
    {
        let context = this._contexts.get(system);
        if (context) { return context; }

        context = new WorldContext(system, this._publisher.createScope());
        context["_onDispose"] = this._onContextDispose;

        this._contexts.set(system, context);

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
            try
            {
                system.dispose();
            }
            catch (error)
            {
                if (import.meta.env.DEV)
                {
                    // eslint-disable-next-line no-console
                    console.warn("An error occurred while disposing a system of the world.\n\nSuppressed", error);
                }
            }
        }

        this._systems.clear();
        this._enabledSystems.length = 0;

        for (const resource of this._resources.values())
        {
            try
            {
                resource.dispose();
            }
            catch (error)
            {
                if (import.meta.env.DEV)
                {
                    // eslint-disable-next-line no-console
                    console.warn("An error occurred while disposing a resource of the world.\n\nSuppressed", error);
                }
            }
        }

        this._resources.clear();

        for (const entity of this._entities.values())
        {
            try { entity.dispose(); }
            catch (error)
            {
                if (import.meta.env.DEV)
                {
                    // eslint-disable-next-line no-console
                    console.warn("An error occurred while disposing an entity of the world.\n\nSuppressed", error);
                }
            }

            this._getEntityPool(entity.constructor as EntityType)
                .release(entity);
        }

        this._entities.clear();

        for (const context of this._contexts.values())
        {
            try { context.dispose(); }
            catch (error)
            {
                if (import.meta.env.DEV)
                {
                    // eslint-disable-next-line no-console
                    console.warn("An error occurred while disposing a context of the world.\n\nSuppressed", error);
                }
            }
        }

        this._contexts.clear();
        this._publisher.clear();

        this._entityPools.clear();
        this._componentPools.clear();
    }
}
