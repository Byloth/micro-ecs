import { ReferenceException } from "@byloth/core";
import { describe, it, expect, vi } from "vitest";

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

    it("Should allow subscribing to an event", () =>
    {
        const _spawnHandler = vi.fn();
        const _moveHandler = vi.fn();

        _populateWorld(new System());

        context.subscribe("player:spawn", _spawnHandler);
        context.subscribe("player:move", _moveHandler);

        world.publish("player:spawn", { x: 10, y: 20 });
        world.publish("player:move", { x: 30, y: 40 });

        expect(_spawnHandler).toHaveBeenCalledWith({ x: 10, y: 20 });
        expect(_moveHandler).toHaveBeenCalledWith({ x: 30, y: 40 });
    });
    it("Should throw if subscribing to an event that already exists", () =>
    {
        const _deathHandler1 = vi.fn();
        const _deathHandler2 = vi.fn();

        _populateWorld(new System());

        context.subscribe("player:death", _deathHandler1);
        context.subscribe("player:death", _deathHandler2);

        world.publish("player:death");

        expect(_deathHandler1).toHaveBeenCalledTimes(1);
        expect(_deathHandler2).toHaveBeenCalledTimes(1);
    });

    it("Should allow unsubscribing from an event", () =>
    {
        const _moveHandler1 = vi.fn();
        const _moveHandler2 = vi.fn();
        const _moveHandler3 = vi.fn();

        _populateWorld(new System());

        context.subscribe("player:move", _moveHandler1);
        context.subscribe("player:move", _moveHandler2);
        const unsubscribe = context.subscribe("player:move", _moveHandler3);

        world.publish("player:move", { x: 50, y: 60 });
        expect(_moveHandler1).toHaveBeenCalledTimes(1);
        expect(_moveHandler2).toHaveBeenCalledTimes(1);
        expect(_moveHandler3).toHaveBeenCalledTimes(1);

        context.unsubscribe("player:move", _moveHandler2);
        world.publish("player:move", { x: 70, y: 80 });
        expect(_moveHandler1).toHaveBeenCalledTimes(2);
        expect(_moveHandler2).toHaveBeenCalledTimes(1);
        expect(_moveHandler3).toHaveBeenCalledTimes(2);

        unsubscribe();
        world.publish("player:move", { x: 90, y: 100 });
        expect(_moveHandler1).toHaveBeenCalledTimes(3);
        expect(_moveHandler2).toHaveBeenCalledTimes(1);
        expect(_moveHandler3).toHaveBeenCalledTimes(2);
    });

    it("Should throw if unsubscribing from an event that does not exist", () =>
    {
        const _moveHandler = vi.fn();
        const _spawnHandler = vi.fn();

        _populateWorld(new System());

        context.subscribe("player:move", _moveHandler);
        expect(() => context.unsubscribe("player:spawn", _spawnHandler)).toThrow(ReferenceException);
    });
    it("Should throw if unsubscribing a handler that was not subscribed", () =>
    {
        const _moveHandler = vi.fn();
        const _spawnHandler1 = vi.fn();
        const _spawnHandler2 = vi.fn();

        _populateWorld(new System());

        context.subscribe("player:move", _moveHandler);
        context.subscribe("player:spawn", _spawnHandler1);
        expect(() => context.unsubscribe("player:move", _spawnHandler2)).toThrow(ReferenceException);
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

        context.subscribe("player:spawn", _spawnHandler1);
        context.subscribe("player:spawn", _spawnHandler2);
        context.subscribe("player:move", _moveHandler1);
        context.subscribe("player:move", _moveHandler2);
        context.subscribe("player:move", _moveHandler3);
        context.subscribe("player:death", _deathHandler);

        world.publish("player:spawn", { x: 10, y: 20 });
        expect(_spawnHandler1).toHaveBeenCalledTimes(1);
        expect(_spawnHandler2).toHaveBeenCalledTimes(1);

        expect(_moveHandler1).not.toHaveBeenCalled();
        expect(_moveHandler2).not.toHaveBeenCalled();
        expect(_moveHandler3).not.toHaveBeenCalled();

        world.publish("player:move", { x: 30, y: 40 });
        expect(_moveHandler1).toHaveBeenCalledTimes(1);
        expect(_moveHandler2).toHaveBeenCalledTimes(1);
        expect(_moveHandler3).toHaveBeenCalledTimes(1);

        expect(_deathHandler).not.toHaveBeenCalled();

        world.publish("player:death");
        expect(_deathHandler).toHaveBeenCalledTimes(1);

        world.removeSystem(system);

        world.publish("player:spawn", { x: 50, y: 60 });
        expect(_spawnHandler1).toHaveBeenCalledTimes(1);
        expect(_spawnHandler2).toHaveBeenCalledTimes(1);

        world.publish("player:move", { x: 70, y: 80 });
        expect(_moveHandler1).toHaveBeenCalledTimes(1);
        expect(_moveHandler2).toHaveBeenCalledTimes(1);
        expect(_moveHandler3).toHaveBeenCalledTimes(1);

        world.publish("player:death");
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

        context.subscribe("player:spawn", _spawnHandler1);
        context.subscribe("player:spawn", _spawnHandler2);
        context.subscribe("player:move", _moveHandler1);
        context.subscribe("player:move", _moveHandler2);
        context.subscribe("player:move", _moveHandler3);
        context.subscribe("player:death", _deathHandler);

        world.publish("player:spawn", { x: 10, y: 20 });
        expect(_spawnHandler1).toHaveBeenCalledTimes(1);
        expect(_spawnHandler2).toHaveBeenCalledTimes(1);

        expect(_moveHandler1).not.toHaveBeenCalled();
        expect(_moveHandler2).not.toHaveBeenCalled();
        expect(_moveHandler3).not.toHaveBeenCalled();

        world.publish("player:move", { x: 30, y: 40 });
        expect(_moveHandler1).toHaveBeenCalledTimes(1);
        expect(_moveHandler2).toHaveBeenCalledTimes(1);
        expect(_moveHandler3).toHaveBeenCalledTimes(1);

        expect(_deathHandler).not.toHaveBeenCalled();

        world.publish("player:death");
        expect(_deathHandler).toHaveBeenCalledTimes(1);

        context.dispose();

        world.publish("player:spawn", { x: 50, y: 60 });
        expect(_spawnHandler1).toHaveBeenCalledTimes(1);
        expect(_spawnHandler2).toHaveBeenCalledTimes(1);

        world.publish("player:move", { x: 70, y: 80 });
        expect(_moveHandler1).toHaveBeenCalledTimes(1);
        expect(_moveHandler2).toHaveBeenCalledTimes(1);
        expect(_moveHandler3).toHaveBeenCalledTimes(1);

        world.publish("player:death");
        expect(_deathHandler).toHaveBeenCalledTimes(1);
    });
});
