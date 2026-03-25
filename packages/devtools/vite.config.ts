import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

export default defineConfig(({ mode }) =>
{
  if (mode === "client")
  {
    return {
      build: {
        lib: {
          entry: fileURLToPath(new URL("src/index.ts", import.meta.url)),
          fileName: "micro-ecs-devtools",
          formats: ["es", "iife"],
          name: "MicroECSDevTools"
        },
        outDir: "dist/client",
        rollupOptions: {
          external: ["@byloth/micro-ecs"],
          output: { exports: "named" }
        },
        emptyOutDir: true
      }
    };
  }

  if (mode === "plugin")
  {
    return {
      build: {
        lib: {
          entry: fileURLToPath(new URL("src/server/index.ts", import.meta.url)),
          fileName: "plugin",
          formats: ["es"],
          name: "MicroECSDevToolsPlugin"
        },
        outDir: "dist/plugin",
        rollupOptions: {
          external: ["vite", "ws"],
          output: { exports: "named" }
        },
        emptyOutDir: true
      }
    };
  }

  // Default: Vue DevTools UI (dev server only — WS server is started by the host app's plugin).
  return {
    plugins: [vue()],
    build: {
      outDir: "dist/app",
      emptyOutDir: true
    }
  };
});
