import { ReferenceException, RuntimeException } from "@byloth/core";
import { describe, expect, it, vi } from "vitest";

import { System, World } from "../src/index.js";

describe("System", () =>
{
    describe("Initialization", () =>
    {
        it("Should be initialized with default values", () =>
        {
            const system = new System();

            expect(system.priority).toBe(0);
            expect(system.isEnabled).toBe(true);
            expect(system.world).toBeNull();
        });
        it("Should be initialized with a custom priority", () =>
        {
            const system = new System(5);
            expect(system.priority).toBe(5);
        });
        it("Should be initialized as disabled", () =>
        {
            const system = new System(Infinity, false);
            expect(system.isEnabled).toBe(false);
        });
    });

    describe("Lifecycle", () =>
    {
        it("Should be initialized and attached to a world", () =>
        {
            const _onInitialize = vi.fn();
            class TestSystem extends System
            {
                public override initialize(world: World): void
                {
                    super.initialize(world);

                    _onInitialize();
                }
            }

            const world = new World();
            const system = world.addSystem(new TestSystem());

            expect(system.world).toBe(world);
            expect(_onInitialize).toHaveBeenCalledTimes(1);
        });
        it("Should throw when initializing a system already attached to a world", () =>
        {
            const world1 = new World();
            const world2 = new World();
            const system = world1.addSystem(new System());

            expect(() => world2.addSystem(system))
                .toThrow(ReferenceException);
        });

        it("Should be disposed and detached from the world", () =>
        {
            const _onDispose = vi.fn();
            class TestSystem extends System
            {
                public override dispose(): void
                {
                    _onDispose();

                    super.dispose();
                }
            }

            const world = new World();
            const system = world.addSystem(new TestSystem());

            world.removeSystem(TestSystem);

            expect(system.world).toBeNull();
            expect(_onDispose).toHaveBeenCalledTimes(1);
        });
        it("Should throw when disposing a system not attached to any world", () =>
        {
            const system = new System();

            expect(() => system.dispose())
                .toThrow(ReferenceException);
        });

        it("Should call update with delta time", () =>
        {
            const _onUpdate = vi.fn();
            class TestSystem extends System
            {
                public override update(deltaTime: number): void
                {
                    _onUpdate(deltaTime);
                }
            }

            const world = new World();
            world.addSystem(new TestSystem());

            world.update(16);

            expect(_onUpdate).toHaveBeenCalledWith(16);
        });
        it("Should not call update on disabled systems", () =>
        {
            const _onUpdate = vi.fn();
            class TestSystem extends System
            {
                public override update(deltaTime: number): void
                {
                    _onUpdate(deltaTime);
                }
            }

            const world = new World();
            const system = world.addSystem(new TestSystem());
            system.disable();

            world.update(16);

            expect(_onUpdate).not.toHaveBeenCalled();
        });
    });

    describe("Enable & Disable", () =>
    {
        it("Should enable a disabled system", () =>
        {
            const _onEnable = vi.fn();
            class TestSystem extends System
            {
                public override enable(): void
                {
                    super.enable();

                    _onEnable();
                }
            }

            const system = new TestSystem(0, false);
            system.enable();

            expect(system.isEnabled).toBe(true);
            expect(_onEnable).toHaveBeenCalledTimes(1);
        });
        it("Should throw when enabling an already enabled system", () =>
        {
            const system = new System();

            expect(() => system.enable())
                .toThrow(RuntimeException);
        });

        it("Should disable an enabled system", () =>
        {
            const _onDisable = vi.fn();
            class TestSystem extends System
            {
                public override disable(): void
                {
                    super.disable();

                    _onDisable();
                }
            }

            const system = new TestSystem();
            system.disable();

            expect(system.isEnabled).toBe(false);
            expect(_onDisable).toHaveBeenCalledTimes(1);
        });
        it("Should throw when disabling an already disabled system", () =>
        {
            const system = new System(0, false);

            expect(() => system.disable())
                .toThrow(RuntimeException);
        });
    });

    describe("Priority", () =>
    {
        it("Should sort systems by priority in the world's update loop", () =>
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
    });
});
