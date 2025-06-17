import type { CallbackMap, Publisher } from "@byloth/core";

import type { WorldEventsMap } from "./world.js";

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export default class Context<T extends CallbackMap<T> = { }, U extends CallbackMap = T & WorldEventsMap>
{
    private readonly _publisher: Publisher<U>;

    public constructor(publisher: Publisher<U>)
    {
        this._publisher = publisher;
    }

    public emit<K extends keyof U>(event: K & string, ...args: Parameters<U[K]>): ReturnType<U[K]>[]
    {
        return this._publisher.publish(event, ...args);
    }

    public on<K extends keyof U>(event: K & string, subscriber: U[K]): () => void
    {
        return this._publisher.subscribe(event, subscriber);
    }
    public once<K extends keyof U>(event: K & string, subscriber: U[K]): () => void
    {
        const _subscriber = (...args: Parameters<U[K]>): ReturnType<U[K]> =>
        {
            this._publisher.unsubscribe(event, subscriber);

            return subscriber(...args);
        };

        return this._publisher.subscribe(event, _subscriber as U[K]);
    }
    public off<K extends keyof U>(event: K & string, subscriber: U[K]): void
    {
        this._publisher.unsubscribe(event, subscriber);
    }

    public dispose(): void
    {
        this._publisher.clear();
    }
}
