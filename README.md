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

---

## Features

- **World** — Central container managing Entities, Systems, Resources, and Services
- **Entity** — Container for Components, can be enabled/disabled
- **Component** — Data attached to Entities, with independent enable/disable
- **System** — Logic operating on entities/components, with priority-based execution
- **Resource** — Singleton data shared across the world
- **Service** — A System that can be used as a Resource dependency
- **QueryManager** — Efficient component queries with cached views
- **QueryView** — Cached, auto-updating view of entities matching a query
- **Contexts** — Dependency injection for Systems (WorldContext) and Components (EntityContext)
- **Events** — Built-in pub/sub system via `Publisher`

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

> **Note:** This library requires `@byloth/core` as a peer dependency.

---

## Quick Start

```typescript
import { World, Entity, Component, System } from "@byloth/micro-ecs";
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
  private view?: ReadonlyQueryView<[Position, Velocity]>;

  public override onAttach(world: World): void {
    this.view = world.getComponentView(Position, Velocity);
  }
  public override update(deltaTime: number): void {

    for (const [position, velocity] of this.view!.components) {
      position.x += velocity.vx * deltaTime;
      position.y += velocity.vy * deltaTime;
    }
  }
}

// Create the World
const world = new World();

// Add Systems and Entities
world.addSystem(new MovementSystem());

const entity = new Entity();
entity.addComponent(new Position());
entity.addComponent(new Velocity());
world.addEntity(entity);

// Game loop
function gameLoop(deltaTime: number) {
  world.update(deltaTime);
}
```

---

## Architecture

### Core Classes

```
Component   — Data attached to Entities (standalone class)
Resource    — Singleton data, attachable to World
├── Entity  — Container for Components
└── System  — Logic with update(), priority, enable/disable
```

### QueryManager

Efficiently queries entities by component types:

```typescript
// Get first component of type
world.getFirstComponent(Position);

// Get first entity with all component types
world.getFirstComponents(Position, Velocity);

// Iterate all matching entities
world.findAllComponents(Position, Velocity);

// Get cached view that auto-updates
world.getComponentView(Position, Velocity);
```

### Contexts

**WorldContext** — Provided to Systems for:
- Event subscription (`on`, `once`, `wait`, `off`)
- Event emission (`emit`)
- Resource dependency management (`useResource`, `releaseResource`)

**EntityContext** — Provided to Components for:
- Component dependency management (`useComponent`, `releaseComponent`)

---

## Roadmap

### 🟠 Improvements

Optimizations and refinements that improve quality and performance.

- [ ] **Automatic View garbage collection**

  Implement an automatic clean-up system for `QueryManager` that detects and removes Views no longer referenced or used, avoiding memory accumulation over time.

---

### 🟢 Future Considerations

Ideas and possible evolutions to evaluate based on needs.

- [ ] **Object pooling**

  Implement a pooling system for `Entity` and `Component` to reduce Garbage Collector pressure in scenarios with high creation/destruction frequency (e.g., particle systems, projectiles).

  > ⚠️ Evaluate carefully: could complicate the API and go against the project's "DX-first" philosophy.

---

## License

[Apache 2.0](https://www.apache.org/licenses/LICENSE-2.0)
