import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const generatorPath = path.join(projectRoot, "scripts", "generate-firebase-config.mjs");
const packageSource = readFileSync(path.join(projectRoot, "package.json"), "utf8");
const generatorSource = readFileSync(generatorPath, "utf8");
const copySource = readFileSync(path.join(projectRoot, "scripts", "copy-static-assets.mjs"), "utf8");
const indexHtml = readFileSync(path.join(projectRoot, "index.html"), "utf8");
const appSource = readFileSync(path.join(projectRoot, "app.js"), "utf8");
const composeSource = readFileSync(path.join(projectRoot, "compose.dev.yaml"), "utf8");
const mainStart = readFileSync(path.join(projectRoot, "docker", "start-main.sh"), "utf8");
const adminStart = readFileSync(path.join(projectRoot, "docker", "start-admin.sh"), "utf8");

const tests = [];
function test(name, fn) {
  tests.push([name, fn]);
}

function sha256(file) {
  return createHash("sha256").update(readFileSync(file)).digest("hex");
}

function appTarget(file) {
  const source = readFileSync(file, "utf8");
  return source.match(/window\.PM_APP_TARGET\s*=\s*"([^"]+)"/)?.[1] || "";
}

function runGenerator(cwd, args) {
  return execFileSync(process.execPath, [generatorPath, ...args], {
    cwd,
    encoding: "utf8",
    env: {
      ...process.env,
      VITE_FIREBASE_API_KEY: "test-api-key",
      VITE_FIREBASE_AUTH_DOMAIN: "test.invalid",
      VITE_FIREBASE_PROJECT_ID: "test-project",
      VITE_FIREBASE_STORAGE_BUCKET: "test.invalid",
      VITE_FIREBASE_MESSAGING_SENDER_ID: "1234567890",
      VITE_FIREBASE_APP_ID: "1:1234567890:web:test",
      VITE_BUILD_DATE: "2026-08-04T00:00:00.000Z",
      VITE_GIT_COMMIT: "test-commit",
      VITE_APP_VERSION: "test-version"
    },
    stdio: ["ignore", "pipe", "pipe"]
  });
}

test("build lifecycle uses explicit isolated targets", () => {
  const packageJson = JSON.parse(packageSource);
  assert.match(packageJson.scripts["firebase:config"], /--target main/);
  assert.match(packageJson.scripts["firebase:config"], /--allow-root-source-mutation/);
  assert.equal(packageJson.scripts["prebuild:admin"], undefined);
  assert.match(packageJson.scripts["postbuild:admin"], /--exclude-runtime-env/);
  assert.match(packageJson.scripts["postbuild:admin"], /--target admin-standalone/);
  assert.match(packageJson.scripts["postbuild:admin"], /--runtime-output dist-admin\/pm-env\.js/);
});

test("generator rejects inferred or admin root mutation", () => {
  assert.doesNotMatch(generatorSource, /npm_lifecycle_event|lifecycleEvent|inferredAppTarget/);
  assert.match(generatorSource, /const appTarget = cli\.target \|\| "main"/);
  assert.match(generatorSource, /Only the main target may write protected root runtime\/config files/);
  assert.match(generatorSource, /Root runtime\/config output requires --allow-root-source-mutation/);
});

test("main and admin generation stay isolated in either order", () => {
  const fixture = mkdtempSync(path.join(tmpdir(), "pm-target-isolation-"));
  try {
    writeFileSync(path.join(fixture, "package.json"), JSON.stringify({ version: "1.0.0" }), "utf8");
    const mainArgs = [
      "--target", "main",
      "--runtime-output", "pm-env.js",
      "--config-output", "firebase-config.local.js",
      "--stable-config-output", "pm-firebase-config.js",
      "--allow-root-source-mutation"
    ];
    const adminArgs = [
      "--target", "admin-standalone",
      "--runtime-output", "dist-admin/pm-env.js"
    ];

    runGenerator(fixture, mainArgs);
    const rootFiles = ["pm-env.js", "firebase-config.local.js", "pm-firebase-config.js"]
      .map((file) => path.join(fixture, file));
    rootFiles.forEach((file) => assert.equal(appTarget(file), "main"));
    const rootHashesBeforeAdmin = rootFiles.map(sha256);

    runGenerator(fixture, adminArgs);
    assert.equal(appTarget(path.join(fixture, "dist-admin", "pm-env.js")), "admin-standalone");
    assert.deepEqual(rootFiles.map(sha256), rootHashesBeforeAdmin);

    runGenerator(fixture, mainArgs);
    assert.equal(appTarget(path.join(fixture, "dist-admin", "pm-env.js")), "admin-standalone");
    rootFiles.forEach((file) => assert.equal(appTarget(file), "main"));

    runGenerator(fixture, adminArgs);
    rootFiles.forEach((file) => assert.equal(appTarget(file), "main"));
    assert.equal(appTarget(path.join(fixture, "dist-admin", "pm-env.js")), "admin-standalone");

    assert.throws(() => runGenerator(fixture, [
      "--target", "admin-standalone",
      "--runtime-output", "pm-env.js",
      "--allow-root-source-mutation"
    ]), /Only the main target may write protected root runtime\/config files/);
  } finally {
    rmSync(fixture, { recursive: true, force: true });
  }
});

test("admin static copy cannot import the root runtime env", () => {
  assert.match(copySource, /--exclude-runtime-env/);
  assert.match(copySource, /if \(!excludeRuntimeEnv\) assets\.push\("pm-env\.js"\)/);
});

test("runtime resolver uses entry env then config then main", () => {
  const start = appSource.indexOf("function appTargetV60");
  const end = appSource.indexOf("function isStandaloneAdminSiteV60", start);
  assert.ok(start >= 0 && end > start);
  const resolver = appSource.slice(start, end);
  assert.match(resolver, /window\.PM_APP_TARGET \|\| window\.PM_FIREBASE_CONFIG\?\.appTarget \|\| "main"/);
  assert.doesNotMatch(resolver, /localStorage|sessionStorage|operationMode/);
});

test("html and docker contracts avoid stale or mixed targets", () => {
  assert.equal((indexHtml.match(/\/pm-env\.js\?v=2/g) || []).length, 1);
  assert.doesNotMatch(indexHtml, /\/pm-env\.js\?v=1/);
  assert.match(composeSource, /VITE_APP_TARGET:\s*main/);
  assert.match(composeSource, /VITE_APP_TARGET:\s*admin-standalone/);
  assert.match(composeSource, /\/pm-env\.js\?v=2/);
  assert.match(mainStart, /VITE_APP_TARGET=main/);
  assert.match(adminStart, /VITE_APP_TARGET=admin-standalone/);
  assert.match(adminStart, /npm run build:admin/);
});

test("current authentication and school-mode patches remain active", () => {
  assert.match(indexHtml, /services\/authService\.js\?v=17/);
  assert.match(indexHtml, /app\.js\?v=159/);
  assert.match(appSource, /const APP_PATCH_VERSION_V159 = "v159\.0 - 2026-08-04"/);
  assert.match(appSource, /const APP_PATCH_VERSION_V158 = "v158\.0 - 2026-08-04"/);
});

for (const [name, fn] of tests) {
  await fn();
  console.log(`ok - ${name}`);
}

console.log(`${tests.length}/${tests.length} app target isolation tests passed.`);
