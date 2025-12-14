import { ReferenceException, RuntimeException } from "@byloth/core";
import { describe, expect, it, vi } from "vitest";

import { AttachmentException, Component, Entity } from "../src/index.js";

describe("Component", () =>
{
    it("Should be initialized with a `null` entity", () =>
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

        const entity = new Entity();
        const component = entity.addComponent(new TestComponent());

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

        const entity1 = new Entity();
        const entity2 = new Entity();
        const component = entity1.addComponent(new TestComponent());

        expect(() => entity2.addComponent(component)).toThrowError(AttachmentException);
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

        const entity = new Entity();
        const component = entity.addComponent(new TestComponent());

        entity.removeComponent(component);

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

        const entity = new Entity();
        const component = entity.addComponent(new TestComponent());

        entity.removeComponent(TestComponent);

        expect(() => entity.removeComponent(component)).toThrowError(ReferenceException);
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

        const entity = new Entity();
        const component = entity.addComponent(new TestComponent());

        expect(() => component.dispose()).toThrowError(RuntimeException);

        entity.removeComponent(TestComponent);
        component.dispose();

        expect(component.entity).toBeNull();
        expect(_dispose).toHaveBeenCalledTimes(1);
    });
});
