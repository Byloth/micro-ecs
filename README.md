# μECS 🕹

[![NPM Version](https://img.shields.io/npm/v/%40byloth%2Fmicro-ecs)](https://www.npmjs.com/package/@byloth/micro-ecs)
[![Codecov](https://codecov.io/gh/Byloth/micro-ecs/graph/badge.svg?token=GU8UM7FQFL)](https://codecov.io/gh/Byloth/micro-ecs)
[![NPM release](https://github.com/Byloth/micro-ecs/actions/workflows/release-npm.yml/badge.svg)](https://github.com/Byloth/micro-ecs/actions/workflows/release-npm.yml)
[![GPR release](https://github.com/Byloth/micro-ecs/actions/workflows/release-gpr.yml/badge.svg)](https://github.com/Byloth/micro-ecs/actions/workflows/release-gpr.yml)
[![NPM Downloads](https://img.shields.io/npm/dt/%40byloth%2Fmicro-ecs)](https://www.npmjs.com/package/@byloth/micro-ecs)
[![License](https://img.shields.io/github/license/byloth/micro-ecs)](https://www.apache.org/licenses/LICENSE-2.0)

A simple & lightweight ECS (Entity Component System) library for JavaScript and TypeScript.

---

## Overview

μECS (micro-ecs) is a **headless library**, completely agnostic to any graphics or rendering library.

Traditional ECS architectures excel in low-level contexts with direct memory control (C++, Rust, etc.).  
JavaScript doesn't offer this level of control, so μECS takes a **pragmatic approach**: it brings only the ECS benefits that translate well to a high-level environment, leaving behind optimizations that would require direct memory management.

### Design Philosophy

The library is built on three pillars:

- **DX-first**: Developer Experience is prioritized over raw performance.  
The library doesn't use TypedArrays which would be faster but significantly hurt ergonomics.  
A pleasant API is more valuable than squeezing out every microsecond.
- **Familiarity**: The API should feel natural to any JavaScript developer.  
This means using recognizable patterns: ES6 classes, getters/setters, pub/sub events, and typical OOP idioms common in the JS ecosystem.
- **Speed over Memory**: When trade-offs are necessary, execution speed is preferred over memory consumption.  
Using extra memory is acceptable if it yields performance benefits at runtime.

### Is it any good?

Yes. <sup>[<a href="https://news.ycombinator.com/item?id=3067434">1</a>]</sup>

---

## Installation

```bash
# npm
npm install @byloth/micro-ecs @byloth/core

# pnpm
pnpm add @byloth/micro-ecs @byloth/core

# yarn
yarn add @byloth/micro-ecs @byloth/core

# bun
bun add @byloth/micro-ecs @byloth/core
```

> [!NOTE]
> This library requires [`@byloth/core`](https://www.npmjs.com/package/@byloth/core) as a peer dependency.

---

## Quick Start

```typescript
import { World, Component, System } from "@byloth/micro-ecs";
import type { ReadonlyQueryView } from "@byloth/micro-ecs";

// Define Components
class Position extends Component {
  public x = 0;
  public y = 0;
}
class Velocity extends Component {
  public vx = 0;
  public vy = 0;
}

// Define a System
class MovementSystem extends System {
  private _view!: ReadonlyQueryView<[Position, Velocity]>;

  public override initialize(world: World): void {
    super.initialize(world);

    this._view = world.getComponentView(Position, Velocity);
  }
  public override update(deltaTime: number): void {
    for (const [position, velocity] of this._view.components) {
      position.x += velocity.vx * deltaTime;
      position.y += velocity.vy * deltaTime;
    }
  }
}

// Create the World
const world = new World();

// Add Systems
world.addSystem(new MovementSystem());

// Create Entities and Components
const entity = world.createEntity();
entity.createComponent(Position);
entity.createComponent(Velocity);

// Game loop
let _lastTime = performance.now();
function gameLoop() {
  const currentTime = performance.now();
  const deltaTime = currentTime - _lastTime;

  world.update(deltaTime);

  _lastTime = currentTime;

  requestAnimationFrame(gameLoop);
}

requestAnimationFrame(gameLoop);
```

---

## Key Concepts

### Lifecycle

Every core class follows the `Poolable` pattern: the constructor creates the object in an empty state, `initialize()` activates it, and `dispose()` resets it.  
Entities and Components are pooled automatically by the World.

### World

The central container. Creates and destroys Entities, registers Systems and Resources, dispatches events, and drives the update loop.

```typescript
const world = new World();

// Entities
const entity = world.createEntity();
world.destroyEntity(entity);

// Systems (priority order — lower runs first)
world.addSystem(new PhysicsSystem());
world.addSystem(new RenderSystem(10));
world.removeSystem(PhysicsSystem);

// Resources (singletons shared across the world)
world.addResource(new GameConfig());
world.removeResource(GameConfig);

// Services (System + Resource in one)
world.addService(new InputManager());
world.removeService(InputManager);

// Events
world.emit("player:hit", entity, 10);

// Update loop & cleanup
world.update(deltaTime);
world.dispose();
```

### Entity & Component

Entities are containers for Components. Each entity can hold at most one instance of a given Component type.  
Both can be enabled/disabled to show or hide them from queries.

```typescript
const entity = world.createEntity();

const hp = entity.createComponent(Health, true, 200);
entity.hasComponent(Health);  // true
entity.getComponent(Health);  // Health
entity.destroyComponent(Health);

entity.disable();  // Hides from queries
entity.enable();   // Visible again
```

Components accept custom parameters through `initialize()`:

```typescript
class Health extends Component {
  public current = 100;
  public max = 100;

  public override initialize(entity: Entity, enabled?: boolean, maxHp?: number): void {
    super.initialize(entity, enabled);

    this.current = maxHp ?? 100;
    this.max = maxHp ?? 100;
  }
}
```

### System

Systems contain logic that runs every frame via `update()`.  
They extend `Resource` and support priority-based execution order.

```typescript
class PhysicsSystem extends System {
  public constructor() {
    super(/* priority */ 0, /* enabled */ true);
  }

  public override initialize(world: World): void {
    super.initialize(world);
  }
  public override update(deltaTime: number): void {
    // Called every frame by world.update()
  }
  public override dispose(): void {
    super.dispose();
  }
}
```

### Queries & Views

The World exposes methods to query entities by component types.  
`getComponentView()` returns a cached, auto-updating `ReadonlyQueryView`.

```typescript
// One-shot queries
world.getFirstComponent(Position);
world.getFirstComponents(Position, Velocity);

// Lazy iteration
for (const [pos, vel] of world.findAllComponents(Position, Velocity)) { /* ... */ }

// Cached view (preferred in Systems)
const view = world.getComponentView(Position, Velocity);

view.size;         // number
view.has(entity);  // boolean
view.get(entity);  // [Position, Velocity] | undefined

for (const [position, velocity] of view.components) {
  position.x += velocity.vx;
}

// React to changes
view.onAdd((entity, components) => { /* ... */ });
view.onRemove((entity, components) => { /* ... */ });
view.onClear(() => { /* ... */ });
```

### Contexts

A **WorldContext** gives Systems access to events and resource dependencies.  
An **EntityContext** lets Components declare dependencies on sibling Components.

```typescript
// WorldContext — obtained in System.initialize()
const ctx = world.getContext(this);

ctx.on("player:hit", handler);    // Subscribe
ctx.once("game:start", handler);  // Subscribe once
ctx.off("player:hit", handler);   // Unsubscribe
await ctx.wait("player:hit");     // Async wait

const config = ctx.useResource(GameConfig);  // Declare dependency
ctx.releaseResource(GameConfig);             // Release dependency

// EntityContext — obtained in Component.initialize()
const ctx = entity.getContext(this);

const pos = ctx.useComponent(Position);  // Require sibling
ctx.releaseComponent(Position);          // Release dependency
```

> [!NOTE]
> A component with active dependants cannot be destroyed until its dependants are removed first.

---

## Roadmap

### 🔴 Critical Implementations

Issues that block or compromise production usage.

*Luckily, none at the moment.*

---

### 🟠 Known Bugs & Limitations

Known issues and current limitations to be aware of.

*Inexplicably, none at the moment.*

---

### 🟡 Improvements

Optimizations and refinements that improve quality and performance.

- [ ] **Automatic View garbage collection**

  Implement an automatic clean-up system for `QueryManager` that detects and removes Views no longer referenced or used, avoiding memory accumulation over time.

---

### 🟢 Future Considerations

Ideas and possible evolutions to evaluate based on needs.

- [ ] **Archetypes**

  Consider an archetype system to group entities with the same component "signature", optimizing queries.

  > ⚠️ In a JavaScript context, the traditional benefits of archetypes (cache locality, contiguous memory) are not exploitable.  
  > The cached View system already present in QueryManager covers part of these advantages. Actual utility to be evaluated.

---

### 🔵 Nice to Have

Features that would be beneficial but are not critical.

- [ ] **Advanced Query System**

  Rewrite the query system from scratch to allow users to define queries using, chaining and nesting logical operators: `and`, `or` and `not`.

---

## License

[Apache 2.0](https://www.apache.org/licenses/LICENSE-2.0)
