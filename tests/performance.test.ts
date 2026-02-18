import { beforeEach, describe, expect, it } from "vitest";

import { Random } from "@byloth/core";

import { Component, Entity, System, World } from "../src/index.js";
import type { ComponentType } from "../src/index.js";

const NUM_ENTITIES = 5000;
const NUM_COMPONENT_TYPES = 32;
const NUM_ITERATIONS = 1000;

// Create component types
const ComponentTypes: ComponentType[] = [];
for (let i = 0; i < NUM_COMPONENT_TYPES; i += 1)
{
    const ComponentClass = class extends Component
    {
        public value = Math.random();
    };

    Object.defineProperty(ComponentClass, "name", { value: `PerfComponent${i}` });
    ComponentTypes.push(ComponentClass);
}

describe("Performance Benchmarks", () =>
{
    let _world: World;
    let _entities: Entity[];

    beforeEach(() =>
    {
        _world = new World();
        _entities = [];

        // Create entities with random components
        for (let i = 0; i < NUM_ENTITIES; i += 1)
        {
            const entity = new Entity();
            const numComponents = Random.Integer(3, 10);
            const selectedTypes = Random.Sample(ComponentTypes, numComponents);

            for (const ComponentType of selectedTypes)
            {
                entity.addComponent(new ComponentType());
            }

            _world.addEntity(entity);
            _entities.push(entity);
        }
    });

    it("Should handle repeated single-component queries efficiently", () =>
    {
        const startTime = performance.now();

        for (let i = 0; i < NUM_ITERATIONS; i += 1)
        {
            const type = ComponentTypes[i % ComponentTypes.length];
            const component = _world.getFirstComponent(type);
            expect(component).toBeDefined();
        }

        const duration = performance.now() - startTime;

        // This should be fast due to component index
        expect(duration).toBeLessThan(100); // Should complete in < 100ms
    });

    it("Should handle repeated multi-component queries efficiently", () =>
    {
        const startTime = performance.now();

        for (let i = 0; i < NUM_ITERATIONS; i += 1)
        {
            const type1 = ComponentTypes[i % ComponentTypes.length];
            const type2 = ComponentTypes[(i + 1) % ComponentTypes.length];
            _world.getFirstComponents(type1, type2);
        }

        const duration = performance.now() - startTime;

        // This should be fast due to query caching
        expect(duration).toBeLessThan(150); // Should complete in < 150ms
    });

    it("Should handle view creation and iteration efficiently", () =>
    {
        const type1 = ComponentTypes[0];
        const type2 = ComponentTypes[1];
        const type3 = ComponentTypes[2];

        const startTime = performance.now();

        // First call creates view
        const view = _world.getComponentView(type1, type2, type3);

        // Subsequent calls should return cached view
        for (let i = 0; i < 100; i += 1)
        {
            const cachedView = _world.getComponentView(type1, type2, type3);
            expect(cachedView).toBe(view); // Same reference
        }

        // Iterate through components
        let count = 0;
        for (const components of view.components)
        {
            expect(components).toHaveLength(3);
            count += 1;
        }

        const duration = performance.now() - startTime;

        expect(count).toBeGreaterThan(0);
        expect(duration).toBeLessThan(50); // Should complete in < 50ms
    });

    it("Should handle system enable/disable efficiently", () =>
    {
        // Create systems with different priorities and unique types
        const systems = [];
        for (let i = 0; i < 100; i += 1)
        {
            class TestSystem extends System
            {
                public constructor()
                {
                    super(Random.Integer(0, 10), true);
                }
                public override update(): void { /* noop */ }
            }
            const system = new TestSystem();
            systems.push(system);
            _world.addSystem(system);
        }

        const startTime = performance.now();

        // Toggle systems multiple times
        for (let i = 0; i < 1000; i += 1)
        {
            const system = systems[i % systems.length];
            if (system.isEnabled)
            {
                system.disable();
            }
            else
            {
                system.enable();
            }
        }

        const duration = performance.now() - startTime;

        // This should be fast due to O(1) lookup with index
        expect(duration).toBeLessThan(50); // Should complete in < 50ms
    });

    it("Should handle world update efficiently", () =>
    {
        // Create systems with unique types
        let updateCount = 0;
        for (let i = 0; i < 50; i += 1)
        {
            class TestSystem extends System
            {
                public constructor(priority: number)
                {
                    super(priority, true);
                }
                public override update(): void { updateCount += 1; }
            }
            _world.addSystem(new TestSystem(i));
        }

        const startTime = performance.now();

        // Run many update frames
        for (let i = 0; i < 1000; i += 1)
        {
            _world.update(0.016); // 60 FPS
        }

        const duration = performance.now() - startTime;

        expect(updateCount).toBe(50 * 1000); // 50 systems * 1000 frames
        expect(duration).toBeLessThan(100); // Should complete in < 100ms
    });
});
