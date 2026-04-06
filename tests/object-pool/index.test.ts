import { RuntimeException } from "@byloth/core";
import { describe, expect, it } from "vitest";

import { ObjectPool } from "../../src/index.js";

describe("ObjectPool", () =>
{
    let _nextId: number;

    const _factory = (): { id: number } =>
    {
        _nextId ??= 0;

        return { id: (_nextId += 1) };
    };

    describe("Initialization", () =>
    {
        it("Should be initialized with zero available items", () =>
        {
            const pool = new ObjectPool(_factory);

            expect(pool.available).toBe(0);
        });
    });

    describe("Acquire & Release", () =>
    {
        it("Should create a new item when the pool is empty", () =>
        {
            const pool = new ObjectPool(_factory);
            const item = pool.acquire();

            expect(item).toBeDefined();
            expect(item.id).toBeGreaterThan(0);
        });
        it("Should reuse a released item on the next acquire", () =>
        {
            const pool = new ObjectPool(_factory);
            const item = pool.acquire();

            pool.release(item);
            expect(pool.available).toBe(1);

            const reused = pool.acquire();
            expect(reused).toBe(item);
            expect(pool.available).toBe(0);
        });
        it("Should increase available count after releasing an item", () =>
        {
            const pool = new ObjectPool(_factory);
            const item1 = pool.acquire();
            const item2 = pool.acquire();

            pool.release(item1);
            expect(pool.available).toBe(1);

            pool.release(item2);
            expect(pool.available).toBe(2);
        });
        it("Should silently discard released items when the pool is full", () =>
        {
            const pool = new ObjectPool(_factory, 2);
            const items = [pool.acquire(), pool.acquire(), pool.acquire()];

            pool.release(items[0]);
            pool.release(items[1]);
            pool.release(items[2]);

            expect(pool.available).toBe(2);
        });
        it("Should throw when releasing an item that was already released", () =>
        {
            const pool = new ObjectPool(_factory);
            const item = pool.acquire();

            pool.release(item);

            expect(() => pool.release(item))
                .toThrow(RuntimeException);
        });
    });

    describe("Preallocate", () =>
    {
        it("Should preallocate items in an empty pool", () =>
        {
            const pool = new ObjectPool(_factory);

            pool.preallocate(5);
            expect(pool.available).toBe(5);
        });
        it("Should respect the maximum pool size when preallocating", () =>
        {
            const pool = new ObjectPool(_factory, 3);

            pool.preallocate(10);
            expect(pool.available).toBe(3);
        });
        it("Should add items up to the remaining capacity", () =>
        {
            const pool = new ObjectPool(_factory, 5);

            pool.preallocate(3);
            expect(pool.available).toBe(3);

            pool.preallocate(4);
            expect(pool.available).toBe(5);
        });
        it("Should do nothing when the pool is already full", () =>
        {
            const pool = new ObjectPool(_factory, 2);

            pool.preallocate(2);
            expect(pool.available).toBe(2);

            pool.preallocate(5);
            expect(pool.available).toBe(2);
        });
    });

    describe("Clear", () =>
    {
        it("Should remove all items from the pool", () =>
        {
            const pool = new ObjectPool(_factory);

            pool.preallocate(5);
            expect(pool.available).toBe(5);

            pool.clear();
            expect(pool.available).toBe(0);
        });
        it("Should do nothing on an already empty pool", () =>
        {
            const pool = new ObjectPool(_factory);

            pool.clear();
            expect(pool.available).toBe(0);
        });
        it("Should create new items after clearing", () =>
        {
            const pool = new ObjectPool(_factory);
            const item1 = pool.acquire();

            pool.release(item1);
            pool.clear();

            const item2 = pool.acquire();
            expect(item2).not.toBe(item1);
        });
    });
});
