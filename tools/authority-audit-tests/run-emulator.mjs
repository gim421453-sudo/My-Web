import { spawn, spawnSync } from "node:child_process";
import { mkdtempSync, existsSync, rmSync, writeFileSync } from "node:fs";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const projectId = "demo-myweb-authority-audit";
const root = resolve(".");
const firebaseCli = resolve("tools", "firestore-rules-tests", "node_modules", "firebase-tools", "lib", "bin", "firebase.js");
const testEntry = resolve("tools", "authority-audit-tests", "authorityInventory.integration.mjs");
const baseConfigPath = resolve("firebase.authority-audit-test.json");

async function selectLoopbackPort() {
  const server = createServer();
  await new Promise((resolveListen, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolveListen);
  });
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("EMULATOR_PORT_SELECTION_FAILED");
  const { port } = address;
  await new Promise((resolveClose, reject) => server.close((error) => error ? reject(error) : resolveClose()));
  return port;
}

function javaAvailable() {
  const result = spawnSync("java", ["-version"], { encoding: "utf8", shell: false });
  return !result.error && result.status === 0;
}

if (!projectId.startsWith("demo-") || !existsSync(firebaseCli) || !existsSync(testEntry)
  || !existsSync(baseConfigPath) || !javaAvailable()) {
  throw new Error("AUTHORITY_AUDIT_EMULATOR_PREFLIGHT_FAILED");
}
for (const name of ["GOOGLE_APPLICATION_CREDENTIALS", "GCLOUD_PROJECT", "GOOGLE_CLOUD_PROJECT", "FIREBASE_CONFIG"]) {
  if (process.env[name]) throw new Error(`FORBIDDEN_CLOUD_ENVIRONMENT:${name}`);
}

const command = `"${process.execPath}" "${testEntry}"`;
const port = await selectLoopbackPort();
const config = JSON.parse(await (await import("node:fs/promises")).readFile(baseConfigPath, "utf8"));
config.emulators = { ...config.emulators, firestore: { ...config.emulators?.firestore, host: "127.0.0.1", port } };
if (config.firestore?.rules) config.firestore.rules = resolve(root, config.firestore.rules);
const tempDir = mkdtempSync(join(tmpdir(), "myweb-authority-emulator-"));
const configPath = join(tempDir, "firebase.json");
writeFileSync(configPath, `${JSON.stringify(config, null, 2)}\n`, { flag: "wx" });
process.stderr.write(`AUTHORITY_AUDIT_EMULATOR_PORT=${port}\n`);
const child = spawn(process.execPath, [
  firebaseCli,
  "emulators:exec",
  "--only", "firestore",
  "--project", projectId,
  "--config", configPath,
  command,
], {
  cwd: root,
  env: {
    PATH: process.env.PATH,
    SystemRoot: process.env.SystemRoot,
    TEMP: process.env.TEMP,
    TMP: process.env.TMP,
    FIRESTORE_EMULATOR_HOST: `127.0.0.1:${port}`,
    PM_AUTHORITY_AUDIT_PROJECT_ID: projectId,
    CI: "true",
    FIREBASE_SKIP_UPDATE_CHECK: "true",
  },
  shell: false,
  stdio: "inherit",
  windowsHide: true,
});

const timeout = setTimeout(() => child.kill(), 180_000);
child.on("error", (error) => {
  clearTimeout(timeout);
  rmSync(tempDir, { recursive: true, force: true });
  process.stderr.write(`${error?.message || "AUTHORITY_AUDIT_EMULATOR_FAILED"}\n`);
  process.exitCode = 1;
});
child.on("exit", (code, signal) => {
  clearTimeout(timeout);
  rmSync(tempDir, { recursive: true, force: true });
  process.exitCode = signal ? 1 : (Number.isInteger(code) ? code : 1);
});
