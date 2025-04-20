import { Publisher } from "@byloth/core";
import type { CallbackMap, Constructor, SmartIterator } from "@byloth/core";

import type Entity from "./entity.js";
import type Component from "./component.js";
import type System from "./system.js";

import QueryManager from "./query/index.js";
import type { Condition } from "./query/conditions.js";

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
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export default class World<T extends CallbackMap<T> = { }> extends Publisher<T & WorldEventsMap>
{
    private readonly _entities: Map<number, Entity>;
    public get entities(): ReadonlyMap<number, Entity> { return this._entities; }

    private readonly _systems: System[];
    public get systems(): readonly System[] { return this._systems; }

    private readonly _queryManager: QueryManager;

    private readonly _onEntityChildAdd = (entity: Entity, child: Entity): void => { this.addEntity(child); };
    private readonly _onEntityChildRemove = (entity: Entity, child: Entity): void => { this.removeEntity(child.id); };

    public constructor()
    {
        super();

        this._entities = new Map();
        this._systems = [];

        this._queryManager = new QueryManager(this);

        // @ts-expect-error - Parameter type is correct.
        this.subscribe("entity:child:add", this._onEntityChildAdd);

        // @ts-expect-error - Parameters type is correct.
        this.subscribe("entity:child:remove", this._onEntityChildRemove);
    }

    private _insertSystem(system: System): void
    {
        let left = 0;
        let right = this._systems.length;

        while (left < right)
        {
            const middle = Math.floor((left + right) / 2);
            const other = this._systems[middle];

            if (system.priority < other.priority) { right = middle; }
            else { left = middle + 1; }
        }

        this._systems.splice(left, 0, system);
    }

    public addEntity(entity: Entity): this
    {
        try
        {
            entity.onAttach(this);
        }
        catch (error)
        {
            // eslint-disable-next-line no-console
            console.error("Failed to attach entity:", error);

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

    public getEntities<E extends Entity = Entity>(condition: Condition): ReadonlySet<E>
    {
        return this._queryManager.getEntities<E>(condition);
    }

    public pickFirstEntity<E extends Entity = Entity>(condition: Condition): E | undefined
    {
        return this._queryManager.pickFirstEntity<E>(condition);
    }
    public pickEntities<E extends Entity = Entity>(condition: Condition): SmartIterator<E>
    {
        return this._queryManager.pickEntities<E>(condition);
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
        catch (error)
        {
            // eslint-disable-next-line no-console
            console.error("Failed to attach system:", error);

            throw new Error();
        }

        this._insertSystem(system);

        // @ts-expect-error - Parameter type is correct.
        this.publish("system:add", system);

        return this;
    }
    public removeSystem(system: System): this
    {
        const index = this._systems.indexOf(system);
        if (index === -1) { throw new Error(); }

        this._systems.splice(index, 1);
        system.onDetach();

        // @ts-expect-error - Parameter type is correct.
        this.publish("system:remove", system);

        return this;
    }

    public update(deltaTime: number): void
    {
        for (const system of this._systems)
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

        for (const entity of this._entities.values())
        {
            if (entity.parent) { continue; }
            entity.dispose();
        }

        this._entities.clear();
    }
}
