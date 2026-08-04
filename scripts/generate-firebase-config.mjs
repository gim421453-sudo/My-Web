import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { dirname, relative, resolve } from "node:path";

const root = process.cwd();
const envPath = resolve(root, ".env");
const packagePath = resolve(root, "package.json");
const protectedRootOutputs = new Set([
  resolve(root, "firebase-config.local.js"),
  resolve(root, "pm-firebase-config.js"),
  resolve(root, "pm-env.js")
]);
const requiredKeys = [
  "VITE_FIREBASE_API_KEY",
  "VITE_FIREBASE_AUTH_DOMAIN",
  "VITE_FIREBASE_PROJECT_ID",
  "VITE_FIREBASE_STORAGE_BUCKET",
  "VITE_FIREBASE_MESSAGING_SENDER_ID",
  "VITE_FIREBASE_APP_ID"
];

function parseCliOptions(argv) {
  const options = {
    target: "",
    runtimeOutput: "",
    configOutput: "",
    stableConfigOutput: "",
    allowRootSourceMutation: false
  };
  const names = new Map([
    ["--target", "target"],
    ["--runtime-output", "runtimeOutput"],
    ["--config-output", "configOutput"],
    ["--stable-config-output", "stableConfigOutput"]
  ]);

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--allow-root-source-mutation") {
      options.allowRootSourceMutation = true;
      continue;
    }
    const separator = argument.indexOf("=");
    const optionName = separator >= 0 ? argument.slice(0, separator) : argument;
    const property = names.get(optionName);
    if (!property) throw new Error(`Unknown option: ${optionName}`);
    const value = separator >= 0 ? argument.slice(separator + 1) : argv[++index];
    if (!value || value.startsWith("--")) throw new Error(`Missing value for ${optionName}`);
    options[property] = value;
  }

  return options;
}

function resolveOutputPath(value, label) {
  if (!value) return null;
  const output = resolve(root, value);
  const relativePath = relative(root, output);
  if (relativePath.startsWith("..") || resolve(root, relativePath) !== output) {
    throw new Error(`${label} must stay inside the project root.`);
  }
  return output;
}

const cli = parseCliOptions(process.argv.slice(2));
const appTarget = cli.target || "main";
if (!["main", "admin-standalone"].includes(appTarget)) {
  throw new Error(`Unsupported app target: ${appTarget}`);
}

const outputPath = resolveOutputPath(cli.configOutput, "config output");
const stableOutputPath = resolveOutputPath(cli.stableConfigOutput, "stable config output");
const runtimeEnvOutputPath = resolveOutputPath(cli.runtimeOutput, "runtime output");
const outputPaths = [outputPath, stableOutputPath, runtimeEnvOutputPath].filter(Boolean);

if (!runtimeEnvOutputPath) throw new Error("--runtime-output is required.");
if (new Set(outputPaths).size !== outputPaths.length) throw new Error("Generated output paths must be unique.");

for (const output of outputPaths) {
  if (!protectedRootOutputs.has(output)) continue;
  if (!cli.allowRootSourceMutation) {
    throw new Error("Root runtime/config output requires --allow-root-source-mutation.");
  }
  if (appTarget !== "main") {
    throw new Error("Only the main target may write protected root runtime/config files.");
  }
}

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
  appTarget
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

for (const output of outputPaths) {
  mkdirSync(dirname(output), { recursive: true });
  writeFileSync(output, outputSource, "utf8");
  console.log(`Generated ${relative(root, output)}`);
}
