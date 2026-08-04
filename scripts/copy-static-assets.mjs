import { cpSync, existsSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";

const outDir = process.argv[2] || "dist";
const excludeRuntimeEnv = process.argv.slice(3).includes("--exclude-runtime-env");
const root = process.cwd();
const target = resolve(root, outDir);

const assets = [
  "styles.css",
  "app.js",
  "shared",
  "services",
  "robots.txt"
];

if (!excludeRuntimeEnv) assets.push("pm-env.js");

if (!existsSync(target)) {
  mkdirSync(target, { recursive: true });
}

assets.forEach((asset) => {
  const from = resolve(root, asset);
  if (!existsSync(from)) {
    console.warn(`Skipped missing static asset: ${asset}`);
    return;
  }
  cpSync(from, resolve(target, asset), { recursive: true });
  console.log(`Copied ${asset} -> ${outDir}/${asset}`);
});
