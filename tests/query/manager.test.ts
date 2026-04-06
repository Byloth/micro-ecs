import { beforeEach, describe, expect, it, vi } from "vitest";

import { Component, Entity, World } from "../../src/index.js";
import type { ComponentType } from "../../src/index.js";

class TestEntity extends Entity
{
    public override initialize(world: World, enabled = true): void
    {
        super.initialize(world);
        this._isEnabled = enabled;
    }
}

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

        const definitions: [[ComponentType, boolean][], boolean][] = [
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

        Object.defineProperty(Entity, "__μECS_NextId__", { value: 0, writable: true });

        for (const [components, entityEnabled] of definitions)
        {
            const entity = _world.createEntity(TestEntity, entityEnabled);

            for (const [C, componentEnabled] of components)
            {
                const comp = entity.createComponent(C);
                if (!componentEnabled) { comp.disable(); }
            }
        }
    });

    it("Should retrieve entities matching component queries", () =>
    {
        const first = _world.getFirstComponents(TestComponent3, TestComponent1)!;
        const second = _world.getFirstComponent(TestComponent4);
        const iterator = _world.findAllComponents(TestComponent2).toArray();
        const view = Array.from(_world.getComponentView(TestComponent1).components);

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

    describe("Component manipulation", () =>
    {
        it("Should update the view when components are added", () =>
        {
            const view = _world.getComponentView(TestComponent1, TestComponent3);

            const before = Array.from(view.components);
            expect(before.length).toBe(2);
            expect(before[0][0].entity!.id).toBe(3);
            expect(before[1][0].entity!.id).toBe(5);

            const entity = _world.getEntity(2);
            entity.createComponent(TestComponent3);

            const after = Array.from(view.components);
            expect(after.length).toBe(3);
            expect(after[0][0].entity!.id).toBe(3);
            expect(after[1][0].entity!.id).toBe(5);
            expect(after[2][0].entity!.id).toBe(2);
        });
        it("Should update the view when components are enabled", () =>
        {
            const view = _world.getComponentView(TestComponent1, TestComponent3);

            const before = Array.from(view.components);
            expect(before.length).toBe(2);
            expect(before[0][0].entity!.id).toBe(3);
            expect(before[1][0].entity!.id).toBe(5);

            const entity1 = _world.getEntity(1);
            entity1.getComponent(TestComponent3)
                .enable();

            const entity2 = _world.getEntity(9);
            entity2.getComponent(TestComponent1)
                .enable();

            entity2.getComponent(TestComponent3)
                .enable();

            const after = Array.from(view.components);
            expect(after.length).toBe(4);
            expect(after[0][0].entity!.id).toBe(3);
            expect(after[1][0].entity!.id).toBe(5);
            expect(after[2][0].entity!.id).toBe(1);
            expect(after[3][0].entity!.id).toBe(9);
        });
        it("Should reactively update view when components are disabled", () =>
        {
            const view = _world.getComponentView(TestComponent1, TestComponent3);

            const before = Array.from(view.components);
            expect(before.length).toBe(2);
            expect(before[0][0].entity!.id).toBe(3);
            expect(before[1][0].entity!.id).toBe(5);

            const [entity1, entity2] = before;
            entity1[1].disable();
            entity2[0].disable();

            const after = Array.from(view.components);
            expect(after.length).toBe(0);
        });
        it("Should update the view when components are removed", () =>
        {
            const view = _world.getComponentView(TestComponent1, TestComponent3);

            const before = Array.from(view.components);
            expect(before.length).toBe(2);
            expect(before[0][0].entity!.id).toBe(3);
            expect(before[1][0].entity!.id).toBe(5);

            const { entity } = before[0][0];
            entity!.destroyComponent(TestComponent1);

            const after = Array.from(view.components);
            expect(after.length).toBe(1);
            expect(after[0][0].entity!.id).toBe(5);
        });
    });

    describe("Entity manipulation", () =>
    {
        it("Should update the view when entities are added", () =>
        {
            const view = _world.getComponentView(TestComponent2, TestComponent3);

            const before = Array.from(view.components);
            expect(before.length).toBe(2);
            expect(before[0][0].entity!.id).toBe(5);
            expect(before[1][0].entity!.id).toBe(7);

            const entity = _world.createEntity();
            entity.createComponent(TestComponent3);
            entity.createComponent(TestComponent2);

            const after = Array.from(view.components);
            expect(after.length).toBe(3);
            expect(after[0][0].entity!.id).toBe(5);
            expect(after[1][0].entity!.id).toBe(7);
            expect(after[2][0].entity!.id).toBe(10);
        });
        it("Should update the view when entities are enabled", () =>
        {
            const view = _world.getComponentView(TestComponent2, TestComponent3);

            const before = Array.from(view.components);
            expect(before.length).toBe(2);
            expect(before[0][0].entity!.id).toBe(5);
            expect(before[1][0].entity!.id).toBe(7);

            _world.getEntity(6)
                .enable();

            const after = Array.from(view.components);
            expect(after.length).toBe(3);
            expect(after[0][0].entity!.id).toBe(5);
            expect(after[1][0].entity!.id).toBe(7);
            expect(after[2][0].entity!.id).toBe(6);
        });
        it("Should update the view when entities are disabled", () =>
        {
            const view = _world.getComponentView(TestComponent2, TestComponent3);

            const before = Array.from(view.components);
            expect(before.length).toBe(2);
            expect(before[0][0].entity!.id).toBe(5);
            expect(before[1][0].entity!.id).toBe(7);

            before[1][0].entity!.disable();

            const after = Array.from(view.components);
            expect(after.length).toBe(1);
            expect(after[0][0].entity!.id).toBe(5);
        });
        it("Should update the view when entities are removed", () =>
        {
            const view = _world.getComponentView(TestComponent2, TestComponent3);

            const before = Array.from(view.components);
            expect(before.length).toBe(2);
            expect(before[0][0].entity!.id).toBe(5);
            expect(before[1][0].entity!.id).toBe(7);

            const entity1 = before[0][0].entity!;
            const entity2 = before[1][0].entity!;

            _world.destroyEntity(entity1.id);
            _world.destroyEntity(entity2);

            const after = Array.from(view.components);
            expect(after.length).toBe(0);
        });
    });

    it("Should trigger the add callback once when an entity with multiple components is added", () =>
    {
        const _onEntryAdd = vi.fn();

        const view = _world.getComponentView(TestComponent1, TestComponent2);
        view.onAdd(_onEntryAdd);

        const entity1 = _world.createEntity();
        entity1.createComponent(TestComponent1);
        entity1.createComponent(TestComponent2);

        const entity2 = _world.createEntity();
        entity2.createComponent(TestComponent1);
        entity2.createComponent(TestComponent2);

        expect(_onEntryAdd).toHaveBeenCalledTimes(2);
    });

    it("Should clear all views when the world is disposed", () =>
    {
        const entities = _world.getComponentView(TestComponent3);

        const before = Array.from(entities.components);
        expect(before.length).toBe(4);
        expect(before[0][0].entity!.id).toBe(3);
        expect(before[1][0].entity!.id).toBe(4);
        expect(before[2][0].entity!.id).toBe(5);
        expect(before[3][0].entity!.id).toBe(7);

        _world.dispose();

        const after = Array.from(entities.components);
        expect(after.length).toBe(0);
    });
});
