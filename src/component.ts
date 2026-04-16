import { ReferenceException, RuntimeException } from "@byloth/core";

import type Entity from "./entity.js";
import type Poolable from "./object-pool/types.js";

export default class Component<E extends Entity = Entity> implements Poolable<E>
{
    // eslint-disable-next-line camelcase
    private static __μECS_NextId__ = 0;

    // eslint-disable-next-line camelcase
    private static __μECS_TypeId__ = 0;

    public static get Id(): number
    {
        if (!(Object.hasOwn(this, "__μECS_TypeId__")))
        {
            this["__μECS_TypeId__"] = (Component["__μECS_NextId__"] += 1);
        }

        return this["__μECS_TypeId__"];
    }

    protected _entity: E | null;
    public get entity(): E { return this._entity!; }

    protected _isEnabled: boolean;
    public get isEnabled(): boolean { return this._isEnabled; }

    public constructor()
    {
        this._entity = null;
        this._isEnabled = false;
    }

    public initialize(entity: E, ...args: unknown[]): void
    {
        if ((import.meta.env.DEV) && (this._entity))
        {
            throw new ReferenceException("The component is already attached to an entity.");
        }

        this._entity = entity;
        this._isEnabled = true;
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

    public dispose(): void
    {
        if ((import.meta.env.DEV) && !(this._entity))
        {
            throw new ReferenceException("The component isn't attached to any entity.");
        }

        this._entity = null;
        this._isEnabled = false;
    }
}
