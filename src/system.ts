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
    public get world(): W { throw new Error(); }

    public constructor(priority = 0)
    {
        this.priority = priority;

        this._enabled = true;
        this._world = null;
    }

    public enable(): void
    {
        if (this._enabled) { throw new Error(); }
        this._enabled = true;

        if (this._world) { this._world.publish("system:enable", this); }
    }

    public disable(): void
    {
        if (!(this._enabled)) { throw new Error(); }
        this._enabled = false;

        if (this._world) { this._world.publish("system:disable", this); }
    }

    public onAttach(world: W): void
    {
        if (this._world) { throw new Error(); }
        this._world = world;

        Object.defineProperty(this, "world", { get: () => this._world!, configurable: true });
    }
    public onDetach(): void
    {
        if (!(this._world)) { throw new Error(); }
        this._world = null;

        Object.defineProperty(this, "world", { get: () => { throw new Error(); }, configurable: true });
    }

    public update(deltaTime: number): void { /* ... */ }
    public dispose(): void
    {
        if (!(this._world)) { return; }
        this._world = null;

        Object.defineProperty(this, "world", { get: () => { throw new Error(); }, configurable: true });
    }
}
