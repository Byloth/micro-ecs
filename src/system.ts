import type World from "./world.js";

export default class System<W extends World = World>
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
        this.priority = priority;

        this._enabled = enabled;
        this._world = null;
    }

    public enable(): void
    {
        if (this._enabled) { throw new Error(); }
        this._enabled = true;

        this._world?.publish("system:enable", this);
    }
    public disable(): void
    {
        if (!(this._enabled)) { throw new Error(); }
        this._enabled = false;

        this._world?.publish("system:disable", this);
    }

    public onAttach(world: W): void
    {
        if (this._world) { throw new Error(); }
        this._world = world;
    }
    public onDetach(): void
    {
        if (!(this._world)) { throw new Error(); }
        this._world = null;
    }

    public update(deltaTime: number): void { /* ... */ }
    public dispose(): void
    {
        if (!(this._world)) { return; }
        this._world = null;
    }
}
