import { Publisher } from "@byloth/core";

export interface ViewEventsMap<T>
{
    "element:add": (value: T) => void;
    "element:delete": (value: T) => void;

    "set:clear": () => void;
}

export interface ReadonlyView<T> extends ReadonlySet<T>
{
    subscribe<K extends keyof ViewEventsMap<T>>(event: K, callback: ViewEventsMap<T>[K]): () => void;
    unsubscribe<K extends keyof ViewEventsMap<T>>(event: K, callback: ViewEventsMap<T>[K]): void;
}

export default class View<T> extends Set<T>
{
    private readonly _publisher: Publisher<ViewEventsMap<T>>;

    public constructor(iterable?: Iterable<T> | null)
    {
        super(iterable);

        this._publisher = new Publisher();
    }

    public override add(value: T): this
    {
        super.add(value);

        this._publisher.publish("element:add", value);

        return this;
    }
    public override delete(value: T): boolean
    {
        const result = super.delete(value);
        if (result) { this._publisher.publish("element:delete", value); }

        return result;
    }

    public override clear(): void
    {
        const size = this.size;

        super.clear();
        if (size > 0) { this._publisher.publish("set:clear"); }
    }

    public subscribe<K extends keyof ViewEventsMap<T>>(event: K, callback: ViewEventsMap<T>[K]): () => void
    {
        return this._publisher.subscribe(event, callback);
    }
    public unsubscribe<K extends keyof ViewEventsMap<T>>(event: K, callback: ViewEventsMap<T>[K]): void
    {
        this._publisher.unsubscribe(event, callback);
    }
}
