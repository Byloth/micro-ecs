import { ReferenceException, RuntimeException } from "@byloth/core";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
    Component,
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

            expect(_world.entities.size).toBe(1);
            expect(_world.entities.get(entity.id)).toBe(entity);
        });
        it("Should expose the entities as a readonly map", () =>
        {
            const entity1 = _world.createEntity();
            const entity2 = _world.createEntity();

            expect(_world.entities).toBe(_world["_entities"]);
            expect(_world.entities.size).toBe(2);
            expect(_world.entities.get(entity1.id)).toBe(entity1);
            expect(_world.entities.get(entity2.id)).toBe(entity2);

            entity1.disable();
            expect(_world.entities.has(entity1.id)).toBe(true);

            _world.destroyEntity(entity2);
            expect(_world.entities.size).toBe(1);
            expect(_world.entities.has(entity2.id)).toBe(false);
        });

        it("Should assign entity IDs from a per-world counter starting at 1", () =>
        {
            const other = new World();

            expect(_world.nextId).toBe(1);
            expect(_world.createEntity().id).toBe(1);
            expect(_world.createEntity().id).toBe(2);
            expect(_world.nextId).toBe(3);

            expect(other.createEntity().id).toBe(1);
            expect(other.nextId).toBe(2);
        });
        it("Should assign a new ID to an entity recycled from the pool", () =>
        {
            const entity1 = _world.createEntity();
            _world.destroyEntity(entity1);

            const entity2 = _world.createEntity();

            expect(entity2).toBe(entity1);
            expect(entity2.id).toBe(2);
        });
        it("Should expose and restore the next entity ID", () =>
        {
            _world["_nextId"] = 100;

            expect(_world.createEntity().id).toBe(100);
            expect(_world.nextId).toBe(101);
        });
        it("Should throw when creating an entity whose ID is already in use", () =>
        {
            _world.createEntity();
            _world["_nextId"] = 1;

            expect(() => _world.createEntity())
                .toThrow(ReferenceException);
        });

        it("Should roll back the next ID and release the entity when `initialize` throws", () =>
        {
            const error = new Error("Boom!");

            let shouldFail = true;
            class FailingEntity extends Entity
            {
                public override initialize(world: World): void
                {
                    super.initialize(world);

                    if (shouldFail) { throw error; }
                }
            }

            const pool = _world["_getEntityPool"](FailingEntity);
            const _onWarn = vi.spyOn(console, "warn").mockImplementation(() => { /* ... */ });

            _world.createEntity();

            let caught: unknown;
            try { _world.createEntity(FailingEntity); }
            catch (e) { caught = e; }

            expect(caught).toBe(error);
            expect(_onWarn).not.toHaveBeenCalled();

            expect(_world.nextId).toBe(2);
            expect(_world.entities.size).toBe(1);
            expect(pool.available).toBe(1);

            const failed = pool["_items"][0];
            expect(failed.id).toBe(-1);
            expect(failed["_world"]).toBeNull();

            shouldFail = false;
            const entity = _world.createEntity(FailingEntity);

            expect(entity).toBe(failed);
            expect(entity.id).toBe(2);
            expect(_world.nextId).toBe(3);

            _onWarn.mockRestore();
        });
        it("Should detach components created before `initialize` throws", () =>
        {
            class TestComponent extends Component { }
            class FailingEntity extends Entity
            {
                public override initialize(world: World): void
                {
                    super.initialize(world);
                    this.createComponent(TestComponent);

                    throw new Error("Boom!");
                }
            }

            const view = _world.getComponentView(TestComponent);

            expect(() => _world.createEntity(FailingEntity))
                .toThrow("Boom!");

            expect(view.size).toBe(0);
            expect(_world["_getComponentPool"](TestComponent).available).toBe(1);
            expect(_world["_getEntityPool"](FailingEntity).available).toBe(1);
        });
        it("Should drop the entity when `initialize` throws before attaching", () =>
        {
            class FailingEntity extends Entity
            {
                public override initialize(world: World): void
                {
                    throw new Error("Boom!");
                }
            }

            expect(() => _world.createEntity(FailingEntity))
                .toThrow("Boom!");

            expect(_world.nextId).toBe(1);
            expect(_world.entities.size).toBe(0);
            expect(_world["_getEntityPool"](FailingEntity).available).toBe(0);
        });
        it("Should assign distinct IDs to entities created inside `initialize`", () =>
        {
            class ParentEntity extends Entity
            {
                public child!: Entity;

                public override initialize(world: World): void
                {
                    super.initialize(world);

                    this.child = world.createEntity();
                }
            }

            const parent = _world.createEntity(ParentEntity);

            expect(parent.id).toBe(1);
            expect(parent.child.id).toBe(2);
            expect(_world.entities.get(1)).toBe(parent);
            expect(_world.entities.get(2)).toBe(parent.child);
            expect(_world.nextId).toBe(3);
        });
        it("Should not roll back past IDs consumed by nested creations", () =>
        {
            let child: Entity;
            class FailingParentEntity extends Entity
            {
                public override initialize(world: World): void
                {
                    super.initialize(world);
                    child = world.createEntity();

                    throw new Error("Boom!");
                }
            }

            expect(() => _world.createEntity(FailingParentEntity))
                .toThrow("Boom!");

            expect(_world.nextId).toBe(3);
            expect(_world.entities.size).toBe(1);
            expect(_world.entities.get(2)).toBe(child!);
            expect(_world.createEntity().id).toBe(3);
        });
        it("Should not release the entity when its `dispose` throws during recovery", () =>
        {
            const error = new Error("Boom!");
            class FailingEntity extends Entity
            {
                public override initialize(world: World): void
                {
                    super.initialize(world);

                    throw error;
                }
                public override dispose(): void
                {
                    throw new Error("Dispose failed!");
                }
            }

            const _onWarn = vi.spyOn(console, "warn").mockImplementation(() => { /* ... */ });

            let caught: unknown;
            try { _world.createEntity(FailingEntity); }
            catch (e) { caught = e; }

            expect(caught).toBe(error);
            expect(_onWarn).toHaveBeenCalledTimes(1);
            expect(_world["_getEntityPool"](FailingEntity).available).toBe(0);
            expect(_world.nextId).toBe(1);

            _onWarn.mockRestore();
        });

        it("Should reset the next entity ID on dispose", () =>
        {
            _world.createEntity();
            _world.createEntity();
            _world.dispose();

            expect(_world.nextId).toBe(1);
            expect(_world.createEntity().id).toBe(1);
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

    describe("Pooling", () =>
    {
        class TestComponent extends Component { }

        it("Should use the default pool sizes when no options are given", () =>
        {
            expect(_world["_entityPoolSize"]).toBe(World.DefaultOptions.entityPoolSize);
            expect(_world["_componentPoolSize"]).toBe(World.DefaultOptions.componentPoolSize);
        });
        it("Should hand back a clean, recycled entity", () =>
        {
            const entity1 = _world.createEntity();
            entity1.createComponent(TestComponent);
            entity1.disable();

            _world.destroyEntity(entity1);

            const entity2 = _world.createEntity();

            expect(entity2).toBe(entity1);
            expect(entity2.id).toBe(2);
            expect(entity2.world).toBe(_world);
            expect(entity2.isEnabled).toBe(true);
            expect(entity2.components.size).toBe(0);
        });
        it("Should hand back a clean, recycled component", () =>
        {
            const entity = _world.createEntity();

            const component1 = entity.createComponent(TestComponent);
            component1.disable();
            entity.destroyComponent(TestComponent);

            const component2 = entity.createComponent(TestComponent);

            expect(component2).toBe(component1);
            expect(component2.entity).toBe(entity);
            expect(component2.isEnabled).toBe(true);
        });

        it("Should not recycle entities when their pool size is zero", () =>
        {
            const world = new World({ entityPoolSize: 0 });

            const entity1 = world.createEntity();
            world.destroyEntity(entity1);

            expect(world.createEntity()).not.toBe(entity1);
        });
        it("Should not recycle components when their pool size is zero", () =>
        {
            const world = new World({ componentPoolSize: 0 });
            const entity = world.createEntity();

            const component1 = entity.createComponent(TestComponent);
            entity.destroyComponent(TestComponent);

            expect(entity.createComponent(TestComponent)).not.toBe(component1);
        });

        it("Should throw when releasing a live entity to its pool", () =>
        {
            const entity = _world.createEntity();

            expect(() => _world["_getEntityPool"](Entity).release(entity))
                .toThrow(RuntimeException);
        });
        it("Should throw when releasing a live component to its pool", () =>
        {
            const entity = _world.createEntity();
            const component = entity.createComponent(TestComponent);

            expect(() => _world["_getComponentPool"](TestComponent).release(component))
                .toThrow(RuntimeException);
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
        it("Should throw when adding a system that already exists", () =>
        {
            const system = new System();
            _world.addSystem(system);

            expect(() => _world.addSystem(system))
                .toThrow(ReferenceException);
        });

        it("Should forward initialization arguments to the system", () =>
        {
            const _onInitialize = vi.fn();
            class TestSystem extends System
            {
                public threshold!: number;
                public name!: string;

                public override initialize(world: World, threshold: number, name: string): void
                {
                    super.initialize(world);

                    this.threshold = threshold;
                    this.name = name;

                    _onInitialize(threshold, name);
                }
            }

            const system = _world.addSystem(new TestSystem(), 10, "main");
            expect(system.threshold).toBe(10);
            expect(system.name).toBe("main");

            expect(_onInitialize).toHaveBeenCalledTimes(1);
            expect(_onInitialize).toHaveBeenCalledWith(10, "main");
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
        it("Should forward initialization arguments to the resource", () =>
        {
            const _onInitialize = vi.fn();
            class TestResource extends Resource
            {
                public value!: number;
                public label!: string;

                public override initialize(world: World, value: number, label: string): void
                {
                    super.initialize(world);

                    this.value = value;
                    this.label = label;

                    _onInitialize(value, label);
                }
            }

            const resource = _world.addResource(new TestResource(), 42, "answer");
            expect(resource.value).toBe(42);
            expect(resource.label).toBe("answer");

            expect(_onInitialize).toHaveBeenCalledTimes(1);
            expect(_onInitialize).toHaveBeenCalledWith(42, "answer");
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
        it("Should forward initialization arguments to the service", () =>
        {
            const _onInitialize = vi.fn();
            class TestService extends System
            {
                public step!: number;
                public tag!: string;

                public override initialize(world: World, step: number, tag: string): void
                {
                    super.initialize(world);

                    this.step = step;
                    this.tag = tag;

                    _onInitialize(step, tag);
                }
            }

            const service = _world.addService(new TestService(), 7, "core");
            expect(service.step).toBe(7);
            expect(service.tag).toBe("core");

            expect(_onInitialize).toHaveBeenCalledTimes(1);
            expect(_onInitialize).toHaveBeenCalledWith(7, "core");
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

            class TestResource extends Resource { }
            class TestService extends System
            {
                public override initialize(world: World): void
                {
                    super.initialize(world);

                    world.getContext(this)
                        .useResource(TestResource);
                }
            }

            const resource = _world.addResource(new TestResource());
            const service = _world.addService(new TestService());
            const context = _world.getContext(service);

            expect(context).toBeInstanceOf(WorldContext);
            expect(context.dependencies.size).toBe(1);
            expect(_world["_contexts"].has(service)).toBe(true);
            expect(_world["_dependencies"].has(resource)).toBe(true);

            context.on("__internals__:clear", _clear);

            _world.removeService(service);

            expect(_clear).toHaveBeenCalledTimes(1);
            expect(context.dependencies.size).toBe(0);
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

            const context = _world.getContext(system);

            expect(context).toBeInstanceOf(WorldContext);
            expect(context.dependencies.size).toBe(1);
            expect(_world["_contexts"].has(system)).toBe(true);
            expect(_world["_dependencies"].has(resource)).toBe(true);

            context.on("__internals__:clear", _clear);
            context.dispose();

            expect(_clear).toHaveBeenCalledTimes(1);
            expect(context.dependencies.size).toBe(0);
            expect(_world["_contexts"].has(system)).toBe(false);
            expect(_world["_dependencies"].has(resource)).toBe(false);

            expect(() => _world.removeResource(TestResource))
                .not.toThrow();
        });
        it("Should clear resource dependencies when the system is removed", () =>
        {
            const _clear = vi.fn();

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

            const context = _world.getContext(system);

            expect(context).toBeInstanceOf(WorldContext);
            expect(context.dependencies.size).toBe(1);
            expect(_world["_contexts"].has(system)).toBe(true);
            expect(_world["_dependencies"].has(resource)).toBe(true);

            context.on("__internals__:clear", _clear);

            _world.removeSystem(TestSystem);

            expect(_clear).toHaveBeenCalledTimes(1);
            expect(context.dependencies.size).toBe(0);
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
