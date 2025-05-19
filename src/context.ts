import type { CallbackMap, Publisher, Subscribable } from "@byloth/core";
import type { WorldEventsMap } from "./world.js";

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export default class Context<T extends CallbackMap<T> = { }> implements Subscribable<T & WorldEventsMap>
{
    private readonly _publisher: Publisher<T & WorldEventsMap>;
    private readonly _subscribers: Map<string, Set<() => void>>;

    public constructor(publisher: Publisher<T & WorldEventsMap>)
    {
        this._publisher = publisher;
        this._subscribers = new Map();
    }

    // eslint-disable-next-line space-before-function-paren
    public subscribe<K extends keyof (T & WorldEventsMap)>(event: K & string, subscriber: (T & WorldEventsMap)[K])
        : () => void
    {
        if (!(this._subscribers.has(event))) { this._subscribers.set(event, new Set([subscriber])); }
        else
        {
            const subscribers = this._subscribers.get(event)!;
            if (subscribers.has(subscriber)) { throw new Error(); }
            subscribers.add(subscriber);
        }

        this._publisher.subscribe(event, subscriber);

        return () => this.unsubscribe(event, subscriber);
    }

    // eslint-disable-next-line space-before-function-paren
    public unsubscribe<K extends keyof (T & WorldEventsMap)>(event: K & string, subscriber: (T & WorldEventsMap)[K])
        : void
    {
        const subscribers = this._subscribers.get(event);
        if (!(subscribers)) { throw new Error(); }
        if (!(subscribers.delete(subscriber))) { throw new Error(); }

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
