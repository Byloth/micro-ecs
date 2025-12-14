import { RuntimeException } from "@byloth/core";

import Resource from "./resource.js";
import type World from "./world.js";

export default class System<W extends World = World> extends Resource<W>
{
    public static Sort(a: System, b: System): number
    {
        return a.priority - b.priority;
    }

    public readonly priority: number;

    private _isEnabled: boolean;
    public get isEnabled(): boolean { return this._isEnabled; }

    public constructor(priority = 0, enabled = true)
    {
        super();

        this.priority = priority;

        this._isEnabled = enabled;
    }

    public enable(): void
    {
        if ((import.meta.env.DEV) && (this._isEnabled))
        {
            throw new RuntimeException("The system is already enabled.");
        }

        this._isEnabled = true;
        this.world?.["_enableSystem"](this);
    }
    public disable(): void
    {
        if ((import.meta.env.DEV) && !(this._isEnabled))
        {
            throw new RuntimeException("The system is already disabled.");
        }

        this._isEnabled = false;
        this.world?.["_disableSystem"](this);
    }

    public update(deltaTime: number): void { /* ... */ }
}
