import { describe, it, expect } from "vitest";
import { Component, Entity, World } from "../src/index.js";

describe("getComponentViewManager", () =>
{
    class TestComponent1 extends Component { }
    class TestComponent2 extends Component { }
    class TestComponent3 extends Component { }
    class TestComponent4 extends Component { }

    const _populateWorld = (world: World): void =>
    {
        const definitions = [
            [TestComponent1],
            [TestComponent2, TestComponent1],
            [TestComponent1, TestComponent3],
            [TestComponent3],
            [TestComponent2, TestComponent3, TestComponent1],
            [TestComponent3, TestComponent2],
            [TestComponent2]
        ];

        let index = 0;
        for (const components of definitions)
        {
            const entity = new Entity();
            components.forEach((C) => entity.addComponent(new C()));

            Object.defineProperty(entity, "id", { value: (index += 1) });

            world.addEntity(entity);
        }
    };

    it("Should retrieve entities matching a condition", () =>
    {
        const world = new World();

        _populateWorld(world);

        const first = world.getComponents(TestComponent3, TestComponent1)!;
        const second = world.getComponent(TestComponent4);
        const iterator = world.findComponents(TestComponent2).toArray();
        const view = Array.from(world.getComponentView(TestComponent1).values());

        expect(view.length).toBe(4);
        expect(view[0][0].entity!.id).toBe(1);
        expect(view[1][0].entity!.id).toBe(2);
        expect(view[2][0].entity!.id).toBe(3);
        expect(view[3][0].entity!.id).toBe(5);

        expect(iterator.length).toBe(4);
        expect(iterator[0][0].entity!.id).toBe(2);
        expect(iterator[1][0].entity!.id).toBe(5);
        expect(iterator[2][0].entity!.id).toBe(6);
        expect(iterator[3][0].entity!.id).toBe(7);

        expect(first[0].entity!.id).toBe(3);
        expect(second).toBeUndefined();
    });

    it("Should reactively update entities when entities are added", () =>
    {
        const world = new World();

        _populateWorld(world);

        const view = world.getComponentView(TestComponent1, TestComponent3);

        const before = Array.from(view.values());
        expect(before.length).toBe(2);
        expect(before[0][0].entity!.id).toBe(3);
        expect(before[1][0].entity!.id).toBe(5);

        const entity = new Entity()
            .addComponent(new TestComponent3())
            .addComponent(new TestComponent1());

        Object.defineProperty(entity, "id", { value: 10 });

        world.addEntity(entity);

        const after = Array.from(view.values());
        expect(after.length).toBe(3);
        expect(after[0][0].entity!.id).toBe(3);
        expect(after[1][0].entity!.id).toBe(5);
        expect(after[2][0].entity!.id).toBe(10);
    });
    it("Should reactively update entities when entities are removed", () =>
    {
        const world = new World();

        _populateWorld(world);

        const view = world.getComponentView(TestComponent2, TestComponent3);

        const before = Array.from(view.values());
        expect(before.length).toBe(2);
        expect(before[0][0].entity!.id).toBe(5);
        expect(before[1][0].entity!.id).toBe(6);

        const { entity } = before[1][0];
        entity!.removeComponent(TestComponent2);

        const after = Array.from(view.values());
        expect(after.length).toBe(1);
        expect(after[0][0].entity!.id).toBe(5);
    });

    it("Should be disposed correctly", () =>
    {
        const world = new World();

        _populateWorld(world);

        const entities = world.getComponentView(TestComponent3);

        const before = Array.from(entities.values());
        expect(before.length).toBe(4);
        expect(before[0][0].entity!.id).toBe(3);
        expect(before[1][0].entity!.id).toBe(4);
        expect(before[2][0].entity!.id).toBe(5);
        expect(before[3][0].entity!.id).toBe(6);

        world.dispose();

        const after = Array.from(entities.values());
        expect(after.length).toBe(0);
    });
});
