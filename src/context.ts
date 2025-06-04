import { ReferenceException } from "@byloth/core";
import type { Callback, CallbackMap, Publisher, Subscribable } from "@byloth/core";

import type { WorldEventsMap } from "./world.js";

export default class Context<
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    T extends CallbackMap<T> = { },
    U extends CallbackMap = T & WorldEventsMap
> implements Subscribable<U>
{
    private readonly _publisher: Publisher<U>;
    private readonly _subscribers: Map<string, Set<Callback<unknown[], unknown>>>;

    public constructor(publisher: Publisher<U>)
    {
        this._publisher = publisher;
        this._subscribers = new Map();
    }

    public subscribe<K extends keyof U>(event: K & string, subscriber: U[K])
        : () => void
    {
        if (!(this._subscribers.has(event))) { this._subscribers.set(event, new Set()); }

        const subscribers = this._subscribers.get(event)!;
        subscribers.add(subscriber);

        this._publisher.subscribe(event, subscriber);

        return () =>
        {
            if (!(subscribers.delete(subscriber)))
            {
                throw new ReferenceException("Unable to unsubscribe the required subscriber. " +
                    "The subscription was already unsubscribed.");
            }

            this._publisher.unsubscribe(event, subscriber);
        };
    }
    public unsubscribe<K extends keyof U>(event: K & string, subscriber: U[K])
        : void
    {
        const subscribers = this._subscribers.get(event);
        if (!(subscribers))
        {
            throw new ReferenceException("Unable to unsubscribe the required subscriber. " +
                "The subscription was already unsubscribed or was never subscribed.");
        }

        if (!(subscribers.delete(subscriber)))
        {
            throw new ReferenceException("Unable to unsubscribe the required subscriber. " +
                "The subscription was already unsubscribed or was never subscribed.");
        }

        this._publisher.unsubscribe(event, subscriber);
    }

    public dispose(): void
    {
        for (const [event, subscribers] of this._subscribers)
        {
            for (const subscriber of subscribers)
            {
                // @ts-expect-error - Parameter type is correct.
                this._publisher.unsubscribe(event, subscriber);
            }
        }

        this._subscribers.clear();
    }
}
