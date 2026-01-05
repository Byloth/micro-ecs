import { ReferenceException, RuntimeException } from "@byloth/core";

import type Entity from "./entity.js";

export default class Component<E extends Entity = Entity>
{
    private _isEnabled: boolean;
    public get isEnabled(): boolean { return this._isEnabled; }

    private _entity: E | null;
    public get entity(): E | null { return this._entity; }

    public constructor(enabled = true)
    {
        this._isEnabled = enabled;

        this._entity = null;
    }

    public enable(): void
    {
        if ((import.meta.env.DEV) && (this._isEnabled))
        {
            throw new RuntimeException("The component is already enabled.");
        }

        this._isEnabled = true;
        this._entity?.["_enableComponent"](this);
    }
    public disable(): void
    {
        if ((import.meta.env.DEV) && !(this._isEnabled))
        {
            throw new RuntimeException("The component is already disabled.");
        }

        this._isEnabled = false;
        this._entity?.["_disableComponent"](this);
    }

    public onAttach(entity: E): void
    {
        if ((import.meta.env.DEV) && (this._entity))
        {
            throw new ReferenceException("The component is already attached to an entity.");
        }

        this._entity = entity;
    }
    public onDetach(): void
    {
        if ((import.meta.env.DEV) && !(this._entity))
        {
            throw new ReferenceException("The component isn't attached to any entity.");
        }

        this._entity = null;
    }

    public dispose(): void
    {
        if ((import.meta.env.DEV) && (this._entity))
        {
            throw new RuntimeException("The component must be detached from the entity before disposing it.");
        }
    }
}
