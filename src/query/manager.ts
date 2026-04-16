import { KeyException, SmartIterator, ValueException } from "@byloth/core";
import type { CallbackMap } from "@byloth/core";

import QueryView from "./view.js";
import type { ReadonlyQueryView } from "./view.js";

import type Entity from "../entity.js";
import type Component from "../component.js";
import type { ComponentType, Instances } from "../types.js";

function _getQueryKey(Types: ComponentType[]): string
{
    const length = Types.length;
    if (length === 1) { return `${Types[0].Id}`; }

    const ids = new Array<number>(length);
    for (let i = 0; i < length; i += 1)
    {
        ids[i] = Types[i].Id;
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

function _createMask(Types: ComponentType[]): number[]
{
    const mask: number[] = [];
    for (const Type of Types)
    {
        _setMaskBit(mask, Type.Id);
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

function _gatherComponents(entity: Entity, Types: ComponentType[]): Component[]
{
    const components = new Array<Component>(Types.length);
    for (let i = 0; i < Types.length; i += 1)
    {
        components[i] = entity["_components"].get(Types[i])!;
    }

    return components;
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export default class QueryManager<T extends CallbackMap<T> = { }>
{
    protected readonly _typeKeys: Map<ComponentType, Set<string>>;
    protected readonly _keyTypes: Map<string, ComponentType[]>;

    protected readonly _queryMasks: Map<string, number[]>;
    protected readonly _entityMasks: WeakMap<Entity, number[]>;

    protected readonly _entities: ReadonlyMap<number, Entity>;
    protected readonly _views: Map<string, QueryView<Component[]>>;

    public constructor(entities: ReadonlyMap<number, Entity>)
    {
        this._typeKeys = new Map();
        this._keyTypes = new Map();

        this._queryMasks = new Map();
        this._entityMasks = new WeakMap();

        this._entities = entities;
        this._views = new Map();
    }

    protected _getEntityMask(entity: Entity): number[]
    {
        let mask = this._entityMasks.get(entity);
        if (!(mask))
        {
            mask = [];
            this._entityMasks.set(entity, mask);
        }

        return mask;
    }

    protected _onEntityComponentEnable(entity: Entity, component: Component)
    {
        const Type = component.constructor as ComponentType;

        const entityMask = this._getEntityMask(entity);
        _setMaskBit(entityMask, Type.Id);

        const keys = this._typeKeys.get(Type);
        if (!(keys)) { return; }

        for (const key of keys)
        {
            const view = this._views.get(key)!;
            if (view.has(entity)) { continue; }

            const queryMask = this._queryMasks.get(key)!;
            if (!(_matchMask(entityMask, queryMask))) { continue; }

            const Types = this._keyTypes.get(key)!;
            const components = _gatherComponents(entity, Types);

            view.set(entity, components);
        }
    }
    protected _onEntityComponentDisable(entity: Entity, component: Component)
    {
        const Type = component.constructor as ComponentType;

        const entityMask = this._entityMasks.get(entity);
        if (entityMask) { _unsetMaskBit(entityMask, Type.Id); }

        const keys = this._typeKeys.get(Type);
        if (!(keys)) { return; }

        for (const key of keys)
        {
            const view = this._views.get(key);
            if (view) { view.delete(entity); }
        }
    }

    protected _addComponentKeys(Types: ComponentType[], key: string): void
    {
        for (const Type of Types)
        {
            const view = this._typeKeys.get(Type);
            if (view) { view.add(key); }
            else { this._typeKeys.set(Type, new Set([key])); }
        }
    }
    protected _addKeyComponents(key: string, Types: ComponentType[]): void
    {
        if ((import.meta.env.DEV) && (this._keyTypes.has(key)))
        {
            throw new KeyException(`The key "${key}" is already registered.`);
        }

        this._keyTypes.set(key, Types);
    }

    public pickOne<C extends ComponentType, R extends InstanceType<C> = InstanceType<C>>(
        Type: C
    ): R | undefined
    {
        const key = `${Type.Id}`;
        const view = this._views.get(key) as QueryView<[R]> | undefined;
        if (view) { return view.components[0]?.[0]; }

        for (const entity of this._entities.values())
        {
            if (!(entity.isEnabled)) { continue; }

            const component = entity["_components"].get(Type);
            if (component?.isEnabled) { return component as R; }
        }

        return undefined;
    }

    public findFirst<C extends ComponentType[], R extends Instances<C> = Instances<C>>(
        ...Types: C
    ): R | undefined
    {
        if ((import.meta.env.DEV) && !(Types.length))
        {
            throw new ValueException("At least one type must be provided.");
        }

        const key = _getQueryKey(Types);
        const view = this._views.get(key) as QueryView<R> | undefined;
        if (view) { return view.components[0]; }

        const queryMask = _createMask(Types);
        for (const entity of this._entities.values())
        {
            if (!(entity.isEnabled)) { continue; }

            const entityMask = this._entityMasks.get(entity);
            if (!(entityMask) || !(_matchMask(entityMask, queryMask))) { continue; }

            return _gatherComponents(entity, Types) as R;
        }

        return undefined;
    }
    public findAll<C extends ComponentType[], R extends Instances<C> = Instances<C>>(
        ...Types: C
    ): SmartIterator<R>
    {
        if ((import.meta.env.DEV) && !(Types.length))
        {
            throw new ValueException("At least one type must be provided.");
        }

        const key = _getQueryKey(Types);
        const view = this._views.get(key) as QueryView<R> | undefined;
        if (view) { return new SmartIterator(view.components); }

        const entities = this._entities;
        const entityMasks = this._entityMasks;
        const queryMask = _createMask(Types);

        return new SmartIterator(function* (): Generator<R>
        {
            for (const entity of entities.values())
            {
                if (!(entity.isEnabled)) { continue; }

                const entityMask = entityMasks.get(entity);
                if (!(entityMask) || !(_matchMask(entityMask, queryMask))) { continue; }

                yield _gatherComponents(entity, Types) as R;
            }
        });
    }

    public getView<C extends ComponentType[], R extends Instances<C> = Instances<C>>(
        ...Types: C
    ): ReadonlyQueryView<R>
    {
        if ((import.meta.env.DEV) && !(Types.length))
        {
            throw new ValueException("At least one type must be provided.");
        }

        const key = _getQueryKey(Types);
        let view = this._views.get(key) as QueryView<R> | undefined;
        if (view) { return view; }

        const queryMask = _createMask(Types);
        view = new QueryView<R>();

        for (const entity of this._entities.values())
        {
            if (!(entity.isEnabled)) { continue; }

            const entityMask = this._entityMasks.get(entity);
            if (!(entityMask) || !(_matchMask(entityMask, queryMask))) { continue; }

            const components = _gatherComponents(entity, Types) as R;
            view.set(entity, components);
        }

        this._views.set(key, view);
        this._queryMasks.set(key, queryMask);

        this._addComponentKeys(Types, key);
        this._addKeyComponents(key, Types);

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
