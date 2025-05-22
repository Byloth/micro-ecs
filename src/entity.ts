import type { Constructor } from "@byloth/core";

import type Component from "./component.js";
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

    private readonly _tags: Set<string>;
    public get tags(): ReadonlySet<string> { return this._tags; }

    public constructor()
    {
        this.id = (Entity["__μECS_nextId__"] += 1);

        this._world = null;

        this._components = new Map();

        this._parent = null;
        this._children = new Set();

        this._tags = new Set();
    }

    public addComponent(component: Component): this
    {
        const type = component.constructor as Constructor<Component>;
        if (this._components.has(type)) { throw new Error(); }

        try
        {
            component.onAttach(this);
        }
        catch
        {
            // TODO!
            // console.error("Failed to attach component:", error);

            throw new Error();
        }

        this._components.set(type, component);

        if (this._world) { this._world.publish("entity:component:add", this, component); }

        return this;
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
        if (!(component)) { throw new Error(); }

        this._components.delete(type);

        component.onDetach();

        if (this._world) { this._world.publish("entity:component:remove", this, component); }

        return component;
    }

    public addChild(child: Entity): this
    {
        try
        {
            child.onAdoption(this);
        }
        catch
        {
            // TODO!
            // console.error("Failed to adopt child:", error);

            throw new Error();
        }

        this._children.add(child);

        if (this._world) { this._world.publish("entity:child:add", this, child); }

        return this;
    }
    public removeChild(child: Entity): this
    {
        if (!(this._children.delete(child))) { throw new Error(); }

        child.onUnadoption();

        if (this._world) { this._world.publish("entity:child:remove", this, child); }

        return this;
    }

    public addTag(tag: string): this
    {
        if (this._tags.has(tag)) { throw new Error(); }
        this._tags.add(tag);

        if (this._world) { this._world.publish("entity:tag:add", this, tag); }

        return this;
    }
    public hasTag(tag: string): boolean
    {
        return this._tags.has(tag);
    }
    public removeTag(tag: string): this
    {
        if (!(this._tags.delete(tag))) { throw new Error(); }
        if (this._world) { this._world.publish("entity:tag:remove", this, tag); }

        return this;
    }

    public onAttach(world: W): void
    {
        if (this._world) { throw new Error(); }
        this._world = world;
    }
    public onDetach(): void
    {
        if (!(this._world)) { throw new Error(); }
        this._world = null;
    }

    public onAdoption(parent: Entity): void
    {
        if (this._parent) { throw new Error(); }
        this._parent = parent;
    }
    public onUnadoption(): void
    {
        if (!(this._parent)) { throw new Error(); }
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

        this._tags.clear();
    }
}
