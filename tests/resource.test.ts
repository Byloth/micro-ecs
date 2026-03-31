import { ReferenceException } from "@byloth/core";
import { describe, expect, it, vi } from "vitest";

import { Resource, World } from "../src/index.js";

describe("Resource", () =>
{
    describe("Initialization", () =>
    {
        it("Should be initialized with a null world", () =>
        {
            const resource = new Resource();
            expect(resource.world).toBeNull();
        });
    });

    describe("Lifecycle", () =>
    {
        it("Should be initialized and attached to a world", () =>
        {
            const _onInitialize = vi.fn();
            class TestResource extends Resource
            {
                public override initialize(world: World): void
                {
                    super.initialize(world);

                    _onInitialize();
                }
            }

            const world = new World();
            const resource = world.addResource(new TestResource());

            expect(resource.world).toBe(world);
            expect(_onInitialize).toHaveBeenCalledTimes(1);
        });
        it("Should throw when initializing a resource already attached to a world", () =>
        {
            const world1 = new World();
            const world2 = new World();
            const resource = world1.addResource(new Resource());

            expect(() => world2.addResource(resource))
                .toThrow(ReferenceException);
        });

        it("Should be disposed and detached from the world", () =>
        {
            const _onDispose = vi.fn();
            class TestResource extends Resource
            {
                public override dispose(): void
                {
                    _onDispose();

                    super.dispose();
                }
            }

            const world = new World();
            const resource = world.addResource(new TestResource());

            world.removeResource(TestResource);

            expect(resource.world).toBeNull();
            expect(_onDispose).toHaveBeenCalledTimes(1);
        });
        it("Should throw when disposing a resource not attached to any world", () =>
        {
            const resource = new Resource();

            expect(() => resource.dispose())
                .toThrow(ReferenceException);
        });
    });
});
