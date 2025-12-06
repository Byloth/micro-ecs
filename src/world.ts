import { Publisher, ReferenceException } from "@byloth/core";
import type { CallbackMap, Constructor, InternalsEventsMap, ReadonlyMapView, SmartIterator } from "@byloth/core";

import type Entity from "./entity.js";
import type Component from "./component.js";
import type System from "./system.js";
import type Resource from "./resource.js";

import WorldContext from "./contexts/world.js";
import { AttachmentException, DependencyException } from "./exceptions.js";
import QueryManager from "./query-manager.js";
import type { Instances, SignalEventsMap } from "./types.js";

type P = SignalEventsMap & InternalsEventsMap;

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export default class World<T extends CallbackMap<T> = { }>
{
    private readonly _entities: Map<number, Entity>;
    public get entities(): ReadonlyMap<number, Entity> { return this._entities; }

    private readonly _resources: Map<Constructor<Resource>, Resource>;
    public get resources(): ReadonlyMap<Constructor<Resource>, Resource> { return this._resources; }

    private readonly _systems: Map<Constructor<System>, System>;
    private readonly _enabledSystems: System[];
    public get systems(): ReadonlyMap<Constructor<System>, System> { return this._systems; }

    private readonly _contexts: Map<System, WorldContext<CallbackMap>>;
    private readonly _dependencies: Map<Resource, Set<System>>;

    private readonly _queryManager: QueryManager;
    private readonly _publisher: Publisher;

    private _onContextDispose = (context: WorldContext): void =>
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
        this._entities = new Map();
        this._resources = new Map();

        this._systems = new Map();
        this._enabledSystems = [];

        this._contexts = new Map();
        this._dependencies = new Map();

        this._queryManager = new QueryManager(this._entities);
        this._publisher = new Publisher();
    }

    private _enableEntity(entity: Entity): void
    {
        for (const component of entity.components.values())
        {
            if (!(component.isEnabled)) { continue; }

            this._enableEntityComponent(entity, component);
        }
    }
    private _disableEntity(entity: Entity): void
    {
        for (const component of entity.components.values())
        {
            if (!(component.isEnabled)) { continue; }

            this._disableEntityComponent(entity, component);
        }
    }

    private _enableEntityComponent(entity: Entity, component: Component): void
    {
        this._queryManager["_onEntityComponentEnable"](entity, component);
    }
    private _disableEntityComponent(entity: Entity, component: Component): void
    {
        this._queryManager["_onEntityComponentDisable"](entity, component);
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

    private _addDependency(system: System, type: Constructor<Resource>): Resource
    {
        const dependency = this._resources.get(type);
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
    private _removeDependency(system: System, type: Constructor<Resource>): Resource
    {
        const dependency = this._resources.get(type)!;
        const dependants = this._dependencies.get(dependency);
        if ((import.meta.env.DEV) && !(dependants?.delete(system)))
        {
            throw new DependencyException("The dependant doesn't depend on this resource.");
        }

        if (dependants!.size === 0) { this._dependencies.delete(dependency); }

        return dependency;
    }

    public addEntity<E extends Entity>(entity: E): E
    {
        if ((import.meta.env.DEV) && (this._entities.has(entity.id)))
        {
            throw new ReferenceException("The entity already exists in the world.");
        }

        try
        {
            entity.onAttach(this);
        }
        catch (error)
        {
            if (import.meta.env.DEV)
            {
                throw new AttachmentException("It wasn't possible to attach this entity to the world.", error);
            }

            throw error;
        }

        this._entities.set(entity.id, entity);

        if (entity.isEnabled) { this._enableEntity(entity); }
        return entity;
    }

    public removeEntity<E extends Entity = Entity>(entityId: number): E;
    public removeEntity<E extends Entity>(entity: E): E;
    public removeEntity<E extends Entity>(entity: number | E): E
    {
        const entityId = (typeof entity === "number") ? entity : entity.id;

        const _entity = this._entities.get(entityId) as E | undefined;
        if ((import.meta.env.DEV) && !(_entity))
        {
            throw new ReferenceException("The entity doesn't exist in the world.");
        }

        if (_entity!.isEnabled) { this._disableEntity(_entity!); }
        this._entities.delete(_entity!.id);

        try
        {
            _entity!.onDetach();
        }
        catch (error)
        {
            if (import.meta.env.DEV)
            {
                // eslint-disable-next-line no-console
                console.warn("An error occurred while detaching this entity from the world.\n\nSuppressed", error);
            }
        }

        return _entity!;
    }

    public getFirstComponent<C extends Constructor<Component>, R extends InstanceType<C> = InstanceType<C>>(
        type: C
    ): R | undefined
    {
        return this._queryManager.pickOne<C, R>(type);
    }
    public getFirstComponents<C extends Constructor<Component>[], R extends Instances<C> = Instances<C>>(
        ...types: C
    ): R | undefined
    {
        return this._queryManager.findFirst<C, R>(...types);
    }

    public findAllComponents<C extends Constructor<Component>[], R extends Instances<C> = Instances<C>>(
        ...types: C
    ): SmartIterator<R>
    {
        return this._queryManager.findAll<C, R>(...types);
    }

    public getComponentView<C extends Constructor<Component>[], R extends Instances<C> = Instances<C>>(
        ...types: C
    ): ReadonlyMapView<Entity, R>
    {
        return this._queryManager.getView<C, R>(...types);
    }

    public addResource<R extends Resource>(resource: R): R
    {
        const type = resource.constructor as Constructor<Resource>;
        if ((import.meta.env.DEV) && (this._resources.has(type)))
        {
            throw new ReferenceException("The resource already exists in the world.");
        }

        try
        {
            resource.onAttach(this);
        }
        catch (error)
        {
            if (import.meta.env.DEV)
            {
                throw new AttachmentException("It wasn't possible to attach this resource to the world.", error);
            }

            throw error;
        }

        this._resources.set(type, resource);

        return resource;
    }

    public removeResource<R extends Resource>(type: Constructor<R>): R;
    public removeResource<R extends Resource>(resource: R): R;
    public removeResource<R extends Resource>(resource: Constructor<R> | R): R
    {
        const type = (typeof resource === "function") ? resource : resource.constructor as Constructor<Resource>;

        const _resource = this._resources.get(type) as R | undefined;

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

        this._resources.delete(type);

        try
        {
            _resource!.onDetach();
        }
        catch (error)
        {
            if (import.meta.env.DEV)
            {
                // eslint-disable-next-line no-console
                console.warn("An error occurred while detaching this resource from the world.\n\nSuppressed", error);
            }
        }

        return _resource!;
    }

    public addSystem<S extends System>(system: S): S
    {
        const type = system.constructor as Constructor<System>;
        if ((import.meta.env.DEV) && (this._systems.has(type)))
        {
            throw new ReferenceException("The system already exists in the world.");
        }

        try
        {
            system.onAttach(this);
        }
        catch (error)
        {
            if (import.meta.env.DEV)
            {
                throw new AttachmentException("It wasn't possible to attach this system to the world.", error);
            }

            throw error;
        }

        this._systems.set(type, system);
        if (system.isEnabled) { this._enableSystem(system); }

        return system;
    }

    public removeSystem<S extends System>(type: Constructor<S>): S;
    public removeSystem<S extends System>(system: S): S;
    public removeSystem<S extends System>(system: Constructor<S> | S): S
    {
        const type = (typeof system === "function") ? system : system.constructor as Constructor<System>;

        const _system = this._systems.get(type) as S | undefined;
        if ((import.meta.env.DEV) && !(_system))
        {
            throw new ReferenceException("The system doesn't exist in the world.");
        }

        const context = this._contexts.get(_system!);
        if (context)
        {
            try
            {
                context.dispose();
            }
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
        this._systems.delete(type);

        try
        {
            _system!.onDetach();
        }
        catch (error)
        {
            if (import.meta.env.DEV)
            {
                // eslint-disable-next-line no-console
                console.warn("An error occurred while detaching this system from the world.\n\nSuppressed", error);
            }
        }

        return _system!;
    }

    public addService<S extends System>(service: S): S
    {
        const type = service.constructor as Constructor<Resource> & Constructor<System>;
        if (import.meta.env.DEV)
        {
            if (this._resources.has(type))
            {
                throw new ReferenceException("The service has already been added as a resource in the world.");
            }
            if (this._systems.has(type))
            {
                throw new ReferenceException("The service has already been added as a system in the world.");
            }
        }

        try
        {
            service.onAttach(this);
        }
        catch (error)
        {
            if (import.meta.env.DEV)
            {
                throw new AttachmentException("It wasn't possible to attach this service to the world.", error);
            }

            throw error;
        }

        this._resources.set(type, (service as unknown) as Resource);
        this._systems.set(type, service);

        if (service.isEnabled) { this._enableSystem(service); }

        return service;
    }

    public removeService<S extends System>(type: Constructor<S>): S;
    public removeService<S extends System>(service: S): S;
    public removeService<S extends System>(service: Constructor<S> | S): S
    {
        const type = ((typeof service === "function") ? service : service.constructor) as
            Constructor<Resource> & Constructor<System>;

        const _service = this._systems.get(type) as S | undefined;
        if (import.meta.env.DEV)
        {
            if (!(_service))
            {
                throw new ReferenceException("The service doesn't exist in the world as a system.");
            }
            if (!(this._resources.has(type)))
            {
                throw new ReferenceException("The service doesn't exist in the world as a resource.");
            }
        }

        const context = this._contexts.get(_service!);
        if (context)
        {
            try
            {
                context.dispose();
            }
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

        this._systems.delete(type);
        this._resources.delete(type);

        try
        {
            _service!.onDetach();
        }
        catch (error)
        {
            if (import.meta.env.DEV)
            {
                // eslint-disable-next-line no-console
                console.warn("An error occurred while detaching this service from the world.\n\nSuppressed", error);
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

        try
        {
            for (const system of this._systems.values())
            {
                system.onDetach();
                system.dispose();
            }
        }
        catch (error)
        {
            if (import.meta.env.DEV)
            {
                // eslint-disable-next-line no-console
                console.warn("An error occurred while disposing systems of the world.\n\nSuppressed", error);
            }
        }

        this._systems.clear();
        this._enabledSystems.length = 0;

        try
        {
            for (const resource of this._resources.values())
            {
                resource.onDetach();
                resource.dispose();
            }
        }
        catch (error)
        {
            if (import.meta.env.DEV)
            {
                // eslint-disable-next-line no-console
                console.warn("An error occurred while disposing resources of the world.\n\nSuppressed", error);
            }
        }

        this._resources.clear();

        try
        {
            for (const entity of this._entities.values())
            {
                entity.onDetach();
                entity.dispose();
            }
        }
        catch (error)
        {
            if (import.meta.env.DEV)
            {
                // eslint-disable-next-line no-console
                console.warn("An error occurred while disposing entities of the world.\n\nSuppressed", error);
            }
        }

        this._entities.clear();

        try
        {
            for (const context of this._contexts.values())
            {
                context.dispose();
            }
        }
        catch (error)
        {
            if (import.meta.env.DEV)
            {
                // eslint-disable-next-line no-console
                console.warn("An error occurred while disposing contexts of the world.\n\nSuppressed", error);
            }
        }

        this._contexts.clear();
        this._publisher.clear();
    }
}
