import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
const distDir = path.join(rootDir, "dist");

const results = [];

function test(name, fn) {
  try {
    fn();
    results.push({ name, status: "passed" });
  } catch (error) {
    results.push({
      name,
      status: "failed",
      message: error instanceof Error ? error.message : String(error),
    });
  }
}

function exists(relativePath) {
  return fs.existsSync(path.join(rootDir, relativePath));
}

function readText(relativePath) {
  return fs.readFileSync(path.join(rootDir, relativePath), "utf8");
}

function listFiles(baseDir) {
  const base = path.join(rootDir, baseDir);
  if (!fs.existsSync(base)) return [];
  const result = [];
  const walk = (current) => {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) walk(full);
      else result.push(path.relative(base, full).replace(/\\/g, "/"));
    }
  };
  walk(base);
  return result.sort();
}

function loadManifest() {
  const sandbox = {
    module: { exports: null },
    exports: {},
    window: {},
    globalThis: null,
    Object,
    Array,
  };
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(readText("shared/ownerPreviewReleaseManifest.js"), sandbox, {
    filename: "shared/ownerPreviewReleaseManifest.js",
  });
  return sandbox.module.exports || sandbox.PM_OWNER_PREVIEW_RELEASE_MANIFEST_V1;
}

function visiblePath(file) {
  return file.replace(/\\/g, "/");
}

function distTextFiles() {
  return listFiles("dist").filter((file) => /\.(html|js|css|txt|json)$/i.test(file));
}

function readDist(file) {
  return fs.readFileSync(path.join(distDir, file), "utf8");
}

function occurrences(pattern, files) {
  const matches = [];
  for (const file of files) {
    const text = readDist(file);
    if (pattern.test(text)) matches.push(file);
  }
  return matches;
}

const sourceFiles = {
  packageJson: JSON.parse(readText("package.json")),
  viteConfig: readText("vite.config.js"),
  indexHtml: readText("index.html"),
  appNextHtml: readText("app-next.html"),
  copyStatic: readText("scripts/copy-static-assets.mjs"),
  generateConfig: readText("scripts/generate-firebase-config.mjs"),
  operationalSafety: readText("shared/operationalSafety.js"),
  workspaceDataService: readText("services/workspaceDataService.js"),
  app: readText("app.js"),
  firebaseJson: JSON.parse(readText("firebase.json")),
};

const manifest = loadManifest();

test("git-sensitive excluded files are not part of build inputs", () => {
  assert.doesNotMatch(sourceFiles.viteConfig, /firestore\.rules\.console-current|firestore\.rules\.next|generate-blog-pdfs/);
  assert.doesNotMatch(sourceFiles.copyStatic, /firestore\.rules\.console-current|firestore\.rules\.next|generate-blog-pdfs/);
});

test("firebase hosting preview deploy targets dist without development fallbacks", () => {
  assert.ok(sourceFiles.firebaseJson.hosting, "firebase.json hosting config missing");
  assert.equal(sourceFiles.firebaseJson.hosting.public, "dist");
  assert.ok(Array.isArray(sourceFiles.firebaseJson.hosting.ignore), "hosting ignore missing");
  assert.ok(sourceFiles.firebaseJson.hosting.ignore.includes("firestore.rules.console-current"));
  assert.ok(sourceFiles.firebaseJson.hosting.ignore.includes("firestore.rules.next"));
  assert.ok(sourceFiles.firebaseJson.hosting.ignore.includes("scripts/generate-blog-pdfs.py"));
  assert.equal(sourceFiles.firebaseJson.hosting.rewrites, undefined, "unexpected Hosting rewrite can break app-next.html direct access");
  assert.equal(sourceFiles.firebaseJson.hosting.redirects, undefined, "unexpected Hosting redirect configured");
  assert.ok(
    sourceFiles.firebaseJson.hosting.headers?.some((entry) =>
      entry.source === "**" &&
      entry.headers?.some((header) =>
        header.key === "X-Robots-Tag" &&
        /noindex,\s*nofollow/.test(header.value)
      )
    ),
    "X-Robots-Tag noindex header missing"
  );
});

