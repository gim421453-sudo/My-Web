import { cpSync, existsSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";

const outDir = process.argv[2] || "dist";
const root = process.cwd();
const target = resolve(root, outDir);

const assets = [
  "styles.css",
  "app.js",
  "shared",
  "services",
  "pm-env.js"
];

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
