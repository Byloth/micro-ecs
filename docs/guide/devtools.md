# DevTools

`@byloth/micro-ecs-devtools` provides a standalone inspector panel to visualize your ECS world in real time — entities, components, systems, and resources — with zero framework requirements.

## How it works

```
Host App (browser)          DevTools UI
──────────────────          ─────────────────
createDevTools({ world })   http://localhost:5174
       │                          │
       └── WebSocket (5175) ──────┘
```

The host app streams ECS snapshots to a WebSocket relay server. The DevTools Vue app connects to the same server and displays everything in real time.

## Setup

### 1. Add the package

::: code-group

```sh [pnpm]
pnpm add -D @byloth/micro-ecs-devtools
```

```sh [npm]
npm install --save-dev @byloth/micro-ecs-devtools
```

:::

### 2. Register the Vite plugin (in your host app)

```typescript
// vite.config.ts
import { defineConfig } from "vite";
import { microECSDevToolsPlugin } from "@byloth/micro-ecs-devtools/plugin";

export default defineConfig({
    plugins: [
        microECSDevToolsPlugin() // starts the WS relay server on port 5175
    ]
});
```

### 3. Connect your World

```typescript
import { createDevTools } from "@byloth/micro-ecs-devtools";

const world = new World();
// ... set up your world ...

if (import.meta.env.DEV) {
    createDevTools({ world });
}
```

### 4. Open the DevTools UI

Start the DevTools app in a separate terminal:

```sh
pnpm --filter @byloth/micro-ecs-devtools run dev
```

Then open [http://localhost:5174](http://localhost:5174).

## Options

```typescript
createDevTools({
    world,         // World instance (required)
    port: 5175     // WS server port (default: 5175)
});
```

```typescript
microECSDevToolsPlugin({
    port: 5175     // WS server port (default: 5175)
});
```

## Future: Browser Extension

The WebSocket protocol is designed to be portable. A future browser extension will replace the WS transport with `chrome.runtime` messaging, without changing the DevTools UI or the `createDevTools` API.
