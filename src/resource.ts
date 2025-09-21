import { ReferenceException, RuntimeException } from "@byloth/core";

import μObject from "./core.js";
import type World from "./world.js";

export default class Resource<W extends World = World> extends μObject
{
    private _world: W | null;
    public get world(): W | null { return this._world; }

    public constructor()
    {
        super();

        this._world = null;
    }

    public onAttach(world: W): void
    {
        if (this._world) { throw new ReferenceException("The resource is already attached to a world."); }
        this._world = world;
    }
    public onDetach(): void
    {
        if (!(this._world)) { throw new ReferenceException("The resource isn't attached to any world."); }
        this._world = null;
    }

    public dispose(): void
    {
        if (this._world)
        {
            throw new RuntimeException("The resource must be detached from the world before disposing it.");
        }
    }
}
