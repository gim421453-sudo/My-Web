#!/usr/bin/env bash
# Run from any directory with Node 22 and Java 21 available on PATH.
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."
if [[ "$(node -p 'process.versions.node.split(".")[0]')" != 22 ]]; then
  echo 'Select Node 22 on PATH before running Functions validation.' >&2
  exit 1
fi
java -version
test -d functions/node_modules
test -d tools/firestore-rules-tests/node_modules
test -f functions/.env.local
if ! grep -qx 'MYWEB_TRUSTED_BACKEND_MODE=emulator' functions/.env.local; then
  echo 'Preserve existing local settings and set MYWEB_TRUSTED_BACKEND_MODE=emulator in functions/.env.local.' >&2
  exit 1
fi
# Scope credential removal to this validation process and its children only.
# The tests reject ADC and all data lives in explicitly named demo projects.
unset GOOGLE_APPLICATION_CREDENTIALS CLOUDSDK_CONFIG GCLOUD_PROJECT GOOGLE_CLOUD_PROJECT FIREBASE_CONFIG FIREBASE_TOKEN
export TZ=Asia/Seoul CI=true MYWEB_TRUSTED_BACKEND_MODE=emulator METADATA_SERVER_DETECTION=none
validation_state="$(mktemp -d "${TMPDIR:-/tmp}/myweb-validation.XXXXXX")"
export XDG_CONFIG_HOME="$validation_state/config"
mkdir -p "$XDG_CONFIG_HOME"
cli=node_modules/firebase-tools/lib/bin/firebase.js
npm --prefix functions test
PM_RULES_TEST_PROJECT_ID=demo-myweb-rules node "$cli" emulators:exec \
  --config firebase.rules-test.json --project demo-myweb-rules --only firestore \
  'node --test --test-concurrency=1 tools/firestore-rules-tests/tests/run-all.mjs'
node "$cli" emulators:exec --config firebase.recovery.json \
  --project demo-myweb-configured-rules-teacher-scope --only firestore \
  'node --test tests/firestore/configured-rules.teacher-scope.test.mjs'
node "$cli" emulators:exec --config firebase.trusted-backend-emulator.json \
  --project demo-myweb-trusted-backend --only functions,auth,firestore \
  'npm --prefix functions run test:integration'
