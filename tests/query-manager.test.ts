import type { Constructor } from "@byloth/core";
import { beforeEach, describe, it, expect, vi } from "vitest";

import { Component, Entity, World } from "../src/index.js";

class TestComponent1 extends Component { }
class TestComponent2 extends Component { }
class TestComponent3 extends Component { }
class TestComponent4 extends Component { }

describe("QueryManager", () =>
{
    let _world: World;

    beforeEach(() =>
    {
        _world = new World();

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

            _world.addEntity(entity);
        }
    });

    it("Should retrieve entities matching a condition", () =>
    {
        const first = _world.getFirstComponents(TestComponent3, TestComponent1)!;
        const second = _world.getFirstComponent(TestComponent4);
        const iterator = _world.findAllComponents(TestComponent2).toArray();
        const view = Array.from(_world.getComponentView(TestComponent1).values());

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
        it("Should reactively update view when components are added", () =>
        {
            const view = _world.getComponentView(TestComponent1, TestComponent3);

            const before = Array.from(view.values());
            expect(before.length).toBe(2);
            expect(before[0][0].entity!.id).toBe(3);
            expect(before[1][0].entity!.id).toBe(5);

            const entity = _world.entities.get(2)!;
            entity.addComponent(new TestComponent3());

            const after = Array.from(view.values());
            expect(after.length).toBe(3);
            expect(after[0][0].entity!.id).toBe(3);
            expect(after[1][0].entity!.id).toBe(5);
            expect(after[2][0].entity!.id).toBe(2);
        });
        it("Should reactively update view when components are enabled", () =>
        {
            const view = _world.getComponentView(TestComponent1, TestComponent3);

            const before = Array.from(view.values());
            expect(before.length).toBe(2);
            expect(before[0][0].entity!.id).toBe(3);
            expect(before[1][0].entity!.id).toBe(5);

            const entity1 = _world.entities.get(1)!;
            entity1.components.get(TestComponent3)!
                .enable();

            const entity2 = _world.entities.get(9)!;
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
        it("Should reactively update view when components are disabled", () =>
        {
            const view = _world.getComponentView(TestComponent1, TestComponent3);

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
        it("Should reactively update view when components are removed", () =>
        {
            const view = _world.getComponentView(TestComponent1, TestComponent3);

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
        it("Should reactively update view when entities are added", () =>
        {
            const view = _world.getComponentView(TestComponent2, TestComponent3);

            const before = Array.from(view.values());
            expect(before.length).toBe(2);
            expect(before[0][0].entity!.id).toBe(5);
            expect(before[1][0].entity!.id).toBe(7);

            const entity = new Entity();
            entity.addComponent(new TestComponent3());
            entity.addComponent(new TestComponent2());

            Object.defineProperty(entity, "id", { value: 10 });

            _world.addEntity(entity);

            const after = Array.from(view.values());
            expect(after.length).toBe(3);
            expect(after[0][0].entity!.id).toBe(5);
            expect(after[1][0].entity!.id).toBe(7);
            expect(after[2][0].entity!.id).toBe(10);
        });
        it("Should reactively update view when entities are enabled", () =>
        {
            const view = _world.getComponentView(TestComponent2, TestComponent3);

            const before = Array.from(view.values());
            expect(before.length).toBe(2);
            expect(before[0][0].entity!.id).toBe(5);
            expect(before[1][0].entity!.id).toBe(7);

            _world.entities.get(6)!
                .enable();

            const after = Array.from(view.values());
            expect(after.length).toBe(3);
            expect(after[0][0].entity!.id).toBe(5);
            expect(after[1][0].entity!.id).toBe(7);
            expect(after[2][0].entity!.id).toBe(6);
        });
        it("Should reactively update view when components are disabled", () =>
        {
            const view = _world.getComponentView(TestComponent2, TestComponent3);

            const before = Array.from(view.values());
            expect(before.length).toBe(2);
            expect(before[0][0].entity!.id).toBe(5);
            expect(before[1][0].entity!.id).toBe(7);

            before[1][0].entity!.disable();

            const after = Array.from(view.values());
            expect(after.length).toBe(1);
            expect(after[0][0].entity!.id).toBe(5);
        });
        it("Should reactively update view when entities are removed", () =>
        {
            const view = _world.getComponentView(TestComponent2, TestComponent3);

            const before = Array.from(view.values());
            expect(before.length).toBe(2);
            expect(before[0][0].entity!.id).toBe(5);
            expect(before[1][0].entity!.id).toBe(7);

            const entity1 = before[0][0].entity!;
            const entity2 = before[1][0].entity!;

            _world.removeEntity(entity1.id);
            _world.removeEntity(entity2);

            const after = Array.from(view.values());
            expect(after.length).toBe(0);
        });
    });
    describe("When parent entities are manipulated", () =>
    {
        beforeEach(() =>
        {
            _world = new World();

            const parent1 = new Entity();
            const parent2 = new Entity(false);

            Object.defineProperty(parent1, "id", { value: 1 });
            Object.defineProperty(parent2, "id", { value: 2 });

            const child1 = new Entity(false);
            const child2 = new Entity();
            const child3 = new Entity();
            const child4 = new Entity(false);

            Object.defineProperty(child1, "id", { value: 3 });
            Object.defineProperty(child2, "id", { value: 4 });
            Object.defineProperty(child3, "id", { value: 5 });
            Object.defineProperty(child4, "id", { value: 6 });

            parent1.addChild(child1);
            parent1.addChild(child2);

            parent2.addChild(child3);
            parent2.addChild(child4);

            parent1.addComponent(new TestComponent1());
            parent2.addComponent(new TestComponent2());
            parent2.addComponent(new TestComponent3());

            child1.addComponent(new TestComponent1());
            child2.addComponent(new TestComponent1());
            child2.addComponent(new TestComponent2());
            child2.addComponent(new TestComponent3());

            child3.addComponent(new TestComponent1());
            child4.addComponent(new TestComponent2());
            child4.addComponent(new TestComponent3());

            _world.addEntity(parent1);
            _world.addEntity(parent2);
        });

        it("Should reactively update view when parent entities are added", () =>
        {
            const view = _world.getComponentView(TestComponent1);

            const before = Array.from(view.values());
            expect(before.length).toBe(2);
            expect(before[0][0].entity!.id).toBe(1);
            expect(before[1][0].entity!.id).toBe(4);

            const parent = new Entity(false);
            Object.defineProperty(parent, "id", { value: 7 });

            const child = new Entity();
            Object.defineProperty(child, "id", { value: 8 });

            child.addComponent(new TestComponent1());
            parent.addChild(child);

            _world.addEntity(parent);

            expect(view.size).toBe(2);

            parent.enable();

            const after = Array.from(view.values());
            expect(after.length).toBe(3);
            expect(before[0][0].entity!.id).toBe(1);
            expect(before[1][0].entity!.id).toBe(4);
            expect(after[2][0].entity!.id).toBe(8);
        });
        it("Should reactively update view when parent entities are enabled", () =>
        {
            const view = _world.getComponentView(TestComponent1);

            const before = Array.from(view.values());
            expect(before.length).toBe(2);
            expect(before[0][0].entity!.id).toBe(1);
            expect(before[1][0].entity!.id).toBe(4);

            _world.entities.get(2)!.enable();

            const after = Array.from(view.values());
            expect(after.length).toBe(3);
            expect(after[0][0].entity!.id).toBe(1);
            expect(after[1][0].entity!.id).toBe(4);
            expect(after[2][0].entity!.id).toBe(5);
        });
        it("Should reactively update view when parent entities are disabled", () =>
        {
            _world.entities.get(2)!.enable();

            const view = _world.getComponentView(TestComponent2, TestComponent3);

            const before = Array.from(view.values());
            expect(before.length).toBe(2);
            expect(before[0][0].entity!.id).toBe(4);
            expect(before[1][0].entity!.id).toBe(2);

            _world.entities.get(1)!.disable();

            const after = Array.from(view.values());
            expect(after.length).toBe(2);
            expect(after[0][0].entity!.id).toBe(4);
            expect(after[1][0].entity!.id).toBe(2);
        });
        it("Should reactively update view when parent entities are removed", () =>
        {
            const view = _world.getComponentView(TestComponent2, TestComponent3);
            expect(view.size).toBe(1);

            _world.entities.get(6)!.enable();
            expect(view.size).toBe(1);

            _world.entities.get(2)!.enable();

            const before = Array.from(view.values());
            expect(before.length).toBe(3);
            expect(before[0][0].entity!.id).toBe(4);
            expect(before[1][0].entity!.id).toBe(2);
            expect(before[2][0].entity!.id).toBe(6);

            _world.removeEntity(1);
            expect(view.size).toBe(2);
            _world.removeEntity(2);

            const after = Array.from(view.values());
            expect(after.length).toBe(0);
        });
    });

    it("Should reactively be called once when an entity with multiple components is added", () =>
    {
        const _onEntryAdd = vi.fn();

        const view = _world.getComponentView(TestComponent1, TestComponent2);
        view.subscribe("entry:add", _onEntryAdd);

        const entity1 = new Entity();
        entity1.addComponent(new TestComponent1());
        entity1.addComponent(new TestComponent2());

        const entity2 = new Entity();
        entity2.addComponent(new TestComponent1());
        entity2.addComponent(new TestComponent2());

        _world.addEntity(entity1);
        _world.addEntity(entity2);

        expect(_onEntryAdd).toHaveBeenCalledTimes(2);
    });

    it("Should be disposed correctly", () =>
    {
        const entities = _world.getComponentView(TestComponent3);

        const before = Array.from(entities.values());
        expect(before.length).toBe(4);
        expect(before[0][0].entity!.id).toBe(3);
        expect(before[1][0].entity!.id).toBe(4);
        expect(before[2][0].entity!.id).toBe(5);
        expect(before[3][0].entity!.id).toBe(7);

        _world.dispose();

        const after = Array.from(entities.values());
        expect(after.length).toBe(0);
    });
});
