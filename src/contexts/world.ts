import { ReferenceException, TimedPromise } from "@byloth/core";
import type {
    Callback,
    CallbackMap,
    InternalsEventsMap,
    PromiseResolver,
    Publisher,
    WildcardEventsMap

} from "@byloth/core";

import type Component from "../component.js";
import type Resource from "../resource.js";
import type System from "../system.js";
import type World from "../world.js";

import type { ReadonlyQueryView } from "../query/view.js";
import type { ComponentType, Instances, Resourceable, ResourceType, SignalEventsMap } from "../types.js";

type P = SignalEventsMap & InternalsEventsMap;
type S = P & WildcardEventsMap;

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export default class WorldContext<T extends CallbackMap<T> = { }>
{
    protected get _world(): World { return this._system.world!; }

    protected readonly _system: System;
    protected readonly _publisher: Publisher;

    protected readonly _dependencies: Set<Resource>;
    public get dependencies(): ReadonlySet<Resource> { return this._dependencies; }

    protected readonly _componentViews: Set<ReadonlyQueryView<Component[]>>;
    public get componentViews(): ReadonlySet<ReadonlyQueryView<Component[]>> { return this._componentViews; }

    protected _onDispose?: (context: WorldContext) => void;

    public constructor(system: System, publisher: Publisher)
    {
        this._system = system;
        this._publisher = publisher;

        this._dependencies = new Set();
        this._componentViews = new Set();
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

    public useResource<R extends System>(Type: ResourceType<R>): Resourceable<R>;
    public useResource<R extends Resource>(Type: ResourceType<R>): R;
    public useResource(Type: ResourceType): Resource
    {
        const dependency = this._world["_addDependency"](this._system, Type);
        this._dependencies.add(dependency);

        return dependency;
    }

    public releaseResource<R extends System>(Type: ResourceType<R>): void;
    public releaseResource<R extends System>(service: R): void;
    public releaseResource<R extends Resource>(Type: ResourceType<R>): void;
    public releaseResource<R extends Resource>(resource: R): void;
    public releaseResource(resource: ResourceType | Resource): void
    {
        const Type = (typeof resource === "function") ? resource : resource.constructor as ResourceType;

        const dependency = this._world["_removeDependency"](this._system, Type);
        this._dependencies.delete(dependency);
    }

    public useComponentView<C extends ComponentType[], R extends Instances<C> = Instances<C>>(
        ...Types: C
    ): ReadonlyQueryView<R>
    {
        const view = this._world["_addComponentView"](this._system, Types);
        this._componentViews.add(view);

        return view as unknown as ReadonlyQueryView<R>;
    }

    public releaseComponentView<C extends Component[]>(view: ReadonlyQueryView<C>): void;
    public releaseComponentView<C extends ComponentType[]>(...Types: C): void;
    public releaseComponentView(...args: [ReadonlyQueryView<Component[]>] | ComponentType[]): void
    {
        let view: ReadonlyQueryView<Component[]>;
        if (typeof args[0] === "function")
        {
            const _view = this._world["_queryManager"].findView(...args as ComponentType[]);
            if ((import.meta.env.DEV) && !(_view))
            {
                throw new ReferenceException("The view doesn't exist in the world.");
            }

            view = _view!;
        }
        else { view = args[0]; }

        this._world["_removeComponentView"](this._system, view);
        this._componentViews.delete(view);
    }

    public dispose(): void
    {
        if (this._onDispose)
        {
            this._onDispose(this);
            this._onDispose = undefined;
        }

        this._dependencies.clear();
        this._componentViews.clear();

        this._publisher.clear();
    }
}
