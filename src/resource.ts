import { ReferenceException, RuntimeException } from "@byloth/core";

import type World from "./world.js";

export default class Resource<W extends World = World>
{
    private _world: W | null;
    public get world(): W | null { return this._world; }

    public constructor()
    {
        this._world = null;
    }

    public onAttach(world: W): void
    {
        if ((import.meta.env.DEV) && (this._world))
        {
            throw new ReferenceException("The object is already attached to a world.");
        }

        this._world = world;
    }
    public onDetach(): void
    {
        if ((import.meta.env.DEV) && !(this._world))
        {
            throw new ReferenceException("The object isn't attached to any world.");
        }

        this._world = null;
    }

    public dispose(): void
    {
        if ((import.meta.env.DEV) && (this._world))
        {
            throw new RuntimeException("The object must be detached from the world before disposing it.");
        }
    }
}
