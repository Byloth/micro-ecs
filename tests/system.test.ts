import { ReferenceException, RuntimeException } from "@byloth/core";
import { describe, expect, it, vi } from "vitest";

import { System, World } from "../src/index.js";

describe("System", () =>
{
    it("Should be initialized with default values", () =>
    {
        const system = new System();

        expect(system.priority).toBe(0);
        expect(system.isEnabled).toBe(true);
        expect(system.world).toBeNull();
    });

    it("Should enable / disable the system", () =>
    {
        const _onEnable = vi.fn();
        const _onDisable = vi.fn();

        class TestSystem extends System
        {
            public override enable(): void
            {
                super.enable();

                _onEnable();
            }
            public override disable(): void
            {
                super.disable();

                _onDisable();
            }
        }

        const system = new TestSystem();
        expect(system.isEnabled).toBe(true);
        expect(() => system.enable())
            .toThrow(RuntimeException);

        expect(_onEnable).not.toHaveBeenCalled();
        expect(_onDisable).not.toHaveBeenCalled();

        system.disable();
        expect(system.isEnabled).toBe(false);
        expect(() => system.disable())
            .toThrow(RuntimeException);

        expect(_onEnable).toHaveBeenCalledTimes(0);
        expect(_onDisable).toHaveBeenCalledTimes(1);

        system.enable();
        expect(system.isEnabled).toBe(true);
        expect(_onEnable).toHaveBeenCalledTimes(1);
        expect(_onDisable).toHaveBeenCalledTimes(1);
    });

    it("Should be attachable to a world", () =>
    {
        const _onAttach = vi.fn();
        class TestSystem extends System
        {
            public override onAttach(world: World): void
            {
                super.onAttach(world);

                _onAttach();
            }
        }

        const world = new World();
        const system = world.addSystem(new TestSystem());

        expect(system.world).toBe(world);
        expect(_onAttach).toHaveBeenCalledTimes(1);
    });
    it("Should throw an error if attached to a world while already attached to another", () =>
    {
        const _onAttach = vi.fn();
        class TestSystem extends System
        {
            public override onAttach(world: World): void
            {
                super.onAttach(world);

                _onAttach();
            }
        }

        const world1 = new World();
        const world2 = new World();
        const system = world1.addSystem(new TestSystem());

        expect(() => world2.addSystem(system))
            .toThrow(ReferenceException);

        expect(_onAttach).toHaveBeenCalledTimes(1);
    });

    it("Should be detachable from a world", () =>
    {
        const _onDetach = vi.fn();
        class TestSystem extends System
        {
            public override onDetach(): void
            {
                super.onDetach();

                _onDetach();
            }
        }

        const world = new World();
        const system = world.addSystem(new TestSystem());

        world.removeSystem(TestSystem);

        expect(system.world).toBeNull();
        expect(_onDetach).toHaveBeenCalledTimes(1);
    });
    it("Should throw an error if detached from a world while not attached to one", () =>
    {
        const _onDetach = vi.fn();
        class TestSystem extends System
        {
            public override onDetach(): void
            {
                super.onDetach();

                _onDetach();
            }
        }

        const world = new World();
        const system = new TestSystem();

        expect(() => world.removeSystem(system))
            .toThrow(ReferenceException);

        expect(_onDetach).not.toHaveBeenCalled();
    });

    it("Should be sortable by priority", () =>
    {
        class SystemA extends System { }
        class SystemB extends System { }
        class SystemC extends System { }
        class SystemD extends System { }
        class SystemE extends System { }
        class SystemF extends System { }

        const world = new World();
        const system0 = new SystemA(2);
        const system1 = new SystemB(3);
        const system2 = new SystemC();
        const system3 = new SystemD(2);
        const system4 = new SystemE(1);
        const system5 = new SystemF(-1);

        world.addSystem(system0);
        world.addSystem(system1);
        world.addSystem(system2);
        world.addSystem(system3);
        world.addSystem(system4);
        world.addSystem(system5);

        expect(world["_enabledSystems"])
            .toEqual([system5, system2, system4, system0, system3, system1]);
    });

    it("Should be disposable", () =>
    {
        const _onDispose = vi.fn();
        class TestSystem extends System
        {
            public override dispose(): void
            {
                super.dispose();

                _onDispose();
            }
        }

        const world = new World();
        const system = world.addSystem(new TestSystem());

        expect(() => system.dispose())
            .toThrow(RuntimeException);

        world.removeSystem(system);
        system.dispose();

        expect(system.world).toBeNull();
        expect(_onDispose).toHaveBeenCalledTimes(1);
    });
});
