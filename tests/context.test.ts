import { Publisher } from "@byloth/core";
import { describe, it, expect, vi, beforeEach } from "vitest";

import { Context } from "../src/index.js";

interface EventsMap
{
    "player:spawn": (evt: { x: number, y: number }) => void;
    "player:move": (coords: { x: number, y: number }) => void;
    "player:death": () => void;
}

describe("Context", () =>
{
    let publisher: Publisher<EventsMap>;
    let context: Context<EventsMap>;

    beforeEach(() =>
    {
        publisher = new Publisher();
        context = new Context(publisher);
    });

    it("Should allow subscribing to an event", () =>
    {
        const _spawnHandler = vi.fn();
        const _moveHandler = vi.fn();

        context.subscribe("player:spawn", _spawnHandler);
        context.subscribe("player:move", _moveHandler);

        publisher.publish("player:spawn", { x: 10, y: 20 });
        publisher.publish("player:move", { x: 30, y: 40 });

        expect(_spawnHandler).toHaveBeenCalledWith({ x: 10, y: 20 });
        expect(_moveHandler).toHaveBeenCalledWith({ x: 30, y: 40 });
    });
    it("Should throw if subscribing to an event that already exists", () =>
    {
        const _deathHandler1 = vi.fn();
        const _deathHandler2 = vi.fn();

        context.subscribe("player:death", _deathHandler1);
        context.subscribe("player:death", _deathHandler2);
        expect(() => context.subscribe("player:death", _deathHandler1)).toThrow();

        publisher.publish("player:death");

        expect(_deathHandler1).toHaveBeenCalledTimes(1);
        expect(_deathHandler2).toHaveBeenCalledTimes(1);
    });

    it("Should allow unsubscribing from an event", () =>
    {
        const _moveHandler1 = vi.fn();
        const _moveHandler2 = vi.fn();
        const _moveHandler3 = vi.fn();

        context.subscribe("player:move", _moveHandler1);
        context.subscribe("player:move", _moveHandler2);
        const unsubscribe = context.subscribe("player:move", _moveHandler3);

        publisher.publish("player:move", { x: 50, y: 60 });
        expect(_moveHandler1).toHaveBeenCalledTimes(1);
        expect(_moveHandler2).toHaveBeenCalledTimes(1);
        expect(_moveHandler3).toHaveBeenCalledTimes(1);

        context.unsubscribe("player:move", _moveHandler2);
        publisher.publish("player:move", { x: 70, y: 80 });
        expect(_moveHandler1).toHaveBeenCalledTimes(2);
        expect(_moveHandler2).toHaveBeenCalledTimes(1);
        expect(_moveHandler3).toHaveBeenCalledTimes(2);

        unsubscribe();
        publisher.publish("player:move", { x: 90, y: 100 });
        expect(_moveHandler1).toHaveBeenCalledTimes(3);
        expect(_moveHandler2).toHaveBeenCalledTimes(1);
        expect(_moveHandler3).toHaveBeenCalledTimes(2);
    });

    it("Should throw if unsubscribing from an event that does not exist", () =>
    {
        const _moveHandler = vi.fn();
        const _spawnHandler = vi.fn();

        context.subscribe("player:move", _moveHandler);
        expect(() => context.unsubscribe("player:spawn", _spawnHandler)).toThrow();
    });
    it("Should throw if unsubscribing a handler that was not subscribed", () =>
    {
        const _moveHandler = vi.fn();
        const _spawnHandler1 = vi.fn();
        const _spawnHandler2 = vi.fn();

        context.subscribe("player:move", _moveHandler);
        context.subscribe("player:spawn", _spawnHandler1);
        expect(() => context.unsubscribe("player:move", _spawnHandler2)).toThrow();
    });

    it("Should clear all subscribers on dispose", () =>
    {
        const _spawnHandler1 = vi.fn();
        const _spawnHandler2 = vi.fn();
        const _moveHandler1 = vi.fn();
        const _moveHandler2 = vi.fn();
        const _moveHandler3 = vi.fn();
        const _deathHandler = vi.fn();

        context.subscribe("player:spawn", _spawnHandler1);
        context.subscribe("player:spawn", _spawnHandler2);
        context.subscribe("player:move", _moveHandler1);
        context.subscribe("player:move", _moveHandler2);
        context.subscribe("player:move", _moveHandler3);
        context.subscribe("player:death", _deathHandler);

        publisher.publish("player:spawn", { x: 10, y: 20 });
        expect(_spawnHandler1).toHaveBeenCalledTimes(1);
        expect(_spawnHandler2).toHaveBeenCalledTimes(1);

        publisher.publish("player:move", { x: 30, y: 40 });
        expect(_moveHandler1).toHaveBeenCalledTimes(1);
        expect(_moveHandler2).toHaveBeenCalledTimes(1);
        expect(_moveHandler3).toHaveBeenCalledTimes(1);

        publisher.publish("player:death");
        expect(_deathHandler).toHaveBeenCalledTimes(1);

        context.dispose();

        publisher.publish("player:spawn", { x: 50, y: 60 });
        expect(_spawnHandler1).toHaveBeenCalledTimes(1);
        expect(_spawnHandler2).toHaveBeenCalledTimes(1);

        publisher.publish("player:move", { x: 70, y: 80 });
        expect(_moveHandler1).toHaveBeenCalledTimes(1);
        expect(_moveHandler2).toHaveBeenCalledTimes(1);
        expect(_moveHandler3).toHaveBeenCalledTimes(1);

        publisher.publish("player:death");
        expect(_deathHandler).toHaveBeenCalledTimes(1);
    });
});
