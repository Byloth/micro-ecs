import { bench, describe } from "vitest";
import { Component, Entity, System, World } from "../src/index.js";
import type { ReadonlyQueryView } from "../src/index.js";

// =============================================================================
// Test Components
// =============================================================================

class Position extends Component
{
    public x = 0;
    public y = 0;
}

class Velocity extends Component
{
    public vx = 0;
    public vy = 0;
}

class Health extends Component
{
    public current = 100;
    public max = 100;
}

class Renderable extends Component
{
    public sprite = "default";
    public layer = 0;
}

class AI extends Component
{
    public state = "idle";
    public target: Entity | null = null;
}

class Collider extends Component
{
    public width = 32;
    public height = 32;
}

class Tag1 extends Component { }
class Tag2 extends Component { }
class Tag3 extends Component { }
class Tag4 extends Component { }

// =============================================================================
// Helpers
// =============================================================================

function createBasicEntity(): Entity
{
    const entity = new Entity();
    entity.addComponent(new Position());
    entity.addComponent(new Velocity());

    return entity;
}

function createComplexEntity(): Entity
{
    const entity = new Entity();
    entity.addComponent(new Position());
    entity.addComponent(new Velocity());
    entity.addComponent(new Health());
    entity.addComponent(new Renderable());

    return entity;
}

function createFullEntity(): Entity
{
    const entity = new Entity();
    entity.addComponent(new Position());
    entity.addComponent(new Velocity());
    entity.addComponent(new Health());
    entity.addComponent(new Renderable());
    entity.addComponent(new AI());
    entity.addComponent(new Collider());

    return entity;
}

function populateWorld(world: World, count: number, factory: () => Entity): void
{
    for (let i = 0; i < count; i += 1)
    {
        world.addEntity(factory());
    }
}

// =============================================================================
// 1. BASELINE: Entity & Component Creation
// =============================================================================

describe("1. Baseline: Entity & Component Creation", () =>
{
    bench("Create empty Entity", () =>
    {
        new Entity();
    });

    bench("Create Entity + 2 Components (Position, Velocity)", () =>
    {
        createBasicEntity();
    });

    bench("Create Entity + 4 Components", () =>
    {
        createComplexEntity();
    });

    bench("Create Entity + 6 Components", () =>
    {
        createFullEntity();
    });
});

// =============================================================================
// 2. WORLD OPERATIONS: Adding/Removing Entities
// =============================================================================

describe("2. World Operations: Add Entity", () =>
{
    bench("Add Entity to empty World", () =>
    {
        const world = new World();
        world.addEntity(createBasicEntity());
    });

    // Pre-create worlds for accurate measurement
    const world100 = new World();
    populateWorld(world100, 100, createBasicEntity);

    const world1000 = new World();
    populateWorld(world1000, 1000, createBasicEntity);

    const world10000 = new World();
    populateWorld(world10000, 10000, createBasicEntity);

    bench("Add Entity to World with 100 entities", () =>
    {
        const entity = createBasicEntity();
        world100.addEntity(entity);
        world100.removeEntity(entity); // Reset for next iteration
    });

    bench("Add Entity to World with 1000 entities", () =>
    {
        const entity = createBasicEntity();
        world1000.addEntity(entity);
        world1000.removeEntity(entity);
    });

    bench("Add Entity to World with 10000 entities", () =>
    {
        const entity = createBasicEntity();
        world10000.addEntity(entity);
        world10000.removeEntity(entity);
    });
});

// =============================================================================
// 3. QUERYVIEW: Creation & Population
// =============================================================================

describe("3. QueryView: First Creation (populates from existing entities)", () =>
{
    bench("getView on empty World", () =>
    {
        const world = new World();
        world.getComponentView(Position, Velocity);
    });

    // These measure the INITIAL population cost (scanning all entities)
    // This is a one-time cost when first creating a view
    bench("getView (first call) - 100 entities", () =>
    {
        const world = new World();
        populateWorld(world, 100, createBasicEntity);
        world.getComponentView(Position, Velocity);
    });

    bench("getView (first call) - 1000 entities", () =>
    {
        const world = new World();
        populateWorld(world, 1000, createBasicEntity);
        world.getComponentView(Position, Velocity);
    });

    bench("getView (first call) - 10000 entities", () =>
    {
        const world = new World();
        populateWorld(world, 10000, createBasicEntity);
        world.getComponentView(Position, Velocity);
    });
});

