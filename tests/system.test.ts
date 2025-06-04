import { ReferenceException, RuntimeException } from "@byloth/core";
import { describe, it, expect, vi } from "vitest";

import { AttachmentException, System, World } from "../src/index.js";

describe("System", () =>
{
    it("Should be initialized with default values", () =>
    {
        const system = new System();

        expect(system.priority).toBe(0);
        expect(system.world).toBeNull();
    });

    it("Should enable / disable the system", () =>
    {
        const _enable = vi.fn(() => { /* ... */ });
        const _disable = vi.fn(() => { /* ... */ });
        class TestSystem extends System
        {
            public override enable(): void
            {
                super.enable();
                _enable();
            }
            public override disable(): void
            {
                super.disable();
                _disable();
            }
        }

        const system = new TestSystem();
        expect(system.enabled).toBe(true);
        expect(() => system.enable()).toThrow(RuntimeException);
        expect(_enable).not.toHaveBeenCalled();
        expect(_disable).not.toHaveBeenCalled();

        system.disable();
        expect(system.enabled).toBe(false);
        expect(() => system.disable()).toThrow(RuntimeException);
        expect(_enable).toHaveBeenCalledTimes(0);
        expect(_disable).toHaveBeenCalledTimes(1);

        system.enable();
        expect(system.enabled).toBe(true);
        expect(_enable).toHaveBeenCalledTimes(1);
        expect(_disable).toHaveBeenCalledTimes(1);
    });

    it("Should be attachable to a world", () =>
    {
        const _onAttach = vi.fn(() => { /* ... */ });
        class TestSystem extends System
        {
            public override onAttach(world: World): void
            {
                super.onAttach(world);
                _onAttach();
            }
        }

        const world = new World();
        const system = new TestSystem();

        world.addSystem(system);

        expect(system.world).toBe(world);
        expect(_onAttach).toHaveBeenCalledTimes(1);
    });
    it("Should throw an error if attached to a world while already attached to another", () =>
    {
        const _onAttach = vi.fn(() => { /* ... */ });
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
        const system = new TestSystem();

        world1.addSystem(system);

        expect(() => world2.addSystem(system)).toThrow(AttachmentException);
        expect(_onAttach).toHaveBeenCalledTimes(1);
    });

    it("Should be detachable from a world", () =>
    {
        const _onDetach = vi.fn(() => { /* ... */ });
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

        world.addSystem(system);
        world.removeSystem(system);

        expect(system.world).toBeNull();
        expect(_onDetach).toHaveBeenCalledTimes(1);
    });
    it("Should throw an error if detached from a world while not attached to one", () =>
    {
        const _onDetach = vi.fn(() => { /* ... */ });
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

        expect(() => world.removeSystem(system)).toThrow(ReferenceException);
        expect(_onDetach).not.toHaveBeenCalled();
    });

    it("Should be sortable by priority", () =>
    {
        const world = new World();
        const system0 = new System(2);
        const system1 = new System(3);
        const system2 = new System();
        const system3 = new System(2);
        const system4 = new System(1);
        const system5 = new System(-1);

        world.addSystem(system0);
        world.addSystem(system1);
        world.addSystem(system2);
        world.addSystem(system3);
        world.addSystem(system4);
        world.addSystem(system5);

        expect(world.systems).toEqual([system5, system2, system4, system0, system3, system1]);
    });

    it("Should be disposable", () =>
    {
        const _dispose = vi.fn(() => { /* ... */ });
        class TestSystem extends System
        {
            public override dispose(): void
            {
                super.dispose();
                _dispose();
            }
        }

        const system = new TestSystem();
        const world = new World();

        world.addSystem(system);
        expect(() => system.dispose()).toThrow(RuntimeException);

        world.removeSystem(system);
        system.dispose();

        expect(system.world).toBeNull();
        expect(_dispose).toHaveBeenCalledTimes(1);
    });
});
