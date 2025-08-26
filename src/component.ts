import { ReferenceException, RuntimeException } from "@byloth/core";

import μObject from "./core.js";
import type Entity from "./entity.js";
import type World from "./world.js";

export default class Component<W extends World = World, E extends Entity<W> = Entity<W>> extends μObject
{
    private _isEnabled: boolean;
    public get isEnabled(): boolean { return this._isEnabled; }

    private _entity: E | null;
    public get entity(): E | null { return this._entity; }

    private _world: W | null;
    public get world(): W | null { return this._world; }

    public constructor(enabled = true)
    {
        super();

        this._isEnabled = enabled;

        this._entity = null;
        this._world = null;
    }

    public enable(): void
    {
        if (this._isEnabled) { throw new RuntimeException("The component is already enabled."); }
        this._isEnabled = true;

        this._world?.["_enableComponent"](this._entity!, this);
    }
    public disable(): void
    {
        if (!(this._isEnabled)) { throw new RuntimeException("The component is already disabled."); }
        this._isEnabled = false;

        this._world?.["_disableComponent"](this._entity!, this);
    }

    public onAttach(entity: E): void
    {
        if (this._entity) { throw new ReferenceException("The component is already attached to an entity."); }
        this._entity = entity;
    }
    public onDetach(): void
    {
        if (!(this._entity)) { throw new ReferenceException("The component isn't attached to any entity."); }
        this._entity = null;
    }

    public onMount(world: W): void
    {
        if (this._world) { throw new ReferenceException("The component is already mounted in a world."); }
        this._world = world;
    }
    public onUnmount(): void
    {
        if (!(this._world)) { throw new ReferenceException("The component isn't mounted in any world."); }
        this._world = null;
    }

    public dispose(): void
    {
        if (this._entity)
        {
            throw new RuntimeException("The component must be detached from the entity before disposing it.");
        }
    }
}
