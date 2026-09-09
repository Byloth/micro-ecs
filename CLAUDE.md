# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

μECS (micro-ecs) is a lightweight Entity Component System library for JavaScript and TypeScript.
It provides the classic ECS pattern with Entities, Components, Systems, and Resources, plus a World container to manage them all.

## Design Philosophy

μECS is a **headless library**, completely agnostic to any graphics or rendering library.

Traditional ECS architectures excel in low-level contexts with direct memory control (C++, Rust, etc.). JavaScript doesn't offer this level of control, so μECS takes a **pragmatic approach**: it brings only the ECS benefits that translate well to a high-level environment, leaving behind optimizations that would require direct memory management.

The library is built on three pillars:

1. **DX-first** - Developer Experience is prioritized over raw performance. For example, the library doesn't use TypedArrays which would be faster but significantly hurt ergonomics. A pleasant API is more valuable than squeezing out every microsecond.

2. **Familiarity** - The API should feel natural to any JavaScript developer. This means using recognizable patterns: ES6 classes, getters/setters, pub/sub events, and typical OOP idioms common in the JS ecosystem.

3. **Speed over Memory** - When trade-offs are necessary, execution speed is preferred over memory consumption. Using extra memory is acceptable if it yields performance benefits at runtime.

## Commands

```bash
pnpm run dev           # Start Vite dev server
pnpm run build         # Build for production (prod + dev builds)
pnpm run typecheck     # Run TypeScript type checking (tsc)
pnpm run lint          # Run ESLint
pnpm run test          # Run Vitest tests
pnpm run test:coverage # Run tests with coverage
```

Run a single test file:
```bash
pnpm run vitest run tests/world.test.ts
```

## Architecture

### Core Classes (src/)

**World** (`world.ts`) - The central container that manages:
- Entities (with their Components; IDs come from a per-world counter, `nextId`)
- Object pools for Entities and Components (sizes via `WorldOptions.entityPoolSize` / `componentPoolSize`, `0` disables pooling)
- Systems (with priority-based execution order)
- Resources (singleton data shared across systems)
- Services (objects that are both System and Resource)
- Event publishing via `Publisher` from `@byloth/core`
- QueryManager for component queries

**Entity** (`entity.ts`) - Container for Components. Can be enabled/disabled. Manages component dependencies via EntityContext.

**Component** (`component.ts`) - Data attached to Entities. Can be enabled/disabled independently.

**System** (`system.ts`) - Logic that operates on entities/components. Has priority for execution order. `update(deltaTime)` is called by World.

**Resource** (`resource.ts`) - Singleton data shared across the world. Systems declare dependencies on Resources via WorldContext.

**QueryManager** (`query/manager.ts`) - Efficiently queries entities by component types:
- `pickOne<C>(type)` - Get first component of type
- `findFirst<C>(...types)` - Get first entity with all component types
- `findAll<C>(...types)` - Iterate all matching entities
- `getView<C>(...types)` - Get cached view that auto-updates

**QueryView** (`query/view.ts`) - Cached view returned by `getView()`. Auto-updates when entities/components change. Provides:
- `entities` / `components` - Direct array access (preferred for iteration)
- `get(entity)` / `has(entity)` - Entity lookup
- `[Symbol.iterator]()` - Iterate `[entity, components]` tuples (use only when entity access is needed)
- `onAdd()` / `onRemove()` / `onClear()` - Event subscriptions

### Contexts (src/contexts/)

**WorldContext** (`world.ts`) - Provided to Systems. Enables:
- Event subscription (`on`, `once`, `wait`, `off`)
- Event emission (`emit`)
- Resource dependency management (`useResource`, `releaseResource`)

**EntityContext** (`entity.ts`) - Provided to Components. Enables:
- Component dependency management (`useComponent`, `releaseComponent`)

### Build System

Uses Vite with three build modes (`pnpm run build` runs all of them):
- Production build (`vite build`): minified, `import.meta.env.DEV` resolved to `false`. Outputs `micro-ecs.prod.cjs`, `micro-ecs.esm.prod.js`, `micro-ecs.global.prod.js`
- Development build (`--mode development`): unminified, `import.meta.env.DEV` resolved to `true`. Outputs `micro-ecs.cjs`, `micro-ecs.esm.js`
- Bundler build (`--mode bundler`): ESM with `import.meta.env.DEV` left **unresolved**, for downstream bundlers (Vite, webpack) to decide. Outputs `micro-ecs.esm.bundler.js`. Never use it as a Node entry: `import.meta.env` is undefined there.

Development-only code uses `import.meta.env.DEV` guards - these checks are tree-shaken in production builds.

Package entry points (`package.json` → `exports`):
- Bundlers (`default` condition) get `micro-ecs.esm.bundler.js`
- Node ESM (`node` condition) gets `micro-ecs.esm.js`, or `micro-ecs.esm.prod.js` with `node -C production`
- Node CJS gets `index.cjs`, which picks `micro-ecs.cjs` / `micro-ecs.prod.cjs` from `NODE_ENV`

### Dependencies

- **@byloth/core** (peer dependency) - Provides utilities like `Publisher`, `SmartIterator`, `MapView`, and exception classes

## Design Rules

- **Strict, never idempotent.** Lifecycle and state-transition methods (`enable`, `disable`, `dispose`, `destroy*`, `remove*`, `use*`/`release*`, duplicate `create*`/`add*`) throw in DEV when called in the wrong state. Do not make them idempotent, do not add `strict`/`force` parameters or permissive setters. Callers check first (`isEnabled`, `hasComponent`, ...). Rationale: a loud error beats a silently masked logic error. Library-internal cleanup of an object in unknown state checks the state explicitly (see the `createEntity` failure path in `world.ts`) instead of relaxing the method.
- **DEV-only validation.** All checks live under `import.meta.env.DEV` and are stripped in production: production trusts the caller.
- **`dispose()` is the reset.** Pools hand the same instance back, so every subclass must reset its own fields in `dispose()`. There is no separate `reset()` hook; in DEV a pool refuses objects that haven't been disposed.

## Code Style

- Uses Allman brace style
- ESLint with `@byloth/eslint-config-typescript`
- Non-null assertions allowed (`@typescript-eslint/no-non-null-assertion: off`)