describe("3b. QueryView: Cached Access", () =>
{
    const world = new World();
    populateWorld(world, 1000, createBasicEntity);
    world.getComponentView(Position, Velocity); // Pre-create

    bench("getView (cached) - 1000 entities", () =>
    {
        world.getComponentView(Position, Velocity);
    });
});

// =============================================================================
// 4. REACTIVE UPDATES: Component Enable/Disable with Active Views
// =============================================================================

describe("4. Reactive Updates: Component Changes with Active Views", () =>
{
    // Setup: World with 1000 entities and 1 active view
    const world1View = new World();
    populateWorld(world1View, 1000, createBasicEntity);
    world1View.getComponentView(Position, Velocity);
    const entities1View = Array.from(world1View.entities.values());

    bench("Enable/Disable component - 1 active view", () =>
    {
        const entity = entities1View[Math.floor(Math.random() * entities1View.length)];
        const pos = entity.getComponent(Position);

        pos.disable();
        pos.enable();
    });

    // Setup: World with 1000 entities and 5 active views
    const world5Views = new World();
    populateWorld(world5Views, 1000, createComplexEntity);
    world5Views.getComponentView(Position);
    world5Views.getComponentView(Position, Velocity);
    world5Views.getComponentView(Position, Health);
    world5Views.getComponentView(Position, Velocity, Health);
    world5Views.getComponentView(Position, Velocity, Health, Renderable);
    const entities5Views = Array.from(world5Views.entities.values());

    bench("Enable/Disable component - 5 active views", () =>
    {
        const entity = entities5Views[Math.floor(Math.random() * entities5Views.length)];
        const pos = entity.getComponent(Position);

        pos.disable();
        pos.enable();
    });

    // Setup: World with 1000 entities and 10 active views
    const world10Views = new World();
    populateWorld(world10Views, 1000, createFullEntity);
    world10Views.getComponentView(Position);
    world10Views.getComponentView(Velocity);
    world10Views.getComponentView(Health);
    world10Views.getComponentView(Position, Velocity);
    world10Views.getComponentView(Position, Health);
    world10Views.getComponentView(Velocity, Health);
    world10Views.getComponentView(Position, Velocity, Health);
    world10Views.getComponentView(Position, Velocity, Renderable);
    world10Views.getComponentView(Health, AI);
    world10Views.getComponentView(Position, Velocity, Health, Renderable, AI, Collider);
    const entities10Views = Array.from(world10Views.entities.values());

    bench("Enable/Disable component - 10 active views", () =>
    {
        const entity = entities10Views[Math.floor(Math.random() * entities10Views.length)];
        const pos = entity.getComponent(Position);

        pos.disable();
        pos.enable();
    });
});

// =============================================================================
// 5. ADD ENTITY WITH ACTIVE VIEWS
// =============================================================================

describe("5. Add Entity with Active QueryViews", () =>
{
    // Pre-create worlds
    const worldNoViews = new World();
    populateWorld(worldNoViews, 100, createBasicEntity);

    const world1View = new World();
    populateWorld(world1View, 100, createBasicEntity);
    world1View.getComponentView(Position, Velocity);

    const world5Views = new World();
    populateWorld(world5Views, 100, createComplexEntity);
    world5Views.getComponentView(Position);
    world5Views.getComponentView(Position, Velocity);
    world5Views.getComponentView(Position, Health);
    world5Views.getComponentView(Position, Velocity, Health);
    world5Views.getComponentView(Position, Velocity, Health, Renderable);

    bench("Add Entity - no active views", () =>
    {
        const entity = createBasicEntity();
        worldNoViews.addEntity(entity);
        worldNoViews.removeEntity(entity);
    });

    bench("Add Entity - 1 matching view", () =>
    {
        const entity = createBasicEntity();
        world1View.addEntity(entity);
        world1View.removeEntity(entity);
    });

    bench("Add Entity - 5 matching views", () =>
    {
        const entity = createComplexEntity();
        world5Views.addEntity(entity);
        world5Views.removeEntity(entity);
    });
});

// =============================================================================
// 6. UPDATE LOOP: Iteration Performance
// =============================================================================

