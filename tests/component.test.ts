import { ReferenceException, RuntimeException } from "@byloth/core";
import { describe, expect, it, vi } from "vitest";

import { Component, World } from "../src/index.js";
import type { Entity } from "../src/index.js";

describe("Component", () =>
{
    describe("Initialization", () =>
    {
        it("Should be initialized with default values", () =>
        {
            const component = new Component();

            expect(component.entity).toBeNull();
            expect(component.isEnabled).toBe(false);
        });
    });

    describe("Lifecycle", () =>
    {
        it("Should be initialized and attached to an entity", () =>
        {
            const _onInitialize = vi.fn();
            class TestComponent extends Component
            {
                public override initialize(entity: Entity, enabled = true): void
                {
                    super.initialize(entity);
                    this._isEnabled = enabled;

                    _onInitialize();
                }
            }

            const world = new World();
            const entity1 = world.createEntity();
            const component1 = entity1.createComponent(TestComponent);

            expect(component1.entity).toBe(entity1);
            expect(component1.isEnabled).toBe(true);

            const entity2 = world.createEntity();
            const component2 = entity2.createComponent(TestComponent, false);

            expect(component2.entity).toBe(entity2);
            expect(component2.isEnabled).toBe(false);

            expect(_onInitialize).toHaveBeenCalledTimes(2);
        });
        it("Should throw when initializing an already attached component", () =>
        {
            const world = new World();

            const entity1 = world.createEntity();
            const entity2 = world.createEntity();

            const component = entity1.createComponent(Component);

            expect(() => component.initialize(entity2))
                .toThrow(ReferenceException);
        });

        it("Should be disposed and detached from the entity", () =>
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

            const world = new World();
            const entity = world.createEntity();
            entity.createComponent(TestComponent);
            entity.destroyComponent(TestComponent);

            expect(_onDispose).toHaveBeenCalledTimes(1);
            expect(entity.hasComponent(TestComponent)).toBe(false);
        });
        it("Should throw when disposing a component not attached to any entity", () =>
        {
            const component = new Component();

            expect(() => component.dispose())
                .toThrow(ReferenceException);
        });
    });

    describe("Enable & Disable", () =>
    {
        it("Should enable a disabled component", () =>
        {
            class TestComponent extends Component
            {
                public override initialize(entity: Entity, enabled = true): void
                {
                    super.initialize(entity);
                    this._isEnabled = enabled;
                }
            }

            const world = new World();
            const entity = world.createEntity();
            const component = entity.createComponent(TestComponent, false);

            expect(component.isEnabled).toBe(false);

            component.enable();

            expect(component.isEnabled).toBe(true);
        });
        it("Should throw when enabling an already enabled component", () =>
        {
            const world = new World();
            const entity = world.createEntity();
            const component = entity.createComponent(Component);

            expect(() => component.enable())
                .toThrow(RuntimeException);
        });

        it("Should disable an enabled component", () =>
        {
            const world = new World();
            const entity = world.createEntity();
            const component = entity.createComponent(Component);

            expect(component.isEnabled).toBe(true);

            component.disable();

            expect(component.isEnabled).toBe(false);
        });
        it("Should throw when disabling an already disabled component", () =>
        {
            class TestComponent extends Component
            {
                public override initialize(entity: Entity, enabled = true): void
                {
                    super.initialize(entity);
                    this._isEnabled = enabled;
                }
            }

            const world = new World();
            const entity = world.createEntity();
            const component = entity.createComponent(TestComponent, false);

            expect(() => component.disable())
                .toThrow(RuntimeException);
        });
    });
});
