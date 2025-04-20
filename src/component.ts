import type Entity from "./entity.js";

export default class Component<E extends Entity = Entity>
{
    private _entity: E | null;
    public get entity(): E { throw new Error(); }

    public constructor()
    {
        this._entity = null;
    }

    public onAttach(entity: E): void
    {
        if (this._entity) { throw new Error(); }
        this._entity = entity;

        Object.defineProperty(this, "entity", { get: () => this._entity!, configurable: true });
    }
    public onDetach(): void
    {
        if (!(this._entity)) { throw new Error(); }
        this._entity = null;

        Object.defineProperty(this, "entity", { get: () => { throw new Error(); }, configurable: true });
    }

    public dispose(): void
    {
        if (!(this._entity)) { return; }
        this._entity = null;

        Object.defineProperty(this, "entity", { get: () => { throw new Error(); }, configurable: true });
    }
}
