import { ReferenceException, RuntimeException } from "@byloth/core";
import type { Constructor } from "@byloth/core";

import μObject from "./core.js";
import type Component from "./component.js";
import EntityContext from "./contexts/entity.js";
import { AttachmentException, DependencyException } from "./exceptions.js";
import type World from "./world.js";

export default class Entity<W extends World = World> extends μObject
{
    private _isEnabled: boolean;
    public get isEnabled(): boolean { return this._isEnabled; }

    private readonly _components: Map<Constructor<Component>, Component>;
    public get components(): ReadonlyMap<Constructor<Component>, Component> { return this._components; }

    private _world: W | null;
    public get world(): W | null { return this._world; }

    private readonly _contexts: Map<Component, EntityContext>;
    private readonly _dependencies: Map<Component, Set<Component>>;

    private _onContextDispose = (context: EntityContext): void =>
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

    public constructor(enabled = true)
    {
        super();

        this._isEnabled = enabled;

        this._components = new Map();

        this._world = null;

        this._contexts = new Map();
        this._dependencies = new Map();
    }

    private _addDependency(component: Component, type: Constructor<Component>): Component
    {
        const dependency = this._components.get(type);
        if (!(dependency)) { throw new DependencyException("The dependency doesn't exist in the entity."); }

        const dependants = this._dependencies.get(dependency);
        if (dependants)
        {
            if (dependants.has(component))
            {
                throw new DependencyException("The dependant already depends on this component.");
            }

            dependants.add(component);
        }
        else { this._dependencies.set(dependency, new Set([component])); }

        return dependency;
    }
    private _removeDependency(component: Component, type: Constructor<Component>): Component
    {
        const dependency = this._components.get(type)!;
        const dependants = this._dependencies.get(dependency);
        if (!(dependants?.delete(component)))
        {
            throw new DependencyException("The dependant doesn't depend on this component.");
        }

        if (dependants.size === 0) { this._dependencies.delete(dependency); }

        return dependency;
    }

    private _enableComponent(component: Component): void
    {
        if (!(this._isEnabled)) { return; }

        this._world?.["_enableEntityComponent"](this, component);
    }
    private _disableComponent(component: Component): void
    {
        if (!(this._isEnabled)) { return; }

        this._world?.["_disableEntityComponent"](this, component);
    }

    public addComponent<C extends Component>(component: C): C
    {
        const type = component.constructor as Constructor<Component>;
        if (this._components.has(type)) { throw new ReferenceException("The component already exists in the entity."); }

        try
        {
            component.onAttach(this);
        }
        catch (error)
        {
            throw new AttachmentException("It wasn't possible to attach this component to the entity.", error);
        }

        this._components.set(type, component);

        if (component.isEnabled) { this._enableComponent(component); }
        return component;
    }

    public getComponent<C extends Component>(type: Constructor<C>): C
    {
        const component = this._components.get(type) as C | undefined;
        if (!(component)) { throw new ReferenceException("The component doesn't exist in the entity."); }

        return component;
    }
    public hasComponent(type: Constructor<Component>): boolean
    {
        return this._components.has(type);
    }

    public removeComponent<C extends Component>(type: Constructor<C>): C;
    public removeComponent<C extends Component>(component: C): C;
    public removeComponent<C extends Component>(component: Constructor<C> | C): C
    {
        const type = (typeof component === "function") ? component : component.constructor as Constructor<Component>;

        const _component = this._components.get(type) as C | undefined;
        if (!(_component)) { throw new ReferenceException("The component doesn't exist in the entity."); }

        if (this._dependencies.has(_component))
        {
            throw new DependencyException(
                "The component has dependants and cannot be removed. Remove them first."
            );
        }

        const context = this._contexts.get(_component);
        if (context)
        {
            context.dispose();

            this._contexts.delete(_component);
        }

        try
        {
            _component.onDetach();
        }
        catch (error)
        {
            // eslint-disable-next-line no-console
            console.warn("An error occurred while detaching this component from the entity.\n\nSuppressed", error);
        }

        this._components.delete(_component.constructor as Constructor<Component>);

        if (_component.isEnabled) { this._disableComponent(_component); }
        return _component;
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
        if (this._isEnabled) { throw new RuntimeException("The entity is already enabled."); }
        this._isEnabled = true;

        this._world?.["_enableEntity"](this);
    }
    public disable(): void
    {
        if (!(this._isEnabled)) { throw new RuntimeException("The entity is already disabled."); }
        this._isEnabled = false;

        this._world?.["_disableEntity"](this);
    }

    public onAttach(world: W): void
    {
        if (this._world) { throw new ReferenceException("The entity is already attached to a world."); }
        this._world = world;
    }
    public onDetach(): void
    {
        if (!(this._world)) { throw new ReferenceException("The entity isn't attached to any world."); }
        this._world = null;
    }

    public dispose(): void
    {
        if (this._world)
        {
            throw new RuntimeException("The entity must be detached from the world before being disposed.");
        }

        try
        {
            for (const component of this._components.values())
            {
                component.onDetach();
                component.dispose();
            }
        }
        catch (error)
        {
            // eslint-disable-next-line no-console
            console.warn("An error occurred while disposing components of the entity.\n\nSuppressed", error);
        }

        this._components.clear();

        try
        {
            for (const context of this._contexts.values())
            {
                context.dispose();
            }
        }
        catch (error)
        {
            // eslint-disable-next-line no-console
            console.warn("An error occurred while disposing contexts of the entity.\n\nSuppressed", error);
        }

        this._contexts.clear();
        this._dependencies.clear();
    }
}
