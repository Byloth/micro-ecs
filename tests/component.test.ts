import { ReferenceException, RuntimeException } from "@byloth/core";
import { describe, it, expect, vi } from "vitest";

import { AttachmentException, Component, Entity, World } from "../src/index.js";

describe("Component", () =>
{
    it("Should be initialized with a null entity", () =>
    {
        const component = new Component();
        expect(component.entity).toBeNull();
    });

    it("Should be attachable to an entity", async () =>
    {
        const _onAttach = vi.fn(() => { /* ... */ });
        class TestComponent extends Component
        {
            public override async onAttach(entity: Entity): Promise<void>
            {
                await super.onAttach(entity);

                _onAttach();
            }
        }

        const component = new TestComponent();
        const entity = new Entity();

        await entity.addComponent(component);

        expect(component.entity).toBe(entity);
        expect(_onAttach).toHaveBeenCalledTimes(1);
    });
    it("Should throw an error if attached to an entity while already attached to another", async () =>
    {
        const _onAttach = vi.fn(() => { /* ... */ });
        class TestComponent extends Component
        {
            public override async onAttach(entity: Entity): Promise<void>
            {
                await super.onAttach(entity);

                _onAttach();
            }
        }

        const component = new TestComponent();
        const entity1 = new Entity();
        const entity2 = new Entity();

        await entity1.addComponent(component);
        await expect(entity2.addComponent(component)).rejects
            .toThrow(AttachmentException);
    });

    it("Should be detachable from an entity", async () =>
    {
        const _onDetach = vi.fn(() => { /* ... */ });
        class TestComponent extends Component
        {
            public override onDetach(): void
            {
                super.onDetach();

                _onDetach();
            }
        }

        const component = new TestComponent();
        const entity = new Entity();

        await entity.addComponent(component);
        entity.removeComponent(TestComponent);

        expect(component.entity).toBeNull();
        expect(_onDetach).toHaveBeenCalledTimes(1);
    });
    it("Should throw an error if detached from an entity while not attached to one", async () =>
    {
        const _onDetach = vi.fn(() => { /* ... */ });
        class TestComponent extends Component
        {
            public override onDetach(): void
            {
                super.onDetach();

                _onDetach();
            }
        }

        const component = new TestComponent();
        const entity = new Entity();

        await entity.addComponent(component);
        entity.removeComponent(TestComponent);

        expect(() => entity.removeComponent(TestComponent)).toThrow(ReferenceException);
        expect(_onDetach).toHaveBeenCalledTimes(1);
    });

    it("Should be disposable", async () =>
    {
        const _dispose = vi.fn(() => { /* ... */ });
        class TestComponent extends Component
        {
            public override dispose(): void
            {
                super.dispose();

                _dispose();
            }
        }

        const component = new TestComponent();
        const entity = new Entity();

        await entity.addComponent(component);
        expect(() => component.dispose()).toThrow(RuntimeException);

        entity.removeComponent(TestComponent);
        component.dispose();

        expect(component.entity).toBeNull();
        expect(_dispose).toHaveBeenCalledTimes(1);
    });

    it("Should call `onMount` when the entity is attached to a world", async () =>
    {
        const _onMount = vi.fn(() => { /* ... */ });
        class TestComponent extends Component
        {
            public override async onMount(): Promise<void>
            {
                await super.onMount();

                _onMount();
            }
        }

        const component = new TestComponent();
        const entity = new Entity();
        const world = new World();

        await entity.addComponent(component);
        await world.addEntity(entity);

        expect(_onMount).toHaveBeenCalledTimes(1);
    });
    it("Should call `onMount` when the entity is adopted by another entity", async () =>
    {
        const _onMount = vi.fn(() => { /* ... */ });
        class TestComponent extends Component
        {
            public override async onMount(): Promise<void>
            {
                await super.onMount();

                _onMount();
            }
        }

        const component = new TestComponent();
        const parent = new Entity();
        const child = new Entity();
        const world = new World();

        await world.addEntity(parent);
        await child.addComponent(component);
        await parent.addChild(child);

        expect(_onMount).toHaveBeenCalledTimes(1);
    });
    it("Should call `onMount` when the component is attached to an entity already attached to a world", async () =>
    {
        const _onMount = vi.fn(() => { /* ... */ });
        class TestComponent extends Component
        {
            public override async onMount(): Promise<void>
            {
                await super.onMount();

                _onMount();
            }
        }

        const component = new TestComponent();
        const entity = new Entity();
        const world = new World();

        await world.addEntity(entity);
        await entity.addComponent(component);

        expect(_onMount).toHaveBeenCalledTimes(1);
    });

    it("Should call `onUnmount` when the entity is detached from a world", async () =>
    {
        const _onUnmount = vi.fn(() => { /* ... */ });
        class TestComponent extends Component
        {
            public override onUnmount(): void
            {
                super.onUnmount();

                _onUnmount();
            }
        }

        const component = new TestComponent();
        const entity = new Entity();
        const world = new World();

        await entity.addComponent(component);
        await world.addEntity(entity);
        world.removeEntity(entity.id);

        expect(_onUnmount).toHaveBeenCalledTimes(1);
    });
    it("Should call `onUnmount` when the entity is unadopted from another entity", async () =>
    {
        const _onUnmount = vi.fn(() => { /* ... */ });
        class TestComponent extends Component
        {
            public override onUnmount(): void
            {
                super.onUnmount();

                _onUnmount();
            }
        }

        const component = new TestComponent();
        const parent = new Entity();
        const child = new Entity();
        const world = new World();

        await world.addEntity(parent);
        await child.addComponent(component);
        await parent.addChild(child);
        parent.removeChild(child);

        expect(_onUnmount).toHaveBeenCalledTimes(1);
    });
});
