import { describe, it, expect, vi } from "vitest";

import { Component, Entity, World } from "../src/index.js";

describe("Entity", () =>
{
    it("Should be initialized with default values", () =>
    {
        const entity = new Entity();

        expect(entity.id).toBeGreaterThan(0);

        expect(() => entity.world).toThrow();
        expect(entity.parent).toBeNull();

        expect(entity.components.size).toBe(0);
        expect(entity.children.size).toBe(0);
        expect(entity.tags.size).toBe(0);
    });

    it("Should be able to add and retrieve a component", () =>
    {
        class TestComponent extends Component { }

        const entity = new Entity();
        const component = new TestComponent();

        entity.addComponent(component);

        expect(entity.hasComponent(TestComponent)).toBe(true);
        expect(entity.getComponent(TestComponent)).toBe(component);
        expect(entity.components.size).toBe(1);
    });
    it("Should throw an error when adding a duplicate component", () =>
    {
        class TestComponent extends Component { }

        const entity = new Entity();
        const component = new TestComponent();

        entity.addComponent(component);

        expect(() => entity.addComponent(component)).toThrow();
    });

    it("Should be able to remove a component", () =>
    {
        class TestComponent extends Component { }

        const entity = new Entity();
        const component = new TestComponent();

        entity.addComponent(component);
        entity.removeComponent(TestComponent);

        expect(entity.hasComponent(TestComponent)).toBe(false);
        expect(entity.components.size).toBe(0);
    });
    it("Should throw an error when removing a non-existent component", () =>
    {
        class TestComponent extends Component { }

        const entity = new Entity();

        expect(() => entity.removeComponent(TestComponent)).toThrow();
    });

    it("Should be able to add and retrieve a child entity", () =>
    {
        const parent = new Entity();
        const child = new Entity();

        parent.addChild(child);

        expect(parent.children.has(child)).toBe(true);
        expect(parent.children.size).toBe(1);
        expect(child.parent).toBe(parent);
    });
    it("Should be able to remove a child entity", () =>
    {
        const parent = new Entity();
        const child = new Entity();

        parent.addChild(child);
        parent.removeChild(child);

        expect(parent.children.has(child)).toBe(false);
        expect(parent.children.size).toBe(0);
        expect(child.parent).toBeNull();
    });
    it("Should throw an error when removing a non-existent child entity", () =>
    {
        const parent = new Entity();
        const child = new Entity();

        expect(() => parent.removeChild(child)).toThrow();
    });

    it("Should share the same world with its children", () =>
    {
        const world = new World();
        const parent = new Entity();
        const child = new Entity();

        parent.addChild(child);
        world.addEntity(parent);

        expect(parent.world).toBe(world);
        expect(child.world).toBe(world);
    });

    it("Should be able to add and retrieve a tag", () =>
    {
        const entity = new Entity();

        entity.addTag("tag:test");

        expect(entity.hasTag("tag:test")).toBe(true);
        expect(entity.tags.has("tag:test")).toBe(true);
        expect(entity.tags.size).toBe(1);
    });
    it("Should throw an error when adding a duplicate tag", () =>
    {
        const entity = new Entity();

        entity.addTag("tag:test");

        expect(() => entity.addTag("tag:test")).toThrow();
        expect(entity.tags.size).toBe(1);
    });

    it("Should be able to remove a tag", () =>
    {
        const entity = new Entity();

        entity.addTag("tag:test");
        entity.removeTag("tag:test");

        expect(entity.hasTag("tag:test")).toBe(false);
        expect(entity.tags.size).toBe(0);
    });
    it("Should throw an error when removing a non-existent tag", () =>
    {
        const entity = new Entity();

        expect(() => entity.removeTag("tag:test")).toThrow();
    });

    it("Should be attachable to a world", () =>
    {
        const _onAttach = vi.fn(() => { /* ... */ });
        class TestEntity extends Entity
        {
            public override onAttach(world: World): void
            {
                super.onAttach(world);
                _onAttach();
            }
        }

        const world = new World();
        const entity = new TestEntity();

        world.addEntity(entity);

        expect(entity.world).toBe(world);
        expect(_onAttach).toHaveBeenCalledTimes(1);
    });
    it("Should throw an error if attached to a world while already attached to another", () =>
    {
        const _onAttach = vi.fn(() => { /* ... */ });
        class TestEntity extends Entity
        {
            public override onAttach(world: World): void
            {
                super.onAttach(world);
                _onAttach();
            }
        }

        const world1 = new World();
        const world2 = new World();
        const entity = new TestEntity();

        world1.addEntity(entity);

        expect(() => world2.addEntity(entity)).toThrow();
    });

    it("Should be detachable from a world", () =>
    {
        const _onDetach = vi.fn(() => { /* ... */ });
        class TestEntity extends Entity
        {
            public override onDetach(): void
            {
                super.onDetach();

                _onDetach();
            }
        }

        const world = new World();
        const entity = new TestEntity();

        world.addEntity(entity);
        world.removeEntity(entity.id);

        expect(() => entity.world).toThrow();
        expect(_onDetach).toHaveBeenCalledTimes(1);
    });
    it("Should throw an error if detached from a world while not attached to one", () =>
    {
        const _onDetach = vi.fn(() => { /* ... */ });
        class TestEntity extends Entity
        {
            public override onDetach(): void
            {
                super.onDetach();

                _onDetach();
            }
        }

        const world = new World();
        const entity = new TestEntity();

        world.addEntity(entity);
        world.removeEntity(entity.id);

        expect(() => world.removeEntity(entity.id)).toThrow();
    });

    it("Should be disposable", () =>
    {
        const _dispose = vi.fn(() => { /* ... */ });

        class TestComponent extends Component { }
        class TestEntity extends Entity
        {
            public override dispose(): void
            {
                super.dispose();

                _dispose();
            }
        }

        const world = new World();
        const parent = new TestEntity();
        const child = new TestEntity();

        parent.addChild(child);
        parent.addComponent(new TestComponent());
        parent.addTag("tag:test");

        world.addEntity(parent);
        parent.dispose();

        expect(parent.world).toBeNull();

        expect(parent.hasComponent(TestComponent)).toBe(false);
        expect(parent.components.size).toBe(0);

        expect(parent.hasTag("tag:test")).toBe(false);
        expect(parent.tags.size).toBe(0);

        expect(parent.children.has(child)).toBe(false);
        expect(parent.children.size).toBe(0);

        expect(child.world).toBeNull();
        expect(child.parent).toBeNull();

        expect(_dispose).toHaveBeenCalledTimes(2);
    });
});
