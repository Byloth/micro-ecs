import { ReferenceException, RuntimeException } from "@byloth/core";
import { describe, expect, it, vi } from "vitest";

import { AttachmentException, Component, DependencyException, Entity, EntityContext, World } from "../src/index.js";

describe("Entity", () =>
{
    it("Should be initialized with default values", () =>
    {
        const entity = new Entity();

        expect(entity.id).toBeGreaterThan(0);
        expect(entity.isEnabled).toBe(true);
        expect(entity.world).toBeNull();
        expect(entity.components.size).toBe(0);
    });

    it("Should be able to add and retrieve a component", () =>
    {
        class TestComponent extends Component { }

        const entity = new Entity();
        const component = entity.addComponent(new TestComponent());

        expect(entity.hasComponent(TestComponent)).toBe(true);
        expect(entity.getComponent(TestComponent)).toBe(component);
        expect(entity.components.size).toBe(1);
    });
    it("Should throw an error when adding a duplicate component", () =>
    {
        class TestComponent extends Component { }

        const entity = new Entity();
        const component = entity.addComponent(new TestComponent());

        expect(() => entity.addComponent(component)).toThrowError(ReferenceException);
    });

    it("Should be able to remove a component", () =>
    {
        class TestComponent extends Component { }

        const entity = new Entity();
        const component = entity.addComponent(new TestComponent());

        entity.removeComponent(component);

        expect(entity.hasComponent(TestComponent)).toBe(false);
        expect(entity.components.size).toBe(0);
    });
    it("Should throw an error when removing a non-existent component", () =>
    {
        class TestComponent extends Component { }

        const entity = new Entity();
        expect(() => entity.removeComponent(TestComponent)).toThrowError(ReferenceException);
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
        const entity = world.addEntity(new TestEntity());

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

        const entity = world1.addEntity(new TestEntity());

        expect(() => world2.addEntity(entity)).toThrowError(AttachmentException);
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
        const entity = world.addEntity(new TestEntity());

        world.removeEntity(entity);

        expect(entity.world).toBeNull();
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
        const entity = world.addEntity(new TestEntity());

        world.removeEntity(entity.id);

        expect(() => world.removeEntity(entity)).toThrowError(ReferenceException);
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
        const entity = world.addEntity(new TestEntity());

        entity.addComponent(new TestComponent());

        expect(() => entity.dispose()).toThrowError(RuntimeException);

        world.removeEntity(entity.id);
        entity.dispose();

        expect(entity.world).toBeNull();

        expect(entity.hasComponent(TestComponent)).toBe(false);
        expect(entity.components.size).toBe(0);

        expect(_dispose).toHaveBeenCalledTimes(1);
    });

    describe("Context", () =>
    {
        it("Should provide a context for each component", () =>
        {
            class TestComponent extends Component { }

            const entity = new Entity();
            const component = entity.addComponent(new TestComponent());
            const context = entity.getContext(component);

            expect(context).toBeInstanceOf(EntityContext);
        });
        it("Should provide the same context when getting it the same component", () =>
        {
            class TestComponent extends Component { }

            const entity = new Entity();
            const component = entity.addComponent(new TestComponent());

            const context1 = entity.getContext(component);
            const context2 = entity.getContext(component);

            expect(context1).toBe(context2);
        });

        it("Should allow using and releasing component dependencies", () =>
        {
            class DependencyComponent extends Component { }
            class DependantComponent extends Component { }

            const entity = new Entity();
            const dependency = entity.addComponent(new DependencyComponent());
            const dependant = entity.addComponent(new DependantComponent());

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

            const entity = new Entity();
            const dependency = entity.addComponent(new DependencyComponent());
            const dependant1 = entity.addComponent(new DependantComponent1());
            const dependant2 = entity.addComponent(new DependantComponent2());

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

        it("Should throw when trying to use the same dependency twice in the same context", () =>
        {
            class DependencyComponent extends Component { }
            class DependantComponent extends Component { }

            const entity = new Entity();

            entity.addComponent(new DependencyComponent());

            const dependant = entity.addComponent(new DependantComponent());
            const context = entity.getContext(dependant);

            context.useComponent(DependencyComponent);

            expect(() => context.useComponent(DependencyComponent))
                .toThrowError(DependencyException);
        });
        it("Should throw when trying to release a dependency that isn't used in the context", () =>
        {
            class DependencyComponent extends Component { }
            class DependantComponent extends Component { }

            const entity = new Entity();

            entity.addComponent(new DependencyComponent());

            const dependant = entity.addComponent(new DependantComponent());
            const context = entity.getContext(dependant);

            expect(() => context.releaseComponent(DependencyComponent))
                .toThrowError(DependencyException);
        });

        it("Should throw an error when defining a dependency for a component not attached to the entity", () =>
        {
            class DependencyComponent extends Component { }
            class DependantComponent extends Component
            {
                public override onAttach(entity: Entity): void
                {
                    super.onAttach(entity);

                    entity.getContext(this)
                        .useComponent(DependencyComponent);
                }
            }

            const entity = new Entity();

            expect(() => entity.addComponent(new DependantComponent()))
                .toThrowError(AttachmentException);
        });

        it("Should block removing a dependency that still has dependants", () =>
        {
            class DependencyComponent extends Component { }
            class DependantComponent extends Component
            {
                public override onAttach(entity: Entity): void
                {
                    super.onAttach(entity);

                    entity.getContext(this)
                        .useComponent(DependencyComponent);
                }
            }

            const entity = new Entity();

            const dependency = entity.addComponent(new DependencyComponent());
            const dependant = entity.addComponent(new DependantComponent());

            expect(() => entity.removeComponent(dependency))
                .toThrowError(DependencyException);

            entity.removeComponent(dependant);
            entity.removeComponent(DependencyComponent);
        });

        it("Should clear & remove the context when the context itself is disposed", () =>
        {
            let context: EntityContext;

            class DependencyComponent extends Component { }
            class DependantComponent extends Component
            {
                public override onAttach(entity: Entity): void
                {
                    super.onAttach(entity);

                    context = entity.getContext(this);
                    context.useComponent(DependencyComponent);
                }
            }

            const entity = new Entity();
            const dependency = entity.addComponent(new DependencyComponent());
            const dependant = entity.addComponent(new DependantComponent());

            expect(context!).toBeInstanceOf(EntityContext);
            expect(context!.dependencies.size).toBe(1);
            expect(entity["_contexts"].has(dependant)).toBe(true);
            expect(entity["_dependencies"].has(dependency)).toBe(true);

            context!.dispose();

            expect(context!.dependencies.size).toBe(0);
            expect(entity["_contexts"].has(dependant)).toBe(false);
            expect(entity["_dependencies"].has(dependency)).toBe(false);

            expect(() => entity.removeComponent(dependency)).not.toThrowError();
        });
        it("Should clear & remove the context when the component is removed", () =>
        {
            let context: EntityContext;

            class DependencyComponent extends Component { }
            class DependantComponent extends Component
            {
                public override onAttach(entity: Entity): void
                {
                    super.onAttach(entity);

                    context = entity.getContext(this);
                    context.useComponent(DependencyComponent);
                }
            }

            const entity = new Entity();
            const dependency = entity.addComponent(new DependencyComponent());
            const dependant = entity.addComponent(new DependantComponent());

            expect(context!).toBeInstanceOf(EntityContext);
            expect(context!.dependencies.size).toBe(1);
            expect(entity["_contexts"].has(dependant)).toBe(true);
            expect(entity["_dependencies"].has(dependency)).toBe(true);

            entity.removeComponent(dependant);

            expect(context!.dependencies.size).toBe(0);
            expect(entity["_contexts"].has(dependant)).toBe(false);
            expect(entity["_dependencies"].has(dependency)).toBe(false);

            expect(() => entity.removeComponent(DependencyComponent)).not.toThrowError();
        });
        it("Should clear & remove the context when the entity is disposed", () =>
        {
            let context: EntityContext;

            class DependencyComponent extends Component { }
            class DependantComponent extends Component
            {
                public override onAttach(entity: Entity): void
                {
                    super.onAttach(entity);

                    context = entity.getContext(this);
                    context.useComponent(DependencyComponent);
                }
            }

            const entity = new Entity();
            const dependency = entity.addComponent(new DependencyComponent());
            const dependant = entity.addComponent(new DependantComponent());

            expect(context!).toBeInstanceOf(EntityContext);
            expect(context!.dependencies.size).toBe(1);
            expect(entity["_contexts"].has(dependant)).toBe(true);
            expect(entity["_dependencies"].has(dependency)).toBe(true);

            entity.dispose();

            expect(context!.dependencies.size).toBe(0);
            expect(entity["_contexts"].has(dependant)).toBe(false);
            expect(entity["_dependencies"].has(dependency)).toBe(false);
        });
    });
});
