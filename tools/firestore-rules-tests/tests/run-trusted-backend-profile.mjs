import "./trusted-backend-candidate.rules.test.mjs";

import { after } from "node:test";
import { cleanupCandidateEnvironment } from "./trusted-backend-candidate.helpers.mjs";

after(async () => {
  await cleanupCandidateEnvironment();
});
