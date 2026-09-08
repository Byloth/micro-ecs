// @vitest-environment node

import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import { VERSION } from "../src/index.js";
import manifest from "../package.json" with { type: "json" };

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DIST = resolve(ROOT, "dist");

const PROBE = "let threw = false; try { new m.World().getEntity(-1); } catch { threw = true; }" +
    " console.log(JSON.stringify({ version: m.VERSION, threw: threw }));";

interface Probe { version: string, threw: boolean }
function _load(format: "esm" | "cjs", production: boolean): Probe
{
    const args = production ? ["--conditions", "production"] : [];
    if (format === "esm")
    {
        args.push("--input-type=module", "-e", `const m = await import("${manifest.name}"); ${PROBE}`);
    }
    else { args.push("-e", `const m = require("${manifest.name}"); ${PROBE}`); }

    return JSON.parse(execFileSync(process.execPath, args, { cwd: ROOT, encoding: "utf-8" }));
}

function _targets(entry: unknown): string[]
{
    if (typeof entry === "string") { return [entry]; }

    return Object.values(entry as Record<string, unknown>).flatMap(_targets);
}

describe.skipIf(!(existsSync(DIST)))("Packaging", () =>
{
    it("Should ship every file referenced by the `exports` map", () =>
    {
        for (const target of _targets(manifest.exports))
        {
            expect(existsSync(resolve(ROOT, target)), target).toBe(true);
        }
    });

    it.each([
        ["esm", false],
        ["cjs", false],
        ["esm", true],
        ["cjs", true]

    ] as const)("Should be importable from Node as %s (production: %s)", (format, production) =>
    {
        const probe = _load(format, production);

        expect(probe.version).toBe(VERSION);
        expect(probe.threw).toBe(!(production));
    });
});
