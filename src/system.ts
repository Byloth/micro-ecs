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

    private _enabled: boolean;
    public get enabled(): boolean { return this._enabled; }

    private _world: W | null;
    public get world(): W | null { return this._world; }

    public constructor(priority = 0, enabled = true)
    {
        super();

        this.priority = priority;

        this._enabled = enabled;
        this._world = null;
    }

    public enable(): void
    {
        if (this._enabled) { throw new RuntimeException("The system is already enabled."); }
        this._enabled = true;

        // @ts-expect-error - The method exists and is correct.
        this._world?._enableSystem(this);
    }
    public disable(): void
    {
        if (!(this._enabled)) { throw new RuntimeException("The system is already disabled."); }
        this._enabled = false;

        // @ts-expect-error - The method exists and is correct.
        this._world?._disableSystem(this);
    }

    public onAttach(world: W): void
    {
        if (this._world) { throw new ReferenceException("The system is already attached to a world."); }
        this._world = world;
    }
    public onDetach(): void
    {
        if (!(this._world)) { throw new ReferenceException("The system isn't attached to any world."); }
        this._world = null;
    }

    public update(deltaTime: number): void { /* ... */ }

    public dispose(): void
    {
        if (this._world)
        {
            throw new RuntimeException("The system must be detached from the world before disposing it.");
        }
    }
}
