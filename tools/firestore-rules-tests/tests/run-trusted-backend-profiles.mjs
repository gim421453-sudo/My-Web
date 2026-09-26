import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const entry = fileURLToPath(new URL("./run-trusted-backend-profile.mjs", import.meta.url));
const profiles = ["transition", "strict", "live", "local"];

for (const profile of profiles) {
  process.stdout.write(`\n[trusted-rules-test] profile=${profile}\n`);
  const result = spawnSync(process.execPath, [entry], {
    env: {
      ...process.env,
      PM_TRUSTED_RULES_PROFILE: profile,
      PM_TRUSTED_RULES_PROJECT_ID: `demo-myweb-trusted-${profile}`,
    },
    stdio: "inherit",
  });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}
