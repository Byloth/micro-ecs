import { describe, it, expect, vi } from "vitest";
import { Component, Entity } from "../src/index.js";

describe("Component", () =>
{
    it("Should be initialized with a null entity", () =>
    {
        const component = new Component();
        expect(component.entity).toBeNull();
    });

    it("Should be attachable to an entity", () =>
    {
        const _onAttach = vi.fn(() => { /* ... */ });
        class TestComponent extends Component
        {
            public override onAttach(entity: Entity): void
            {
                super.onAttach(entity);
                _onAttach();
            }
        }

        const component = new TestComponent();
        const entity = new Entity();

        entity.addComponent(component);

        expect(component.entity).toBe(entity);
        expect(_onAttach).toHaveBeenCalledTimes(1);
    });
    it("Should throw an error if attached to an entity while already attached to another", () =>
    {
        const _onAttach = vi.fn(() => { /* ... */ });
        class TestComponent extends Component
        {
            public override onAttach(entity: Entity): void
            {
                super.onAttach(entity);
                _onAttach();
            }
        }

        const component = new TestComponent();
        const entity1 = new Entity();
        const entity2 = new Entity();

        entity1.addComponent(component);
        expect(() => entity2.addComponent(component)).toThrow();
    });

    it("Should be detachable from an entity", () =>
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

        entity.addComponent(component);
        entity.removeComponent(TestComponent);

        expect(component.entity).toBeNull();
        expect(_onDetach).toHaveBeenCalledTimes(1);
    });
    it("Should throw an error if detached from an entity while not attached to one", () =>
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

        entity.addComponent(component);
        entity.removeComponent(TestComponent);

        expect(() => entity.removeComponent(TestComponent)).toThrow();
        expect(_onDetach).toHaveBeenCalledTimes(1);
    });

    it("Should be disposable", () =>
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

        entity.addComponent(component);
        component.dispose();

        expect(component.entity).toBeNull();
        expect(_dispose).toHaveBeenCalledTimes(1);
    });
});
