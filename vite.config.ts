import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";

export default defineConfig({
  build: {
    lib: {
      entry: fileURLToPath(new URL("src/index.ts", import.meta.url)),
      fileName: (format) =>
      {
        if (format === "cjs") { return "micro-ecs.cjs"; }
        if (format === "es") { return "micro-ecs.esm.js"; }
        if (format === "iife") { return "micro-ecs.global.js"; }
        if (format === "umd") { return "micro-ecs.umd.cjs"; }

        throw new Error(`Unknown build format: ${format}`);
      },
      formats: ["cjs", "es", "iife", "umd"],
      name: "MicroECS"
    },
    rollupOptions: {
      external: ["@byloth/core"],
      output: {
        exports: "named",
        globals: { "@byloth/core": "Core" }
      }
    },
    sourcemap: true
  }
});
