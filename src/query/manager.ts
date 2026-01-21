import { KeyException, SmartIterator, ValueException } from "@byloth/core";
import type { CallbackMap } from "@byloth/core";

import QueryView from "./view.js";
import type { ReadonlyQueryView } from "./view.js";

import type Entity from "../entity.js";
import type Component from "../component.js";
import type { ComponentType, Instances } from "../types.js";

function _getQueryKey(types: ComponentType[]): string
{
    const length = types.length;
    if (length === 1) { return `${types[0].Id}`; }

    const ids = new Array<number>(length);
    for (let i = 0; i < length; i += 1)
    {
        ids[i] = types[i].Id;
    }

    ids.sort((a, b) => (a - b));

    return ids.join(",");
}

function _setMaskBit(mask: number[], typeId: number): void
{
    const index = (typeId >>> 5); // Math.floor(typeId / 32)
    const bit = (1 << (typeId & 31)); // 1 << (typeId % 32)

    while (mask.length <= index) { mask.push(0); }

    mask[index] |= bit;
}
function _unsetMaskBit(mask: number[], typeId: number): void
{
    const index = (typeId >>> 5);
    if (index >= mask.length) { return; }

    const bit = (1 << (typeId & 31));

    mask[index] &= ~(bit);
}

function _createMask(types: ComponentType[]): number[]
{
    const mask: number[] = [];
    for (const type of types)
    {
        _setMaskBit(mask, type.Id);
    }

    return mask;
}
function _matchMask(entityMask: number[], queryMask: number[]): boolean
{
    const length = queryMask.length;
    if (entityMask.length < length) { return false; }

    for (let i = 0; i < length; i += 1)
    {
        if ((entityMask[i] & queryMask[i]) !== queryMask[i]) { return false; }
    }

    return true;
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export default class QueryManager<T extends CallbackMap<T> = { }>
{
    private readonly _typeKeys: Map<ComponentType, Set<string>>;
    private readonly _keyTypes: Map<string, ComponentType[]>;

    private readonly _queryMasks: Map<string, number[]>;
    private readonly _entityMasks: WeakMap<Entity, number[]>;

    private readonly _entities: ReadonlyMap<number, Entity>;
    private readonly _views: Map<string, QueryView<Component[]>>;

    public constructor(entities: ReadonlyMap<number, Entity>)
    {
        this._typeKeys = new Map();
        this._keyTypes = new Map();

        this._queryMasks = new Map();
        this._entityMasks = new WeakMap();

        this._entities = entities;
        this._views = new Map();
    }

    private _getEntityMask(entity: Entity): number[]
    {
        let mask = this._entityMasks.get(entity);
        if (!(mask))
        {
            mask = [];
            this._entityMasks.set(entity, mask);
        }

        return mask;
    }

    private _onEntityComponentEnable(entity: Entity, component: Component)
    {
        const type = component.constructor as ComponentType;

        const entityMask = this._getEntityMask(entity);
        _setMaskBit(entityMask, type.Id);

        const keys = this._typeKeys.get(type);
        if (!(keys)) { return; }

        for (const key of keys)
        {
            const view = this._views.get(key)!;
            if (view.has(entity)) { continue; }

            const queryMask = this._queryMasks.get(key)!;
            if (!(_matchMask(entityMask, queryMask))) { continue; }

            const types = this._keyTypes.get(key)!;
            const length = types.length;
            const components = new Array<Component>(length);
            for (let i = 0; i < length; i += 1)
            {
                components[i] = entity.components.get(types[i])!;
            }

            view.set(entity, components);
        }
    }
    private _onEntityComponentDisable(entity: Entity, component: Component)
    {
        const type = component.constructor as ComponentType;

        const entityMask = this._entityMasks.get(entity);
        if (entityMask) { _unsetMaskBit(entityMask, type.Id); }

        const keys = this._typeKeys.get(type);
        if (!(keys)) { return; }

        for (const key of keys)
        {
            const view = this._views.get(key);
            if (view) { view.delete(entity); }
        }
    }

    private _addComponentKeys(types: ComponentType[], key: string): void
    {
        for (const type of types)
        {
            const view = this._typeKeys.get(type);
            if (view) { view.add(key); }
            else { this._typeKeys.set(type, new Set([key])); }
        }
    }
    private _addKeyComponents(key: string, types: ComponentType[]): void
    {
        if ((import.meta.env.DEV) && (this._keyTypes.has(key)))
        {
            throw new KeyException(`The key "${key}" is already registered.`);
        }

        this._keyTypes.set(key, types);
    }

    public pickOne<C extends ComponentType, R extends InstanceType<C> = InstanceType<C>>(
        type: C
    ): R | undefined
    {
        const key = `${type.Id}`;
        const view = this._views.get(key) as QueryView<[R]> | undefined;
        if (view) { return view.components[0][0]; }

        for (const entity of this._entities.values())
        {
            if (!(entity.isEnabled)) { continue; }

            const component = entity.components.get(type);
            if (component?.isEnabled) { return component as R; }
        }

        return undefined;
    }

    public findFirst<C extends ComponentType[], R extends Instances<C> = Instances<C>>(
        ...types: C
    ): R | undefined
    {
        if ((import.meta.env.DEV) && !(types.length))
        {
            throw new ValueException("At least one type must be provided.");
        }

        const key = _getQueryKey(types);
        const view = this._views.get(key) as QueryView<R> | undefined;
        if (view) { return view.components[0]; }

        const queryMask = _createMask(types);
        const length = types.length;

        for (const entity of this._entities.values())
        {
            if (!(entity.isEnabled)) { continue; }

            const entityMask = this._entityMasks.get(entity);
            if (!(entityMask) || !(_matchMask(entityMask, queryMask))) { continue; }

            const components = new Array<Component>(length);
            for (let i = 0; i < length; i += 1)
            {
                components[i] = entity.components.get(types[i])!;
            }

            return components as R;
        }

        return undefined;
    }
    public findAll<C extends ComponentType[], R extends Instances<C> = Instances<C>>(
        ...types: C
    ): SmartIterator<R>
    {
        if ((import.meta.env.DEV) && !(types.length))
        {
            throw new ValueException("At least one type must be provided.");
        }

        const key = _getQueryKey(types);
        const view = this._views.get(key) as QueryView<R> | undefined;
        if (view) { return new SmartIterator(view.components); }

        const entities = this._entities;
        const entityMasks = this._entityMasks;
        const queryMask = _createMask(types);
        const length = types.length;

        return new SmartIterator(function* (): Generator<R>
        {
            for (const entity of entities.values())
            {
                if (!(entity.isEnabled)) { continue; }

                const entityMask = entityMasks.get(entity);
                if (!(entityMask) || !(_matchMask(entityMask, queryMask))) { continue; }

                const components = new Array<Component>(length);
                for (let i = 0; i < length; i += 1)
                {
                    components[i] = entity.components.get(types[i])!;
                }

                yield components as R;
            }
        });
    }

    public getView<C extends ComponentType[], R extends Instances<C> = Instances<C>>(
        ...types: C
    ): ReadonlyQueryView<R>
    {
        if ((import.meta.env.DEV) && !(types.length))
        {
            throw new ValueException("At least one type must be provided.");
        }

        const key = _getQueryKey(types);
        let view = this._views.get(key) as QueryView<R> | undefined;
        if (view) { return view; }

        const queryMask = _createMask(types);
        const length = types.length;
        view = new QueryView<R>();

        for (const entity of this._entities.values())
        {
            if (!(entity.isEnabled)) { continue; }

            const entityMask = this._entityMasks.get(entity);
            if (!(entityMask) || !(_matchMask(entityMask, queryMask))) { continue; }

            const components = new Array<Component>(length);
            for (let i = 0; i < length; i += 1)
            {
                components[i] = entity.components.get(types[i])!;
            }

            view.set(entity, components as R);
        }

        this._views.set(key, view);
        this._queryMasks.set(key, queryMask);

        this._addComponentKeys(types, key);
        this._addKeyComponents(key, types);

        return view;
    }

    public dispose(): void
    {
        for (const view of this._views.values()) { view.clear(); }
        this._views.clear();

        this._queryMasks.clear();

        this._keyTypes.clear();
        this._typeKeys.clear();
    }
}
