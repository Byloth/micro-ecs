import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";

export default defineConfig(({ mode }) =>
{
  const isDev = (mode === "development");
  const suffix = isDev ? "" : "prod.";

  return {
    define: { "import.meta.env.DEV": JSON.stringify(isDev) },
    build: {
      minify: !(isDev),
      lib: {
        entry: fileURLToPath(new URL("src/index.ts", import.meta.url)),
        fileName: (format) =>
        {
          if (format === "cjs") { return `micro-ecs.${suffix}cjs`; }
          if (format === "es") { return `micro-ecs.esm.${suffix}js`; }
          if (format === "iife") { return `micro-ecs.global.${suffix}js`; }
          if (format === "umd") { return `micro-ecs.umd.${suffix}cjs`; }

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
      emptyOutDir: !(isDev)
    }
  };
});
