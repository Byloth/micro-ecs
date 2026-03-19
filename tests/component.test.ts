import { describe, expect, it, vi } from "vitest";
import { Component, Entity } from "../src/index.js";

describe("Component", () =>
{
    it("Should be initialized with default values", () =>
    {
        const component = new Component();

        expect(component.entity).toBeNull();
        expect(component.isEnabled).toBe(false);
    });

    // FIXME: This test makes no longer sense...
    //
    /*
    it("Should be attachable to an entity", () =>
    {
        const _onAttach = vi.fn();
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
    */

    // FIXME: This test makes no longer sense...
    //
    /*
    it("Should throw an error if attached to an entity while already attached to another", () =>
    {
        const _onAttach = vi.fn();
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

        expect(() => entity2.addComponent(component))
            .toThrow(ReferenceException);
    });
    */

    // FIXME: This test makes no longer sense...
    //
    /*
    it("Should be detachable from an entity", () =>
    {
        const _onDetach = vi.fn();
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
    */

    // FIXME: This test makes no longer sense...
    //
    /*
    it("Should throw an error if detached from an entity while not attached to one", () =>
    {
        const _onDetach = vi.fn();
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

        expect(() => entity.removeComponent(component))
            .toThrow(ReferenceException);

        expect(_onDetach).toHaveBeenCalledTimes(1);
    });
    */

    // FIXME: This test makes no longer sense...
    //
    /*
    it("Should be disposable", () =>
    {
        const _onDispose = vi.fn();
        class TestComponent extends Component
        {
            public override dispose(): void
            {
                super.dispose();

                _onDispose();
            }
        }

        const entity = new Entity();
        const component = entity.addComponent(new TestComponent());

        expect(() => component.dispose())
            .toThrow(RuntimeException);

        entity.removeComponent(TestComponent);
        component.dispose();

        expect(component.entity).toBeNull();
        expect(_onDispose).toHaveBeenCalledTimes(1);
    });
    */

    it("Should be initialized and attached to an entity", () =>
    {
        const _onInitialize = vi.fn();
        class TestComponent extends Component
        {
            public override initialize(entity: Entity): void
            {
                super.initialize(entity);

                _onInitialize();
            }
        }

        const entity = new Entity();
        const component = entity.createComponent(TestComponent);

        expect(component.entity).toBe(entity);
        expect(_onInitialize).toHaveBeenCalledTimes(1);
    });

    it("Should be detached from the entity and disposed", () =>
    {
        const _onDispose = vi.fn();
        class TestComponent extends Component
        {
            public override dispose(): void
            {
                super.dispose();

                _onDispose();
            }
        }

        const entity = new Entity();
        entity.createComponent(TestComponent);
        entity.destroyComponent(TestComponent);

        expect(_onDispose).toHaveBeenCalledTimes(1);
        expect(entity.hasComponent(TestComponent)).toBe(false);
    });
});
