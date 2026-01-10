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
pnpm dev           # Start Vite dev server
pnpm build         # Build for production (prod + dev builds)
pnpm typecheck     # Run TypeScript type checking (tsc)
pnpm lint          # Run ESLint
pnpm test          # Run Vitest tests
pnpm test:coverage # Run tests with coverage
```

Run a single test file:
```bash
pnpm vitest run tests/world.test.ts
```

## Architecture

### Core Classes (src/)

All ECS objects inherit from `μObject` (`core.ts`), which provides auto-incrementing unique IDs.

**World** (`world.ts`) - The central container that manages:
- Entities (with their Components)
- Systems (with priority-based execution order)
- Resources (singleton data shared across systems)
- Services (objects that are both System and Resource)
- Event publishing via `Publisher` from `@byloth/core`
- QueryManager for component queries

**Entity** (`entity.ts`) - Container for Components. Can be enabled/disabled. Manages component dependencies via EntityContext.

**Component** (`component.ts`) - Data attached to Entities. Can be enabled/disabled independently.

**System** (`system.ts`) - Logic that operates on entities/components. Has priority for execution order. `update(deltaTime)` is called by World.

**Resource** (`resource.ts`) - Singleton data shared across the world. Systems declare dependencies on Resources via WorldContext.

**QueryManager** (`query-manager.ts`) - Efficiently queries entities by component types:
- `pickOne<C>(type)` - Get first component of type
- `findFirst<C>(...types)` - Get first entity with all component types
- `findAll<C>(...types)` - Iterate all matching entities
- `getView<C>(...types)` - Get cached view that auto-updates

### Contexts (src/contexts/)

**WorldContext** (`world.ts`) - Provided to Systems. Enables:
- Event subscription (`on`, `once`, `wait`, `off`)
- Event emission (`emit`)
- Resource dependency management (`useResource`, `releaseResource`)

**EntityContext** (`entity.ts`) - Provided to Components. Enables:
- Component dependency management (`useComponent`, `releaseComponent`)

### Build System

Uses Vite with dual-mode builds:
- Production build: minified, outputs `*.prod.js` / `*.prod.cjs`
- Development build: unminified with `import.meta.env.DEV` checks preserved

Development-only code uses `import.meta.env.DEV` guards - these checks are tree-shaken in production builds.

Output formats: CJS, ESM, IIFE (global), UMD

### Dependencies

- **@byloth/core** (peer dependency) - Provides utilities like `Publisher`, `SmartIterator`, `MapView`, and exception classes

## Code Style

- Uses Allman brace style
- ESLint with `@byloth/eslint-config-typescript`
- Non-null assertions allowed (`@typescript-eslint/no-non-null-assertion: off`)
