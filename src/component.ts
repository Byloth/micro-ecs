import { ReferenceException, RuntimeException } from "@byloth/core";

import type Entity from "./entity.js";

export default class Component<E extends Entity = Entity>
{
    private _entity: E | null;
    public get entity(): E | null { return this._entity; }

    public constructor()
    {
        this._entity = null;
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

    public dispose(): void
    {
        if (this._entity)
        {
            throw new RuntimeException("The component must be detached from the entity before disposing it.");
        }
    }
}
