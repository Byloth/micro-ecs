# What is μECS?

**μECS** (micro-ecs) is a lightweight Entity Component System library for JavaScript and TypeScript.

It brings the classic ECS pattern — Entities, Components, Systems, and Resources — to high-level JavaScript, without sacrificing ergonomics.

## Design Philosophy

μECS is a **headless library**, completely agnostic to any graphics or rendering library.

Traditional ECS architectures excel in low-level contexts with direct memory control (C++, Rust). JavaScript doesn't offer this level of control, so μECS takes a **pragmatic approach**: it brings only the ECS benefits that translate well to a high-level environment.

### Three pillars

1. **DX-first** — Developer Experience is prioritized over raw performance. The library uses ES6 classes, getters/setters, and familiar OOP idioms. A pleasant API is more valuable than squeezing out every microsecond.

2. **Familiarity** — The API feels natural to any JavaScript developer. Recognizable patterns: pub/sub events, typed Maps, and class-based design.

3. **Speed over Memory** — When trade-offs are necessary, execution speed is preferred over memory consumption.

## Installation

::: code-group

```sh [pnpm]
pnpm add @byloth/micro-ecs @byloth/core
```

```sh [npm]
npm install @byloth/micro-ecs @byloth/core
```

```sh [yarn]
yarn add @byloth/micro-ecs @byloth/core
```

:::

> `@byloth/core` is a required peer dependency.
