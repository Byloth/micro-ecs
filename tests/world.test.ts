import { ReferenceException } from "@byloth/core";
import { beforeEach, describe, it, expect, vi } from "vitest";

import { Entity, Context, System, World } from "../src/index.js";

describe("World", () =>
{
    let _world: World;

    beforeEach(() => { _world = new World(); });

    it("Should add an entity to the world", () =>
    {
        const entity = new Entity();
        _world.addEntity(entity);

        expect(_world.entities.size).toBe(1);
        expect(_world.entities.get(entity.id)).toBe(entity);
    });
    it("Should throw an error if the entity already exists", () =>
    {
        const entity = new Entity();
        _world.addEntity(entity);

        expect(() => _world.addEntity(entity)).toThrow(ReferenceException);
    });

    it("Should remove an entity from the world", () =>
    {
        const entity = new Entity();

        _world.addEntity(entity);
        _world.removeEntity(entity.id);

        expect(_world.entities.size).toBe(0);
        expect(_world.entities.get(entity.id)).toBeUndefined();
    });
    it("Should throw an error if the entity doesn't exist", () =>
    {
        const entity = new Entity();

        expect(() => _world.removeEntity(entity.id)).toThrow(ReferenceException);
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

        const system = new TestSystem();
        _world.addSystem(system);

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

        const system = new TestSystem();

        _world.addSystem(system);
        _world.removeSystem(system);

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

        const system1 = new TestSystem1();
        const system2 = new TestSystem2();

        _world.addSystem(system1);
        _world.addSystem(system2);

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

    it("Should provide a context for each system", () =>
    {
        class TestSystem extends System { }

        const system = new TestSystem();
        const context = _world.getContext(system);

        expect(context).toBeInstanceOf(Context);
    });
    it("Should provide the same context when getting it the same system", () =>
    {
        class TestSystem extends System { }

        const system = new TestSystem();

        const context1 = _world.getContext(system);
        const context2 = _world.getContext(system);

        expect(context1).toBe(context2);
    });

    it("Should clear & remove the context when the context itself is disposed", () =>
    {
        const _clear = vi.fn(() => { /* ... */ });

        let context: Context;
        class TestSystem extends System
        {
            public override onAttach(world: World): void
            {
                super.onAttach(world);

                context = world.getContext(this);
            }
        }

        const system = new TestSystem();
        _world.addSystem(system);

        expect(context!).toBeInstanceOf(Context);
        context!.on("__internals__:clear", _clear);
        context!.dispose();

        expect(_clear).toHaveBeenCalledTimes(1);
    });
    it("Should clear & remove the context when the system is removed", () =>
    {
        const _clear = vi.fn(() => { /* ... */ });

        let context: Context;
        class TestSystem extends System
        {
            public override onAttach(world: World): void
            {
                super.onAttach(world);

                context = world.getContext(this);
            }
        }

        const system = new TestSystem();
        _world.addSystem(system);

        expect(context!).toBeInstanceOf(Context);
        context!.on("__internals__:clear", _clear);

        _world.removeSystem(system);

        expect(_clear).toHaveBeenCalledTimes(1);
    });
});
