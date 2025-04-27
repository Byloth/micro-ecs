import { SetView, SmartIterator } from "@byloth/core";
import type { Constructor, ReadonlySetView } from "@byloth/core";

import type Entity from "../entity.js";
import type Component from "../component.js";
import type World from "../world.js";

import { Condition, HasComponent, HasTag, And, Or, Not } from "./conditions.js";

export function hasComponent(type: Constructor<Component>): HasComponent { return new HasComponent(type); }
export function hasTag(tag: string): HasTag { return new HasTag(tag); }

export function and(...conditions: Condition[]): And { return new And(...conditions); }
export function or(...conditions: Condition[]): Or { return new Or(...conditions); }
export function not(condition: Condition): Not { return new Not(condition); }

interface ConditionAnalysis
{
    components: Set<Constructor<Component>>;
    tags: Set<string>;
}
interface Query<E extends Entity = Entity>
{
    condition: Condition;
    entities: SetView<E>;
}

export default class QueryManager<W extends World = World>
{
    private readonly _queries: Map<string, Query>;

    private readonly _componentIndexes: Map<Constructor<Component>, Set<string>>;
    private readonly _tagIndexes: Map<string, Set<string>>;

    private readonly _world: W;

    private readonly _onEntityComponentAdd = (entity: Entity, type: Constructor<Component>) =>
    {
        const indexes = this._componentIndexes.get(type);
        if (!(indexes)) { return; }

        for (const index of indexes)
        {
            const query = this._queries.get(index);
            if (!(query) || (query.entities.has(entity))) { continue; }
            if (query.condition.evaluate(entity)) { query.entities.add(entity); }
        }
    };
    private readonly _onEntityComponentRemove = (entity: Entity, type: Constructor<Component>) =>
    {
        const indexes = this._componentIndexes.get(type);
        if (!(indexes)) { return; }

        for (const index of indexes)
        {
            const query = this._queries.get(index);
            if (!(query) || !(query.entities.has(entity))) { continue; }
            if (!(query.condition.evaluate(entity))) { query.entities.delete(entity); }
        }
    };

    private readonly _onEntityTagAdd = (entity: Entity, tag: string) =>
    {
        const indexes = this._tagIndexes.get(tag);
        if (!(indexes)) { return; }

        for (const index of indexes)
        {
            const query = this._queries.get(index);
            if (!(query) || (query.entities.has(entity))) { continue; }
            if (query.condition.evaluate(entity)) { query.entities.add(entity); }
        }
    };
    private readonly _onEntityTagRemove = (entity: Entity, tag: string) =>
    {
        const indexes = this._tagIndexes.get(tag);
        if (!(indexes)) { return; }

        for (const index of indexes)
        {
            const query = this._queries.get(index);
            if (!(query) || !(query.entities.has(entity))) { continue; }
            if (!(query.condition.evaluate(entity))) { query.entities.delete(entity); }
        }
    };

    public constructor(world: W)
    {
        this._queries = new Map();

        this._componentIndexes = new Map();
        this._tagIndexes = new Map();

        this._world = world;
        this._world.subscribe("entity:component:add", this._onEntityComponentAdd);
        this._world.subscribe("entity:component:remove", this._onEntityComponentRemove);

        this._world.subscribe("entity:tag:add", this._onEntityTagAdd);
        this._world.subscribe("entity:tag:remove", this._onEntityTagRemove);
    }

    private _analyzeCondition(condition: Condition): ConditionAnalysis
    {
        const components = new Set<Constructor<Component>>();
        const tags = new Set<string>();

        const queue: Condition[] = [condition];
        const seen = new Set<string>();

        do
        {
            const current = queue.pop()!;

            if (seen.has(current.toString())) { continue; }
            seen.add(current.toString());

            if ((current instanceof And) || (current instanceof Or))
            {
                queue.push(...current.conditions);
            }
            else if (current instanceof Not)
            {
                queue.push(current.condition);
            }
            else if (current instanceof HasComponent)
            {
                components.add(current.type);
            }
            else if (current instanceof HasTag)
            {
                tags.add(current.tag);
            }
        }
        while (queue.length > 0);

        return { components, tags };
    }

    private _addComponentIndexes(components: Set<Constructor<Component>>, index: string): void
    {
        for (const component of components)
        {
            const queries = this._componentIndexes.get(component);
            if (queries)
            {
                queries.add(index);
                continue;
            }

            this._componentIndexes.set(component, new Set([index]));
        }
    }
    private _addTagIndexes(tags: Set<string>, index: string): void
    {
        for (const tag of tags)
        {
            const queries = this._tagIndexes.get(tag);
            if (queries)
            {
                queries.add(index);
                continue;
            }

            this._tagIndexes.set(tag, new Set([index]));
        }
    }

    public getFirstEntity<E extends Entity = Entity>(condition: Condition): E | undefined
    {
        const index = condition.toString();
        const query = this._queries.get(index) as Query<E> | undefined;
        if (query)
        {
            const { value } = query.entities
                .values()
                .next();

            return value;
        }

        for (const entity of this._world.entities.values())
        {
            if (condition.evaluate(entity)) { return entity as E; }
        }

        return undefined;
    }
    public getEntities<E extends Entity = Entity>(condition: Condition): SmartIterator<E>
    {
        const index = condition.toString();
        const query = this._queries.get(index) as Query<E> | undefined;
        if (query) { return new SmartIterator(query.entities); }

        return new SmartIterator(this._world.entities.values() as Iterable<E>)
            .filter((entity) => condition.evaluate(entity));
    }
    public getEntitiesReactiveView<E extends Entity = Entity>(condition: Condition): ReadonlySetView<E>
    {
        const index = condition.toString();
        const query = this._queries.get(index) as Query<E> | undefined;
        if (query) { return query.entities; }

        const entities = new SetView<E>();
        for (const entity of this._world.entities.values())
        {
            if (condition.evaluate(entity)) { entities.add(entity as E); }
        }

        this._queries.set(index, { condition, entities });

        const { components, tags } = this._analyzeCondition(condition);

        this._addComponentIndexes(components, index);
        this._addTagIndexes(tags, index);

        return entities;
    }

    public dispose(): void
    {
        this._world.unsubscribe("entity:component:add", this._onEntityComponentAdd);
        this._world.unsubscribe("entity:component:remove", this._onEntityComponentRemove);

        this._world.unsubscribe("entity:tag:add", this._onEntityTagAdd);
        this._world.unsubscribe("entity:tag:remove", this._onEntityTagRemove);

        for (const query of this._queries.values()) { query.entities.clear(); }

        this._queries.clear();
        this._componentIndexes.clear();
        this._tagIndexes.clear();
    }
}
