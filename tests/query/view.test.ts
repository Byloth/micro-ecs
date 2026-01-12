import { beforeEach, describe, expect, it, vi } from "vitest";

import { Component, Entity } from "../../src/index.js";
import QueryView from "../../src/query/view.js";

class TestComponent1 extends Component { }
class TestComponent2 extends Component { }

describe("QueryView", () =>
{
    let _view: QueryView<[TestComponent1]>;

    beforeEach(() =>
    {
        _view = new QueryView<[TestComponent1]>();
    });

    describe("Initialization", () =>
    {
        it("Should be initialized with default values", () =>
        {
            expect(_view.size).toBe(0);
            expect(_view.entities).toEqual([]);
            expect(_view.components).toEqual([]);
        });
        it("Should be initialized with an iterable", () =>
        {
            const entity1 = new Entity();
            const entity2 = new Entity();

            const component1 = new TestComponent1();
            const component2 = new TestComponent1();

            const view = new QueryView<[TestComponent1]>([
                [entity1, [component1]],
                [entity2, [component2]]
            ]);

            expect(view.size).toBe(2);
            expect(view.entities).toContain(entity1);
            expect(view.entities).toContain(entity2);
        });
    });

    describe("Basic operations", () =>
    {
        it("Should be able to add an entity with components using set()", () =>
        {
            const entity = new Entity();
            const component = new TestComponent1();

            _view.set(entity, [component]);

            expect(_view.size).toBe(1);
            expect(_view.has(entity)).toBe(true);
            expect(_view.get(entity)).toEqual([component]);
        });
        it("Should update components when setting an existing entity", () =>
        {
            const entity = new Entity();
            const component1 = new TestComponent1();
            const component2 = new TestComponent1();

            _view.set(entity, [component1]);
            _view.set(entity, [component2]);

            expect(_view.size).toBe(1);
            expect(_view.get(entity)).toEqual([component2]);
        });

        it("Should be able to check if an entity exists using has()", () =>
        {
            const entity1 = new Entity();
            const entity2 = new Entity();
            const component = new TestComponent1();

            _view.set(entity1, [component]);

            expect(_view.has(entity1)).toBe(true);
            expect(_view.has(entity2)).toBe(false);
        });

        it("Should be able to get components for an entity using get()", () =>
        {
            const entity = new Entity();
            const component = new TestComponent1();

            _view.set(entity, [component]);
            expect(_view.get(entity)).toEqual([component]);
        });
        it("Should return undefined when getting a non-existent entity", () =>
        {
            const entity = new Entity();

            expect(_view.get(entity)).toBeUndefined();
        });

        it("Should be able to remove an entity using delete()", () =>
        {
            const entity = new Entity();
            const component = new TestComponent1();

            _view.set(entity, [component]);

            const result = _view.delete(entity);
            expect(result).toBe(true);
            expect(_view.size).toBe(0);
            expect(_view.has(entity)).toBe(false);
        });
        it("Should return false when deleting a non-existent entity", () =>
        {
            const entity = new Entity();

            const result = _view.delete(entity);
            expect(result).toBe(false);
        });
        it("Should maintain correct indexes after deleting an entity", () =>
        {
            const entity1 = new Entity();
            const entity2 = new Entity();
            const entity3 = new Entity();

            const component1 = new TestComponent1();
            const component2 = new TestComponent1();
            const component3 = new TestComponent1();

            _view.set(entity1, [component1]);
            _view.set(entity2, [component2]);
            _view.set(entity3, [component3]);

            _view.delete(entity1);

            expect(_view.size).toBe(2);
            expect(_view.has(entity1)).toBe(false);
            expect(_view.has(entity2)).toBe(true);
            expect(_view.has(entity3)).toBe(true);
            expect(_view.get(entity2)).toEqual([component2]);
            expect(_view.get(entity3)).toEqual([component3]);
        });

        it("Should be able to clear all entities using clear()", () =>
        {
            const entity1 = new Entity();
            const entity2 = new Entity();
            const component1 = new TestComponent1();
            const component2 = new TestComponent1();

            _view.set(entity1, [component1]);
            _view.set(entity2, [component2]);

            _view.clear();

            expect(_view.size).toBe(0);
            expect(_view.entities).toEqual([]);
            expect(_view.components).toEqual([]);
        });
    });

    describe("Events", () =>
    {
        it("Should trigger 'add' event when an entity is added", () =>
        {
            const callback = vi.fn();
            const entity = new Entity();
            const component = new TestComponent1();

            _view.onAdd(callback);
            _view.set(entity, [component]);

            expect(callback).toHaveBeenCalledTimes(1);
            expect(callback).toHaveBeenCalledWith(entity, [component]);
        });
        it("Should not trigger 'add' event when updating an existing entity", () =>
        {
            const callback = vi.fn();
            const entity = new Entity();
            const component1 = new TestComponent1();
            const component2 = new TestComponent1();

            _view.set(entity, [component1]);
            _view.onAdd(callback);
            _view.set(entity, [component2]);

            expect(callback).not.toHaveBeenCalled();
        });

        it("Should trigger 'remove' event when an entity is removed", () =>
        {
            const callback = vi.fn();
            const entity = new Entity();
            const component = new TestComponent1();

            _view.set(entity, [component]);
            _view.onRemove(callback);
            _view.delete(entity);

            expect(callback).toHaveBeenCalledTimes(1);
            expect(callback).toHaveBeenCalledWith(entity, [component]);
        });
        it("Should not trigger 'remove' event when deleting a non-existent entity", () =>
        {
            const callback = vi.fn();
            const entity = new Entity();

            _view.onRemove(callback);
            _view.delete(entity);

            expect(callback).not.toHaveBeenCalled();
        });

        it("Should trigger 'clear' event when the view is cleared", () =>
        {
            const callback = vi.fn();
            const entity = new Entity();
            const component = new TestComponent1();

            _view.set(entity, [component]);
            _view.onClear(callback);
            _view.clear();

            expect(callback).toHaveBeenCalledTimes(1);
        });
        it("Should not trigger 'clear' event when the view is already empty", () =>
        {
            const callback = vi.fn();

            _view.onClear(callback);
            _view.clear();

            expect(callback).not.toHaveBeenCalled();
        });

        it("Should be able to unsubscribe from events", () =>
        {
            const callback = vi.fn();
            const entity = new Entity();
            const component = new TestComponent1();

            const unsubscribe = _view.onAdd(callback);
            unsubscribe();

            _view.set(entity, [component]);

            expect(callback).not.toHaveBeenCalled();
        });
    });

    describe("Multiple components", () =>
    {
        it("Should handle views with multiple component types", () =>
        {
            const view = new QueryView<[TestComponent1, TestComponent2]>();
            const entity = new Entity();
            const component1 = new TestComponent1();
            const component2 = new TestComponent2();

            view.set(entity, [component1, component2]);

            expect(view.size).toBe(1);
            expect(view.get(entity)).toEqual([component1, component2]);
        });
    });

    describe("Edge cases", () =>
    {
        it("Should handle deletion of the first and only element", () =>
        {
            const entity = new Entity();
            const component = new TestComponent1();

            _view.set(entity, [component]);
            _view.delete(entity);

            expect(_view.size).toBe(0);
            expect(_view.has(entity)).toBe(false);
        });
        it("Should handle deletion from the middle of the list correctly", () =>
        {
            const entities = [new Entity(), new Entity(), new Entity(), new Entity(), new Entity()];
            const components = entities.map(() => new TestComponent1());

            entities.forEach((entity, index) =>
            {
                _view.set(entity, [components[index]]);
            });

            expect(_view.size).toBe(5);

            _view.delete(entities[2]);

            expect(_view.size).toBe(4);
            expect(_view.has(entities[0])).toBe(true);
            expect(_view.has(entities[1])).toBe(true);
            expect(_view.has(entities[2])).toBe(false);
            expect(_view.has(entities[3])).toBe(true);
            expect(_view.has(entities[4])).toBe(true);

            expect(_view.get(entities[0])).toEqual([components[0]]);
            expect(_view.get(entities[1])).toEqual([components[1]]);
            expect(_view.get(entities[3])).toEqual([components[3]]);
            expect(_view.get(entities[4])).toEqual([components[4]]);
        });
        it("Should handle deletion of the last element", () =>
        {
            const entity1 = new Entity();
            const entity2 = new Entity();
            const component1 = new TestComponent1();
            const component2 = new TestComponent1();

            _view.set(entity1, [component1]);
            _view.set(entity2, [component2]);

            _view.delete(entity2);

            expect(_view.size).toBe(1);
            expect(_view.has(entity1)).toBe(true);
            expect(_view.has(entity2)).toBe(false);
            expect(_view.get(entity1)).toEqual([component1]);
        });
    });

    describe("Iteration", () =>
    {
        it("Should be iterable with for...of", () =>
        {
            const entity1 = new Entity();
            const entity2 = new Entity();
            const component1 = new TestComponent1();
            const component2 = new TestComponent1();

            _view.set(entity1, [component1]);
            _view.set(entity2, [component2]);

            const results: [Entity, [TestComponent1]][] = [];
            for (const entry of _view)
            {
                results.push(entry);
            }

            expect(results).toHaveLength(2);
            expect(results).toContainEqual([entity1, [component1]]);
            expect(results).toContainEqual([entity2, [component2]]);
        });
        it("Should yield tuples of [entity, components]", () =>
        {
            const entity = new Entity();
            const component = new TestComponent1();

            _view.set(entity, [component]);

            const iterator = _view[Symbol.iterator]();
            const result = iterator.next();

            expect(result.done).toBe(false);
            expect(result.value).toEqual([entity, [component]]);
        });
        it("Should allow destructuring in for...of", () =>
        {
            const entity = new Entity();
            const component = new TestComponent1();

            _view.set(entity, [component]);

            for (const [e, [c]] of _view)
            {
                expect(e).toBe(entity);
                expect(c).toBe(component);
            }
        });
    });
});
