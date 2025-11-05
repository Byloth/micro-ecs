import { KeyException, MapView, SmartIterator, ValueException } from "@byloth/core";
import type { CallbackMap, Constructor, ReadonlyMapView } from "@byloth/core";

import type Entity from "./entity.js";
import type Component from "./component.js";
import type { Instances } from "./types.js";

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export default class QueryManager<T extends CallbackMap<T> = { }>
{
    private readonly _typeKeys: Map<Constructor<Component>, Set<string>>;
    private readonly _keyTypes: Map<string, Constructor<Component>[]>;

    private readonly _views: Map<string, MapView<Entity, Component[]>>;

    private readonly _entities: ReadonlyMap<number, Entity>;

    public constructor(entities: ReadonlyMap<number, Entity>)
    {
        this._typeKeys = new Map();
        this._keyTypes = new Map();

        this._views = new Map();

        this._entities = entities;
    }

    private _onEntityComponentEnable(entity: Entity, component: Component)
    {
        const type = component.constructor as Constructor<Component>;
        const keys = this._typeKeys.get(type);
        if (!(keys)) { return; }

        for (const key of keys)
        {
            const entities = this._views.get(key)!;
            if (entities.has(entity)) { continue; }

            const types = this._keyTypes.get(key);
            if (!(types)) { continue; }

            const components: Component[] = [];

            let found = true;
            let index = 0;
            do
            {
                const _type = types[index];
                const _component = entity.components.get(_type);
                if (!(_component) || !(_component.isEnabled))
                {
                    found = false;

                    break;
                }

                components.push(_component);

                index += 1;
            }
            while (index < types.length);

            if (found) { entities.set(entity, components); }
        }
    }
    private _onEntityComponentDisable(entity: Entity, component: Component)
    {
        const type = component.constructor as Constructor<Component>;
        const keys = this._typeKeys.get(type);
        if (!(keys)) { return; }

        for (const key of keys)
        {
            const view = this._views.get(key);
            if (view) { view.delete(entity); }
        }
    }

    private _addComponentKeys(types: Constructor<Component>[], key: string): void
    {
        for (const type of types)
        {
            const view = this._typeKeys.get(type);
            if (view) { view.add(key); }
            else { this._typeKeys.set(type, new Set([key])); }
        }
    }
    private _addKeyComponents(key: string, types: Constructor<Component>[]): void
    {
        if (this._keyTypes.has(key)) { throw new KeyException(`The key "${key}" is already registered.`); }
        this._keyTypes.set(key, types);
    }

    public pickOne<C extends Constructor<Component>, R = InstanceType<C>>(type: C): R | undefined
    {
        const view = this._views.get(type.name) as MapView<number, R> | undefined;
        if (view)
        {
            const { value } = view.values()
                .next();

            return value;
        }

        for (const entity of this._entities.values())
        {
            if (!(entity.isEnabled)) { continue; }

            const component = entity.components.get(type);
            if (component?.isEnabled) { return component as R; }
        }

        return undefined;
    }

    public findFirst<C extends Constructor<Component>[], R extends Instances<C> = Instances<C>>(
        ...types: C
    ): R | undefined
    {
        if (!(types.length)) { throw new ValueException("At least one type must be provided."); }

        const key = types.map((type) => type.name)
            .sort()
            .join(",");

        const view = this._views.get(key) as MapView<number, R> | undefined;
        if (view)
        {
            const { value } = view.values()
                .next();

            return value;
        }

        const components: Component[] = [];

        for (const entity of this._entities.values())
        {
            if (!(entity.isEnabled)) { continue; }

            let found = true;
            let index = 0;
            do
            {
                const type = types[index];
                const component = entity.components.get(type);
                if (!(component) || !(component.isEnabled))
                {
                    found = false;

                    break;
                }

                components.push(component);

                index += 1;
            }
            while (index < types.length);

            if (found) { return components as R; }

            components.length = 0;
        }

        return undefined;
    }
    public findAll<C extends Constructor<Component>[], R extends Instances<C> = Instances<C>>(
        ...types: C
    ): SmartIterator<R>
    {
        if (!(types.length)) { throw new ValueException("At least one type must be provided."); }

        const key = types.map((type) => type.name)
            .sort()
            .join(",");

        const view = this._views.get(key) as MapView<number, R> | undefined;
        if (view) { return new SmartIterator(view.values()); }

        return new SmartIterator(this._entities.values())
            .filter((entity) => (entity.isEnabled))
            .map((entity) =>
            {
                const components: Component[] = [];

                let found = true;
                let index = 0;
                do
                {
                    const type = types[index];
                    const component = entity.components.get(type);
                    if (!(component) || !(component.isEnabled))
                    {
                        found = false;

                        break;
                    }

                    components.push(component);

                    index += 1;
                }
                while (index < types.length);

                if (found) { return components as R; }

                return undefined;
            })
            .filter<R>((component) => component !== undefined);
    }

    public getView<C extends Constructor<Component>[], R extends Instances<C> = Instances<C>>(
        ...types: C
    ): ReadonlyMapView<Entity, R>
    {
        if (!(types.length)) { throw new ValueException("At least one type must be provided."); }

        const key = types.map((type) => type.name)
            .sort()
            .join(",");

        let view = this._views.get(key) as MapView<Entity, R> | undefined;
        if (view) { return view; }

        view = new MapView<Entity, R>();
        for (const entity of this._entities.values())
        {
            if (!(entity.isEnabled)) { continue; }

            const components: Component[] = [];

            let found = true;
            let index = 0;
            do
            {
                const type = types[index];
                const component = entity.components.get(type);
                if (!(component) || !(component.isEnabled))
                {
                    found = false;

                    break;
                }

                components.push(component);

                index += 1;
            }
            while (index < types.length);

            if (found) { view.set(entity, components as R); }
        }

        this._views.set(key, view);

        this._addComponentKeys(types, key);
        this._addKeyComponents(key, types);

        return view;
    }

    public dispose(): void
    {
        for (const view of this._views.values()) { view.clear(); }
        this._views.clear();

        this._keyTypes.clear();
        this._typeKeys.clear();
    }
}
