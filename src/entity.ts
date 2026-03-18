import { ReferenceException, RuntimeException } from "@byloth/core";

import type Component from "./component.js";
import EntityContext from "./contexts/entity.js";
import { DependencyException } from "./exceptions.js";
import type { ComponentType } from "./types.js";
import type World from "./world.js";
import type Poolable from "./pool/poolable.js";

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
    public get components(): ReadonlyMap<ComponentType, Component> { return this._components; }

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

    protected _addDependency(component: Component, type: ComponentType): Component
    {
        const dependency = this._components.get(type);
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
    protected _removeDependency(component: Component, type: ComponentType): Component
    {
        const dependency = this._components.get(type)!;
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

    public addComponent<C extends Component>(component: C): C
    {
        const type = component.constructor as ComponentType;
        if ((import.meta.env.DEV) && (this._components.has(type)))
        {
            throw new ReferenceException("The component already exists in the entity.");
        }

        component.onAttach(this);

        this._components.set(type, component);

        if (component.isEnabled) { this._enableComponent(component); }
        return component;
    }

    public getComponent<C extends Component>(type: ComponentType<C>): C
    {
        const component = this._components.get(type) as C | undefined;
        if ((import.meta.env.DEV) && !(component))
        {
            throw new ReferenceException("The component doesn't exist in the entity.");
        }

        return component!;
    }
    public hasComponent(type: ComponentType): boolean
    {
        return this._components.has(type);
    }

    public removeComponent<C extends Component>(type: ComponentType<C>): C;
    public removeComponent<C extends Component>(component: C): C;
    public removeComponent<C extends Component>(component: ComponentType<C> | C): C
    {
        const type = (typeof component === "function") ? component : component.constructor as ComponentType<C>;

        const _component = this._components.get(type) as C | undefined;

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
        this._components.delete(_component!.constructor as ComponentType);

        try { _component!.onDetach(); }
        catch (error)
        {
            if (import.meta.env.DEV)
            {
                // eslint-disable-next-line no-console
                console.warn("An error occurred while detaching this component from the entity.\n\nSuppressed", error);
            }
        }

        return _component!;
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
            try
            {
                component.onDetach();
                component.dispose();
            }
            catch (error)
            {
                if (import.meta.env.DEV)
                {
                    // eslint-disable-next-line no-console
                    console.warn("An error occurred while disposing components of the entity.\n\nSuppressed", error);
                }
            }
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
