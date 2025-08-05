import { ReferenceException, RuntimeException } from "@byloth/core";
import type { Constructor } from "@byloth/core";

import μObject from "./core.js";
import type Component from "./component.js";
import EntityContext from "./contexts/entity.js";
import { AdoptionException, AttachmentException, DependencyException } from "./exceptions.js";
import type World from "./world.js";

export default class Entity<W extends World = World> extends μObject
{
    private _enabled: boolean;
    public get enabled(): boolean { return (this._enabled && (this._parent ? this._parent.enabled : true)); }

    private readonly _components: Map<Constructor<Component>, Component>;
    public get components(): ReadonlyMap<Constructor<Component>, Component> { return this._components; }

    private _parent: Entity | null;
    public get parent(): Entity | null { return this._parent; }

    private readonly _children: Set<Entity>;
    public get children(): ReadonlySet<Entity> { return this._children; }

    private _world: W | null;
    public get world(): W | null { return this._world; }

    private readonly _contexts: Map<Component, EntityContext>;
    private readonly _dependencies: Map<Component, Set<Component>>;

    private _onContextDispose = (context: EntityContext): void =>
    {
        const dependant = context["_component"];
        for (const dependency of context.dependencies)
        {
            const dependants = this._dependencies.get(dependency)!;
            dependants.delete(dependant);

            if (dependants.size === 0) { this._dependencies.delete(dependency); }
        }

        this._contexts.delete(dependant);
    };

    public constructor(enabled = true)
    {
        super();

        this._enabled = enabled;

        this._components = new Map();

        this._parent = null;
        this._children = new Set();

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

        if (this._world)
        {
            component.onMount(this._world);

            this._world.emit("entity:component:enable", this, component);
        }

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

        if (this._world)
        {
            _component.onUnmount();
            this._components.delete(_component.constructor as Constructor<Component>);
            _component.onDetach();

            this._world.emit("entity:component:disable", this, _component);
        }
        else
        {
            this._components.delete(_component.constructor as Constructor<Component>);
            _component.onDetach();
        }

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

    public addChild<E extends Entity>(child: E): E
    {
        if (child.parent) { throw new ReferenceException("The entity already has a parent."); }
        if (child.world) { throw new ReferenceException("The entity is already attached to a world."); }

        try
        {
            child.onAdoption(this);
        }
        catch (error)
        {
            throw new AdoptionException("It wasn't possible to adopt this entity as a child.", error);
        }

        this._children.add(child);

        this._world?.["_addEntity"](child, this.enabled);

        return child;
    }
    public removeChild<E extends Entity>(child: E): E
    {
        if (!(this._children.delete(child)))
        {
            throw new ReferenceException("The entity isn't a child of this entity.");
        }

        child.onUnadoption();

        this._world?.["_removeEntity"](child, this.enabled);

        return child;
    }

    public enable(): void
    {
        if (this._enabled) { throw new RuntimeException("The entity is already enabled."); }
        this._enabled = true;

        if (this._parent ? this._parent.enabled : true) { this._world?.["_enableEntity"](this); }
    }
    public disable(): void
    {
        if (!(this._enabled)) { throw new RuntimeException("The entity is already disabled."); }
        this._enabled = false;

        if (this._parent ? this._parent.enabled : true) { this._world?.["_disableEntity"](this); }
    }

    public onAttach(world: W): void
    {
        if (this._world) { throw new ReferenceException("The entity is already attached to a world."); }
        this._world = world;

        for (const component of this._components.values())
        {
            component.onMount(world);
        }
    }
    public onDetach(): void
    {
        if (!(this._world)) { throw new ReferenceException("The entity isn't attached to any world."); }
        this._world = null;

        for (const component of this._components.values())
        {
            component.onUnmount();
        }
    }

    public onAdoption(parent: Entity): void
    {
        if (this._parent) { throw new ReferenceException("The entity is already adopted by another entity."); }
        this._parent = parent;
    }
    public onUnadoption(): void
    {
        if (!(this._parent)) { throw new ReferenceException("The entity isn't adopted by any entity."); }
        this._parent = null;
    }

    public dispose(): void
    {
        if (this._world)
        {
            throw new RuntimeException("The entity must be detached from the world before being disposed.");
        }
        if (this._parent)
        {
            throw new RuntimeException("The entity must be unadopted from its parent before being disposed.");
        }

        for (const component of this._components.values())
        {
            component.onDetach();
            component.dispose();
        }

        this._components.clear();

        for (const child of this._children)
        {
            child.onUnadoption();
            child.dispose();
        }

        this._children.clear();

        for (const context of this._contexts.values())
        {
            context.dispose();
        }

        this._contexts.clear();
        this._dependencies.clear();
    }
}
