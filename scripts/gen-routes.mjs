/**
 * Regenerates TanStack Router route tree (routeTree.gen.ts).
 *
 * Runs the route generator directly without a full Vite build,
 * so tsc -b can type-check against an up-to-date route tree.
 *
 * Usage: node scripts/gen-routes.mjs
 */
import { Generator } from "@tanstack/router-generator";
import { getConfig } from "@tanstack/router-plugin";

const root = process.cwd();
const userConfig = getConfig({}, root);
const generator = new Generator({ config: userConfig, root });

await generator.run();

console.log("✓ Route tree generated");
