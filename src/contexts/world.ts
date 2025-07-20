import { TimedPromise } from "@byloth/core";
import type {
    Callback,
    CallbackMap,
    InternalsEventsMap,
    PromiseResolver,
    Publisher,
    WildcardEventsMap

} from "@byloth/core";

import type System from "../system.js";
import type { SignalEventsMap, WorldEventsMap } from "../types.js";

type W = WorldEventsMap & SignalEventsMap;
type P = W & InternalsEventsMap;
type S = W & WildcardEventsMap & InternalsEventsMap;

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export default class WorldContext<T extends CallbackMap<T> = { }>
{
    private readonly _system: System;
    private readonly _publisher: Publisher;

    private _onDispose?: (context: WorldContext) => void;

    public constructor(system: System, publisher: Publisher)
    {
        this._system = system;
        this._publisher = publisher;
    }

    public emit<K extends keyof T>(event: K & string, ...args: Parameters<T[K]>): ReturnType<T[K]>[];
    public emit<K extends keyof P>(event: K & string, ...args: Parameters<P[K]>): ReturnType<P[K]>[];
    public emit(event: string, ...args: unknown[]): unknown[]
    {
        return this._publisher.publish(event, ...args);
    }

    public on<K extends keyof T>(event: K & string, callback: T[K]): () => void;
    public on<K extends keyof S>(event: K & string, callback: S[K]): () => void;
    public on(event: string, callback: Callback<unknown[], unknown>): () => void
    {
        return this._publisher.subscribe(event, callback);
    }

    public once<K extends keyof T>(event: K & string, callback: T[K]): () => void;
    public once<K extends keyof S>(event: K & string, callback: S[K]): () => void;
    public once(event: string, callback: Callback<unknown[], unknown>): () => void
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

    public dispose(): void
    {
        if (this._onDispose)
        {
            this._onDispose(this);
            this._onDispose = undefined;
        }

        this._publisher.clear();
    }
}
