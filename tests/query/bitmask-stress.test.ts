import { beforeEach, describe, expect, it } from "vitest";

import { Random } from "@byloth/core";

import { Component, World } from "../../src/index.js";
import type { ComponentType, Entity } from "../../src/index.js";

const NUM_ENTITIES = 1000;
const NUM_COMPONENT_TYPES = 64;
const MIN_COMPONENTS_PER_ENTITY = 1;
const MAX_COMPONENTS_PER_ENTITY = 20;
const NUM_QUERY_TESTS = 100;
const MAX_QUERY_SIZE = 5;

const ComponentTypes: ComponentType[] = [];
for (let i = 0; i < NUM_COMPONENT_TYPES; i += 1)
{
    const ComponentClass = class extends Component { };

    ComponentTypes.push(ComponentClass);
}

function randomSample<T>(array: readonly T[], count: number): T[]
{
    const shuffled = [...array].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count);
}

describe("Bitmask Stress Test", () =>
{
    let _world: World;
    let _entities: Entity[];
    let _entityComponentMap: Map<Entity, Set<ComponentType>>;

    beforeEach(() =>
    {
        _world = new World();
        _entities = [];
        _entityComponentMap = new Map();

        for (let i = 0; i < NUM_ENTITIES; i += 1)
        {
            const entity = _world.createEntity();

            const numComponents = Random.Integer(MIN_COMPONENTS_PER_ENTITY, MAX_COMPONENTS_PER_ENTITY + 1);
            const selectedTypes = randomSample(ComponentTypes, numComponents);
            const componentSet = new Set<ComponentType>();

            for (const ComponentType of selectedTypes)
            {
                entity.createComponent(ComponentType);
                componentSet.add(ComponentType);
            }

            _entities.push(entity);
            _entityComponentMap.set(entity, componentSet);
        }
    });

    it("Should correctly match entities with single component queries", () =>
    {
        for (let i = 0; i < NUM_QUERY_TESTS; i += 1)
        {
            const queryType = Random.Choice(ComponentTypes);
            const view = _world.getComponentView(queryType);

            const expectedEntities = _entities.filter((entity) =>
            {
                const components = _entityComponentMap.get(entity)!;
                return components.has(queryType);
            });

            expect(view.size).toBe(expectedEntities.length);

            for (const entity of expectedEntities)
            {
                expect(view.has(entity)).toBe(true);
            }
        }
    });
    it("Should correctly match entities with multi-component queries", () =>
    {
        for (let i = 0; i < NUM_QUERY_TESTS; i += 1)
        {
            const querySize = Random.Integer(2, MAX_QUERY_SIZE + 1);
            const queryTypes = randomSample(ComponentTypes, querySize);

            const view = _world.getComponentView(...queryTypes);

            const expectedEntities = _entities.filter((entity) =>
            {
                const components = _entityComponentMap.get(entity)!;

                return queryTypes.every((Type) => components.has(Type));
            });

            expect(view.size).toBe(expectedEntities.length);

            for (const entity of expectedEntities)
            {
                expect(view.has(entity)).toBe(true);
            }
        }
    });

    it("Should correctly handle queries spanning multiple bitmask chunks (> 32 types)", () =>
    {
        const typesFromFirstChunk = randomSample(ComponentTypes.slice(0, 32), 2);
        const typesFromSecondChunk = randomSample(ComponentTypes.slice(32, 64), 2);
        const queryTypes = [...typesFromFirstChunk, ...typesFromSecondChunk];

        const view = _world.getComponentView(...queryTypes);

        const expectedEntities = _entities.filter((entity) =>
        {
            const components = _entityComponentMap.get(entity)!;

            return queryTypes.every((Type) => components.has(Type));
        });

        expect(view.size).toBe(expectedEntities.length);

        for (const entity of expectedEntities)
        {
            expect(view.has(entity)).toBe(true);
        }
    });

    it("Should correctly update views when components are added", () =>
    {
        const querySize = Random.Integer(2, MAX_QUERY_SIZE + 1);
        const queryTypes = randomSample(ComponentTypes, querySize);

        const view = _world.getComponentView(...queryTypes);
        const initialSize = view.size;

        const nonMatchingEntities = _entities.filter((entity) =>
        {
            const components = _entityComponentMap.get(entity)!;

            return !(queryTypes.every((Type) => components.has(Type)));
        });

        if (nonMatchingEntities.length === 0) { return; }

        const targetEntity = Random.Choice(nonMatchingEntities);
        const entityComponents = _entityComponentMap.get(targetEntity)!;
        const missingTypes = queryTypes.filter((Type) => !(entityComponents.has(Type)));

        for (const MissingType of missingTypes)
        {
            targetEntity.createComponent(MissingType);
            entityComponents.add(MissingType);
        }

        expect(view.size).toBe(initialSize + 1);
        expect(view.has(targetEntity)).toBe(true);
    });
    it("Should correctly update views when components are removed", () =>
    {
        const querySize = Random.Integer(1, MAX_QUERY_SIZE + 1);
        const queryTypes = randomSample(ComponentTypes, querySize);

        const view = _world.getComponentView(...queryTypes);

        const matchingEntities = [...view.entities];
        if (matchingEntities.length === 0) { return; }

        const initialSize = view.size;

        const targetEntity = Random.Choice(matchingEntities);
        const componentToRemove = Random.Choice(queryTypes);

        targetEntity.destroyComponent(componentToRemove);
        _entityComponentMap.get(targetEntity)!.delete(componentToRemove);

        expect(view.size).toBe(initialSize - 1);
        expect(view.has(targetEntity)).toBe(false);
    });

    it("Should correctly handle component enable / disable", () =>
    {
        const queryType = Random.Choice(ComponentTypes);

        const view = _world.getComponentView(queryType);

        const matchingEntities = [...view.entities];
        if (matchingEntities.length === 0) { return; }

        const initialSize = view.size;

        const targetEntity = Random.Choice(matchingEntities);
        const component = targetEntity.getComponent(queryType);

        component.disable();

        expect(view.size).toBe(initialSize - 1);
        expect(view.has(targetEntity)).toBe(false);

        component.enable();

        expect(view.size).toBe(initialSize);
        expect(view.has(targetEntity)).toBe(true);
    });

    it("Should handle extreme case with all component types on single entity", () =>
    {
        const superEntity = _world.createEntity();
        for (const ComponentType of ComponentTypes)
        {
            superEntity.createComponent(ComponentType);
        }

        for (let i = 0; i < 20; i += 1)
        {
            const querySize = Random.Integer(1, 11);
            const queryTypes = randomSample(ComponentTypes, querySize);

            const view = _world.getComponentView(...queryTypes);
            expect(view.has(superEntity)).toBe(true);
        }
    });

    it("Should correctly handle entity with components only from second chunk", () =>
    {
        const secondChunkEntity = _world.createEntity();
        const secondChunkTypes = randomSample(ComponentTypes.slice(32, 64), 5);

        for (const ComponentType of secondChunkTypes)
        {
            secondChunkEntity.createComponent(ComponentType);
        }

        const firstChunkTypes = randomSample(ComponentTypes.slice(0, 32), 2);

        const view1 = _world.getComponentView(...firstChunkTypes);
        expect(view1.has(secondChunkEntity)).toBe(false);

        const view2 = _world.getComponentView(...secondChunkTypes);
        expect(view2.has(secondChunkEntity)).toBe(true);
    });

    it("Should maintain consistency across multiple operations", () =>
    {
        const queryTypes = randomSample(ComponentTypes, 3);
        const view = _world.getComponentView(...queryTypes);

        for (let i = 0; i < 100; i += 1)
        {
            const operation = Random.Integer(0, 3);
            if (operation === 0)
            {
                const entity = _world.createEntity();

                const numComponents = Random.Integer(MIN_COMPONENTS_PER_ENTITY, MAX_COMPONENTS_PER_ENTITY + 1);
                const selectedTypes = randomSample(ComponentTypes, numComponents);
                const componentSet = new Set<ComponentType>();

                for (const ComponentType of selectedTypes)
                {
                    entity.createComponent(ComponentType);
                    componentSet.add(ComponentType);
                }

                _entities.push(entity);
                _entityComponentMap.set(entity, componentSet);
            }
            else if ((operation === 1) && (_entities.length > 10))
            {
                const index = Random.Index(_entities);
                const entity = _entities[index];

                _world.destroyEntity(entity);

                _entities.splice(index, 1);
                _entityComponentMap.delete(entity);
            }
            else
            {
                const entity = Random.Choice(_entities);
                const entityComponents = _entityComponentMap.get(entity)!;
                const randomType = Random.Choice(ComponentTypes);

                if (entityComponents.has(randomType))
                {
                    entity.destroyComponent(randomType);
                    entityComponents.delete(randomType);
                }
                else
                {
                    entity.createComponent(randomType);
                    entityComponents.add(randomType);
                }
            }
        }

        const expectedEntities = _entities.filter((entity) =>
        {
            const components = _entityComponentMap.get(entity)!;

            return queryTypes.every((Type) => components.has(Type));
        });

        expect(view.size).toBe(expectedEntities.length);

        for (const entity of expectedEntities)
        {
            expect(view.has(entity)).toBe(true);
        }
    });
});
