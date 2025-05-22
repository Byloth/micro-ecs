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
        if (this._entity) { throw new Error(); }
        this._entity = entity;
    }
    public onDetach(): void
    {
        if (!(this._entity)) { throw new Error(); }
        this._entity = null;
    }

    public dispose(): void
    {
        if (!(this._entity)) { return; }
        this._entity = null;
    }
}
