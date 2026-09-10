import { ReferenceException, RuntimeException } from "@byloth/core";
import { afterEach, describe, expect, it, vi } from "vitest";

import { Component, DependencyException, Entity, EntityContext, World } from "../src/index.js";

describe("Entity", () =>
{
    afterEach(() => { vi.restoreAllMocks(); });

    describe("Initialization", () =>
    {
        it("Should be initialized with default values", () =>
        {
            const entity = new Entity();

            expect(entity.id).toEqual(-1);
            expect(entity.isEnabled).toBe(false);
            expect(entity.isDisposed).toBe(true);
            expect(entity.world).toBeNull();
            expect(entity["_components"].size).toBe(0);
        });
    });

    describe("Lifecycle", () =>
    {
        it("Should be initialized and attached to a world", () =>
        {
            const _onInitialize = vi.fn();
            class TestEntity extends Entity
            {
                public override initialize(world: World, enabled = true): void
                {
                    super.initialize(world);
                    this._isEnabled = enabled;

                    _onInitialize();
                }
            }

            const world = new World();
            const entity1 = world.createEntity(Entity);

            expect(entity1.world).toBe(world);
            expect(entity1.isEnabled).toBe(true);
            expect(entity1.isDisposed).toBe(false);

            const entity2 = world.createEntity(TestEntity, false);

            expect(entity2.world).toBe(world);
            expect(entity2.isEnabled).toBe(false);

            expect(_onInitialize).toHaveBeenCalledTimes(1);
        });
        it("Should throw when initializing an already attached entity", () =>
        {
            const world = new World();
            const entity = world.createEntity(Entity);

            expect(() => entity.initialize(world))
                .toThrow(ReferenceException);
        });

        it("Should be disposed and detached from the world", () =>
        {
            const _onDispose = vi.fn();

            class TestComponent extends Component { }
            class TestEntity extends Entity
            {
                public override dispose(): void
                {
                    super.dispose();

                    _onDispose();
                }
            }

            const world = new World();
            const entity = world.createEntity(TestEntity);

            entity.createComponent(TestComponent);
            world.destroyEntity(entity.id);

            expect(entity.id).toEqual(-1);
            expect(entity.isEnabled).toBe(false);
            expect(entity.isDisposed).toBe(true);
            expect(entity.world).toBeNull();

            expect(entity.hasComponent(TestComponent)).toBe(false);
            expect(entity["_components"].size).toBe(0);

            expect(_onDispose).toHaveBeenCalledTimes(1);
        });
        it("Should throw when disposing an entity not attached to any world", () =>
        {
            const entity = new Entity();

            expect(() => entity.dispose())
                .toThrow(ReferenceException);
        });
    });

    describe("Faulty dispose", () =>
    {
        class HealthyComponent extends Component { }
        class FaultyComponent extends Component
        {
            public override dispose(): void
            {
                throw new Error("Dispose failed!");
            }
        }

        it("Should abandon a component whose `dispose` throws when destroying it", () =>
        {
            const world = new World();
            const entity = world.createEntity();
            const faulty = entity.createComponent(FaultyComponent);

            const faultyPool = world["_getComponentPool"](FaultyComponent);
            const _onWarn = vi.spyOn(console, "warn").mockImplementation(() => { /* ... */ });

            expect(() => entity.destroyComponent(FaultyComponent)).not.toThrow();

            expect(_onWarn).toHaveBeenCalledTimes(1);
            expect(entity.hasComponent(FaultyComponent)).toBe(false);
            expect(faultyPool.available).toBe(0);
            expect(faulty.isDisposed).toBe(false);
        });
        it("Should abandon a component whose `dispose` throws when destroying the entity", () =>
        {
            class HealthyComponent2 extends Component { }

            const world = new World();
            const entity = world.createEntity();

            entity.createComponent(HealthyComponent);
            entity.createComponent(FaultyComponent);
            entity.createComponent(HealthyComponent2);

            const healthyPool = world["_getComponentPool"](HealthyComponent);
            const healthyPool2 = world["_getComponentPool"](HealthyComponent2);
            const faultyPool = world["_getComponentPool"](FaultyComponent);
            const entityPool = world["_getEntityPool"](Entity);

            const _onWarn = vi.spyOn(console, "warn").mockImplementation(() => { /* ... */ });

            expect(() => world.destroyEntity(entity)).not.toThrow();

            expect(_onWarn).toHaveBeenCalledTimes(1);
            expect(healthyPool.available).toBe(1);
            expect(healthyPool2.available).toBe(1);
            expect(faultyPool.available).toBe(0);

            expect(entity.isDisposed).toBe(true);
            expect(entity["_components"].size).toBe(0);
            expect(entityPool.available).toBe(1);
        });
        it("Should abandon a component whose `dispose` throws when disposing the world", () =>
        {
            const world = new World();
            const entity = world.createEntity();

            entity.createComponent(HealthyComponent);
            entity.createComponent(FaultyComponent);

            const healthyPool = world["_getComponentPool"](HealthyComponent);
            const faultyPool = world["_getComponentPool"](FaultyComponent);
            const entityPool = world["_getEntityPool"](Entity);

            const _onWarn = vi.spyOn(console, "warn").mockImplementation(() => { /* ... */ });

            expect(() => world.dispose()).not.toThrow();

            expect(_onWarn).toHaveBeenCalledTimes(1);
            expect(healthyPool.available).toBe(1);
            expect(faultyPool.available).toBe(0);
            expect(entityPool.available).toBe(1);

            expect(entity.isDisposed).toBe(true);
            expect(world.entities.size).toBe(0);
        });
        it("Should abandon a component whose `dispose` throws even after `super.dispose()`", () =>
        {
            class LateFaultyComponent extends Component
            {
                public override dispose(): void
                {
                    super.dispose();

                    throw new Error("Dispose failed!");
                }
            }

            const world = new World();
            const entity = world.createEntity();
            const faulty = entity.createComponent(LateFaultyComponent);

            const faultyPool = world["_getComponentPool"](LateFaultyComponent);
            const _onWarn = vi.spyOn(console, "warn").mockImplementation(() => { /* ... */ });

            expect(() => entity.destroyComponent(LateFaultyComponent)).not.toThrow();

            expect(_onWarn).toHaveBeenCalledTimes(1);
            expect(faultyPool.available).toBe(0);
            expect(faulty.isDisposed).toBe(true);
        });
    });

    describe("Enable & Disable", () =>
    {
        it("Should enable a disabled entity", () =>
        {
            class TestEntity extends Entity
            {
                public override initialize(world: World, enabled = true): void
                {
                    super.initialize(world);
                    this._isEnabled = enabled;
                }
            }

            const world = new World();
            const entity = world.createEntity(TestEntity, false);

            expect(entity.isEnabled).toBe(false);

            entity.enable();

            expect(entity.isEnabled).toBe(true);
        });
        it("Should throw when enabling an already enabled entity", () =>
        {
            const world = new World();
            const entity = world.createEntity();

            expect(() => entity.enable())
                .toThrow(RuntimeException);
        });

        it("Should disable an enabled entity", () =>
        {
            const world = new World();
            const entity = world.createEntity();

            expect(entity.isEnabled).toBe(true);

            entity.disable();

            expect(entity.isEnabled).toBe(false);
        });
        it("Should throw when disabling an already disabled entity", () =>
        {
            class TestEntity extends Entity
            {
                public override initialize(world: World, enabled = true): void
                {
                    super.initialize(world);
                    this._isEnabled = enabled;
                }
            }

            const world = new World();
            const entity = world.createEntity(TestEntity, false);

            expect(() => entity.disable())
                .toThrow(RuntimeException);
        });
    });

    describe("Components", () =>
    {
        it("Should create and retrieve a component", () =>
        {
            class TestComponent extends Component { }

            const world = new World();
            const entity = world.createEntity();
            const component = entity.createComponent(TestComponent);

            expect(entity.hasComponent(TestComponent)).toBe(true);
            expect(entity.getComponent(TestComponent)).toBe(component);
            expect(entity.components.size).toBe(1);
        });
        it("Should expose the components as a readonly map", () =>
        {
            class TestComponentA extends Component { }
            class TestComponentB extends Component { }

            const world = new World();
            const entity = world.createEntity();
            const componentA = entity.createComponent(TestComponentA);
            const componentB = entity.createComponent(TestComponentB);

            expect(entity.components).toBe(entity["_components"]);
            expect(entity.components.size).toBe(2);
            expect(entity.components.get(TestComponentA)).toBe(componentA);
            expect(entity.components.get(TestComponentB)).toBe(componentB);

            entity.destroyComponent(TestComponentB);
            expect(entity.components.size).toBe(1);
            expect(entity.components.has(TestComponentB)).toBe(false);
        });
        it("Should throw when creating a duplicate component", () =>
        {
            class TestComponent extends Component { }

            const world = new World();
            const entity = world.createEntity();
            entity.createComponent(TestComponent);

            expect(() => entity.createComponent(TestComponent))
                .toThrow(ReferenceException);
        });
        it("Should throw when getting a non-existent component", () =>
        {
            class TestComponent extends Component { }

            const world = new World();
            const entity = world.createEntity();

            expect(() => entity.getComponent(TestComponent))
                .toThrow(ReferenceException);
        });

        it("Should destroy a component", () =>
        {
            class TestComponent extends Component { }

            const world = new World();
            const entity = world.createEntity();
            const component = entity.createComponent(TestComponent);

            entity.destroyComponent(component);

            expect(entity.hasComponent(TestComponent)).toBe(false);
            expect(entity["_components"].size).toBe(0);
        });
        it("Should throw when destroying a non-existent component", () =>
        {
            class TestComponent extends Component { }

            const world = new World();
            const entity = world.createEntity();

            expect(() => entity.destroyComponent(TestComponent))
                .toThrow(ReferenceException);
        });
    });

    describe("Context", () =>
    {
        it("Should provide a context for each component", () =>
        {
            class TestComponent extends Component { }

            const world = new World();
            const entity = world.createEntity();
            const component = entity.createComponent(TestComponent);
            const context = entity.getContext(component);

            expect(context).toBeInstanceOf(EntityContext);
        });
        it("Should provide the same context when requested again for the same component", () =>
        {
            class TestComponent extends Component { }

            const world = new World();
            const entity = world.createEntity();
            const component = entity.createComponent(TestComponent);

            const context1 = entity.getContext(component);
            const context2 = entity.getContext(component);

            expect(context1).toBe(context2);
        });

        it("Should allow using and releasing component dependencies", () =>
        {
            class DependencyComponent extends Component { }
            class DependantComponent extends Component { }

            const world = new World();
            const entity = world.createEntity();
            const dependency = entity.createComponent(DependencyComponent);
            const dependant = entity.createComponent(DependantComponent);

            const context = entity.getContext(dependant);
            const _dependency = context.useComponent(DependencyComponent);

            expect(_dependency).toBe(dependency);
            expect(context.dependencies.size).toBe(1);
            expect(context.dependencies.has(dependency)).toBe(true);

            context.releaseComponent(DependencyComponent);

            expect(context.dependencies.size).toBe(0);
            expect(context.dependencies.has(dependency)).toBe(false);
        });
        it("Should serve multiple dependencies independently", () =>
        {
            class DependencyComponent extends Component { }

            class DependantComponent1 extends Component { }
            class DependantComponent2 extends Component { }

            const world = new World();
            const entity = world.createEntity();
            const dependency = entity.createComponent(DependencyComponent);
            const dependant1 = entity.createComponent(DependantComponent1);
            const dependant2 = entity.createComponent(DependantComponent2);

            const context1 = entity.getContext(dependant1);
            const context2 = entity.getContext(dependant2);

            const dependency1 = context1.useComponent(DependencyComponent);
            const dependency2 = context2.useComponent(DependencyComponent);

            expect(dependency1).toBe(dependency2);

            expect(entity["_dependencies"].size).toBe(1);
            expect(entity["_dependencies"].get(dependency)?.size).toBe(2);

            context1.releaseComponent(DependencyComponent);

            expect(entity["_dependencies"].size).toBe(1);
            expect(entity["_dependencies"].get(dependency)?.size).toBe(1);
        });

        it("Should throw when using the same dependency twice in the same context", () =>
        {
            class DependencyComponent extends Component { }
            class DependantComponent extends Component { }

            const world = new World();
            const entity = world.createEntity();

            entity.createComponent(DependencyComponent);

            const dependant = entity.createComponent(DependantComponent);
            const context = entity.getContext(dependant);

            context.useComponent(DependencyComponent);

            expect(() => context.useComponent(DependencyComponent))
                .toThrow(DependencyException);
        });
        it("Should throw when releasing a dependency that isn't used in the context", () =>
        {
            class DependencyComponent extends Component { }
            class DependantComponent extends Component { }

            const world = new World();
            const entity = world.createEntity();

            entity.createComponent(DependencyComponent);

            const dependant = entity.createComponent(DependantComponent);
            const context = entity.getContext(dependant);

            expect(() => context.releaseComponent(DependencyComponent))
                .toThrow(DependencyException);
        });

        it("Should throw when using a dependency for a component not yet in the entity", () =>
        {
            class DependencyComponent extends Component { }
            class DependantComponent extends Component
            {
                public override initialize(entity: Entity): void
                {
                    super.initialize(entity);

                    entity.getContext(this)
                        .useComponent(DependencyComponent);
                }
            }

            const world = new World();
            const entity = world.createEntity();

            expect(() => entity.createComponent(DependantComponent))
                .toThrow(DependencyException);
        });

        it("Should block destroying a dependency that still has dependants", () =>
        {
            class DependencyComponent extends Component { }
            class DependantComponent extends Component
            {
                public override initialize(entity: Entity): void
                {
                    super.initialize(entity);

                    entity.getContext(this)
                        .useComponent(DependencyComponent);
                }
            }

            const world = new World();
            const entity = world.createEntity();

            const dependency = entity.createComponent(DependencyComponent);
            const dependant = entity.createComponent(DependantComponent);

            expect(() => entity.destroyComponent(dependency))
                .toThrow(DependencyException);

            entity.destroyComponent(dependant);
            entity.destroyComponent(DependencyComponent);
        });

        it("Should create a child component and register it as a dependency", () =>
        {
            class ChildComponent extends Component { }
            class ParentComponent extends Component
            {
                public override initialize(entity: Entity): void
                {
                    super.initialize(entity);

                    entity.getContext(this)
                        .createChild(ChildComponent);
                }
            }

            const world = new World();
            const entity = world.createEntity();
            const parent = entity.createComponent(ParentComponent);
            const context = entity.getContext(parent);
            const child = entity.getComponent(ChildComponent);

            expect(entity.hasComponent(ChildComponent)).toBe(true);
            expect(context.children.has(ChildComponent)).toBe(true);
            expect(context.dependencies.size).toBe(1);
            expect(context.dependencies.has(child)).toBe(true);
        });
        it("Should explicitly destroy a child component with `destroyChild`", () =>
        {
            class ChildComponent extends Component { }
            class ParentComponent extends Component
            {
                public override initialize(entity: Entity): void
                {
                    super.initialize(entity);

                    entity.getContext(this)
                        .createChild(ChildComponent);
                }
            }

            const world = new World();
            const entity = world.createEntity();
            const parent = entity.createComponent(ParentComponent);
            const context = entity.getContext(parent);

            context.destroyChild(ChildComponent);

            expect(entity.hasComponent(ChildComponent)).toBe(false);
            expect(context.children.has(ChildComponent)).toBe(false);
            expect(context.dependencies.size).toBe(0);
        });

        it("Should block destroying a child component that still has a parent", () =>
        {
            class ChildComponent extends Component { }
            class ParentComponent extends Component
            {
                public override initialize(entity: Entity): void
                {
                    super.initialize(entity);

                    entity.getContext(this)
                        .createChild(ChildComponent);
                }
            }

            const world = new World();
            const entity = world.createEntity();
            entity.createComponent(ParentComponent);

            expect(() => entity.destroyComponent(ChildComponent))
                .toThrow(DependencyException);
        });

        it("Should throw when calling `destroyChild` on a non-child component", () =>
        {
            class OtherComponent extends Component { }
            class ParentComponent extends Component { }

            const world = new World();
            const entity = world.createEntity();
            entity.createComponent(OtherComponent);
            const parent = entity.createComponent(ParentComponent);
            const context = entity.getContext(parent);

            expect(() => context.destroyChild(OtherComponent))
                .toThrow(ReferenceException);
        });

        it("Should auto-destroy children when the parent component is destroyed", () =>
        {
            class ChildComponent extends Component { }
            class ParentComponent extends Component
            {
                public override initialize(entity: Entity): void
                {
                    super.initialize(entity);

                    entity.getContext(this)
                        .createChild(ChildComponent);
                }
            }

            const world = new World();
            const entity = world.createEntity();

            entity.createComponent(ParentComponent);
            expect(entity.hasComponent(ChildComponent)).toBe(true);

            entity.destroyComponent(ParentComponent);
            expect(entity.hasComponent(ParentComponent)).toBe(false);
            expect(entity.hasComponent(ChildComponent)).toBe(false);
        });
        it("Should auto-destroy children when the context is manually disposed", () =>
        {
            class ChildComponent extends Component { }
            class ParentComponent extends Component
            {
                public override initialize(entity: Entity): void
                {
                    super.initialize(entity);

                    entity.getContext(this)
                        .createChild(ChildComponent);
                }
            }

            const world = new World();
            const entity = world.createEntity();
            const parent = entity.createComponent(ParentComponent);

            expect(entity.hasComponent(ChildComponent)).toBe(true);

            const context = entity.getContext(parent);
            context.dispose();

            expect(entity.hasComponent(ChildComponent)).toBe(false);
            expect(context.children.size).toBe(0);
            expect(context.dependencies.size).toBe(0);
        });

        it("Should clear and remove the context when the context itself is disposed", () =>
        {
            class DependencyComponent extends Component { }
            class DependantComponent extends Component
            {
                public override initialize(entity: Entity): void
                {
                    super.initialize(entity);

                    entity.getContext(this)
                        .useComponent(DependencyComponent);
                }
            }

            const world = new World();
            const entity = world.createEntity();
            const dependency = entity.createComponent(DependencyComponent);
            const dependant = entity.createComponent(DependantComponent);
            const context = entity.getContext(dependant);

            expect(context).toBeInstanceOf(EntityContext);
            expect(context.dependencies.size).toBe(1);
            expect(entity["_contexts"].has(dependant)).toBe(true);
            expect(entity["_dependencies"].has(dependency)).toBe(true);

            context.dispose();

            expect(context.dependencies.size).toBe(0);
            expect(entity["_contexts"].has(dependant)).toBe(false);
            expect(entity["_dependencies"].has(dependency)).toBe(false);

            expect(() => entity.destroyComponent(dependency))
                .not.toThrow();
        });
        it("Should clear and remove the context when the component is destroyed", () =>
        {
            class DependencyComponent extends Component { }
            class DependantComponent extends Component
            {
                public override initialize(entity: Entity): void
                {
                    super.initialize(entity);

                    entity.getContext(this)
                        .useComponent(DependencyComponent);
                }
            }

            const world = new World();
            const entity = world.createEntity();
            const dependency = entity.createComponent(DependencyComponent);
            const dependant = entity.createComponent(DependantComponent);
            const context = entity.getContext(dependant);

            expect(context).toBeInstanceOf(EntityContext);
            expect(context.dependencies.size).toBe(1);
            expect(entity["_contexts"].has(dependant)).toBe(true);
            expect(entity["_dependencies"].has(dependency)).toBe(true);

            entity.destroyComponent(dependant);

            expect(context.dependencies.size).toBe(0);
            expect(entity["_contexts"].has(dependant)).toBe(false);
            expect(entity["_dependencies"].has(dependency)).toBe(false);

            expect(() => entity.destroyComponent(DependencyComponent))
                .not.toThrow();
        });
        it("Should clear contexts and dependencies when the entity is disposed", () =>
        {
            class DependencyComponent extends Component { }
            class DependantComponent extends Component
            {
                public override initialize(entity: Entity): void
                {
                    super.initialize(entity);

                    entity.getContext(this)
                        .useComponent(DependencyComponent);
                }
            }

            const world = new World();
            const entity = world.createEntity();
            const dependency = entity.createComponent(DependencyComponent);
            const dependant = entity.createComponent(DependantComponent);
            const context = entity.getContext(dependant);

            expect(context).toBeInstanceOf(EntityContext);
            expect(context.dependencies.size).toBe(1);
            expect(entity["_contexts"].has(dependant)).toBe(true);
            expect(entity["_dependencies"].has(dependency)).toBe(true);

            world.destroyEntity(entity);

            expect(context.dependencies.size).toBe(0);
            expect(entity["_contexts"].has(dependant)).toBe(false);
            expect(entity["_dependencies"].has(dependency)).toBe(false);
        });

        it("Should auto-destroy children when the entity is disposed", () =>
        {
            const _onChildDispose = vi.fn();
            const _onParentDispose = vi.fn();

            class ChildComponent extends Component
            {
                public override dispose(): void
                {
                    super.dispose();

                    _onChildDispose();
                }
            }
            class ParentComponent extends Component
            {
                public override initialize(entity: Entity): void
                {
                    super.initialize(entity);

                    entity.getContext(this)
                        .createChild(ChildComponent);
                }
                public override dispose(): void
                {
                    super.dispose();

                    _onParentDispose();
                }
            }

            const world = new World();
            const entity = world.createEntity();
            const parent = entity.createComponent(ParentComponent);
            const context = entity.getContext(parent);

            const childPool = world["_getComponentPool"](ChildComponent);
            const parentPool = world["_getComponentPool"](ParentComponent);

            const _onWarn = vi.spyOn(console, "warn").mockImplementation(() => { /* ... */ });

            world.destroyEntity(entity);

            expect(_onWarn).not.toHaveBeenCalled();
            expect(_onChildDispose).toHaveBeenCalledTimes(1);
            expect(_onParentDispose).toHaveBeenCalledTimes(1);

            expect(context.children.size).toBe(0);
            expect(context.dependencies.size).toBe(0);
            expect(entity["_contexts"].size).toBe(0);
            expect(entity["_dependencies"].size).toBe(0);
            expect(entity["_components"].size).toBe(0);

            expect(childPool.available).toBe(1);
            expect(parentPool.available).toBe(1);

            expect(entity.id).toBe(-1);
            expect(entity.world).toBeNull();
        });
        it("Should auto-destroy every child when the entity is disposed", () =>
        {
            const _onDispose = vi.fn();

            class ChildComponent extends Component
            {
                public override dispose(): void
                {
                    super.dispose();

                    _onDispose(this.constructor);
                }
            }
            class ChildA extends ChildComponent { }
            class ChildB extends ChildComponent { }
            class ChildC extends ChildComponent { }

            class ParentComponent extends Component
            {
                public override initialize(entity: Entity): void
                {
                    super.initialize(entity);

                    const context = entity.getContext(this);
                    context.createChild(ChildA);
                    context.createChild(ChildB);
                    context.createChild(ChildC);
                }
            }

            const world = new World();
            const entity = world.createEntity();
            const parent = entity.createComponent(ParentComponent);
            const context = entity.getContext(parent);

            const poolA = world["_getComponentPool"](ChildA);
            const poolB = world["_getComponentPool"](ChildB);
            const poolC = world["_getComponentPool"](ChildC);

            const _onWarn = vi.spyOn(console, "warn").mockImplementation(() => { /* ... */ });

            world.destroyEntity(entity);

            expect(_onWarn).not.toHaveBeenCalled();
            expect(_onDispose).toHaveBeenCalledTimes(3);
            expect(_onDispose).toHaveBeenCalledWith(ChildA);
            expect(_onDispose).toHaveBeenCalledWith(ChildB);
            expect(_onDispose).toHaveBeenCalledWith(ChildC);

            expect(context.children.size).toBe(0);
            expect(entity["_components"].size).toBe(0);

            expect(poolA.available).toBe(1);
            expect(poolB.available).toBe(1);
            expect(poolC.available).toBe(1);
        });
        it("Should auto-destroy nested children when the entity is disposed", () =>
        {
            const _onDispose = vi.fn();

            class GrandchildComponent extends Component
            {
                public override dispose(): void
                {
                    super.dispose();

                    _onDispose(GrandchildComponent);
                }
            }
            class ChildComponent extends Component
            {
                public override initialize(entity: Entity): void
                {
                    super.initialize(entity);

                    entity.getContext(this)
                        .createChild(GrandchildComponent);
                }
                public override dispose(): void
                {
                    super.dispose();

                    _onDispose(ChildComponent);
                }
            }
            class ParentComponent extends Component
            {
                public override initialize(entity: Entity): void
                {
                    super.initialize(entity);

                    entity.getContext(this)
                        .createChild(ChildComponent);
                }
                public override dispose(): void
                {
                    super.dispose();

                    _onDispose(ParentComponent);
                }
            }

            const world = new World();
            const entity = world.createEntity();
            entity.createComponent(ParentComponent);

            expect(entity["_contexts"].size).toBe(2);

            const grandchildPool = world["_getComponentPool"](GrandchildComponent);
            const childPool = world["_getComponentPool"](ChildComponent);
            const parentPool = world["_getComponentPool"](ParentComponent);

            const _onWarn = vi.spyOn(console, "warn").mockImplementation(() => { /* ... */ });

            world.destroyEntity(entity);

            expect(_onWarn).not.toHaveBeenCalled();
            expect(_onDispose).toHaveBeenCalledTimes(3);
            expect(_onDispose).toHaveBeenCalledWith(GrandchildComponent);
            expect(_onDispose).toHaveBeenCalledWith(ChildComponent);
            expect(_onDispose).toHaveBeenCalledWith(ParentComponent);

            expect(entity["_contexts"].size).toBe(0);
            expect(entity["_dependencies"].size).toBe(0);
            expect(entity["_components"].size).toBe(0);

            expect(grandchildPool.available).toBe(1);
            expect(childPool.available).toBe(1);
            expect(parentPool.available).toBe(1);
        });
        it("Should auto-destroy children when the world is disposed", () =>
        {
            const _onChildDispose = vi.fn();
            const _onParentDispose = vi.fn();

            class ChildComponent extends Component
            {
                public override dispose(): void
                {
                    super.dispose();

                    _onChildDispose();
                }
            }
            class ParentComponent extends Component
            {
                public override initialize(entity: Entity): void
                {
                    super.initialize(entity);

                    entity.getContext(this)
                        .createChild(ChildComponent);
                }
                public override dispose(): void
                {
                    super.dispose();

                    _onParentDispose();
                }
            }

            const world = new World();
            const entity = world.createEntity();
            const parent = entity.createComponent(ParentComponent);
            const context = entity.getContext(parent);

            const childPool = world["_getComponentPool"](ChildComponent);
            const parentPool = world["_getComponentPool"](ParentComponent);

            const _onWarn = vi.spyOn(console, "warn").mockImplementation(() => { /* ... */ });

            world.dispose();

            expect(_onWarn).not.toHaveBeenCalled();
            expect(_onChildDispose).toHaveBeenCalledTimes(1);
            expect(_onParentDispose).toHaveBeenCalledTimes(1);

            expect(context.children.size).toBe(0);
            expect(entity["_contexts"].size).toBe(0);
            expect(entity["_components"].size).toBe(0);

            expect(childPool.available).toBe(1);
            expect(parentPool.available).toBe(1);
        });
    });
});
