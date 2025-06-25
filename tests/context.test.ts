import { ReferenceException, TimeoutException } from "@byloth/core";
import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";

import { Context, System, World } from "../src/index.js";

interface EventsMap
{
    "player:spawn": (evt: { x: number, y: number }) => void;
    "player:move": (coords: { x: number, y: number }) => void;
    "player:death": () => void;
}

describe("Context", () =>
{
    let world: World<EventsMap>;
    let context: Context<EventsMap>;

    const _populateWorld = (system: System): void =>
    {
        world = new World();
        world.addSystem(system);

        context = world.getContext(system);
    };

    beforeEach(() => vi.useFakeTimers());
    afterEach(() => vi.clearAllTimers());

    it("Should allow subscribing to an event", () =>
    {
        const _spawnHandler = vi.fn();
        const _moveHandler = vi.fn();

        _populateWorld(new System());

        context.on("player:spawn", _spawnHandler);
        context.on("player:move", _moveHandler);

        world.emit("player:spawn", { x: 10, y: 20 });
        world.emit("player:move", { x: 30, y: 40 });

        expect(_spawnHandler).toHaveBeenCalledWith({ x: 10, y: 20 });
        expect(_moveHandler).toHaveBeenCalledWith({ x: 30, y: 40 });
    });
    it("Should allow subscribing multiple times to the same event", () =>
    {
        const _deathHandler1 = vi.fn();
        const _deathHandler2 = vi.fn();

        _populateWorld(new System());

        context.on("player:death", _deathHandler1);
        context.on("player:death", _deathHandler2);

        world.emit("player:death");

        expect(_deathHandler1).toHaveBeenCalledTimes(1);
        expect(_deathHandler2).toHaveBeenCalledTimes(1);
    });

    it("Should allow subscribing to an event only once", () =>
    {
        const _moveHandler1 = vi.fn();
        const _moveHandler2 = vi.fn();

        _populateWorld(new System());

        context.on("player:move", _moveHandler1);
        context.once("player:move", _moveHandler2);

        world.emit("player:move", { x: 50, y: 60 });
        expect(_moveHandler1).toHaveBeenCalledWith({ x: 50, y: 60 });
        expect(_moveHandler2).toHaveBeenCalledTimes(1);

        world.emit("player:move", { x: 70, y: 80 });
        expect(_moveHandler1).toHaveBeenCalledTimes(2);
        expect(_moveHandler2).toHaveBeenCalledWith({ x: 50, y: 60 });
    });
    it("Should allow resubscribing to an event after it was called once", () =>
    {
        const _moveHandler1 = vi.fn();
        const _moveHandler2 = vi.fn();

        _populateWorld(new System());

        context.once("player:move", _moveHandler1);
        context.on("player:move", _moveHandler2);

        world.emit("player:move", { x: 50, y: 60 });
        expect(_moveHandler1).toHaveBeenCalledTimes(1);
        expect(_moveHandler2).toHaveBeenCalledTimes(1);

        context.once("player:move", _moveHandler1);

        world.emit("player:move", { x: 70, y: 80 });
        expect(_moveHandler1).toHaveBeenCalledTimes(2);
        expect(_moveHandler2).toHaveBeenCalledTimes(2);
    });

    it("Should allow waiting for an event", async () =>
    {
        const _moveHandler = vi.fn();

        _populateWorld(new System());

        setTimeout(() => world.emit("player:spawn", { x: 5, y: 6 }), 100);

        let _executed = false;
        context.wait("player:spawn")
            .then(([evt]) => _moveHandler(evt))
            .finally(() => { _executed = true; });

        await vi.advanceTimersByTimeAsync(100);

        expect(_executed).toBe(true);
        expect(_moveHandler).toHaveBeenCalledWith({ x: 5, y: 6 });
    });
    it("Should timeout if event is not emitted in time", async () =>
    {
        _populateWorld(new System());

        const _expectTimeoutPromise = expect(context.wait("player:move", 100)).rejects
            .toThrow(TimeoutException);

        expect(context["_publisher"]["_subscribers"].size).toBe(2);

        await vi.advanceTimersByTimeAsync(100);
        await _expectTimeoutPromise;

        expect(context["_publisher"]["_subscribers"].size).toBe(1);
    });

    it("Should allow unsubscribing from an event", () =>
    {
        const _moveHandler1 = vi.fn();
        const _moveHandler2 = vi.fn();
        const _moveHandler3 = vi.fn();

        _populateWorld(new System());

        context.on("player:move", _moveHandler1);
        context.on("player:move", _moveHandler2);
        const unsubscribe = context.on("player:move", _moveHandler3);

        world.emit("player:move", { x: 50, y: 60 });
        expect(_moveHandler1).toHaveBeenCalledTimes(1);
        expect(_moveHandler2).toHaveBeenCalledTimes(1);
        expect(_moveHandler3).toHaveBeenCalledTimes(1);

        context.off("player:move", _moveHandler2);
        world.emit("player:move", { x: 70, y: 80 });
        expect(_moveHandler1).toHaveBeenCalledTimes(2);
        expect(_moveHandler2).toHaveBeenCalledTimes(1);
        expect(_moveHandler3).toHaveBeenCalledTimes(2);

        unsubscribe();
        world.emit("player:move", { x: 90, y: 100 });
        expect(_moveHandler1).toHaveBeenCalledTimes(3);
        expect(_moveHandler2).toHaveBeenCalledTimes(1);
        expect(_moveHandler3).toHaveBeenCalledTimes(2);
    });

    it("Should throw if unsubscribing from an event that does not exist", () =>
    {
        const _moveHandler = vi.fn();
        const _spawnHandler = vi.fn();

        _populateWorld(new System());

        context.on("player:move", _moveHandler);
        expect(() => context.off("player:spawn", _spawnHandler)).toThrow(ReferenceException);
    });
    it("Should throw if unsubscribing a handler that was not subscribed", () =>
    {
        const _moveHandler = vi.fn();
        const _spawnHandler1 = vi.fn();
        const _spawnHandler2 = vi.fn();

        _populateWorld(new System());

        context.on("player:move", _moveHandler);
        context.on("player:spawn", _spawnHandler1);
        expect(() => context.off("player:move", _spawnHandler2)).toThrow(ReferenceException);
    });

    it("Should clear all subscribers on system detach", () =>
    {
        const _spawnHandler1 = vi.fn();
        const _spawnHandler2 = vi.fn();
        const _moveHandler1 = vi.fn();
        const _moveHandler2 = vi.fn();
        const _moveHandler3 = vi.fn();
        const _deathHandler = vi.fn();

        const system = new System();
        _populateWorld(system);

        context.on("player:spawn", _spawnHandler1);
        context.once("player:spawn", _spawnHandler2);
        context.on("player:move", _moveHandler1);
        context.once("player:move", _moveHandler2);
        context.on("player:move", _moveHandler3);
        context.once("player:death", _deathHandler);

        world.emit("player:spawn", { x: 10, y: 20 });
        expect(_spawnHandler1).toHaveBeenCalledTimes(1);
        expect(_spawnHandler2).toHaveBeenCalledTimes(1);

        expect(_moveHandler1).not.toHaveBeenCalled();
        expect(_moveHandler2).not.toHaveBeenCalled();
        expect(_moveHandler3).not.toHaveBeenCalled();

        world.emit("player:move", { x: 30, y: 40 });
        expect(_moveHandler1).toHaveBeenCalledTimes(1);
        expect(_moveHandler2).toHaveBeenCalledTimes(1);
        expect(_moveHandler3).toHaveBeenCalledTimes(1);

        expect(_deathHandler).not.toHaveBeenCalled();

        world.emit("player:death");
        expect(_deathHandler).toHaveBeenCalledTimes(1);

        world.removeSystem(system);

        world.emit("player:spawn", { x: 50, y: 60 });
        expect(_spawnHandler1).toHaveBeenCalledTimes(1);
        expect(_spawnHandler2).toHaveBeenCalledTimes(1);

        world.emit("player:move", { x: 70, y: 80 });
        expect(_moveHandler1).toHaveBeenCalledTimes(1);
        expect(_moveHandler2).toHaveBeenCalledTimes(1);
        expect(_moveHandler3).toHaveBeenCalledTimes(1);

        world.emit("player:death");
        expect(_deathHandler).toHaveBeenCalledTimes(1);
    });
    it("Should clear all subscribers on dispose", () =>
    {
        const _spawnHandler1 = vi.fn();
        const _spawnHandler2 = vi.fn();
        const _moveHandler1 = vi.fn();
        const _moveHandler2 = vi.fn();
        const _moveHandler3 = vi.fn();
        const _deathHandler = vi.fn();

        _populateWorld(new System());

        context.on("player:spawn", _spawnHandler1);
        context.once("player:spawn", _spawnHandler2);
        context.on("player:move", _moveHandler1);
        context.once("player:move", _moveHandler2);
        context.on("player:move", _moveHandler3);
        context.once("player:death", _deathHandler);

        world.emit("player:spawn", { x: 10, y: 20 });
        expect(_spawnHandler1).toHaveBeenCalledTimes(1);
        expect(_spawnHandler2).toHaveBeenCalledTimes(1);

        expect(_moveHandler1).not.toHaveBeenCalled();
        expect(_moveHandler2).not.toHaveBeenCalled();
        expect(_moveHandler3).not.toHaveBeenCalled();

        world.emit("player:move", { x: 30, y: 40 });
        expect(_moveHandler1).toHaveBeenCalledTimes(1);
        expect(_moveHandler2).toHaveBeenCalledTimes(1);
        expect(_moveHandler3).toHaveBeenCalledTimes(1);

        expect(_deathHandler).not.toHaveBeenCalled();

        world.emit("player:death");
        expect(_deathHandler).toHaveBeenCalledTimes(1);

        context.dispose();

        world.emit("player:spawn", { x: 50, y: 60 });
        expect(_spawnHandler1).toHaveBeenCalledTimes(1);
        expect(_spawnHandler2).toHaveBeenCalledTimes(1);

        world.emit("player:move", { x: 70, y: 80 });
        expect(_moveHandler1).toHaveBeenCalledTimes(1);
        expect(_moveHandler2).toHaveBeenCalledTimes(1);
        expect(_moveHandler3).toHaveBeenCalledTimes(1);

        world.emit("player:death");
        expect(_deathHandler).toHaveBeenCalledTimes(1);
    });
});
