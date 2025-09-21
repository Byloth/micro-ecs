import { describe, expect, it, vi } from "vitest";

import { AttachmentException, Resource, World } from "../src/index.js";
import { ReferenceException, RuntimeException } from "@byloth/core";

describe("Resource", () =>
{
    it("Should be initialize with a `null` world", () =>
    {
        const resource = new Resource();
        expect(resource.world).toBeNull();
    });

    it("Should be attachable to a world", () =>
    {
        const _onAttach = vi.fn(() => { /* ... */ });
        class TestResource extends Resource
        {
            public override onAttach(world: World): void
            {
                super.onAttach(world);

                _onAttach();
            }
        }

        const world = new World();
        const resource = world.addResource(new TestResource());

        expect(resource.world).toBe(world);
        expect(_onAttach).toHaveBeenCalledTimes(1);
    });

    it("Should throw an error if attached to a world while already attached to another", () =>
    {
        const _onAttach = vi.fn(() => { /* ... */ });
        class TestResource extends Resource
        {
            public override onAttach(world: World): void
            {
                super.onAttach(world);

                _onAttach();
            }
        }

        const world1 = new World();
        const world2 = new World();
        const resource = world1.addResource(new TestResource());

        expect(() => world2.addResource(resource)).toThrowError(AttachmentException);
    });

    it("Should be detachable from a world", () =>
    {
        const _onDetach = vi.fn(() => { /* ... */ });
        class TestResource extends Resource
        {
            public override onDetach(): void
            {
                super.onDetach();

                _onDetach();
            }
        }

        const world = new World();
        const resource = world.addResource(new TestResource());

        world.removeResource(TestResource);

        expect(resource.world).toBeNull();
        expect(_onDetach).toHaveBeenCalledTimes(1);
    });
    it("Should throw an error if detached from a world while not attached to one", () =>
    {
        const _onDetach = vi.fn(() => { /* ... */ });
        class TestResource extends Resource
        {
            public override onDetach(): void
            {
                super.onDetach();

                _onDetach();
            }
        }

        const world = new World();
        const resource = world.addResource(new TestResource());

        world.removeResource(TestResource);

        expect(() => world.removeResource(resource)).toThrowError(ReferenceException);
        expect(_onDetach).toHaveBeenCalledTimes(1);
    });

    it("Should be disposable", () =>
    {
        const _dispose = vi.fn(() => { /* ... */ });
        class TestResource extends Resource
        {
            public override onDetach(): void
            {
                super.onDetach();

                _dispose();
            }
        }

        const world = new World();
        const resource = world.addResource(new TestResource());

        expect(() => resource.dispose()).toThrowError(RuntimeException);

        world.removeResource(TestResource);
        resource.dispose();

        expect(resource.world).toBeNull();
        expect(_dispose).toHaveBeenCalledTimes(1);
    });
});
