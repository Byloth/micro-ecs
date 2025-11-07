import { TimedPromise } from "@byloth/core";
import type {
    Callback,
    CallbackMap,
    Constructor,
    InternalsEventsMap,
    PromiseResolver,
    Publisher,
    WildcardEventsMap

} from "@byloth/core";

import type System from "../system.js";
import type Resource from "../resource.js";
import type World from "../world.js";
import type { SignalEventsMap } from "../types.js";

type P = SignalEventsMap & InternalsEventsMap;
type S = P & WildcardEventsMap;

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export default class WorldContext<T extends CallbackMap<T> = { }>
{
    private get _world(): World { return this._system.world!; }

    private readonly _system: System;
    private readonly _publisher: Publisher;

    private readonly _dependencies: Set<Resource>;
    public get dependencies(): ReadonlySet<Resource> { return this._dependencies; }

    private _onDispose?: (context: WorldContext) => void;

    public constructor(system: System, publisher: Publisher)
    {
        this._system = system;
        this._publisher = publisher;

        this._dependencies = new Set();
    }

    public emit<K extends keyof T>(event: K & string, ...args: Parameters<T[K]>): ReturnType<T[K]>[];
    public emit<K extends keyof P>(event: K & string, ...args: Parameters<P[K]>): ReturnType<P[K]>[];
    public emit(event: string, ...args: unknown[]): unknown[]
    {
        return this._publisher.publish(event, ...args);
    }

    public on<K extends keyof T>(event: K & string, callback: T[K]): Callback;
    public on<K extends keyof S>(event: K & string, callback: S[K]): Callback;
    public on(event: string, callback: Callback<unknown[], unknown>): Callback
    {
        return this._publisher.subscribe(event, callback);
    }

    public once<K extends keyof T>(event: K & string, callback: T[K]): Callback;
    public once<K extends keyof S>(event: K & string, callback: S[K]): Callback;
    public once(event: string, callback: Callback<unknown[], unknown>): Callback
    {
        const _callback = (...args: unknown[]): unknown =>
        {
            this._publisher.unsubscribe(event, _callback);

            return callback(...args);
        };

        return this._publisher.subscribe(event, _callback);
    }
    public async wait<K extends keyof T>(event: K & string, timeout?: number): Promise<Parameters<T[K]>>;
    public async wait<K extends keyof S>(event: K & string, timeout?: number): Promise<Parameters<S[K]>>;
    public async wait(event: string, timeout?: number): Promise<unknown[]>
    {
        let _callback: Callback<unknown[]>;

        const executor = (resolve: PromiseResolver<unknown[]>) =>
        {
            _callback = (...args) => { resolve(args); };

            this._publisher.subscribe(event, _callback);
        };

        try
        {
            if (timeout) { return await new TimedPromise(executor, timeout); }

            return await new Promise(executor);
        }
        finally
        {
            this._publisher.unsubscribe(event, _callback!);
        }
    }

    public off<K extends keyof T>(event: K & string, callback: T[K]): void;
    public off<K extends keyof S>(event: K & string, callback: S[K]): void;
    public off(event: string, callback: Callback<unknown[], unknown>): void
    {
        this._publisher.unsubscribe(event, callback);
    }

    public useResource<R extends Resource>(type: Constructor<R>): R
    {
        const dependency = this._world["_addDependency"](this._system, type);
        this._dependencies.add(dependency);

        return dependency as R;
    }

    public releaseResource<R extends Resource>(type: Constructor<R>): void;
    public releaseResource<R extends Resource>(resource: R): void;
    public releaseResource<R extends Resource>(resource: Constructor<R> | R): void
    {
        const type = (typeof resource === "function") ? resource : resource.constructor as Constructor<Resource>;

        const dependency = this._world["_removeDependency"](this._system, type);
        this._dependencies.delete(dependency);
    }

    public dispose(): void
    {
        if (this._onDispose)
        {
            this._onDispose(this);
            this._onDispose = undefined;
        }

        this._dependencies.clear();
        this._publisher.clear();
    }
}
