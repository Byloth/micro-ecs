import { ReferenceException } from "@byloth/core";

import type Poolable from "./pool/poolable.js";
import type World from "./world.js";

export default class Resource<W extends World = World> implements Poolable<W>
{
    protected _world: W | null;
    public get world(): W | null { return this._world; }

    public constructor()
    {
        this._world = null;
    }

    public initialize(world: W): void
    {
        if ((import.meta.env.DEV) && (this._world))
        {
            throw new ReferenceException("The object is already attached to a world.");
        }

        this._world = world;
    }
    public dispose(): void
    {
        if ((import.meta.env.DEV) && !(this._world))
        {
            throw new ReferenceException("The object isn't attached to any world.");
        }

        this._world = null;
    }
}
