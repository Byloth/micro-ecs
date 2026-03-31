import { ReferenceException } from "@byloth/core";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
    DependencyException,
    Entity,
    Resource,
    System,
    World,
    WorldContext

} from "../src/index.js";

describe("World", () =>
{
    let _world: World;

    beforeEach(() => { _world = new World(); });

    describe("Entities", () =>
    {
        it("Should create an entity and add it to the world", () =>
        {
            const entity = _world.createEntity();

            expect(_world["_entities"].size).toBe(1);
            expect(_world["_entities"].get(entity.id)).toBe(entity);
        });

        it("Should return true when checking for an existing entity", () =>
        {
            const entity = _world.createEntity();

            expect(_world.hasEntity(entity.id)).toBe(true);
        });
        it("Should return false when checking for a non-existent entity", () =>
        {
            expect(_world.hasEntity(42)).toBe(false);
        });

        it("Should return false after destroying the entity", () =>
        {
            const entity = _world.createEntity();
            _world.destroyEntity(entity);

            expect(_world.hasEntity(entity.id)).toBe(false);
        });

        it("Should destroy an entity and remove it from the world", () =>
        {
            const entity = _world.createEntity();
            _world.destroyEntity(entity);

            expect(_world["_entities"].size).toBe(0);
            expect(_world["_entities"].get(entity.id)).toBeUndefined();
        });
        it("Should throw when destroying a non-existent entity", () =>
        {
            expect(() => _world.destroyEntity(42))
                .toThrow(ReferenceException);
        });
    });

    describe("Systems", () =>
    {
        it("Should add a system to the world", () =>
        {
            const _onUpdate = vi.fn();
            class TestSystem extends System
            {
                public override update(deltaTime: number): void
                {
                    _onUpdate();
                }
            }

            const system = _world.addSystem(new TestSystem());

            expect(_world.systems.size).toBe(1);
            expect(_world.systems.values().next().value).toBe(system);

            _world.update(16);
            expect(_onUpdate).toHaveBeenCalledTimes(1);

            _world.update(16);
            _world.update(16);
            expect(_onUpdate).toHaveBeenCalledTimes(3);
        });

        it("Should remove a system from the world", () =>
        {
            const _onUpdate = vi.fn();
            class TestSystem extends System
            {
                public override update(deltaTime: number): void
                {
                    _onUpdate();
                }
            }

            _world.addSystem(new TestSystem());
            _world.removeSystem(TestSystem);
            _world.update(16);

            expect(_onUpdate).toHaveBeenCalledTimes(0);

            expect(_world.systems.size).toBe(0);
            expect(_world.systems.values().next().value).toBeUndefined();
        });
        it("Should throw when removing a system that doesn't exist", () =>
        {
            const system = new System();

            expect(() => _world.removeSystem(system))
                .toThrow(ReferenceException);
        });

        it("Should call update on all enabled systems", () =>
        {
            const _onUpdate1 = vi.fn();
            const _onUpdate2 = vi.fn();

            class TestSystem1 extends System
            {
                public override update(deltaTime: number): void
                {
                    _onUpdate1();
                }
            }
            class TestSystem2 extends System
            {
                public override update(deltaTime: number): void
                {
                    _onUpdate2();
                }
            }

            const system1 = _world.addSystem(new TestSystem1());
            const system2 = _world.addSystem(new TestSystem2());

            _world.update(16);
            expect(_onUpdate1).toHaveBeenCalledTimes(1);
            expect(_onUpdate2).toHaveBeenCalledTimes(1);

            _world.update(16);
            _world.update(16);
            expect(_onUpdate1).toHaveBeenCalledTimes(3);
            expect(_onUpdate2).toHaveBeenCalledTimes(3);

            system1.disable();

            _world.update(16);
            expect(_onUpdate1).toHaveBeenCalledTimes(3);
            expect(_onUpdate2).toHaveBeenCalledTimes(4);

            system1.enable();
            system2.disable();

            _world.update(16);
            _world.update(16);
            _world.update(16);

            expect(_onUpdate1).toHaveBeenCalledTimes(6);
            expect(_onUpdate2).toHaveBeenCalledTimes(4);

            system1.disable();

            _world.update(16);

            expect(_onUpdate1).toHaveBeenCalledTimes(6);
            expect(_onUpdate2).toHaveBeenCalledTimes(4);
        });
    });

    describe("Resources", () =>
    {
        it("Should add a resource to the world", () =>
        {
            class TestResource extends Resource { }

            const resource = _world.addResource(new TestResource());

            expect(_world.resources.size).toBe(1);
            expect(_world.resources.get(TestResource)).toBe(resource);
        });
        it("Should throw when adding a resource that already exists", () =>
        {
            class TestResource extends Resource { }

            _world.addResource(new TestResource());

            expect(() => _world.addResource(new TestResource()))
                .toThrow(ReferenceException);
        });

        it("Should remove a resource from the world", () =>
        {
            class TestResource extends Resource { }

            _world.addResource(new TestResource());
            _world.removeResource(TestResource);

            expect(_world.resources.size).toBe(0);
        });
        it("Should throw when removing a resource that doesn't exist", () =>
        {
            class TestResource extends Resource { }

            expect(() => _world.removeResource(TestResource))
                .toThrow(ReferenceException);
        });
    });

    describe("Services", () =>
    {
        it("Should add a service as both a resource and a system", () =>
        {
            const _onUpdate = vi.fn();
            class TestService extends System
            {
                public override update(deltaTime: number): void
                {
                    _onUpdate();
                }
            }

            const service = _world.addService(new TestService());

            expect(_world.systems.size).toBe(1);
            expect(_world.resources.size).toBe(1);
            expect(_world.systems.get(TestService)).toBe(service);
            expect(_world.resources.get(TestService)).toBe(service);

            _world.update(16);
            expect(_onUpdate).toHaveBeenCalledTimes(1);
        });

        it("Should throw when adding a service that already exists as a resource", () =>
        {
            class TestService extends System { }

            _world.addResource(new TestService());

            expect(() => _world.addService(new TestService()))
                .toThrow(ReferenceException);
        });
        it("Should throw when adding a service that already exists as a system", () =>
        {
            class TestService extends System { }

            _world.addSystem(new TestService());

            expect(() => _world.addService(new TestService()))
                .toThrow(ReferenceException);
        });

        it("Should remove a service from both resource and system maps", () =>
        {
            const _onUpdate = vi.fn();
            class TestService extends System
            {
                public override update(deltaTime: number): void
                {
                    _onUpdate();
                }
            }

            _world.addService(new TestService());
            expect(_world.systems.size).toBe(1);
            expect(_world.resources.size).toBe(1);

            _world.update(16);
            expect(_onUpdate).toHaveBeenCalledTimes(1);

            _world.removeService(TestService);
            expect(_world.systems.size).toBe(0);
            expect(_world.resources.size).toBe(0);

            _world.update(16);
            expect(_onUpdate).toHaveBeenCalledTimes(1);
        });

        it("Should throw when removing a service that doesn't exist as a system", () =>
        {
            class TestService extends System { }

            _world.addResource(new TestService());

            expect(() => _world.removeService(TestService))
                .toThrow(ReferenceException);
        });
        it("Should throw when removing a service that doesn't exist as a resource", () =>
        {
            class TestService extends System { }

            _world.addSystem(new TestService());

            expect(() => _world.removeService(TestService))
                .toThrow(ReferenceException);
        });

        it("Should call update on enabled services", () =>
        {
            const _onUpdate1 = vi.fn();
            const _onUpdate2 = vi.fn();

            class TestService1 extends System
            {
                public override update(deltaTime: number): void
                {
                    _onUpdate1();
                }
            }
            class TestService2 extends System
            {
                public override update(deltaTime: number): void
                {
                    _onUpdate2();
                }
            }

            const service1 = _world.addService(new TestService1());
            _world.addService(new TestService2());

            _world.update(16);
            expect(_onUpdate1).toHaveBeenCalledTimes(1);
            expect(_onUpdate2).toHaveBeenCalledTimes(1);

            service1.disable();

            _world.update(16);
            expect(_onUpdate1).toHaveBeenCalledTimes(1);
            expect(_onUpdate2).toHaveBeenCalledTimes(2);
        });

        it("Should allow a service to be used as a dependency by other systems", () =>
        {
            class TestService extends System { }
            class TestSystem extends System
            {
                public override initialize(world: World): void
                {
                    super.initialize(world);

                    const context = world.getContext(this);
                    context.useResource(TestService);
                }
            }

            const service = _world.addService(new TestService());
            const system = _world.addSystem(new TestSystem());

            expect(_world["_dependencies"].has(service)).toBe(true);
            expect(_world["_dependencies"].get(service)!.has(system)).toBe(true);
        });
        it("Should dispose service context when removing the service", () =>
        {
            const _clear = vi.fn();

            let context: WorldContext;

            class TestResource extends Resource { }
            class TestService extends System
            {
                public override initialize(world: World): void
                {
                    super.initialize(world);

                    context = world.getContext(this);
                    context.useResource(TestResource);
                }
            }

            const resource = _world.addResource(new TestResource());
            const service = _world.addService(new TestService());

            expect(context!).toBeInstanceOf(WorldContext);
            expect(context!.dependencies.size).toBe(1);
            expect(_world["_contexts"].has(service)).toBe(true);
            expect(_world["_dependencies"].has(resource)).toBe(true);

            context!.on("__internals__:clear", _clear);

            _world.removeService(service);

            expect(_clear).toHaveBeenCalledTimes(1);
            expect(context!.dependencies.size).toBe(0);
            expect(_world["_contexts"].has(service)).toBe(false);
            expect(_world["_dependencies"].has(resource)).toBe(false);

            expect(() => _world.removeResource(resource))
                .not.toThrow();
        });
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
        it("Should provide the same context when getting it for the same system", () =>
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

        it("Should throw when using the same resource twice in the same context", () =>
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
        it("Should throw when releasing a resource that isn't used in the context", () =>
        {
            class TestResource extends Resource { }
            class TestSystem extends System { }

            _world.addResource(new TestResource());

            const system = _world.addSystem(new TestSystem());
            const context = _world.getContext(system);

            expect(() => context.releaseResource(TestResource))
                .toThrow(DependencyException);
        });

        it("Should throw when using a resource not attached to the world", () =>
        {
            class TestResource extends Resource { }
            class TestSystem extends System
            {
                public override initialize(world: World): void
                {
                    super.initialize(world);

                    world.getContext(this)
                        .useResource(TestResource);
                }
            }

            expect(() => _world.addSystem(new TestSystem()))
                .toThrow(DependencyException);
        });

        it("Should block removing a resource that still has dependants", () =>
        {
            class TestResource extends Resource { }
            class TestSystem extends System
            {
                public override initialize(world: World): void
                {
                    super.initialize(world);

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
            const _clear = vi.fn();

            let context: WorldContext;

            class TestResource extends Resource { }
            class TestSystem extends System
            {
                public override initialize(world: World): void
                {
                    super.initialize(world);

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

            expect(() => _world.removeResource(TestResource))
                .not.toThrow();
        });
        it("Should clear resource dependencies when the system is removed", () =>
        {
            const _clear = vi.fn();

            let context: WorldContext;

            class TestResource extends Resource { }
            class TestSystem extends System
            {
                public override initialize(world: World): void
                {
                    super.initialize(world);

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

            expect(() => _world.removeResource(resource))
                .not.toThrow();
        });
    });

    describe("Dispose", () =>
    {
        it("Should dispose all entities, systems, and resources", () =>
        {
            const _onDisposeEntity = vi.fn();
            const _onDisposeSystem = vi.fn();
            const _onDisposeResource = vi.fn();

            class TestEntity extends Entity
            {
                public override dispose(): void
                {
                    super.dispose();

                    _onDisposeEntity();
                }
            }

            class TestSystem extends System
            {
                public override dispose(): void
                {
                    super.dispose();

                    _onDisposeSystem();
                }
            }
            class TestSystemA extends TestSystem { }
            class TestSystemB extends TestSystem { }

            class TestResource extends Resource
            {
                public override dispose(): void
                {
                    super.dispose();

                    _onDisposeResource();
                }
            }

            _world.createEntity(TestEntity);
            _world.createEntity(TestEntity);
            _world.createEntity(TestEntity);

            _world.addSystem(new TestSystemA());
            _world.addSystem(new TestSystemB());

            _world.addResource(new TestResource());

            _world.dispose();

            expect(_onDisposeEntity).toHaveBeenCalledTimes(3);
            expect(_onDisposeSystem).toHaveBeenCalledTimes(2);
            expect(_onDisposeResource).toHaveBeenCalledTimes(1);
            expect(_world["_entities"].size).toBe(0);
            expect(_world.systems.size).toBe(0);
            expect(_world.resources.size).toBe(0);
        });
    });
});
