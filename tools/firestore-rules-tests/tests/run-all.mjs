import "./users.rules.test.mjs";
import "./memberships.rules.test.mjs";
import "./invites.rules.test.mjs";
import "./legacy-paths.rules.test.mjs";
import "./compatibility.rules.test.mjs";

import { after } from "node:test";
import { cleanupRulesEnvironment } from "./helpers.mjs";

after(async () => {
  await cleanupRulesEnvironment();
});
