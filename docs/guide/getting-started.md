# Getting Started

## Installation

::: code-group

```sh [pnpm]
pnpm add @byloth/micro-ecs @byloth/core
```

```sh [npm]
npm install @byloth/micro-ecs @byloth/core
```

:::

## Quick Example

```typescript
import { World, Entity, Component, System } from "@byloth/micro-ecs";

// 1. Define components (pure data)
class Position extends Component {
    x: number;
    y: number;

    constructor(x = 0, y = 0) {
        super();
        this.x = x;
        this.y = y;
    }
}

class Velocity extends Component {
    vx: number;
    vy: number;

    constructor(vx = 0, vy = 0) {
        super();
        this.vx = vx;
        this.vy = vy;
    }
}

// 2. Define systems (logic)
class MovementSystem extends System {
    private _view = this.world!.getComponentView(Position, Velocity);

    update(deltaTime: number): void {
        for (const [pos, vel] of this._view) {
            pos.x += vel.vx * deltaTime;
            pos.y += vel.vy * deltaTime;
        }
    }
}

// 3. Create the world
const world = new World();

// 4. Add a system
world.addSystem(new MovementSystem());

// 5. Add entities with components
const entity = new Entity();
entity.addComponent(new Position(0, 0));
entity.addComponent(new Velocity(10, 5));
world.addEntity(entity);

// 6. Tick the world (e.g., in a game loop)
function gameLoop(deltaTime: number) {
    world.update(deltaTime);
    requestAnimationFrame(() => gameLoop(1 / 60));
}
gameLoop(1 / 60);
```

## Next Steps

- Learn about [Entities](./entities)
- Learn about [Components](./components)
- Learn about [Systems](./systems)
- Learn about [Resources](./resources)
- Learn about [Queries](./queries)
