import type { Callback, CallbackMap, InternalsEventsMap, Publisher, WildcardEventsMap } from "@byloth/core";

import type { SignalEventsMap, WorldEventsMap } from "./types.js";

type W = WorldEventsMap & SignalEventsMap;
type P = W & InternalsEventsMap;
type S = W & WildcardEventsMap & InternalsEventsMap;

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export default class Context<T extends CallbackMap<T> = { }>
{
    private readonly _publisher: Publisher;

    public constructor(publisher: Publisher)
    {
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
            this._publisher.unsubscribe(event, callback);

            return callback(...args);
        };

        return this._publisher.subscribe(event, _callback);
    }
    public off<K extends keyof T>(event: K & string, callback: T[K]): void;
    public off<K extends keyof S>(event: K & string, callback: S[K]): void;
    public off(event: string, callback: Callback<unknown[], unknown>): void
    {
        this._publisher.unsubscribe(event, callback);
    }

    public dispose(): void
    {
        this._publisher.clear();
    }
}
