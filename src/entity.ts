import { ReferenceException } from "@byloth/core";
import type { Constructor } from "@byloth/core";

import type Component from "./component.js";
import { AdoptionException, AttachmentException } from "./exceptions.js";
import type World from "./world.js";

export default class Entity<W extends World = World>
{
    // eslint-disable-next-line camelcase
    private static __μECS_nextId__ = 0;

    public readonly id: number;

    private _world: W | null;
    public get world(): W | null { return this._world; }

    private readonly _components: Map<Constructor<Component>, Component>;
    public get components(): ReadonlyMap<Constructor<Component>, Component> { return this._components; }

    private _parent: Entity | null;
    public get parent(): Entity | null { return this._parent; }

    private readonly _children: Set<Entity>;
    public get children(): ReadonlySet<Entity> { return this._children; }

    public constructor()
    {
        this.id = (Entity["__μECS_nextId__"] += 1);

        this._world = null;

        this._components = new Map();

        this._parent = null;
        this._children = new Set();
    }

    public addComponent<C extends Component>(component: C): C
    {
        const type = component.constructor as Constructor<Component>;
        if (this._components.has(type)) { throw new ReferenceException("The entity already has this component."); }

        try
        {
            component.onAttach(this);
        }
        catch (error)
        {
            throw new AttachmentException("It wasn't possible to attach this component to the entity.", error);
        }

        this._components.set(type, component);

        if (this._world) { this._world.publish("entity:component:add", this, component); }

        return component;
    }

    public getComponent<C extends Component>(type: Constructor<C>): C | undefined
    {
        return this._components.get(type) as C | undefined;
    }
    public hasComponent<C extends Component>(type: Constructor<C>): boolean
    {
        return this._components.has(type);
    }

    public removeComponent<C extends Component>(type: Constructor<C>): C
    {
        const component = this._components.get(type) as C | undefined;
        if (!(component)) { throw new ReferenceException("The entity doesn't have this component."); }

        this._components.delete(type);

        component.onDetach();

        if (this._world) { this._world.publish("entity:component:remove", this, component); }

        return component;
    }

    public addChild<E extends Entity>(child: E): E
    {
        try
        {
            child.onAdoption(this);
        }
        catch (error)
        {
            throw new AdoptionException("It wasn't possible to adopt this entity as a child.", error);
        }

        this._children.add(child);

        if (this._world) { this._world.publish("entity:child:add", this, child); }

        return child;
    }
    public removeChild(child: Entity): this
    {
        if (!(this._children.delete(child)))
        {
            throw new ReferenceException("The entity isn't a child of this entity.");
        }

        child.onUnadoption();

        if (this._world) { this._world.publish("entity:child:remove", this, child); }

        return this;
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
        this._world = null;

        for (const component of this._components.values()) { component.dispose(); }
        this._components.clear();

        this._parent = null;

        for (const child of this._children) { child.dispose(); }
        this._children.clear();
    }
}
