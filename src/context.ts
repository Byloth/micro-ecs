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
    private readonly _subscribers: Map<string, Callback<unknown[], unknown>[]>;

    public constructor(publisher: Publisher<U>)
    {
        this._publisher = publisher;
        this._subscribers = new Map();
    }

    public subscribe<K extends keyof U>(event: K & string, subscriber: U[K])
        : () => void
    {
        const subscribers = this._subscribers.get(event) ?? [];
        subscribers.push(subscriber);

        this._subscribers.set(event, subscribers);
        this._publisher.subscribe(event, subscriber);

        return () =>
        {
            const index = subscribers.indexOf(subscriber);
            if (index < 0)
            {
                throw new ReferenceException("Unable to unsubscribe the required subscriber. " +
                    "The subscription was already unsubscribed.");
            }

            subscribers.splice(index, 1);
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

        const index = subscribers.indexOf(subscriber);
        if (index < 0)
        {
            throw new ReferenceException("Unable to unsubscribe the required subscriber. " +
                "The subscription was already unsubscribed or was never subscribed.");
        }

        subscribers.splice(index, 1);
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
