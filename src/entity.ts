import { ReferenceException, RuntimeException } from "@byloth/core";

import type Component from "./component.js";
import EntityContext from "./contexts/entity.js";
import { DependencyException } from "./exceptions.js";
import ObjectPool from "./pool/object-pool.js";
import type Poolable from "./pool/poolable.js";
import type { InitializeArgs } from "./pool/poolable.js";
import type { ComponentType } from "./types.js";
import type World from "./world.js";

const _componentPools = new Map<ComponentType, ObjectPool<Component>>();
const _getComponentPool = <C extends Component>(Type: ComponentType<C>): ObjectPool<C> =>
{
    let pool = _componentPools.get(Type) as ObjectPool<C> | undefined;
    if (pool) { return pool; }

    pool = new ObjectPool(() => new Type());
    _componentPools.set(Type, pool);

    return pool;
};

export default class Entity<W extends World = World> implements Poolable<W>
{
    // eslint-disable-next-line camelcase
    private static __μECS_NextId__ = 0;

    protected _id: number;
    public get id(): number { return this._id; }

    protected _world: W | null;
    public get world(): W | null { return this._world; }

    protected _isEnabled: boolean;
    public get isEnabled(): boolean { return this._isEnabled; }

    protected readonly _components: Map<ComponentType, Component>;

    protected readonly _contexts: Map<Component, EntityContext>;
    protected readonly _dependencies: Map<Component, Set<Component>>;

    protected readonly _onContextDispose = (context: EntityContext): void =>
    {
        const component = context["_component"];

        for (const dependency of context.dependencies)
        {
            const dependants = this._dependencies.get(dependency)!;
            dependants.delete(component);

            if (dependants.size === 0) { this._dependencies.delete(dependency); }
        }

        this._contexts.delete(component);
    };

    public constructor()
    {
        this._id = -1;
        this._world = null;

        this._isEnabled = false;

        this._components = new Map();

        this._contexts = new Map();
        this._dependencies = new Map();
    }

    protected _addDependency(component: Component, Type: ComponentType): Component
    {
        const dependency = this._components.get(Type);
        if ((import.meta.env.DEV) && !(dependency))
        {
            throw new DependencyException("The dependency doesn't exist in the entity.");
        }

        const dependants = this._dependencies.get(dependency!);
        if (dependants)
        {
            if ((import.meta.env.DEV) && (dependants.has(component)))
            {
                throw new DependencyException("The dependant already depends on this component.");
            }

            dependants.add(component);
        }
        else { this._dependencies.set(dependency!, new Set([component])); }

        return dependency!;
    }
    protected _removeDependency(component: Component, Type: ComponentType): Component
    {
        const dependency = this._components.get(Type)!;
        const dependants = this._dependencies.get(dependency);
        if ((import.meta.env.DEV) && !(dependants?.delete(component)))
        {
            throw new DependencyException("The dependant doesn't depend on this component.");
        }

        if (dependants!.size === 0) { this._dependencies.delete(dependency); }

        return dependency;
    }

    protected _enableComponent(component: Component): void
    {
        if (!(this._isEnabled)) { return; }

        this.world?.["_enableEntityComponent"](this, component);
    }
    protected _disableComponent(component: Component): void
    {
        if (!(this._isEnabled)) { return; }

        this.world?.["_disableEntityComponent"](this, component);
    }

    public initialize(world: W, enabled = true, ...args: unknown[]): void
    {
        if ((import.meta.env.DEV) && (this._world))
        {
            throw new ReferenceException("The entity is already attached to a world.");
        }

        this._id = (Entity["__μECS_NextId__"] += 1);
        this._world = world;

        this._isEnabled = enabled;
    }