test("production build entries are operational and app-next only", () => {
  assert.match(sourceFiles.viteConfig, /index\.html/);
  assert.match(sourceFiles.viteConfig, /app-next\.html/);
  for (const devHtml of [
    "owner-admin-diagnostics.html",
    "shadow-auth-test.html",
    "auth-regression-preview.html",
    "auth-provider-preview.html",
    "legacy-auth-adapter-preview.html",
    "legacy-auth-guard-preview.html",
    "login-bridge-preview.html",
    "protected-route-bridge-preview.html",
    "require-auth-bridge-preview.html",
    "require-workspace-role-bridge-preview.html",
    "workspace-parent-recovery.html",
  ]) {
    assert.doesNotMatch(sourceFiles.viteConfig, new RegExp(devHtml.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
});

test("owner preview entries have noindex", () => {
  assert.match(sourceFiles.indexHtml, /name="robots" content="noindex,nofollow"/);
  assert.match(sourceFiles.appNextHtml, /name="robots" content="noindex,nofollow"/);
});

test("robots blocks all preview crawling and is copied to dist", () => {
  assert.ok(exists("robots.txt"), "robots.txt missing");
  const robots = readText("robots.txt");
  assert.match(robots, /User-agent:\s*\*/);
  assert.match(robots, /Disallow:\s*\//);
  assert.match(sourceFiles.copyStatic, /robots\.txt/);
});

test("operational safety defaults to normal and exposes no production test controls", () => {
  assert.match(sourceFiles.operationalSafety, /return \{ mode: "normal" \}/);
  assert.match(sourceFiles.operationalSafety, /PMOperationalSafetyTestControls/);
  assert.match(sourceFiles.operationalSafety, /if \(isDevelopmentBuild\(\)\)/);
});

test("build metadata is injected without local absolute paths", () => {
  assert.match(sourceFiles.generateConfig, /PM_BUILD_DATE/);
  assert.match(sourceFiles.generateConfig, /PM_GIT_COMMIT/);
  assert.match(sourceFiles.generateConfig, /PM_APP_VERSION/);
  assert.match(sourceFiles.generateConfig, /execFileSync\("git",\s*\["rev-parse",\s*"--short=12",\s*"HEAD"\]/);
  assert.doesNotMatch(sourceFiles.generateConfig, /C:\\Users\\|\/home\//);
});

test("manifest feature stages are classified", () => {
  const counts = manifest.features.reduce((acc, feature) => {
    const stage = feature.releaseStage || "unknown";
    acc[stage] = (acc[stage] || 0) + 1;
    return acc;
  }, {});
  assert.ok((counts.stable || 0) > 0, "stable features missing");
  assert.ok((counts.beta || 0) > 0, "beta features missing");
  assert.ok((counts.hidden || 0) > 0, "hidden features missing");
  assert.ok((counts.planned || 0) > 0, "planned features missing");
  assert.ok(manifest.features.every((feature) => feature.releaseStage !== "blocked" || feature.blockReason));
});

test("critical owner preview write surfaces are server-confirmed", () => {
  for (const pageKey of ["schedules", "notices", "timetable"]) {
    const feature = manifest.features.find((entry) => entry.system === "operational" && entry.pageKey === pageKey);
    assert.ok(feature, `${pageKey} manifest entry missing`);
    assert.equal(feature.releaseStage, "stable");
    assert.equal(feature.hasWrite, true);
    assert.equal(feature.serverConfirmed, true);
    assert.equal(feature.firstOwnerPreviewIncluded, true);
  }
});

test("operational write gate covers schedule and direct notice writes", () => {
  assert.match(sourceFiles.operationalSafety, /isWriteBlocked: \(\) => status\(\)\.writeBlocked/);
  assert.match(sourceFiles.workspaceDataService, /operationalSafetyWriteBlocked/);
  assert.match(sourceFiles.workspaceDataService, /safety-write-blocked/);
  assert.match(sourceFiles.app, /schedule-write-blocked/);
  assert.match(sourceFiles.app, /checkNoticeOperationalWriteAllowedV127/);
  assert.match(sourceFiles.app, /notice-operational-write-blocked/);
  assert.match(sourceFiles.app, /noticeWriteGateBlockedCount/);
  assert.match(sourceFiles.app, /PMNoticeOperationalWriteGateV127/);
  assert.match(sourceFiles.app, /noticeWriteGateVersion:\s*"V127"/);
  assert.match(sourceFiles.indexHtml, /services\/workspaceDataService\.js\?v=10/);
  assert.match(sourceFiles.indexHtml, /app\.js\?v=164/);
  assert.match(sourceFiles.indexHtml, /id="pm-exam-grade-service" src="services\/examGradeService\.js\?v=2"/);
});

if (fs.existsSync(distDir)) {
  const distFiles = listFiles("dist");
  const textFiles = distTextFiles();

  test("dist contains required public owner preview files", () => {
    for (const required of [
      "index.html",
      "app-next.html",
      "app.js",
      "styles.css",
      "robots.txt",
      "shared/operationalSafety.js",
      "shared/ownerPreviewReleaseManifest.js",
      "services/workspaceDataService.js",
      "pm-env.js",
    ]) {
      assert.ok(distFiles.includes(required), `${required} missing`);
    }
  });

  test("dist excludes development html pages", () => {
    const forbidden = [
      "owner-admin-diagnostics.html",
      "shadow-auth-test.html",
      "auth-regression-preview.html",
      "auth-provider-preview.html",
      "legacy-auth-adapter-preview.html",
      "legacy-auth-guard-preview.html",
      "login-bridge-preview.html",
      "protected-route-bridge-preview.html",
      "require-auth-bridge-preview.html",
      "require-workspace-role-bridge-preview.html",
      "workspace-parent-recovery.html",
    ];
    for (const file of forbidden) assert.equal(distFiles.includes(file), false, `${file} leaked into dist`);
  });

  test("dist excludes source maps and sourceMappingURL references", () => {
    assert.equal(distFiles.filter((file) => /\.map$/i.test(file)).length, 0, "source maps found");
    assert.deepEqual(occurrences(/sourceMappingURL=/, textFiles), []);
  });

  test("dist excludes local-only and sensitive file names", () => {
    for (const file of distFiles) {
      assert.doesNotMatch(file, /(^|\/)\.env($|\.|\/)/i);
      assert.doesNotMatch(file, /firebase-config\.local\.js/i);
      assert.doesNotMatch(file, /firestore\.rules\.console-current|firestore\.rules\.next/i);
      assert.doesNotMatch(file, /service-account|firebase-adminsdk|private|secret|credential/i);
      assert.doesNotMatch(file, /\.(log|bak|backup|tmp|zip)$/i);
    }
  });

  test("dist has no private key token or local absolute path strings", () => {
    const forbiddenPatterns = [
      /BEGIN PRIVATE KEY/i,
      /private_key/i,
      /client_email/i,
      /\bBearer\s+[A-Za-z0-9._-]{10,}/i,
      /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/,
      /\b(?:idToken|refreshToken|accessToken)\s*[:=]\s*["'][A-Za-z0-9._-]{20,}["']/i,
      /C:\\Users\\/i,
      /\/home\//i,
    ];
    for (const file of textFiles) {
      const text = readDist(file);
      for (const pattern of forbiddenPatterns) assert.doesNotMatch(text, pattern, `${visiblePath(file)} contains ${pattern}`);
    }
  });

  test("firebase web config strings are limited to expected config surfaces", () => {
    const apiKeyFiles = occurrences(/\bAIza[0-9A-Za-z_-]{10,}\b/, textFiles);
    assert.ok(apiKeyFiles.length >= 1, "Firebase web config apiKey missing");
    for (const file of apiKeyFiles) {
      assert.match(file, /(^pm-env\.js$)|(^pm-firebase-config\.js$)|(^assets\/appNext-.*\.js$)/, `${file} has unexpected Firebase web config string`);
    }
    const debugLeaks = occurrences(/PM Firebase env debug|console\.(info|log)\([^)]*apiKey|apiKey:\s*["']AIza/, textFiles);
    assert.deepEqual(debugLeaks, []);
  });

  test("dist html and robots preserve noindex crawl block", () => {
    assert.match(readDist("index.html"), /noindex,nofollow/);
    assert.match(readDist("app-next.html"), /noindex,nofollow/);
    assert.match(readDist("robots.txt"), /Disallow:\s*\//);
  });

  test("dist generated runtime env exposes safe build metadata", () => {
    const env = readDist("pm-env.js");
    assert.match(env, /PM_BUILD_DATE/);
    assert.match(env, /PM_GIT_COMMIT/);
    assert.match(env, /PM_APP_VERSION/);
    assert.doesNotMatch(env, /C:\\Users\\|\/home\//);
  });
}

for (const result of results) {
  console.log(`${result.status === "passed" ? "ok" : "not ok"} - ${result.name}`);
  if (result.message) console.log(`  ${result.message}`);
}

const failed = results.filter((result) => result.status === "failed");
const distMode = fs.existsSync(distDir) ? "with dist" : "without dist";
console.log(`${results.length - failed.length}/${results.length} owner preview pre-deploy final gate tests passed (${distMode}).`);
if (failed.length) process.exitCode = 1;
