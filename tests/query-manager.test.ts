import type { Constructor } from "@byloth/core";
import { describe, it, expect, vi } from "vitest";

import { Component, Entity, World } from "../src/index.js";

describe("QueryManager", () =>
{
    class TestComponent1 extends Component { }
    class TestComponent2 extends Component { }
    class TestComponent3 extends Component { }
    class TestComponent4 extends Component { }

    const _populateWorld = (world: World): void =>
    {
        const definitions: [[Constructor<Component>, boolean][], boolean][] = [
            [[[TestComponent3, false], [TestComponent1, true]], true],
            [[[TestComponent2, true], [TestComponent1, true]], true],
            [[[TestComponent1, true], [TestComponent3, true]], true],
            [[[TestComponent2, false], [TestComponent3, true]], true],
            [[[TestComponent2, true], [TestComponent3, true], [TestComponent1, true]], true],
            [[[TestComponent2, true], [TestComponent3, true], [TestComponent1, true]], false],
            [[[TestComponent3, true], [TestComponent2, true]], true],
            [[[TestComponent2, true], [TestComponent1, false]], true],
            [[[TestComponent1, false], [TestComponent3, false], [TestComponent2, false]], true]
        ];

        let index = 0;
        for (const [components, entityEnabled] of definitions)
        {
            const entity = new Entity(entityEnabled);

            for (const [C, componentEnabled] of components)
            {
                entity.addComponent(new C(componentEnabled));
            }

            Object.defineProperty(entity, "id", { value: (index += 1) });

            world.addEntity(entity);
        }
    };

    it("Should retrieve entities matching a condition", () =>
    {
        const world = new World();

        _populateWorld(world);

        const first = world.getFirstComponents(TestComponent3, TestComponent1)!;
        const second = world.getFirstComponent(TestComponent4);
        const iterator = world.findAllComponents(TestComponent2).toArray();
        const view = Array.from(world.getComponentView(TestComponent1).values());

        expect(view.length).toBe(4);
        expect(view[0][0].entity!.id).toBe(1);
        expect(view[1][0].entity!.id).toBe(2);
        expect(view[2][0].entity!.id).toBe(3);
        expect(view[3][0].entity!.id).toBe(5);

        expect(iterator.length).toBe(4);
        expect(iterator[0][0].entity!.id).toBe(2);
        expect(iterator[1][0].entity!.id).toBe(5);
        expect(iterator[2][0].entity!.id).toBe(7);
        expect(iterator[3][0].entity!.id).toBe(8);

        expect(first[0].entity!.id).toBe(3);
        expect(second).toBeUndefined();
    });

    describe("When components are manipulated", () =>
    {
        it("Should reactively update entities when components are added", () =>
        {
            const world = new World();

            _populateWorld(world);

            const view = world.getComponentView(TestComponent1, TestComponent3);

            const before = Array.from(view.values());
            expect(before.length).toBe(2);
            expect(before[0][0].entity!.id).toBe(3);
            expect(before[1][0].entity!.id).toBe(5);

            const entity = world.entities.get(2)!;
            entity.addComponent(new TestComponent3());

            const after = Array.from(view.values());
            expect(after.length).toBe(3);
            expect(after[0][0].entity!.id).toBe(3);
            expect(after[1][0].entity!.id).toBe(5);
            expect(after[2][0].entity!.id).toBe(2);
        });
        it("Should reactively update entities when components are enabled", () =>
        {
            const world = new World();

            _populateWorld(world);

            const view = world.getComponentView(TestComponent1, TestComponent3);

            const before = Array.from(view.values());
            expect(before.length).toBe(2);
            expect(before[0][0].entity!.id).toBe(3);
            expect(before[1][0].entity!.id).toBe(5);

            const entity1 = world.entities.get(1)!;
            entity1.components.get(TestComponent3)!
                .enable();

            const entity2 = world.entities.get(9)!;
            entity2.components.get(TestComponent1)!
                .enable();

            entity2.components.get(TestComponent3)!
                .enable();

            const after = Array.from(view.values());
            expect(after.length).toBe(4);
            expect(after[0][0].entity!.id).toBe(3);
            expect(after[1][0].entity!.id).toBe(5);
            expect(after[2][0].entity!.id).toBe(1);
            expect(after[3][0].entity!.id).toBe(9);
        });
        it("Should reactively update entities when components are disabled", () =>
        {
            const world = new World();

            _populateWorld(world);

            const view = world.getComponentView(TestComponent1, TestComponent3);

            const before = Array.from(view.values());
            expect(before.length).toBe(2);
            expect(before[0][0].entity!.id).toBe(3);
            expect(before[1][0].entity!.id).toBe(5);

            const [entity1, entity2] = before;
            entity1[1].disable();
            entity2[0].disable();

            const after = Array.from(view.values());
            expect(after.length).toBe(0);
        });
        it("Should reactively update entities when components are removed", () =>
        {
            const world = new World();

            _populateWorld(world);

            const view = world.getComponentView(TestComponent1, TestComponent3);

            const before = Array.from(view.values());
            expect(before.length).toBe(2);
            expect(before[0][0].entity!.id).toBe(3);
            expect(before[1][0].entity!.id).toBe(5);

            const { entity } = before[0][0];
            entity!.removeComponent(TestComponent1);

            const after = Array.from(view.values());
            expect(after.length).toBe(1);
            expect(after[0][0].entity!.id).toBe(5);
        });
    });

    describe("When entities are manipulated", () =>
    {
        it("Should reactively update entities when entities are added", () =>
        {
            const world = new World();

            _populateWorld(world);

            const view = world.getComponentView(TestComponent2, TestComponent3);

            const before = Array.from(view.values());
            expect(before.length).toBe(2);
            expect(before[0][0].entity!.id).toBe(5);
            expect(before[1][0].entity!.id).toBe(7);

            const entity = new Entity();
            entity.addComponent(new TestComponent3());
            entity.addComponent(new TestComponent2());

            Object.defineProperty(entity, "id", { value: 9 });

            world.addEntity(entity);

            const after = Array.from(view.values());
            expect(after.length).toBe(3);
            expect(after[0][0].entity!.id).toBe(5);
            expect(after[1][0].entity!.id).toBe(7);
            expect(after[2][0].entity!.id).toBe(9);
        });
        it("Should reactively update entities when entities are enabled", () =>
        {
            const world = new World();

            _populateWorld(world);

            const view = world.getComponentView(TestComponent2, TestComponent3);

            const before = Array.from(view.values());
            expect(before.length).toBe(2);
            expect(before[0][0].entity!.id).toBe(5);
            expect(before[1][0].entity!.id).toBe(7);

            world.entities.get(6)!
                .enable();

            const after = Array.from(view.values());
            expect(after.length).toBe(3);
            expect(after[0][0].entity!.id).toBe(5);
            expect(after[1][0].entity!.id).toBe(7);
            expect(after[2][0].entity!.id).toBe(6);
        });
        it("Should reactively update entities when components are disabled", () =>
        {
            const world = new World();

            _populateWorld(world);

            const view = world.getComponentView(TestComponent2, TestComponent3);

            const before = Array.from(view.values());
            expect(before.length).toBe(2);
            expect(before[0][0].entity!.id).toBe(5);
            expect(before[1][0].entity!.id).toBe(7);

            before[1][0].entity!.disable();

            const after = Array.from(view.values());
            expect(after.length).toBe(1);
            expect(after[0][0].entity!.id).toBe(5);
        });
        it("Should reactively update entities when entities are removed", () =>
        {
            const world = new World();

            _populateWorld(world);

            const view = world.getComponentView(TestComponent2, TestComponent3);

            const before = Array.from(view.values());
            expect(before.length).toBe(2);
            expect(before[0][0].entity!.id).toBe(5);
            expect(before[1][0].entity!.id).toBe(7);

            const entity1 = before[0][0].entity!;
            const entity2 = before[1][0].entity!;

            world.removeEntity(entity1.id);
            world.removeEntity(entity2);

            const after = Array.from(view.values());
            expect(after.length).toBe(0);
        });
    });
    describe("When child entities are manipulated", () =>
    {
        
    });

    it("Should reactively be called once when an entity with multiple components is added", () =>
    {
        const _onEntryAdd = vi.fn();

        const world = new World();
        const view = world.getComponentView(TestComponent1, TestComponent2);

        view.subscribe("entry:add", _onEntryAdd);

        _populateWorld(world);

        expect(_onEntryAdd).toHaveBeenCalledTimes(2);
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
        expect(before[3][0].entity!.id).toBe(7);

        world.dispose();

        const after = Array.from(entities.values());
        expect(after.length).toBe(0);
    });
});
