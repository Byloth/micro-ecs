import { describe, it, expect, vi } from "vitest";
import { View } from "../../src/index.js";

describe("View", () =>
{
    it("Should add an element and trigger 'element:add' event", () =>
    {
        const _callback = vi.fn();
        const view = new View([1, 2, 3]);

        view.subscribe("element:add", _callback);
        expect(view.size).toBe(3);
        expect(view.has(2)).toBe(true);
        expect(view.has(4)).toBe(false);

        view.add(4);
        expect(view.size).toBe(4);
        expect(view.has(4)).toBe(true);

        expect(_callback).toHaveBeenCalledWith(4);
    });
    it("Should delete an element and trigger 'element:delete' event", () =>
    {
        const _callback = vi.fn();
        const view = new View([1, 2, 3]);

        view.subscribe("element:delete", _callback);
        expect(view.size).toBe(3);
        expect(view.has(1)).toBe(true);
        expect(view.has(3)).toBe(true);

        const result1 = view.delete(1);
        expect(result1).toBe(true);

        expect(view.size).toBe(2);
        expect(view.has(1)).toBe(false);
        expect(view.has(3)).toBe(true);

        expect(_callback).toHaveBeenCalledWith(1);

        const result2 = view.delete(1);
        expect(result2).toBe(false);

        expect(_callback).toHaveBeenCalledTimes(1);
    });

    it("Should clear all elements and trigger 'set:clear' event", () =>
    {
        const _callback = vi.fn();
        const view = new View([1, 2, 3]);

        view.subscribe("set:clear", _callback);
        expect(view.size).toBe(3);
        expect(view.has(2)).toBe(true);
        expect(view.has(4)).toBe(false);

        view.clear();
        expect(view.size).toBe(0);
        expect(view.has(2)).toBe(false);
        expect(view.has(4)).toBe(false);

        expect(_callback).toHaveBeenCalledTimes(1);
    });

    it("Should not trigger 'element:delete' event if element does not exist", () =>
    {
        const _callback = vi.fn();
        const view = new View([1, 2, 3]);

        view.subscribe("element:delete", _callback);
        expect(view.has(4)).toBe(false);

        const result = view.delete(4);
        expect(result).toBe(false);

        expect(_callback).not.toHaveBeenCalled();
    });

    it("Should unsubscribe from an event", () =>
    {
        const _callback1 = vi.fn();
        const _callback2 = vi.fn();

        const view = new View([1, 2, 3]);
        const unsubscribe = view.subscribe("element:add", _callback1);
        unsubscribe();

        view.subscribe("element:delete", _callback2);
        view.unsubscribe("element:delete", _callback2);

        view.add(4);
        expect(_callback1).not.toHaveBeenCalled();

        view.delete(1);
        expect(_callback2).not.toHaveBeenCalled();
    });
    it("Should handle multiple subscriptions for the same event", () =>
    {
        const _callback1 = vi.fn();
        const _callback2 = vi.fn();

        const view = new View([1, 2, 3]);

        view.subscribe("element:add", _callback1);
        view.subscribe("element:add", _callback2);

        view.add(1);

        expect(_callback1).toHaveBeenCalledWith(1);
        expect(_callback1).toHaveBeenCalledTimes(1);

        expect(_callback2).toHaveBeenCalledWith(1);
        expect(_callback2).toHaveBeenCalledTimes(1);
    });
});
