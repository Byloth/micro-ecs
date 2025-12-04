import { ReferenceException, RuntimeException } from "@byloth/core";

import μObject from "./core.js";
import type World from "./world.js";

export default class System<W extends World = World> extends μObject
{
    public static Sort(a: System, b: System): number
    {
        return a.priority - b.priority;
    }

    public readonly priority: number;

    private _isEnabled: boolean;
    public get isEnabled(): boolean { return this._isEnabled; }

    private _world: W | null;
    public get world(): W | null { return this._world; }

    public constructor(priority = 0, enabled = true)
    {
        super();

        this.priority = priority;

        this._isEnabled = enabled;
        this._world = null;
    }

    public enable(): void
    {
        if ((import.meta.env.DEV) && (this._isEnabled))
        {
            throw new RuntimeException("The system is already enabled.");
        }

        this._isEnabled = true;
        this._world?.["_enableSystem"](this);
    }
    public disable(): void
    {
        if ((import.meta.env.DEV) && !(this._isEnabled))
        {
            throw new RuntimeException("The system is already disabled.");
        }

        this._isEnabled = false;
        this._world?.["_disableSystem"](this);
    }

    public onAttach(world: W): void
    {
        if ((import.meta.env.DEV) && (this._world))
        {
            throw new ReferenceException("The system is already attached to a world.");
        }

        this._world = world;
    }
    public onDetach(): void
    {
        if ((import.meta.env.DEV) && !(this._world))
        {
            throw new ReferenceException("The system isn't attached to any world.");
        }

        this._world = null;
    }

    public update(deltaTime: number): void { /* ... */ }

    public dispose(): void
    {
        if ((import.meta.env.DEV) && (this._world))
        {
            throw new RuntimeException("The system must be detached from the world before disposing it.");
        }
    }
}
