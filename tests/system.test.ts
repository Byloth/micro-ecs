import { describe, it, expect, vi } from "vitest";
import { System, World } from "../src/index.js";

describe("System", () =>
{
    it("Should be initialized with default values", () =>
    {
        const system = new System();

        expect(system.priority).toBe(0);
        expect(() => system.world).toThrow();
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

        expect(() => world2.addSystem(system)).toThrow();
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

        expect(() => system.world).toThrow();
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

        expect(() => world.removeSystem(system)).toThrow();
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
        system.dispose();

        expect(() => system.world).toThrow();
        expect(_dispose).toHaveBeenCalledTimes(1);
    });
});
