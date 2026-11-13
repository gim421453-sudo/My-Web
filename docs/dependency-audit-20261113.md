# Dependency audit — 2026-11-13

Scope: lockfile-only registry audit; no dependency or lockfile changes. Counts describe npm findings, not confirmed exploitability. Runtime reachability has not been established.

| Scope | Low | Moderate | High | Critical | Total |
| --- | ---: | ---: | ---: | ---: | ---: |
| root | 2 | 33 | 20 | 0 | 55 |
| root-production | 2 | 7 | 5 | 0 | 14 |
| functions | 2 | 11 | 3 | 0 | 16 |
| rules | 0 | 29 | 20 | 0 | 49 |

## High severity runtime dependency paths

Root production and Functions findings need separate treatment. Browser bundles, Node SDK paths, and emulator tooling have different exposure. A package being installed does not prove an exploitable browser path.

| Scope | Package | Advisory / dependency cause | npm fix offered |
| --- | --- | --- | --- |
| root-production | `@firebase/firestore` | @grpc/grpc-js; re2js | `false` |
| root-production | `@firebase/firestore-compat` | @firebase/firestore | `true` |
| root-production | `@grpc/grpc-js` | [@grpc/grpc-js: In certain configurations, getAuthContext can return unauthorized certificates as though they were authorized](https://github.com/advisories/GHSA-m9gg-hp2v-232j) (<1.13.6); [@grpc/grpc-js: The server transmits some error messages thrown by method handlers to the client in status messages](https://github.com/advisories/GHSA-f596-whhp-79r4) (<1.13.6) | `false` |
| root-production | `firebase` | @firebase/firestore; @firebase/firestore-compat | `false` |
| root-production | `re2js` | [RE2JS: Quadratic-time denial of service in re2js lookbehind matching](https://github.com/advisories/GHSA-gg6h-894w-4m9c) (>=2.2.0 <2.8.7) | `true` |
| functions | `body-parser` | [body-parser vulnerable to Denial of Service via trailing bytes after a compressed request body](https://github.com/advisories/GHSA-27r3-jxmh-p828) (>=2.0.0 <2.4.0); qs | `false` |
| functions | `express` | body-parser; qs | `false` |
| functions | `firebase-functions` | express; firebase-admin | `false` |

## Decision and next remediation

1. Prioritize deployed Functions HTTP dependency paths (`firebase-functions → express/body-parser/qs`) and Firebase SDK paths separately. Inspect exact locked versions and vendor-supported releases before changing constraints.
2. `fixAvailable: false` is the current npm response, not proof that no upstream solution exists. `true` is not evidence that a change preserves compatibility.
3. Do not use `npm audit fix --force`, major downgrades, or overrides that violate SDK dependency contracts. No safe remediation was validated in this audit-only branch.
4. For an approved upgrade: regenerate only the affected lockfile, compare audit results, run root regressions/builds plus Node 22 Functions and Firestore Rules/Browser regressions. Revert the candidate if security contracts or compatibility regress.
5. Dev-tool findings remain relevant to local/CI execution; production-only counts must not be used to dismiss them.

## Reproduce

```sh
npm audit --json
npm audit --omit=dev --json
npm --prefix functions audit --json
npm --prefix tools/firestore-rules-tests audit --json
```

All four commands completed and returned vulnerability findings (npm nonzero audit status is expected). Historical 0/16/22 counts in the handoff are dated evidence and are superseded only for this current lockfile snapshot by the table above. Registry results can change without a code change. Raw audit files are retained locally at `/workspace/.myweb/task-evidence/`; they are not needed to reproduce the audit.