    public createComponent<C extends Component>(Type: ComponentType<C>, ...args: InitializeArgs<C>): C
    {
        if ((import.meta.env.DEV) && (this._components.has(Type)))
        {
            throw new ReferenceException("The component already exists in the entity.");
        }

        const pool = _getComponentPool(Type);
        const component = pool.acquire() as C;

        component.initialize(this, ...args as InitializeArgs<Component>);

        this._components.set(Type, component);

        if (component.isEnabled) { this._enableComponent(component); }
        return component;
    }

    public hasComponent(Type: ComponentType): boolean { return this._components.has(Type); }
    public getComponent<C extends Component>(Type: ComponentType<C>): C
    {
        const component = this._components.get(Type) as C | undefined;
        if ((import.meta.env.DEV) && !(component))
        {
            throw new ReferenceException("The component doesn't exist in the entity.");
        }

        return component!;
    }

    public destroyComponent<C extends Component>(Type: ComponentType<C>): void;
    public destroyComponent<C extends Component>(component: C): void;
    public destroyComponent<C extends Component>(component: ComponentType<C> | C): void
    {
        const Type = (typeof component === "function") ? component : component.constructor as ComponentType<C>;

        const _component = this._components.get(Type) as C | undefined;

        if (import.meta.env.DEV)
        {
            if (!(_component)) { throw new ReferenceException("The component doesn't exist in the entity."); }
            if (this._dependencies.has(_component))
            {
                throw new DependencyException(
                    "The component has dependants and cannot be removed. Remove them first."
                );
            }
        }

        const context = this._contexts.get(_component!);
        if (context)
        {
            try { context.dispose(); }
            catch (error)
            {
                if (import.meta.env.DEV)
                {
                    // eslint-disable-next-line no-console
                    console.warn(
                        "An error occurred while disposing the context of the component.\n\nSuppressed",
                        error
                    );
                }
            }

            this._contexts.delete(_component!);
        }

        if (_component!.isEnabled) { this._disableComponent(_component!); }
        this._components.delete(Type);

        try { _component!.dispose(); }
        catch (error)
        {
            if (import.meta.env.DEV)
            {
                // eslint-disable-next-line no-console
                console.warn("An error occurred while disposing this component.\n\nSuppressed", error);
            }
        }

        _getComponentPool(_component!.constructor as ComponentType)
            .release(_component!);
    }

    public getContext(component: Component): EntityContext
    {
        let context = this._contexts.get(component);
        if (context) { return context; }

        context = new EntityContext(component);
        context["_onDispose"] = this._onContextDispose;

        this._contexts.set(component, context);

        return context;
    }

    public enable(): void
    {
        if ((import.meta.env.DEV) && (this._isEnabled))
        {
            throw new RuntimeException("The entity is already enabled.");
        }

        this._isEnabled = true;
        this.world?.["_enableEntity"](this);
    }
    public disable(): void
    {
        if ((import.meta.env.DEV) && !(this._isEnabled))
        {
            throw new RuntimeException("The entity is already disabled.");
        }

        this._isEnabled = false;
        this.world?.["_disableEntity"](this);
    }

    public dispose(): void
    {
        if ((import.meta.env.DEV) && !(this._world))
        {
            throw new ReferenceException("The entity isn't attached to any world.");
        }

        this._id = -1;
        this._world = null;

        this._isEnabled = false;

        for (const component of this._components.values())
        {
            try { component.dispose(); }
            catch (error)
            {
                if (import.meta.env.DEV)
                {
                    // eslint-disable-next-line no-console
                    console.warn("An error occurred while disposing components of the entity.\n\nSuppressed", error);
                }
            }

            _getComponentPool(component.constructor as ComponentType)
                .release(component);
        }

        this._components.clear();

        for (const context of this._contexts.values())
        {
            try { context.dispose(); }
            catch (error)
            {
                if (import.meta.env.DEV)
                {
                    // eslint-disable-next-line no-console
                    console.warn("An error occurred while disposing contexts of the entity.\n\nSuppressed", error);
                }
            }
        }

        this._contexts.clear();
        this._dependencies.clear();
    }
}
