import { ReferenceException, RuntimeException } from "@byloth/core";
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

    public async addComponent<C extends Component>(component: C): Promise<C>
    {
        const type = component.constructor as Constructor<Component>;
        if (this._components.has(type)) { throw new ReferenceException("The entity already has this component."); }

        try
        {
            await component.onAttach(this);
        }
        catch (error)
        {
            throw new AttachmentException("It wasn't possible to attach this component to the entity.", error);
        }

        this._components.set(type, component);

        if (this._world)
        {
            await component.onMount();

            this._world.publish("entity:component:add", this, component);
        }

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

        if (this._world)
        {
            component.onUnmount();
            this._components.delete(type);
            component.onDetach();

            this._world.publish("entity:component:remove", this, component);
        }
        else
        {
            this._components.delete(type);
            component.onDetach();
        }

        return component;
    }

    public async addChild<E extends Entity>(child: E): Promise<E>
    {
        try
        {
            await child.onAdoption(this);
        }
        catch (error)
        {
            throw new AdoptionException("It wasn't possible to adopt this entity as a child.", error);
        }

        this._children.add(child);

        if (this._world)
        {
            // @ts-expect-error - The method exists and is correct.
            await this._world._addChildEntity(this, child);
        }

        return child;
    }
    public removeChild(child: Entity): this
    {
        if (!(this._children.delete(child)))
        {
            throw new ReferenceException("The entity isn't a child of this entity.");
        }

        child.onUnadoption();

        if (this._world)
        {
            // @ts-expect-error - The method exists and is correct.
            this._world._removeChildEntity(this, child);
        }

        return this;
    }

    public async onAttach(world: W): Promise<void>
    {
        if (this._world) { throw new ReferenceException("The entity is already attached to a world."); }
        this._world = world;

        await Promise.all(this._components.values().map((component) => component.onMount()));
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

    public async onAdoption(parent: Entity): Promise<void>
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
    }
}
