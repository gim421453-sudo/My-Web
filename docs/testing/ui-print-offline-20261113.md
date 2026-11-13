# Local UI, print and reconnect checks — 2026-11-13

Branch `codex/ui-print-offline-20261113`; base `1874119`. Local demo data only. Added two focused cases to the existing recovery Browser harness. No application behavior, production manifest or permission policy changed.

| Check | Executed outcome |
| --- | --- |
| Legacy canonical schedule title/detail | PASS after awaiting the data listener before navigation |
| App Next canonical + mixed (`name`, `startAt`) schedule display | PASS in a fresh independent browser context |
| 1440×1000 and 390×844 captures | Captured for both apps; document horizontal overflow false in all four |
| Legacy report download | Actual report-download button exercised; downloaded HTML includes canonical fixture |
| A4 print artifacts | Generated PDFs from downloaded legacy report and App Next print media; extracted PDF text includes canonical fixture in both, mixed title in App Next |
| 60 seconds actual browser offline, server changed during isolation | PASS: new server row absent offline; present after reconnect and explicit refresh; server record unchanged by client |
| Runtime exceptions in targeted runs | PASS final runtime check |

The successful display/print rerun executed 2 tests (display + runtime) with fail/cancel/skip/todo 0. The earlier focused run's offline case passed, but its display case failed due to harness sequencing. The offline case was not unnecessarily repeated after the display-only corrections. The existing 18-case baseline passed earlier in this session; the full new 20-case suite was not rerun in this branch.

## Observations requiring follow-up

1. Mixed schema parity is **not** complete: the legacy schedule table has a blank title for the name/startAt fixture (`legacyMixedTitleCount = 0`), while App Next renders its title. Its legacy downloaded report also lacks that title. The canonical schedule remains visible in both. Do not report mixed-data display/output parity as PASS.
2. The legacy mobile capture shows an open sidebar overlay obscuring the left part of the content, despite document overflow being false. This is visual evidence, not an assertion that horizontal overflow alone validates usability. A separate mobile navigation interaction check/fix is appropriate.
3. App Next's generic browser print includes editor, filters and route diagnostics and repeats entries across summary/filter sections. Text is retained, but it is not a polished report equivalent to the legacy report export. A dedicated read-only print layout remains a separate implementation task.
4. The legacy export and App Next PDF can have different ordering/grouping. This branch captures actual outcomes; it does not silently rewrite mixed schemas or impose a new sort contract.
5. A 60-second read/reconnect check does not validate hours offline, token expiry, write queuing, concurrent offline edits, user-device storage recovery or physical printer pagination. Those remain MANUAL_REQUIRED, as does comparison against actual production data. No production access was made.

## Harness corrections and reproducibility

- Wait for the legacy schedule listener and navigation restoration before opening the list.
- Use a separate browser context for App Next; an already authenticated legacy session removes the App Next login form.
- Use the schedule's supported report-download action. Manager has no print-center menu in this fixture; do not infer an authorization bug or bypass navigation to make a test pass. The owner fixture without configured operation mode also redirects to the dashboard; that behavior was preserved.
- Run with `TZ=Asia/Seoul`, writable Firebase config/cache and `PLAYWRIGHT_BROWSERS_PATH=/workspace/.myweb/browsers` in this cloud instance. Node 24/Java 21 were used for these UI cases. Keep CLI auth isolated from production ADC.

```sh
node node_modules/firebase-tools/lib/bin/firebase.js emulators:exec \
  --config firebase.recovery.json --project demo-myweb-recovery-e2e --only auth,firestore \
  'node --test --test-concurrency=1 --test-name-pattern="follow-up|인증 후 런타임" tests/browser/recovery-ui.e2e.test.mjs'
```

Local artifacts (ignored, not committed): `tmp/followup-{legacy,next}-{desktop,mobile}.png`, `tmp/followup-legacy-report.html`, `tmp/followup-{legacy,next}.pdf`, `tmp/followup-ui-observations.json`. Artifacts are device-local evidence, not remotely restored project documentation. They contain demo fixture data only. No source fixes were made for the observed product limitations.
