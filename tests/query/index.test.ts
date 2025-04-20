import { describe, it, expect } from "vitest";
import { and, Component, Entity, hasComponent, hasTag, not, or, World } from "../../src/index.js";

describe("QueryManager", () =>
{
    class TestComponent1 extends Component { }
    class TestComponent2 extends Component { }
    class TestComponent3 extends Component { }

    const _populateWorld = (world: World): void =>
    {
        const definitions = [
            { components: [TestComponent1], tags: [] },
            { components: [], tags: ["test:tag:1"] },
            { components: [TestComponent1, TestComponent3], tags: [] },
            { components: [], tags: ["test:tag:1", "test:tag:2", "test:tag:3"] },
            { components: [], tags: [] },
            { components: [], tags: ["test:tag:2"] },
            { components: [TestComponent1, TestComponent2, TestComponent3], tags: [] },
            { components: [TestComponent2, TestComponent3], tags: ["test:tag:3"] },
            { components: [TestComponent2], tags: [] }
        ];

        let index = 0;
        for (const { components, tags } of definitions)
        {
            const entity = new Entity();
            for (const component of components)
            {
                entity.addComponent(new component());
            }
            for (const tag of tags)
            {
                entity.addTag(tag);
            }

            Object.defineProperty(entity, "id", { value: (index += 1) });

            world.addEntity(entity);
        }
    };

    it("Should retrieve entities matching a condition", () =>
    {
        const world = new World();

        _populateWorld(world);

        const condition1 = hasComponent(TestComponent1);
        const condition2 = or(hasTag("test:tag:1"), hasTag("test:tag:2"));
        const condition3 = and(hasComponent(TestComponent3), hasTag("test:tag:1"));
        const condition4 = and(not(hasComponent(TestComponent1)), not(hasComponent(TestComponent3)));

        const entities1 = Array.from(world.queryEntities(condition1).values());
        const entities2 = world.iterateEntities(condition2).toArray();
        const entity1 = world.getFirstEntity(condition3);
        const entity2 = world.getFirstEntity(condition4);

        expect(entities1.length).toBe(3);
        expect(entities1[0].id).toBe(1);
        expect(entities1[1].id).toBe(3);
        expect(entities1[2].id).toBe(7);

        expect(entities2.length).toBe(3);
        expect(entities2[0].id).toBe(2);
        expect(entities2[1].id).toBe(4);
        expect(entities2[2].id).toBe(6);

        expect(entity1).toBeUndefined();
        expect(entity2!.id).toBe(2);
    });

    it("Should reactively update entities when entities are added", () =>
    {
        const world = new World();

        _populateWorld(world);

        const condition = or(hasTag("test:tag:1"), hasTag("test:tag:2"));
        const entities = world.queryEntities(condition);

        const before = Array.from(entities.values());
        expect(before.length).toBe(3);
        expect(before[0].id).toBe(2);
        expect(before[1].id).toBe(4);
        expect(before[2].id).toBe(6);

        const entity = new Entity();

        Object.defineProperty(entity, "id", { value: 10 });

        entity.addTag("test:tag:1");
        world.addEntity(entity);

        const after = Array.from(entities.values());
        expect(after.length).toBe(4);
        expect(after[0].id).toBe(2);
        expect(after[1].id).toBe(4);
        expect(after[2].id).toBe(6);
        expect(after[3].id).toBe(10);
    });
    it("Should reactively update entities when entities are removed", () =>
    {
        const world = new World();

        _populateWorld(world);

        const condition = or(hasTag("test:tag:1"), hasTag("test:tag:2"));
        const entities = world.queryEntities(condition);

        const before = Array.from(entities.values());
        expect(before.length).toBe(3);
        expect(before[0].id).toBe(2);
        expect(before[1].id).toBe(4);
        expect(before[2].id).toBe(6);

        const entity = before[1];
        entity.removeTag("test:tag:1");

        const current = Array.from(entities.values());
        expect(current.length).toBe(3);
        expect(current[0].id).toBe(2);
        expect(current[1].id).toBe(4);
        expect(current[2].id).toBe(6);

        entity.removeTag("test:tag:2");

        const after = Array.from(entities.values());
        expect(after.length).toBe(2);
        expect(after[0].id).toBe(2);
        expect(after[1].id).toBe(6);
    });

    it("Should be disposed correctly", () =>
    {
        const world = new World();

        _populateWorld(world);

        const condition = hasComponent(TestComponent1);
        const entities = world.queryEntities(condition);

        const before = Array.from(entities.values());
        expect(before.length).toBe(3);
        expect(before[0].id).toBe(1);
        expect(before[1].id).toBe(3);
        expect(before[2].id).toBe(7);

        world.dispose();

        const after = Array.from(entities.values());
        expect(after.length).toBe(0);
    });
});
