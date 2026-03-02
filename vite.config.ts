import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";
import type { LibraryFormats } from "vite";

export default defineConfig(({ mode }) =>
{
  const isBundler = (mode === "bundler");
  const isDev = (mode === "development");
  const isProd = (mode === "production");

  let suffix: string;
  if (isBundler) { suffix = "bundler."; }
  else if (isProd) { suffix = "prod."; }
  else { suffix = ""; }

  const formats: LibraryFormats[] = [];
  if (isBundler) { formats.push("es"); }
  else
  {
    formats.push("cjs");

    if (isProd) { formats.push("iife"); }
  }

  return {
    define: { "import.meta.env.DEV": isBundler ? "import.meta.env.DEV" : JSON.stringify(isDev) },
    build: {
      minify: isProd,
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
        formats: formats,
        name: "MicroECS"
      },
      rollupOptions: {
        external: ["@byloth/core"],
        output: {
          exports: "named",
          globals: { "@byloth/core": "Core" }
        }
      },
      emptyOutDir: isProd
    }
  };
});
