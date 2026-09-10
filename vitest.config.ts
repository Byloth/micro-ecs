import { fileURLToPath } from "node:url";
import { defineConfig, configDefaults } from "vitest/config";

export default defineConfig({
  test: {
    exclude: configDefaults.exclude,
    environment: "node",
    fsModuleCache: true,
    root: fileURLToPath(new URL("./", import.meta.url))
  }
});
