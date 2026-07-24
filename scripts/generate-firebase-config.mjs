import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { resolve } from "node:path";

const root = process.cwd();
const envPath = resolve(root, ".env");
const outputPath = resolve(root, "firebase-config.local.js");
const stableOutputPath = resolve(root, "pm-firebase-config.js");
const runtimeEnvOutputPath = resolve(root, "pm-env.js");
const packagePath = resolve(root, "package.json");
const requiredKeys = [
  "VITE_FIREBASE_API_KEY",
  "VITE_FIREBASE_AUTH_DOMAIN",
  "VITE_FIREBASE_PROJECT_ID",
  "VITE_FIREBASE_STORAGE_BUCKET",
  "VITE_FIREBASE_MESSAGING_SENDER_ID",
  "VITE_FIREBASE_APP_ID"
];

function parseEnv(text) {
  return Object.fromEntries(
    text
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#") && line.includes("="))
      .map((line) => {
        const [key, ...rest] = line.split("=");
        return [key, rest.join("=").replace(/^["']|["']$/g, "")];
      })
  );
}

const fileEnv = existsSync(envPath) ? parseEnv(readFileSync(envPath, "utf8")) : {};
const env = { ...fileEnv, ...process.env };
const missing = requiredKeys.filter((key) => !env[key]);

if (missing.length) {
  throw new Error(`Missing Firebase env values: ${missing.join(", ")}`);
}

const lifecycleEvent = process.env.npm_lifecycle_event || "";
const inferredAppTarget = lifecycleEvent.includes("admin") ? "admin-standalone" : "main";
const packageJson = existsSync(packagePath) ? JSON.parse(readFileSync(packagePath, "utf8")) : {};

function gitShortCommit() {
  if (env.VITE_GIT_COMMIT) return String(env.VITE_GIT_COMMIT).slice(0, 12);
  try {
    return execFileSync("git", ["rev-parse", "--short=12", "HEAD"], {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"]
    }).trim() || "unavailable";
  } catch {
    return "unavailable";
  }
}

const config = {
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.VITE_FIREBASE_APP_ID,
  appTarget: env.VITE_APP_TARGET || inferredAppTarget
};

const publicIntegrations = {
  neisApiKey: env.VITE_NEIS_API_KEY || ""
};

const buildInfo = {
  buildDate: env.VITE_BUILD_DATE || new Date().toISOString(),
  gitCommit: gitShortCommit(),
  appVersion: env.VITE_APP_VERSION || packageJson.version || "unavailable"
};

const outputSource = `window.PM_FIREBASE_CONFIG = ${JSON.stringify(config, null, 2)};\nwindow.PM_APP_TARGET = ${JSON.stringify(config.appTarget)};\nwindow.PM_FIREBASE_CONFIG_SOURCE = "generated-local";\nwindow.PM_PUBLIC_INTEGRATIONS = ${JSON.stringify(publicIntegrations, null, 2)};\nwindow.PM_BUILD_DATE = ${JSON.stringify(buildInfo.buildDate)};\nwindow.PM_GIT_COMMIT = ${JSON.stringify(buildInfo.gitCommit)};\nwindow.PM_APP_VERSION = ${JSON.stringify(buildInfo.appVersion)};\n`;

writeFileSync(outputPath, outputSource, "utf8");
writeFileSync(stableOutputPath, outputSource, "utf8");
writeFileSync(runtimeEnvOutputPath, outputSource, "utf8");

console.log(`Generated ${outputPath}`);
console.log(`Generated ${stableOutputPath}`);
console.log(`Generated ${runtimeEnvOutputPath}`);
