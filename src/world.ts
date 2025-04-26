import { Publisher } from "@byloth/core";
import type { CallbackMap, Constructor, SmartIterator } from "@byloth/core";

import type Entity from "./entity.js";
import type Component from "./component.js";
import type System from "./system.js";

import QueryManager from "./query/index.js";
import type { Condition } from "./query/conditions.js";
import type { ReadonlyView } from "./query/view.js";

export interface WorldEventsMap
{
    "entity:component:add": (entity: Entity, type: Constructor<Component>) => void;
    "entity:component:remove": (entity: Entity, type: Constructor<Component>) => void;

    "entity:child:add": (entity: Entity, child: Entity) => void;
    "entity:child:remove": (entity: Entity, child: Entity) => void;

    "entity:tag:add": (entity: Entity, tag: string) => void;
    "entity:tag:remove": (entity: Entity, tag: string) => void;

    "system:add": (system: System) => void;
    "system:remove": (system: System) => void;

    "system:enable": (system: System) => void;
    "system:disable": (system: System) => void;
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export default class World<T extends CallbackMap<T> = { }> extends Publisher<T & WorldEventsMap>
{
    private readonly _entities: Map<number, Entity>;
    public get entities(): ReadonlyMap<number, Entity> { return this._entities; }

    private readonly _systems: System[];
    private readonly _enabledSystems: System[];
    public get systems(): readonly System[] { return this._systems; }

    private readonly _queryManager: QueryManager;

    private readonly _onEntityChildAdd = (entity: Entity, child: Entity): void => { this.addEntity(child); };
    private readonly _onEntityChildRemove = (entity: Entity, child: Entity): void => { this.removeEntity(child.id); };

    public readonly _onSystemEnable = (system: System): void => { this._insertSystem(this._enabledSystems, system); };
    public readonly _onSystemDisable = (system: System): void => { this._removeSystem(this._enabledSystems, system); };

    public constructor()
    {
        super();

        this._entities = new Map();

        this._systems = [];
        this._enabledSystems = [];

        this._queryManager = new QueryManager(this);

        // @ts-expect-error - Parameter type is correct.
        this.subscribe("entity:child:add", this._onEntityChildAdd);

        // @ts-expect-error - Parameters type is correct.
        this.subscribe("entity:child:remove", this._onEntityChildRemove);

        // @ts-expect-error - Parameter type is correct.
        this.subscribe("system:enable", this._onSystemEnable);

        // @ts-expect-error - Parameter type is correct.
        this.subscribe("system:disable", this._onSystemDisable);
    }

    private _insertSystem(array: System[], system: System): number
    {
        let left = 0;
        let right = array.length;

        while (left < right)
        {
            const middle = Math.floor((left + right) / 2);
            const other = array[middle];

            if (system.priority < other.priority) { right = middle; }
            else { left = middle + 1; }
        }

        array.splice(left, 0, system);

        return left;
    }
    private _removeSystem(array: System[], system: System): number
    {
        const index = array.indexOf(system);
        if (index !== -1) { array.splice(index, 1); }

        return index;
    }

    public addEntity(entity: Entity): this
    {
        try
        {
            entity.onAttach(this);
        }
        catch
        {
            // TODO!
            // console.error("Failed to attach entity:", error);

            throw new Error();
        }

        this._entities.set(entity.id, entity);

        entity.components.keys()
            // @ts-expect-error - Parameters type is correct.
            .forEach((type) => this.publish("entity:component:add", entity, type));

        entity.children
            // @ts-expect-error - Parameters type is correct.
            .forEach((child) => this.publish("entity:child:add", entity, child));

        entity.tags
            // @ts-expect-error - Parameters type is correct.
            .forEach((tag) => this.publish("entity:tag:add", entity, tag));

        return this;
    }

    public getFirstEntity<E extends Entity = Entity>(condition: Condition): E | undefined
    {
        return this._queryManager.getFirstEntity<E>(condition);
    }

    public getEntities<E extends Entity = Entity>(condition: Condition): SmartIterator<E>
    {
        return this._queryManager.getEntities<E>(condition);
    }
    public getEntitiesReactiveView<E extends Entity = Entity>(condition: Condition): ReadonlyView<E>
    {
        return this._queryManager.getEntitiesReactiveView<E>(condition);
    }

    public removeEntity(entityId: number): this
    {
        const entity = this._entities.get(entityId);
        if (!(entity)) { throw new Error(); }

        entity.components.keys()
            // @ts-expect-error - Parameters type is correct.
            .forEach((type) => this.publish("entity:component:remove", entity, type));

        entity.children
            // @ts-expect-error - Parameters type is correct.
            .forEach((child) => this.publish("entity:child:remove", entity, child));

        entity.tags
            // @ts-expect-error - Parameters type is correct.
            .forEach((tag) => this.publish("entity:tag:remove", entity, tag));

        this._entities.delete(entityId);
        entity.onDetach();

        return this;
    }

    public addSystem(system: System): this
    {
        try
        {
            system.onAttach(this);
        }
        catch
        {
            // TODO!
            // console.error("Failed to attach system:", error);

            throw new Error();
        }

        this._insertSystem(this._systems, system);
        if (system.enabled) { this._insertSystem(this._enabledSystems, system); }

        // @ts-expect-error - Parameter type is correct.
        this.publish("system:add", system);

        return this;
    }
    public removeSystem(system: System): this
    {
        if (this._removeSystem(this._systems, system) === -1) { throw new Error(); }
        this._removeSystem(this._enabledSystems, system);

        system.onDetach();

        // @ts-expect-error - Parameter type is correct.
        this.publish("system:remove", system);

        return this;
    }

    public update(deltaTime: number): void
    {
        for (const system of this._enabledSystems)
        {
            system.update(deltaTime);
        }
    }

    public dispose(): void
    {
        this.clear();

        this._queryManager.dispose();

        for (const system of this._systems.slice()) { system.dispose(); }
        this._systems.length = 0;
        this._enabledSystems.length = 0;

        for (const entity of this._entities.values())
        {
            if (entity.parent) { continue; }
            entity.dispose();
        }

        this._entities.clear();
    }
}