describe("6. Update Loop: Iterating QueryView", () =>
{
    // 100 entities
    const world100 = new World();
    populateWorld(world100, 100, createBasicEntity);
    const view100 = world100.getComponentView(Position, Velocity);

    bench("Iterate 100 entities - for loop on .components", () =>
    {
        for (const [pos, vel] of view100.components)
        {
            pos.x += vel.vx;
            pos.y += vel.vy;
        }
    });

    bench("Iterate 100 entities - for...of on view (entity + components)", () =>
    {
        for (const [_entity, [pos, vel]] of view100)
        {
            pos.x += vel.vx;
            pos.y += vel.vy;
        }
    });

    // 1000 entities
    const world1000 = new World();
    populateWorld(world1000, 1000, createBasicEntity);
    const view1000 = world1000.getComponentView(Position, Velocity);

    bench("Iterate 1000 entities - for loop on .components", () =>
    {
        for (const [pos, vel] of view1000.components)
        {
            pos.x += vel.vx;
            pos.y += vel.vy;
        }
    });

    bench("Iterate 1000 entities - for...of on view (entity + components)", () =>
    {
        for (const [_entity, [pos, vel]] of view1000)
        {
            pos.x += vel.vx;
            pos.y += vel.vy;
        }
    });

    // 10000 entities
    const world10000 = new World();
    populateWorld(world10000, 10000, createBasicEntity);
    const view10000 = world10000.getComponentView(Position, Velocity);

    bench("Iterate 10000 entities - for loop on .components", () =>
    {
        for (const [pos, vel] of view10000.components)
        {
            pos.x += vel.vx;
            pos.y += vel.vy;
        }
    });

    bench("Iterate 10000 entities - for...of on view (entity + components)", () =>
    {
        for (const [_entity, [pos, vel]] of view10000)
        {
            pos.x += vel.vx;
            pos.y += vel.vy;
        }
    });
});

// =============================================================================
// 7. REALISTIC GAME LOOP SIMULATION
// =============================================================================

describe("7. Realistic Game Loop: Multiple Systems", () =>
{
    class MovementSystem extends System
    {
        private _view!: ReadonlyQueryView<[Position, Velocity]>;

        public override onAttach(world: World): void
        {
            super.onAttach(world);
            this._view = world.getComponentView(Position, Velocity);
        }

        public override update(_deltaTime: number): void
        {
            for (const [pos, vel] of this._view.components)
            {
                pos.x += vel.vx;
                pos.y += vel.vy;
            }
        }
    }

    class HealthSystem extends System
    {
        private _view!: ReadonlyQueryView<[Health]>;

        public override onAttach(world: World): void
        {
            super.onAttach(world);
            this._view = world.getComponentView(Health);
        }

        public override update(_deltaTime: number): void
        {
            for (const [health] of this._view.components)
            {
                if (health.current < health.max)
                {
                    health.current = Math.min(health.current + 1, health.max);
                }
            }
        }
    }

    class RenderSystem extends System
    {
        public override readonly priority = 100; // Run last

        private _view!: ReadonlyQueryView<[Position, Renderable]>;

        public override onAttach(world: World): void
        {
            super.onAttach(world);
            this._view = world.getComponentView(Position, Renderable);
        }

        public override update(_deltaTime: number): void
        {
            for (const [pos, _rend] of this._view.components)
            {
                // Simulate render calculation
                const _screenX = pos.x * 2;
                const _screenY = pos.y * 2;
            }
        }
    }

    // Small world: 100 entities
    const worldSmall = new World();
    populateWorld(worldSmall, 100, createComplexEntity);
    worldSmall.addSystem(new MovementSystem());
    worldSmall.addSystem(new HealthSystem());
    worldSmall.addSystem(new RenderSystem());

    bench("Game loop tick - 100 entities, 3 systems", () =>
    {
        worldSmall.update(16.67);
    });

    // Medium world: 1000 entities
    const worldMedium = new World();
    populateWorld(worldMedium, 1000, createComplexEntity);
    worldMedium.addSystem(new MovementSystem());
    worldMedium.addSystem(new HealthSystem());
    worldMedium.addSystem(new RenderSystem());

    bench("Game loop tick - 1000 entities, 3 systems", () =>
    {
        worldMedium.update(16.67);
    });

    // Large world: 10000 entities
    const worldLarge = new World();
    populateWorld(worldLarge, 10000, createComplexEntity);
    worldLarge.addSystem(new MovementSystem());
    worldLarge.addSystem(new HealthSystem());
    worldLarge.addSystem(new RenderSystem());

    bench("Game loop tick - 10000 entities, 3 systems", () =>
    {
        worldLarge.update(16.67);
    });
});

