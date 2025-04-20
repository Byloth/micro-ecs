import path from "node:path";
import { fileURLToPath } from "node:url";

import eslintTs from "@byloth/eslint-config-typescript";
import { includeIgnoreFile } from "@eslint/compat";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const gitignorePath = path.resolve(__dirname, ".gitignore");

export default [includeIgnoreFile(gitignorePath), ...eslintTs, {
  rules: {
    "no-trailing-spaces": ["error", { "ignoreComments": true }],
    "@typescript-eslint/no-non-null-assertion": "off",
    "@typescript-eslint/unified-signatures": "off"
  }
}];
