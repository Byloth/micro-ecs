import { ReferenceException, RuntimeException } from "@byloth/core";

import type Component from "./component.js";
import EntityContext from "./contexts/entity.js";
import { AttachmentException, DependencyException } from "./exceptions.js";
import Resource from "./resource.js";
import type { ComponentType } from "./types.js";
import type World from "./world.js";

export default class Entity<W extends World = World> extends Resource<W>
{
    // eslint-disable-next-line camelcase
    private static __μECS_nextId__ = 0;

    public readonly id: number;

    private _isEnabled: boolean;
    public get isEnabled(): boolean { return this._isEnabled; }

    private readonly _components: Map<ComponentType, Component>;
    public get components(): ReadonlyMap<ComponentType, Component> { return this._components; }

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

        this.id = (Entity["__μECS_nextId__"] += 1);

        this._isEnabled = enabled;

        this._components = new Map();

        this._contexts = new Map();
        this._dependencies = new Map();
    }

    private _addDependency(component: Component, type: ComponentType): Component
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
    private _removeDependency(component: Component, type: ComponentType): Component
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

    private _enableComponent(component: Component): void
    {
        if (!(this._isEnabled)) { return; }

        this.world?.["_enableEntityComponent"](this, component);
    }
    private _disableComponent(component: Component): void
    {
        if (!(this._isEnabled)) { return; }

        this.world?.["_disableEntityComponent"](this, component);
    }

    public addComponent<C extends Component>(component: C): C
    {
        const type = component.constructor as ComponentType;
        if ((import.meta.env.DEV) && (this._components.has(type)))
        {
            throw new ReferenceException("The component already exists in the entity.");
        }

        try
        {
            component.onAttach(this);
        }
        catch (error)
        {
            if (import.meta.env.DEV)
            {
                throw new AttachmentException("It wasn't possible to attach this component to the entity.", error);
            }

            throw error;
        }

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
            try
            {
                context.dispose();
            }
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

        try
        {
            _component!.onDetach();
        }
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

    public override dispose(): void
    {
        super.dispose();

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
            if (import.meta.env.DEV)
            {
                // eslint-disable-next-line no-console
                console.warn("An error occurred while disposing components of the entity.\n\nSuppressed", error);
            }
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
            if (import.meta.env.DEV)
            {
                // eslint-disable-next-line no-console
                console.warn("An error occurred while disposing contexts of the entity.\n\nSuppressed", error);
            }
        }

        this._contexts.clear();
        this._dependencies.clear();
    }
}