// =============================================================================
// 8. STRESS TEST: Many Component Types & Complex Queries
// =============================================================================

describe("8. Stress Test: Bitmask with Many Component Types", () =>
{
    // Create entities with varying component combinations
    function createMixedEntity(seed: number): Entity
    {
        const entity = new Entity();
        entity.addComponent(new Position());

        if (seed % 2 === 0) { entity.addComponent(new Velocity()); }
        if (seed % 3 === 0) { entity.addComponent(new Health()); }
        if (seed % 4 === 0) { entity.addComponent(new Renderable()); }
        if (seed % 5 === 0) { entity.addComponent(new AI()); }
        if (seed % 6 === 0) { entity.addComponent(new Collider()); }
        if (seed % 7 === 0) { entity.addComponent(new Tag1()); }
        if (seed % 8 === 0) { entity.addComponent(new Tag2()); }
        if (seed % 9 === 0) { entity.addComponent(new Tag3()); }
        if (seed % 10 === 0) { entity.addComponent(new Tag4()); }

        return entity;
    }

    const worldMixed = new World();
    for (let i = 0; i < 1000; i += 1)
    {
        worldMixed.addEntity(createMixedEntity(i));
    }

    bench("Query 2 component types (common)", () =>
    {
        worldMixed.getComponentView(Position, Velocity);
    });

    bench("Query 4 component types (medium)", () =>
    {
        worldMixed.getComponentView(Position, Velocity, Health, Renderable);
    });

    bench("Query 6 component types (rare)", () =>
    {
        worldMixed.getComponentView(Position, Velocity, Health, Renderable, AI, Collider);
    });

    // Pre-create views for iteration test
    const viewCommon = worldMixed.getComponentView(Position, Velocity);
    const viewMedium = worldMixed.getComponentView(Position, Velocity, Health, Renderable);
    const viewRare = worldMixed.getComponentView(Position, Velocity, Health, Renderable, AI, Collider);

    bench(`Iterate common query (${viewCommon.size} entities)`, () =>
    {
        for (const [pos, vel] of viewCommon.components)
        {
            pos.x += vel.vx;
        }
    });

    bench(`Iterate medium query (${viewMedium.size} entities)`, () =>
    {
        for (const [pos, vel] of viewMedium.components)
        {
            pos.x += vel.vx;
        }
    });

    bench(`Iterate rare query (${viewRare.size} entities)`, () =>
    {
        for (const [pos, vel] of viewRare.components)
        {
            pos.x += vel.vx;
        }
    });
});

// =============================================================================
// 9. WORST CASE: High Churn (Add/Remove in Loop)
// =============================================================================

describe("9. Worst Case: High Entity Churn", () =>
{
    bench("Add and immediately remove 100 entities", () =>
    {
        const world = new World();
        world.getComponentView(Position, Velocity); // Active view

        for (let i = 0; i < 100; i += 1)
        {
            const entity = world.addEntity(createBasicEntity());
            world.removeEntity(entity);
        }
    });

    bench("Toggle 100 components on/off", () =>
    {
        const world = new World();
        populateWorld(world, 100, createBasicEntity);
        world.getComponentView(Position, Velocity);

        const entities = Array.from(world.entities.values());

        for (const entity of entities)
        {
            const pos = entity.getComponent(Position);
            pos.disable();
            pos.enable();
        }
    });
});

// =============================================================================
// 10. FINDALL vs GETVIEW COMPARISON
// =============================================================================

describe("10. findAll() vs getView(): One-time vs Cached", () =>
{
    const world = new World();
    populateWorld(world, 1000, createBasicEntity);

    bench("findAll() - creates iterator each time", () =>
    {
        const iter = world.findAllComponents(Position, Velocity);
        for (const [pos, vel] of iter)
        {
            pos.x += vel.vx;
        }
    });

    const view = world.getComponentView(Position, Velocity);

    bench("getView().components - cached array", () =>
    {
        for (const [pos, vel] of view.components)
        {
            pos.x += vel.vx;
        }
    });
});
