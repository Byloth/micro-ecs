import { ReferenceException } from "@byloth/core";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
    Entity,
    WorldContext,
    System,
    World,
    Resource,
    HierarchyException,
    DependencyException,
    AttachmentException

} from "../src/index.js";

describe("World", () =>
{
    let _world: World;

    beforeEach(() => { _world = new World(); });

    it("Should add an entity to the world", () =>
    {
        const entity = _world.addEntity(new Entity());

        expect(_world.entities.size).toBe(1);
        expect(_world.entities.get(entity.id)).toBe(entity);
    });
    it("Should throw an error if the entity already exists", () =>
    {
        const entity = _world.addEntity(new Entity());

        expect(() => _world.addEntity(entity)).toThrow(ReferenceException);
    });

    it("Should throw an error when trying to add a child entity directly to the world", () =>
    {
        const parent = new Entity();
        const child = parent.addChild(new Entity());

        expect(() => _world.addEntity(child))
            .toThrow(HierarchyException);
    });

    it("Should remove an entity from the world", () =>
    {
        const entity = _world.addEntity(new Entity());
        _world.removeEntity(entity);

        expect(_world.entities.size).toBe(0);
        expect(_world.entities.get(entity.id)).toBeUndefined();
    });
    it("Should throw an error if the entity doesn't exist", () =>
    {
        const entity = new Entity();

        expect(() => _world.removeEntity(entity.id)).toThrow(ReferenceException);
    });

    it("Should throw an error when trying to remove a child entity directly from the world", () =>
    {
        const parent = _world.addEntity(new Entity());
        const child = parent.addChild(new Entity());

        expect(() => _world.removeEntity(child))
            .toThrow(HierarchyException);
    });

    it("Should add a system to the world", () =>
    {
        const _update = vi.fn(() => { /* ... */ });
        class TestSystem extends System
        {
            public override update(deltaTime: number): void
            {
                _update();
            }
        }

        const system = _world.addSystem(new TestSystem());

        expect(_world.systems.size).toBe(1);
        expect(_world.systems.values().next().value).toBe(system);

        _world.update(16);
        expect(_update).toHaveBeenCalledTimes(1);

        _world.update(16);
        _world.update(16);
        expect(_update).toHaveBeenCalledTimes(3);
    });

    it("Should remove a system from the world", () =>
    {
        const _update = vi.fn(() => { /* ... */ });
        class TestSystem extends System
        {
            public override update(deltaTime: number): void
            {
                _update();
            }
        }

        _world.addSystem(new TestSystem());
        _world.removeSystem(TestSystem);
        _world.update(16);

        expect(_update).toHaveBeenCalledTimes(0);

        expect(_world.systems.size).toBe(0);
        expect(_world.systems.values().next().value).toBeUndefined();
    });
    it("Should throw an error if the system doesn't exist", () =>
    {
        const system = new System();

        expect(() => _world.removeSystem(system)).toThrow(ReferenceException);
    });

    it("Should call update on all enabled systems", () =>
    {
        const _update1 = vi.fn(() => { /* ... */ });
        const _update2 = vi.fn(() => { /* ... */ });
        class TestSystem1 extends System
        {
            public override update(deltaTime: number): void
            {
                _update1();
            }
        }
        class TestSystem2 extends System
        {
            public override update(deltaTime: number): void
            {
                _update2();
            }
        }

        const system1 = _world.addSystem(new TestSystem1());
        const system2 = _world.addSystem(new TestSystem2());

        _world.update(16);
        expect(_update1).toHaveBeenCalledTimes(1);
        expect(_update2).toHaveBeenCalledTimes(1);

        _world.update(16);
        _world.update(16);
        expect(_update1).toHaveBeenCalledTimes(3);
        expect(_update2).toHaveBeenCalledTimes(3);

        system1.disable();

        _world.update(16);
        expect(_update1).toHaveBeenCalledTimes(3);
        expect(_update2).toHaveBeenCalledTimes(4);

        system1.enable();
        system2.disable();

        _world.update(16);
        _world.update(16);
        _world.update(16);

        expect(_update1).toHaveBeenCalledTimes(6);
        expect(_update2).toHaveBeenCalledTimes(4);

        system1.disable();

        _world.update(16);

        expect(_update1).toHaveBeenCalledTimes(6);
        expect(_update2).toHaveBeenCalledTimes(4);
    });

    it("Should dispose all entities and systems", () =>
    {
        const _disposeEntity = vi.fn(() => { /* ... */ });
        const _disposeSystem = vi.fn(() => { /* ... */ });

        class TestEntity extends Entity
        {
            public override dispose(): void
            {
                super.dispose();
                _disposeEntity();
            }
        }

        class TestSystem extends System
        {
            public override dispose(): void
            {
                super.dispose();
                _disposeSystem();
            }
        }
        class TestSystemA extends TestSystem { }
        class TestSystemB extends TestSystem { }

        _world.addEntity(new TestEntity());
        _world.addEntity(new TestEntity());
        _world.addEntity(new TestEntity());

        _world.addSystem(new TestSystemA());
        _world.addSystem(new TestSystemB());

        _world.dispose();

        expect(_disposeEntity).toHaveBeenCalledTimes(3);
        expect(_disposeSystem).toHaveBeenCalledTimes(2);
        expect(_world.entities.size).toBe(0);
        expect(_world.systems.size).toBe(0);
    });

    describe("Context", () =>
    {
        it("Should provide a context for each system", () =>
        {
            class TestSystem extends System { }

            const system = new TestSystem();
            const context = _world.getContext(system);

            expect(context).toBeInstanceOf(WorldContext);
        });
        it("Should provide the same context when getting it the same system", () =>
        {
            class TestSystem extends System { }

            const system = new TestSystem();

            const context1 = _world.getContext(system);
            const context2 = _world.getContext(system);

            expect(context1).toBe(context2);
        });

        it("Should allow using and releasing resource dependencies", () =>
        {
            class TestResource extends Resource { }
            class TestSystem extends System { }

            const resource = _world.addResource(new TestResource());
            const system = _world.addSystem(new TestSystem());

            const context = _world.getContext(system);
            const _resource = context.useResource(TestResource);

            expect(_resource).toBe(resource);
            expect(context.dependencies.has(resource)).toBe(true);
            expect(context.dependencies.size).toBe(1);

            context.releaseResource(TestResource);

            expect(context.dependencies.has(resource)).toBe(false);
            expect(context.dependencies.size).toBe(0);
        });
        it("Should serve multiple dependencies independently", () =>
        {
            class TestResource extends Resource { }

            class TestSystem1 extends System { }
            class TestSystem2 extends System { }

            const resource = _world.addResource(new TestResource());
            const system1 = _world.addSystem(new TestSystem1());
            const system2 = _world.addSystem(new TestSystem2());

            const context1 = _world.getContext(system1);
            const context2 = _world.getContext(system2);

            const _resource1 = context1.useResource(TestResource);
            const _resource2 = context2.useResource(TestResource);

            expect(_resource1).toBe(_resource2);

            expect(_world["_dependencies"].size).toBe(1);
            expect(_world["_dependencies"].get(resource)?.size).toBe(2);

            context1.releaseResource(TestResource);

            expect(_world["_dependencies"].size).toBe(1);
            expect(_world["_dependencies"].get(resource)?.size).toBe(1);
        });

        it("Should throw when trying to use the same resource twice in the same context", () =>
        {
            class TestResource extends Resource { }
            class TestSystem extends System { }

            _world.addResource(new TestResource());

            const system = _world.addSystem(new TestSystem());
            const context = _world.getContext(system);

            context.useResource(TestResource);

            expect(() => context.useResource(TestResource))
                .toThrow(DependencyException);
        });
        it("Should throw when trying to release a resource that isn't used in the context", () =>
        {
            class TestResource extends Resource { }
            class TestSystem extends System { }

            _world.addResource(new TestResource());

            const system = _world.addSystem(new TestSystem());
            const context = _world.getContext(system);

            expect(() => context.releaseResource(TestResource))
                .toThrow(DependencyException);
        });

        it("Should throw an error when defining a dependency for a resource not attached to the world", () =>
        {
            class TestResource extends Resource { }
            class TestSystem extends System
            {
                public override onAttach(world: World): void
                {
                    super.onAttach(world);

                    world.getContext(this)
                        .useResource(TestResource);
                }
            }

            expect(() => _world.addSystem(new TestSystem()))
                .toThrow(AttachmentException);
        });

        it("Should block removing a resource that still has dependants", () =>
        {
            class TestResource extends Resource { }
            class TestSystem extends System
            {
                public override onAttach(world: World): void
                {
                    super.onAttach(world);

                    world.getContext(this)
                        .useResource(TestResource);
                }
            }

            const resource = _world.addResource(new TestResource());
            const system = _world.addSystem(new TestSystem());

            expect(() => _world.removeResource(resource))
                .toThrow(DependencyException);

            _world.removeSystem(system);
            _world.removeResource(TestResource);
        });

        it("Should clear resource dependencies when the context itself is disposed", () =>
        {
            const _clear = vi.fn(() => { /* ... */ });

            let context: WorldContext;

            class TestResource extends Resource { }
            class TestSystem extends System
            {
                public override onAttach(world: World): void
                {
                    super.onAttach(world);

                    context = world.getContext(this);
                    context.useResource(TestResource);
                }
            }

            const resource = _world.addResource(new TestResource());
            const system = _world.addSystem(new TestSystem());

            expect(context!).toBeInstanceOf(WorldContext);
            expect(context!.dependencies.size).toBe(1);
            expect(_world["_contexts"].has(system)).toBe(true);
            expect(_world["_dependencies"].has(resource)).toBe(true);

            context!.on("__internals__:clear", _clear);
            context!.dispose();

            expect(_clear).toHaveBeenCalledTimes(1);
            expect(context!.dependencies.size).toBe(0);
            expect(_world["_contexts"].has(system)).toBe(false);
            expect(_world["_dependencies"].has(resource)).toBe(false);

            expect(() => _world.removeResource(TestResource)).not.toThrow();
        });

        it("Should clear resource dependencies when the system is removed", () =>
        {
            const _clear = vi.fn(() => { /* ... */ });

            let context: WorldContext;

            class TestResource extends Resource { }
            class TestSystem extends System
            {
                public override onAttach(world: World): void
                {
                    super.onAttach(world);

                    context = world.getContext(this);
                    context.useResource(TestResource);
                }
            }

            const resource = _world.addResource(new TestResource());
            const system = _world.addSystem(new TestSystem());

            expect(context!).toBeInstanceOf(WorldContext);
            expect(context!.dependencies.size).toBe(1);
            expect(_world["_contexts"].has(system)).toBe(true);
            expect(_world["_dependencies"].has(resource)).toBe(true);

            context!.on("__internals__:clear", _clear);

            _world.removeSystem(TestSystem);

            expect(_clear).toHaveBeenCalledTimes(1);
            expect(context!.dependencies.size).toBe(0);
            expect(_world["_contexts"].has(system)).toBe(false);
            expect(_world["_dependencies"].has(resource)).toBe(false);

            expect(() => _world.removeResource(resource)).not.toThrow();
        });
    });
});
