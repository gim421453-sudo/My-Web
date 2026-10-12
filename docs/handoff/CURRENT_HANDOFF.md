# MY WEB 현재 작업 인계

Last updated: 2026-10-12 (Asia/Seoul)
Status: FULL_REGRESSION_PASS_WITH_DEPENDENCY_ADVISORIES

## 최종 통합 상태 (2026-10-12)

- 저장소: `C:\dev\My-Web`; 브랜치 `main`; 코드 기준 커밋 `6058771` (`fix: reduce firestore membership rules expression budget`). 최종 문서 갱신은 main에 커밋·푸시 완료됐다. Rules expression budget 차단 요인은 해결됐고 전체 자동 회귀 기준은 통과했다. npm advisory는 미해결 잔여 위험이다.
- Rules 수정: membership 역할 변경의 Rules 평가식 사용량을 줄였다. `canUpdateMembershipRole` 경로로 기존 역할 관리 권한과 요청 역할 부여 권한을 통합했고, 자기 역할 변경 금지, `system_owner` 권한, 기존 역할 허용 범위를 유지했다. Firestore Emulator Rules 전체 suite `171/171 PASS`; 수정은 main에 반영 및 push 완료됐다.
- 의존성 조사 브랜치 `codex/dependency-audit-remediation`은 병합하지 않았다. root `npm audit` 16건(높음 12, 보통 4), `npm audit --omit=dev` 높은 위험 4건, Rules 도구 audit 16건(높음 12, 보통 4), Functions audit 0건이다. Firebase 13 / Rules Unit Testing 6 시험은 Rules 1000-expression 문제가 재발하고 audit 개선이 없어 철회했다. `firebase-tools` 14.23.0 하향은 critical 1건 포함 총 22건으로 악화되어 철회했다. 안전성이 검증된 dependency remediation은 없으며 package 및 lockfile은 기준 상태로 복원됐다.
- 전체 회귀 브랜치 `codex/full-regression`에서 `npm test`, `npm run typecheck`, `npm run build`, `npm run build:admin` 통과, Functions 단위 테스트 `557/557 PASS`, Functions Emulator 통합 11개 흐름 PASS, Browser E2E `11/11 PASS`였다. main baseline에서 발견된 Rules 1000-expression 실패는 Rules 수정 후 최종 suite `171/171 PASS`로 해결됐다.
- 격리 검증 런타임은 Node `22.23.2` / Temurin JRE 21 계열이며 demo project와 loopback emulator만 사용했다. 운영 Firebase 접근, 운영 데이터 변경, production 배포는 없었다.
- 잔여 작업: npm advisory 후속 조사; 필요 시 Node 22 개발환경 정식화; 기존 수동 UI/출력 검증. 별도 승인 전 IAM `HOLD`를 유지한다. 강제 override, major downgrade, `npm audit fix --force`는 적용하지 않았다.
- 작업 금지/반복 방지: dependency remediation 및 full regression 브랜치는 main에 병합하지 않았다. 코드, Firestore rules, dependency manifest/lockfile은 이 문서 통합 작업에서 수정하지 않는다. 미추적 `firestore-debug.log` 파일은 보존하며 변경하지 않는다.
- Git 운영 표준: 의미 있는 작업마다 main 최신화 후 별도 `codex/*` 브랜치와 가능하면 worktree에서 수행하고, 검증·명시적 stage·commit·원격 복구 지점·검증된 main 병합 순서를 따르는 정책을 채택했다. 조사 결과는 코드 변경이 없으면 문서에만 통합한다.
- Cross-device readiness: `READY_WITH_WARNINGS` — 현재 main의 HEAD, 최종 Rules/회귀 결과, 잔여 advisory, 미실행 수동 검증과 IAM HOLD를 기록했다.

## 과거 기록: 의존성 취약점 조사 후속 (2026-10-11; 아래 당시 브랜치 결과는 위 최종 상태로 대체됨)

- 목표: 사용자가 요청한 `codex/dependency-investigation` 브랜치에서 취약점 조치와 호환성 회귀 확인을 계속한다.
- 브랜치/작업 기준 HEAD: `codex/dependency-investigation`, 시작 시 `eda5966a3ac62a03c730aa6915a3ad810cd8cd2a`; 당시 원격과 0 ahead / 0 behind. 시작 시 기존 조사 변경 파일 6개와 테스트 생성 로그 2개가 있었으며, 이 후속 작업에서 이어서 확인했다.
- 완료: root `firebase-admin`을 `^13.6.0`에서 `^14.5.0`으로 올렸다. 별도 `tools/firestore-rules-tests`의 `firebase-tools`, `firebase`, `@firebase/rules-unit-testing`을 15.33.0, 12.19.0, 5.0.2 계열로 갱신하고 semver 호환 자동 수정을 적용했다. Rules fixture에는 active `users/{uid}` 프로필을 추가해 현재 규칙 계약에 맞췄다. `--force`나 gRPC override는 사용하지 않았다.
- 2026-10-11 레지스트리 재감사 성공: root `npm audit` 16건(높음 12, 보통 4), `npm audit --omit=dev` 4건(모두 높음), `tools/firestore-rules-tests` 16건(높음 12, 보통 4), Functions 0건. root/Rules audit는 취약점이 남아 exit code 1이며 네트워크 오류가 아니다. 이전 감사 22건(높음 12, 보통 10), 운영 경로 12건(높음 4, 보통 8)보다 감소한 결과가 유지됐다.
- 잔여 고위험 경로: Firebase Web SDK의 `@firebase/firestore@4.17.2`가 `@grpc/grpc-js ~1.9.0`을 참조하고 설치된 grpc-js는 `1.9.16`이다. 해당 범위에는 두 advisory가 적용되고 수정 버전은 1.13.6/1.14.5 이상이다. SDK가 선언한 범위를 벗어나므로 강제 override는 적용하지 않았다. advisory의 영향 조건은 각각 특정 optional client-certificate 인증/RBAC 구성 및 서버 method handler 오류 메시지 노출이다. 의존성 감사 finding은 남지만, 설치 사실만으로 이 앱에서 취약한 코드 경로가 악용된다고 단정할 수도 없다. 생성된 웹 번들에서 gRPC 코드 검색 결과는 없었고, 이것은 패키지 취약점 해소나 전체 악용 가능성 부재의 증거는 아니다. 참고: [GHSA-m9gg-hp2v-232j](https://github.com/advisories/GHSA-m9gg-hp2v-232j), [GHSA-f596-whhp-79r4](https://github.com/advisories/GHSA-f596-whhp-79r4).
- 통과: 후속 변경 후 `npm test`, `npm run build`(TypeScript 검사 포함), `npm run build:admin`, `npm ls --depth=0`(root 및 Rules 보조 패키지), `git diff --check`. 앞선 같은 취약점 작업의 emulator 검증은 active/candidate Rules 39/39 및 recovery Browser E2E 11/11 PASS였다.
- suite 재실행: 시스템 Java 부재로 첫 실행은 사전 점검에서 중단됐다. 공식 Adoptium API에서 받은 Temurin JRE 21은 체크섬을 확인해 임시 사용했다. 처음에는 Hub 자동 포트 변경/기존 Emulator 잔류 프로세스 때문에 연결 및 8083 bind가 실패했다. 테스트 대상 Java 프로세스만 종료하고 suite를 loopback demo project에서 다시 실행했다. 고정 포트 충돌을 피한 임시 18083 실행과 기본 포트 8083 실행 모두 suite 본체가 완료됐지만 동일한 규칙 평가 한도 오류로 exit code 1이다. 임시 포트 변경은 모두 원복했다.
- 실패 케이스 범위: membership의 super-manager/manager 역할 부여 및 compatibility 문서의 정상 update 경로 일부가 `Unable to evaluate the expression as the maximum of 1000 expressions to evaluate has been reached`로 거부됐다(활성 `firestore.rules` L473 주변, 호환 테스트 `compatibility.rules.test.mjs`의 정상 update 2건). 사용자 프로필/invite 테스트 대부분은 통과했으나 보조 suite 전체는 PASS가 아니다. configured Rules 39/39와는 다른 테스트 harness 결과다.
- 실패/제한: audit은 최신 레지스트리 결과를 확인했다. 자동 수정 권고는 Firebase `9.14.0`, `firebase-tools` `14.23.0`, Rules Unit Testing `2.0.7` 등 주요 버전 하향을 포함해 적용하지 않았다. 실서비스 Firebase/배포 확인은 하지 않았다. 기본/관리자 빌드는 성공했지만 비모듈 HTML script 및 React Router `use client` 경고가 남는다.
- 파일 변경: `package.json`, `package-lock.json`, `tools/firestore-rules-tests/package.json`, `tools/firestore-rules-tests/package-lock.json`, `tools/firestore-rules-tests/tests/helpers.mjs`, `tools/firestore-rules-tests/tests/users.rules.test.mjs`, `CHANGELOG.md`, `AGENTS.md`, 이 파일. 테스트에서 생성된 `firestore-debug.log`, `tools/firestore-rules-tests/firestore-debug.log`는 미추적이며 커밋하지 않는다.
- 코드/의존성 변경 9개 파일은 `137c2ef` (`fix: reduce dependency audit vulnerabilities`)로 커밋하고 원격 조사 브랜치에 푸시했다. 이후 푸시 상태를 기록하기 위해 `AGENTS.md`와 이 핸드오프를 갱신 중이다. 테스트 로그 두 개 외에는 tracked 변경이 남지 않았다.
- 다음 단계: membership update 정상 허용 경로에서 Rules 평가식 사용량을 줄일 수 있는 원인을 분석하고, 보안 계약을 유지한 채 회귀 테스트를 추가한다. 남은 advisory는 Firebase SDK와 Firebase CLI 전이 경로를 분리해 호환성을 조사한다. major downgrade나 상위 SDK 선언 범위를 깨는 override는 회귀 검증 없이 적용하지 않는다.
- Cross-device readiness: `READY_WITH_WARNINGS` — 브랜치/작업 기준 HEAD, 코드 커밋·푸시 결과, 수정 파일, 실행한 검사, 남은 advisory, supplemental suite 실패 및 다음 조치가 기록됐다. npm 재감사와 운영 Firebase 동작은 미확인이다.

## 프로젝트 기준

- 저장소: 이 저장소의 루트 폴더 (컴퓨터에 따라 폴더 이름이 `My Web` 또는 `My-Web`으로 다를 수 있음)
- 현재 작업 브랜치: `main` (HEAD `6058771`); Rules expression budget 수정은 main에 반영 및 push 완료.
- 과거 dependency 조사 및 full regression은 각각 `codex/dependency-audit-remediation`, `codex/full-regression`에서 수행했으며 main에 병합하지 않았다.
- 체크포인트 브랜치 `checkpoint/notice-auth-recovery-20260723`는 `main`에 병합 완료되었고, 브랜치 자체는 로컬/원격에 보존 중이다.
- 검증 현황 (2026-10-02 병합 후 결과): `npm test` `933/933 PASS`; `npm run typecheck` PASS; Firestore Rules Emulator `39/39 PASS`; `npm audit` 루트 29건(high 16) / functions 9건(high 2); Browser E2E(`npm run test:recovery:browser`)는 Playwright 브라우저 미설치로 `NOT RUN`; Browser SDK 역할 매트릭스는 실행 스크립트 없음으로 `NOT RUN`.
- PR #1(`fdad789`)의 5개 파일(`firebase.json`, `ProtectedRoute.tsx`, `RequireAuth.tsx`, `RequireWorkspaceRole.tsx`, `pages/Login.tsx`) 비교 결과 누락 없음. AppNext 가드는 `previewMode` 때문에 리다이렉트 대신 안내 문구로 접근을 막는다. `src` 안에서 `pages/Login`을 import하는 곳이 없다(정리 후보).
- 활성 Rules는 `firebase.json`이 지정하는 `firestore.rules`. `firestore.rules.next`, `firestore.rules.console-current`, backup은 배포 대상으로 설정되어 있지 않다.
- IAM: `IAM_STATUS = HOLD`; 이번 작업에서 IAM 문서나 원격 권한을 변경하지 않았다.

## 최신 전체 정밀진단 및 의존성 후속 조치 (2026-10-10)

- 상태: 로컬 자동 검사와 에뮬레이터 검증은 모두 통과했다. 다만 root 의존성 감사에 취약점이 남아 있으므로 전체를 무조건 정상/취약점 없음으로 판정하지 않는다.
- 환경: 저장소 `C:\dev\My-Web`, 작업 브랜치 `codex/dependency-investigation`가 `origin/codex/dependency-investigation`을 추적하며 작업 트리는 깨끗하다. 조사 코드 커밋 `273cb52`와 문서 후속 커밋 `5dc8753`은 원격 브랜치에 푸시됐다. base는 푸시된 `main`의 `fb36b4d54a7e4278a836a6e4e865261c78e287de`다.
- 통과: `npm test`, `npm run typecheck`, `npm run build`, `npm run build:admin`; Node 22에서 Functions 단위 테스트 `557/557`; Firebase Emulator Functions 통합 테스트 `11/11`; Firestore Rules Emulator `39/39`; recovery Browser E2E `11/11`. 의존성 후속 조치 후 `npm test`, 타입 검사 및 두 빌드를 재실행해 통과를 확인했다.
- 빌드 경고: `src/context/AuthContext.tsx`의 Vite 앱과 무관한 `use client` 지시문을 제거했고 `vite.config.js`에서 Firebase를 분할했다. 500 kB 초과 경고는 해소됐다(최대 AppNext 427.74 kB, Firestore 388.78 kB). 기존 비모듈 HTML `<script>` 안내와 React Router 패키지의 무시 가능한 `use client` 지시문은 잔존한다.
- 의존성 감사/조치: 비강제 `npm audit fix` 및 호환 범위의 `npm update vite esbuild`를 적용했다. Vite `7.3.5 → 7.3.7`, esbuild `0.27.7 → 0.28.2`; esbuild 취약점 1건이 없어졌다. root `npm audit`은 22건(12 high, 10 moderate), production-only는 12건(4 high, 8 moderate)으로 감소했다. Functions audit은 0건으로 재확인했다.
- 취약점 영향/호환성: high advisory 2개는 Firebase Web SDK가 `@firebase/firestore@4.17.2 → @grpc/grpc-js ~1.9.0`을 의존하는 경로다. 현재 설치된 `@grpc/grpc-js@1.9.16`은 advisory 취약 범위이며, 자동 권고는 Firebase `9.14.0`으로 downgrade하는 breaking 변경이다. 상위 SDK는 grpc 범위를 `~1.9.0`으로 선언하므로 1.13.6 이상 override는 선언 계약을 깨뜨린다. gRPC 문자열/코드는 생성된 `dist/assets`에서 검색되지 않았지만, 이는 패키지 취약점 해소나 전면적인 악용 불가 증명이 아니다.
- 기타 잔여: Firebase CLI, Firebase Admin, Rules Unit Testing 전이 경로가 포함된다. 감사 자동 수정은 `firebase-tools@14.23.0`, `firebase-admin@14.5.0`, `@firebase/rules-unit-testing@2.0.7` 등 major 변경/downgrade를 제시한다. 각각 로컬 Emulator CLI, 운영자 스크립트 및 Rules 테스트에 사용되므로 별도 호환성·회귀 계획 없이 적용하지 않았다. `--force`는 사용하지 않았다.
- 통합 테스트 보정: 동시 migration finalizer가 완료 후 재시도를 정상 멱등 응답으로 처리할 수 있어 테스트가 단일 성공만 강제하던 경쟁 조건을 보정했다. 허용 상태는 단일 성공+`CONFLICT` 또는 재생 포함 `ROLLED_BACK` 성공이다.
- 변경 파일 7개는 `273cb52`에 기록됨: `AGENTS.md`, `docs/handoff/CURRENT_HANDOFF.md`, `functions/package-lock.json`, `functions/test/migrationRehearsal.integration.ts`, `package-lock.json`, `src/context/AuthContext.tsx`, `vite.config.js`. 테스트용 `.env.local`, 로그 및 임시 JRE는 제거했다.
- 알려진 제한: root audit 잔여 취약점은 상위 의존성 업데이트/주요 버전 변경 검토가 필요하다. 실서비스 로그인, 원격 Firebase 권한·데이터, 배포 및 IAM 변경은 수행하지 않았으므로 해당 경로의 정상 작동은 이번 결과로 보증하지 않는다. root lint 스크립트는 없다.
- 남은 단계: (1) 이 조사 브랜치에서 Firebase SDK/CLI/Admin 및 Rules 테스트 패키지의 개별 후보를 격리 시험하고 Emulator/운영자 스크립트 회귀 테스트, (2) 비모듈 HTML 스크립트의 전역 순서 의존성을 조사, (3) 배포 전 실제 인증·권한·데이터 흐름은 별도 승인된 검증 절차로 확인한다. 이번에는 운영 Firebase에 접속하지 않았다.

## 전체 정밀진단 (2026-10-10)

- 목표: 현재 저장소의 문서/설정/Git 상태와 로컬 앱 및 빌드 검사를 다시 점검하고, 다음 세션을 위한 상태를 갱신한다.
- 저장소 상태: 실제 루트는 `C:\dev\My-Web`이다. 현재 대화에 설정된 옛 OneDrive 경로는 존재하지 않았다. `main` HEAD는 `fb36b4d54a7e4278a836a6e4e865261c78e287de`; `origin/main` 대비 ahead 1 / behind 0. 진단 시작 시 작업 트리는 깨끗했고 `git status -sb`, porcelain v2, `git diff --check`가 정상이었다. 미푸시 커밋은 기존 로컬 문서 커밋 1개다. 현재는 이번 결과를 기록한 `AGENTS.md`와 핸드오프가 unstaged 변경 상태다. fetch/push는 하지 않았다.
- 통과: `npm test` (종료 코드 0, 앱 격리/역할 보안/인증/trusted backend adapter/auth module/시간표·공지 검사 포함), `npm run typecheck`, `npm run build`, `npm run build:admin` 모두 종료 코드 0. `npm ls --depth=0`에서 최상위 의존성 누락은 보고되지 않았다.
- 빌드 경고: 기존 비모듈 `<script>`들이 Vite 번들에서 제외된다는 안내, `src/context/AuthContext.tsx` sourcemap 원본 위치 확인 실패, `use client` 지시문 무시, 500 kB 초과 chunk 경고가 기본/관리자 빌드에서 반복됐다. 두 빌드는 산출물을 만들고 정상 종료했다.
- 설정 확인: `.claude/settings.json`은 유효한 JSON이며 `CLAUDE.md`의 `@AGENTS.md` import가 존재한다. `@@AGENTS_IMPORT@@` 플레이스홀더는 없다. `docs/integration.md`는 program-hub 이용권 조회 계획과 방향을 기록한다.
- 미실행: Functions 단위/통합 테스트는 현재 Node `24.18.0`이 Functions의 `engines.node=22`와 맞지 않아 실행하지 않았다. fnm에는 Node `20.20.2`만 확인됐다. Rules Emulator와 `npm run test:recovery:browser`는 Java 실행 파일이 없어 실행하지 않았다. 브라우저 설치 상태는 이 진단에서 별도로 확인하지 않았다.
- 프로젝트 품질 현황: root lint script가 없다. 실서비스 로그인, Firebase 원격 권한/데이터, 배포 상태는 확인하거나 변경하지 않았다. IAM은 기존 `HOLD`, teacher assignment-scope 서버 경로는 기존 fail-closed 상태로 유지한다. dependency audit은 이번 세션에서 재실행하지 않아 최신 취약점 현황은 미확인이다.
- 작업 트리: 기본 및 관리자 빌드 후 핸드오프 편집 전까지 `git status`는 깨끗했다. 임시/생성 산출물은 Git 변경으로 남지 않았고, 현재는 `AGENTS.md`와 `docs/handoff/CURRENT_HANDOFF.md`만 unstaged 상태다.
- 알려진 제한과 다음 단계: 지원 Node 22와 Java가 갖춰진 개발 PC에서 Functions 테스트, Firestore Rules Emulator, recovery Browser E2E를 실행하고 결과를 이어 기록한다. 미푸시 문서 커밋은 사용자가 검토한 뒤 필요하면 push한다.
## AGENTS 정비 세션 (2026-10-10)

- 목표: 사용자 제공 담당표에 따라 이 저장소가 Codex 담당인지 확인하고, `AGENTS.md`/핸드오프/연동 메모/Claude 차단 설정을 한 번에 정비한다.
- 담당 확인: 실제 저장소 경로는 `C:\dev\My-Web`; 폴더/노트북 이름이 담당표의 `My Web(노트북 My-Web)`에 해당하므로 OWNER는 `Codex`다.
- 완료:
  - `AGENTS.md` 맨 위에 OWNER, 고정 담당표, 작업 규칙, 연동 규칙, 현재 인계 요약을 추가했다.
  - `CLAUDE.md`를 확인했고 `@@AGENTS_IMPORT@@` 플레이스홀더는 없었다. 기존 `@AGENTS.md` import를 유지했다.
  - `docs/integration.md`를 생성해 `My Web` → `program-hub` Service Access API 이용권 확인 계획을 기록했다.
  - `.claude/settings.json`을 생성해 Claude의 `Edit`, `Write`, `NotebookEdit`, git commit/push/checkout/switch 계열 수정을 deny했다.
  - 앱 코드, 의존성, 빌드 설정, 앱 런타임 설정은 변경하지 않았다.
- 읽기/상태 확인:
  - 읽은 문서: `AGENTS.md`, `CLAUDE.md`, `HANDOFF.md`, `docs/handoff/CURRENT_HANDOFF.md`.
  - 현재 브랜치: `main`.
  - 최근 로그: `69e2565 docs: update handoff after main merge`, `14e1255 ..`, `ddcb8a4 merge: synchronize main history before integration`, `5d92af5 chore: update MY WEB paths after workspace move`, `501a7ca docs: record recovery handoff commit`.
  - `git status`와 `git diff`는 `fatal: this operation must be run in a work tree`로 실패한다. `git rev-parse --is-inside-work-tree=true`, `git rev-parse --is-bare-repository=false`, `git branch --show-current=main`, `git log -5`, `git rev-list --left-right --count HEAD...'@{u}' = 0 0`은 정상 확인됐다.
- 검증:
  - 문서 정비 작업이므로 앱 테스트/빌드는 실행하지 않았다.
  - `git ls-files --modified --others --exclude-standard`는 정비 전 변경/미추적 파일을 반환하지 않았다.
- 분류:
  - 커밋 대상: `AGENTS.md`, `docs/handoff/CURRENT_HANDOFF.md`, `docs/integration.md`, `.claude/settings.json`.
  - `.gitignore` 대상: 없음.
  - 사용자 확인 필요: `git status`/`git diff` 실패 원인. Git 내부 상태 또는 실행 환경 문제로 보이며, 커밋 전 사용자가 로컬 터미널에서 `git status -sb`를 재확인하는 것이 안전하다.
- 남은 일:
  - 사용자가 로컬 터미널에서 `git status -sb`가 정상 동작하는지 확인한다.
  - 문제가 없으면 문서 정비 변경만 선택적으로 stage/commit한다.
- 다음 단계:
  - 제안 커밋 명령은 최종 응답에 PowerShell 명령으로만 제공한다. 이 세션에서는 브랜치 전환, stage, commit, push를 하지 않는다.

## 최종 Functions Emulator Node runtime 진단 및 회귀 (2026-09-30)

- Node 요구사항: `functions/package.json`의 `engines.node`는 `22`; Firebase Functions runtime 설정은 해당 package contract를 사용한다. root `package.json`/lock은 `firebase-tools@15.31.0`이며 functions integration runner는 `npm run test:integration`에서 health 포함 11개 순차 스크립트를 실행하고 `127.0.0.1:<Functions port>/demo-myweb-trusted-backend/us-central1/trustedBackendHealth`를 호출한다.
- Node 22.23.2가 이미 fnm에 설치되어 있어 PATH를 해당 process에만 앞세워 사용했다. Node 24.16.0 baseline과 Node 22 비교는 같은 소스, demo project, config, fixtures, loopback ports `5512/9518/8584`에서 수행했다. 시스템 PATH/JAVA_HOME 영구 변경은 없었다.
- 첫 두 비교에서 두 runtime 모두 health가 `TB_MODE_NOT_EMULATOR`로 fail-closed했다. 원인은 custom `MYWEB_TRUSTED_BACKEND_MODE`가 Firebase CLI 부모 process에는 있어도 Functions worker에 자동 전달되지 않았고, 저장소에는 `functions/.env.local`이 없었던 실행 설정 누락이다. 비밀이 아닌 emulator mode 한 줄만 든 임시 ignored `.env.local`을 양쪽 비교에서 똑같이 적용했다. 문서의 다음 실행 전제도 이에 맞게 명확히 했다.
- 보정한 A/B 결과: Node 24.16.0은 Functions discovery와 endpoint가 정상 기동하고 health 및 첫 9개 integration 흐름이 통과했지만, `registryEnrollmentMutation`에서 assertion 실패하여 종료 코드 1이었다. Node 22.23.2는 같은 조건에서 `npm --prefix functions run test:integration` 종료 코드 0, 전체 11개 순차 integration 스크립트 PASS였다. 요청한 판정 규칙에 따라 `ROOT_CAUSE_CLASS = NODE_RUNTIME_ENVIRONMENT_MISMATCH`; 제품 Functions 코드와 security guard는 수정하지 않았다.
- 로그의 `TypeError: fetch failed`는 Firebase CLI가 선택적인 SQL Connect VS Code 알림 endpoint를 찾지 못했다는 비치명 로그였다. CLI 자체 설명대로 extension이 실행되지 않을 때 발생할 수 있으며, 같은 실행에서 `/__/functions.yaml` discovery 응답 및 health function 초기화가 성공했다. 별도의 함수 discovery 네트워크 실패나 404는 보정 A/B에서 재현되지 않았다.
- Functions Emulator integration: Node 22에서 `11/11 PASS`; Node 24는 선언된 지원 runtime이 아니며 위 A/B 결과로 보존했다. production 호출·쓰기·배포는 없었다.
- 최종 회귀: `npm test` PASS; Functions unit `557/557 PASS` (Node 22); `npm run typecheck`, `npm run build`, `npm run build:admin` PASS; configured/candidate Rules Emulator `39/39 PASS`; headless Browser E2E `11/11 PASS`; 기존 Browser SDK role matrix `74/74 PASS`; `git diff --check` PASS. lint script는 없다. 빌드의 기존 sourcemap, `use client`, chunk size 경고는 남는다.
- 보조 4-profile runner는 `tools/firestore-rules-tests/node_modules/firebase-tools`가 없어 전용 preflight 실패했다. 루트 CLI를 재사용한 시도는 helper가 고정한 port `8085`의 emulator 시작 오류로 중단됐고, 사후 listener는 없었다. 이는 이번 필수 configured/candidate Rules 39개 테스트와 Browser SDK matrix 결과를 바꾸지 않으며 추가 4-profile 재실행은 `NOT VERIFIED`로 남긴다.
- 수동 확인: headless 검증으로 기능 경로는 닫혔다. 실제 창 크기/인쇄물의 시각적 외관만 `MANUAL_CHECK_REQUIRED`; 존재하지 않는 role×CRUD UI 조합은 `NOT_APPLICABLE`. non-owner App Next preview는 현재 `owner-preview-only` release gate 정책대로 차단된다.
- intended files 32개를 선택적으로 stage하고 staged name/stat/diff check를 검토한 뒤 `fix: complete MY WEB recovery verification` commit을 생성했다. stage에는 임시 `.env.local`, debug logs, 임시 대체 config가 포함되지 않았다. push는 하지 않았다.
- handoff 문서는 구현 commit `b153f10ed565b93bd5549bd71596278ab4a087b6`을 기록하며, 이번 후속 문서 commit 자체의 SHA는 비자기참조 handoff 규칙상 본문에 포함하지 않는다. 현재 브랜치 상태는 Git으로 다시 확인할 수 있다.
- Cross-device readiness: `READY_WITH_WARNINGS` — 지원 Node 22 기준 필수 자동 게이트 PASS; Node 24는 미지원 runtime 비교 실패로 기록했고 수동 시각 점검만 남는다. IAM HOLD 유지.

## 이전 최종 검증 시도 및 갱신된 결과 (2026-09-30)

- 이번 작업에서는 Computer Use/GUI 대신 headless Playwright Browser를 사용해 demo Auth/Firestore Emulator와 loopback Vite에서 legacy UI 및 보호 direct URL을 확인했다. `npm run test:recovery:browser`는 `11/11 PASS`로 완료됐다. 테스트는 일곱 역할의 로그인·일정 목록/상세·역할별 생성 UI/가능한 생성, workspace 격리, 로그아웃, 관리자에서 viewer로 전환한 뒤 stale 메뉴·권한 제거, pending/rejected/disabled 계정 fail-closed, App Next signed-out 및 system_owner/manager direct URL 경계를 포함한다. `print_account`는 출력 UI만 노출했다. 외부 네트워크 요청은 브라우저에서 차단되며 Firebase SDK는 로컬 의존성에서 제공한다.
- Browser SDK 역할별 Rules matrix의 기존 증거는 계속 `74/74 PASS`다. 위의 11개 headless UI 테스트는 해당 matrix를 대체하지 않으며, 모든 UI 역할별 상세·수정·삭제 조합을 통과한 것으로 해석하지 않는다.
- 이번 최종 regression에서 configured active/candidate Firestore Rules는 demo Emulator에서 `39/39 PASS`; root `npm test` PASS; Functions 단위 테스트 PASS `557/557`; `npm run typecheck`, `npm run build`, `npm run build:admin`, JavaScript 구문 검사 및 `git diff --check` PASS다. lint는 root `package.json`에 스크립트가 없어 실행할 수 없다. 두 빌드의 기존 비모듈 script, sourcemap 및 대용량 chunk 경고는 남아 있다.
- 당시 Node runtime A/B 진단 전 Functions Emulator integration은 PASS하지 않은 것으로 기록했었다. 이후 위의 동일 설정 Node 22/24 A/B 실행에서 지원 Node 22는 `11/11 PASS`했으며, 당시 404/fetch 기록은 최종 corrected run의 결과가 아니다. 첫 ADC 감지 경고 시도는 즉시 중단했으며 production 호출·데이터 변경·배포는 없었다.
- 기존 `dist`/`dist-admin`의 존재만 확인한 것은 아니며 이번에는 각 build 명령을 실행해 성공했다. generated build output은 ignored 상태이고 source 변경으로 취급하지 않았다.
- 현재 `package.json`에는 `lint` script가 없다. `IAM_STATUS = HOLD` 유지.
- 당시에는 Functions Emulator 통합 실패 때문에 최종 gate를 `BLOCKED`로 두고 stage/commit하지 않았다. 이후 Node 22 비교 결과를 위 최신 섹션에 기록했다.
- 정리된 임시 항목: `.firebase-cli-config-recovery/`, `firestore-debug.log`, `firebase.recovery.functions.json`. 남긴 재사용 가능한 harness: `firebase.recovery.json`, `tests/browser/recovery-ui.e2e.test.mjs`, `tests/browser/vite.recovery.config.cjs`, package script 및 Playwright devDependency.
- 당시 다음 작업은 Node `22` runtime 재실행이었다. 그 검증은 위에서 완료됐다.

## Browser Emulator 및 최종 회귀 (2026-09-30)

- Java는 설치되어 있다. Codex process에서 OpenJDK 21.0.12.1과 사용자 제공 `JAVA_HOME` 아래 Temurin OpenJDK 21.0.12를 확인했다. loopback demo Emulator 시작 시 Firebase CLI가 Java를 성공적으로 spawn했다. 영구 환경변수 변경은 없었다.
- `demo-myweb-browser` Auth/Firestore Emulator는 `127.0.0.1:9399`/`127.0.0.1:8384`에서, Functions 통합 Emulator는 demo project의 loopback endpoint에서만 실행했다. production 연결·데이터 변경·Rules/Functions 배포는 없었다.
- active `firestore.rules`에서 두 보안 결함을 Browser/Emulator로 재현 후 고쳤다: (1) 공통 workspace write allowlist의 `settings`로 teacher 직접 설정 생성이 허용됨, (2) `users/{uid}`가 `pending`/`rejected`/`disabled`여도 stale active membership만 있으면 workspace 직접 read/write가 허용됨. settings를 관리자 공통 분기로 한정하고 user profile active/disabled 상태를 workspace 및 canonical system-owner 판정의 별도 계정 자격 조건으로 추가했다. 역할 근거는 계속 canonical membership/systemOwners 문서다.
- Browser SDK Rules role matrix: `system_owner 9/9`, `super_manager 10/10`, `manager 12/12`, `teacher 11/11`, `normal 10/10`, `viewer 11/11`, `print_account 11/11` PASS. non-owner의 workspace B 직접 CRUD는 `permission-denied`, canonical `system_owner` cross-workspace 관리자 경로는 허용됐다. `pending`, `rejected`, `disabled_profile`은 각 `10/10` PASS; disabled Auth는 `auth/user-disabled`로 로그인 거부됐다.
- stale session 검사에서 기존 super_manager Auth session을 유지한 채 Firestore membership role을 viewer로 강등했다. 세션의 이전 역할과 무관하게 관리자 settings write가 `permission-denied`로 거부됐다.
- App Next direct URL에서 `system_owner`의 `admin-preview`와 `workspace-preview`는 허용, 로그아웃 후 보호 URL은 로그인 화면(`signed-out`)으로 fallback했다. 나머지 workspace role은 두 direct URL 모두 기존 Owner Preview manifest의 `owner-preview-only` 범위 제한으로 막혔다. 따라서 non-owner role guard 자체는 검증하지 않았다. App Next는 현재 읽기 전용 pilot이며 legacy UI의 모든 role/list/detail/CRUD 조합을 새로 검증한 것으로 해석하지 않는다.
- 최종 회귀: configured active/candidate Rules `39/39 PASS`; `npm test` PASS (앱 타깃 격리 7/7, security role 86, auth security 22 등); Functions `557/557`; Functions Emulator integration 11개 suite PASS; `npm run typecheck`, `npm run build`, `npm run build:admin`, `git diff --check` PASS. build의 기존 비모듈 script, sourcemap 및 chunk 크기 경고는 남는다. root `package.json`에는 lint script가 없다.
- Browser harness, demo fixture scripts/config, Emulator log 및 로컬 서버/Emulator를 종료·정리했다. 미커밋 사용자 변경은 보존한다. 작업 마지막 Git 점검 및 handoff 완료 전까지 Git staging/commit/push는 하지 않는다.

## 최종 게이트 재개 시도 (2026-09-30)

- 현재 실제 Git 상태는 위 브랜치와 HEAD에 일치하며 stage된 변경은 없다. 기존 미커밋 구현·문서 변경은 보존했다.
- 격리된 demo project `demo-myweb-final-gate`에 Auth/Firestore Emulator를 `127.0.0.1:9099`/`127.0.0.1:8080`으로 시작하고 합성 역할 fixture 7개를 넣었다. 별도 Vite 테스트 화면도 `127.0.0.1:5174`에서 열었다. Emulator가 아닌 production 서비스 접근·배포는 없었다.
- 기본 `java -version`은 OpenJDK 21.0.12.1, 명시적 Temurin 실행은 21.0.12로 통과했다. 샌드박스 안에서 Node/Firebase CLI의 Java 및 Vite/esbuild 자식 프로세스 spawn은 `EPERM`으로 막혔고, 승인된 격상 실행으로만 demo Emulator와 로컬 서버가 시작됐다.
- 실제 Browser UI 조작은 Computer Use 창 선택 단계에서 `Computer Use app approval timed out`로 차단되어 로그인이나 화면 CRUD를 시도하지 않았다. 따라서 역할별 legacy UI 남은 조합은 계속 `NOT VERIFIED`다.
- 이번 시도의 임시 emulator config, Vite config, fixture seeder, Firebase debug log를 제거했고 loopback Emulator/Vite 프로세스를 종료했다. 이번 시도에서는 회귀 테스트를 다시 실행하지 않았다.
- UI 검증 게이트가 닫히지 않아 stage/commit하지 않았다. 실제 브라우저 입력이 가능한 승인된 제어 수단이 제공된 뒤 격리 harness를 재구성하여 남은 UI role matrix와 직접 URL/logout을 마무리하는 것이 정확한 다음 작업이다.

## 긴급 전체 진단 (2026-09-28)

- 결과: `BLOCKED`; 이전 Rules/Functions Emulator 및 unit/build 검증은 PASS 기록 그대로 유지한다. 이번에는 legacy browser harness를 준비했으나 Emulator가 `Could not spawn java -version`으로 시작되지 않아 role/CRUD 브라우저 흐름을 검증하지 못했다. commit하지 않았다.
- 채팅·지원 thread 접근을 동일 workspace의 활성 membership으로 제한하고, 일반 참여자의 participant 목록 변경을 거부했다. 비활성/불일치 membership과 비활성 canonical `systemOwners/{uid}`도 권한에서 거부한다.
- active Rules는 `viewer`·`print_account`의 일반 workspace 읽기를 허용하면서 직접 쓰기는 막고, candidate Rules의 소유 문서 예외 경로도 이 두 읽기 전용 역할의 create/update/delete를 허용하지 않도록 보강했다. 민감 portfolio에 대한 teacher 직접 쓰기는 거부하고 정상 멤버의 허용된 소유 경로는 유지한다.
- 역할 해석에서 중복 user/membership lookup을 줄였다. `system_owner` 권한은 canonical `systemOwners/{uid}`만 근거로 하며 `users.globalRole`/legacy role을 읽지 않는다.
- `firebase-tools@15.31.0`를 root devDependency로 추가했고 npm cache는 `.npm-cache/`로 한정·gitignore 처리했다. Emulator는 demo project와 loopback에서만 실행했다. npm 설치가 취약점 20건(낮음 1, 보통 13, 높음 6)을 보고했으며 자동 수정은 하지 않았다.
- configured active Rules, candidate workspace Rules, candidate auth Rules를 현재 코드로 Emulator에서 함께 실행해 총 37/37 통과했다. 양 Rules 계열의 7개 역할 CRUD matrix, canonical owner 및 teacher-scope 경로도 포함한다.
- Functions Emulator 통합은 포트를 loopback의 사용 가능한 값으로 분리해 11개 integration suite 전부 통과했다. Functions, Auth, Firestore Emulator만 사용했고 production 접근은 0회였다.
- `npm test`, Functions 단위 테스트 557/557, `typecheck`, 기본/관리자 빌드, `git diff --check`는 PASS했다. 기존 Vite 비모듈 script/sourcemap/chunk 크기 경고는 남았다.
- Emulator Auth를 이용해 super_manager, manager, teacher, normal, viewer, print_account, canonical system_owner와 spoof/비활성 owner fixture의 AppNext 로그인 및 owner-preview 직접 경로 차단/허용을 점검했다. spoof 및 비활성 owner는 관리자 미리보기에 접근할 수 없었다.
- AppNext는 읽기 전용 파일럿이라 CRUD·로그아웃을 제공하지 않는다. 이번 작업에서 외부 CDN을 제거한 임시 Vite harness로 legacy 로그인 화면만 렌더링했으나 Auth/Firestore Emulator가 Java 미설치 상태로 시작되지 않았다. 브라우저 로그인이나 fixture write는 시도하지 않았다.
- cross-device readiness: `BLOCKED` — 저장소 범위만으로 시작 가능한 Java runtime이 없어 Emulator 인증 Browser matrix 실행이 막혔다. Java 실행 환경이 확보된 뒤 역할별 목록/상세/허용·거부 CRUD/direct URL/로그아웃을 실행해야 한다.

## 이번 세션

- HEAD 이후 변경 파일과 연관된 root `HANDOFF.md`를 검토했다. 다른 프로젝트 문구가 섞인 보관 문서 삭제를 확인했고, 잘못된 기능 동작 변경은 발견하지 않았다.
- `firestore.rules.next`의 `system_owner` 설명을 실제 canonical `systemOwners/{uid}` 기준에 맞췄다.
- 인증 정규화가 `users.globalRole`만으로 `system_owner`를 부여하지 않도록 수정하고, 존재하나 비활성인 canonical owner 문서도 비권한으로 처리했다.
- 선택적 레거시 membership 진단이 Rules에서 `permission-denied`로 막혀도 canonical nested membership으로 인증 세션을 계속 구성하도록 수정하고 회귀 검사를 추가했다.
- 브라우저 Emulator 연결을 개발 모드의 loopback endpoint로 제한해 추가하고, 테스트 실행기를 `FIRESTORE_EMULATOR_HOST` 환경값 지원으로 전환했다. 임시 Emulator 설정·환경 파일·로그와 로컬 서버는 점검 종료 후 정리했다.
- 후속 Browser 검증용 임시 Vite harness는 외부 Firebase CDN 대신 로컬 Firebase SDK를 가리키도록 구성했으나, Emulator 시작이 Java 부재로 실패했다. 로그인·fixture write는 하지 않았고 임시 harness/config를 정리했다.
- active/candidate Rules의 membership·owner 조회 중복을 정리하고, viewer/print read-only 정책과 소유 문서 경로의 쓰기 예외를 보강했다.
- configured/candidate/auth Rules 및 7개 역할 동적 CRUD Emulator 회귀를 추가·실행했다. 비활성 system owner fixture를 canonical `systemOwners` schema에 맞게 보정했다.
- root devDependency `firebase-tools@15.31.0`을 추가했다. `.npm-cache/`는 저장소 안에서만 사용하고 ignore 처리했다.
- `HANDOFF.md`, 배포 문서, 서브계정 점검 체크리스트의 오래된 archive 경로·Emulator 차단 기록을 정정했다.
- 이번 세션의 `.env.local`, `functions/.env.local`, 임시 Firebase 설정과 Emulator debug 로그를 제거하고 Emulator/Vite 로컬 프로세스를 종료했다.
- 파일별 감사 결과는 [복구 감사 보고서](../recovery/CROSS_PROJECT_CONTAMINATION_RECOVERY_2026-09-27.md)에 기록했다.
- 감사 전 `CURRENT_HANDOFF.md` 전체 내용은 [감사 전 인계 스냅샷](../recovery/CURRENT_HANDOFF_PRE_AUDIT_2026-09-27.md)에 보존했다.

## 중요한 권한 계약

- 전역 `system_owner`는 canonical `systemOwners/{uid}` 문서에서 판정한다. `users.globalRole`이나 legacy role/profile은 권한 근거가 아니다.
- workspace role은 canonical nested membership에 한정된다. manager는 teacher 이하만 관리하고, super_manager는 manager 이하만 관리한다.
- teacher의 민감 학사 직접 client write는 assignment 범위가 검증되는 서버 경로 연결 전까지 거부한다.
- `viewer`와 `print_account`의 일반 직접 write 및 workspace 경로 불일치 payload를 활성 Rules가 차단한다.
- `firestore.rules.next`를 활성 Rules에 병합하거나 배포하지 않았다.

## 검증

- `npm test`: `PASS` — 앱 타깃 격리 7/7, 보안 역할 회귀 86개, 인증 보안 22/22, trusted backend adapter 128/128, auth 모듈 및 시간표·공지 검사 통과.
- `npm --prefix functions test`: `PASS` — 557/557.
- `npm run typecheck`: `PASS`.
- `npm run build`: `PASS`.
- `npm run build:admin`: `PASS`; 이번 점검에서 `dist-admin`을 새로 빌드했다.
- `node --check` — 변경된 JavaScript 및 테스트 파일: `PASS`.
- `git diff --check`: `PASS`.
- lint: `NOT AVAILABLE` — root `package.json`에 lint script가 없다.
- Firestore Rules Emulator: `node --test tests/firestore/configured-rules.teacher-scope.test.mjs tests/firestore/workspace.rules.test.mjs tests/firestore/auth.rules.test.mjs` — `39/39 PASS` (configured active 9, candidate workspace/auth의 기존 tests 포함). Emulator는 demo project와 loopback `127.0.0.1:8384`에서만 사용했다. 현재는 종료 상태다.
- active 및 candidate 7-role matrix: 일반 schedule/notice CRUD와 읽기, settings·민감 데이터 권한, viewer/print 소유 문서 예외 거부, teacher 민감 portfolio 거부, normal 소유 portfolio 허용을 확인했다.
- Functions Emulator integration: `PASS` — loopback Emulator 설정에서 11개 integration suite 통과. fixture 쓰기는 Emulator 전용이며 production 접근은 0회.
- Authenticated Browser Rules role flow (2026-09-30): seven roles PASS (`system_owner 9/9`, `super_manager 10/10`, `manager 12/12`, `teacher 11/11`, `normal 10/10`, `viewer 11/11`, `print_account 11/11`); pending/rejected/disabled_profile each `10/10`; Auth-disabled login denied. Cross-workspace direct read/write matrix, manager delegation, teacher sensitive/settings deny, role downgrade stale-session deny verified.
- App Next authenticated direct URL: canonical system_owner reaches both preview routes; signed-out direct route falls back to login. Other six roles are blocked at the existing `owner-preview-only` release-manifest gate; their lower-level role guard is NOT VERIFIED. The App Next pilot is read-only; full legacy UI role/list/detail/CRUD coverage is not claimed.
- `firebase-tools@15.31.0` 설치 완료. npm 설치 요약에서 취약점 20건(낮음 1, 보통 13, 높음 6)이 보고되었다. `npm audit fix --force`는 실행하지 않았다.
- 기존 isolated-mode 경고는 회피하기 위해 demo project IDs를 사용했다. production에 연결하지 않았다.
- Vite는 비모듈 script, sourcemap 원본 위치, 500 kB 초과 chunk 경고를 출력했으나 두 빌드는 성공했다.

## 남은 검증 및 알려진 사항

- AppNext는 읽기 전용·owner-preview 파일럿이다. non-owner 두 preview route는 manifest gate로 차단되므로 이후 제품 범위가 해당 role 진입을 요구할 때만 role guard 경로를 별도 검증한다. legacy Browser list/detail UI의 모든 role/CRUD 조합은 아직 종합 검증되지 않았으나 직접 Firestore Browser SDK Rules matrix는 통과했다.
- lint: NOT AVAILABLE — root `package.json`에 `lint` script가 없다. build 경고(비모듈 script, sourcemap, 500 kB 초과 chunk)는 유지된다.
- teacher의 assignment-scope 서버 경로 연결 전 민감 학사 직접 쓰기는 계속 fail-closed다.
- Functions permission catalog와 legacy UI/활성 Rules/candidate Rules의 세부 허용 범위 정합성은 별도 검토 대상이다.
- trusted assignment-scope resolver는 구형 학사 write endpoint에 연결되지 않아 fail-closed 상태다.
- root `HANDOFF.md`는 역사적 작업 메모로 표시했다. 오래된 schema/상태 설명은 현재 구현 근거로 사용하지 않는다.
- `docs/IAM_HOLD_STATUS.md`는 HOLD를 유지하지만 과거 HEAD를 기록한다. IAM 범위 밖이므로 수정하지 않았다.
- `npm audit fix --force` 및 audit dependency 변경은 수행하지 않았다.

## 작업 트리와 다음 작업

- 2026-10-01 경로 변경 점검: 실제 repository root는 `C:\dev\My Web`; HEAD는 `501a7ca6adceb0370467b914528b066fb49015f7`; upstream과 0 ahead / 0 behind; `.env`는 존재하고 ignored다. 현행 문서 링크와 `scripts/generate-blog-pdfs.py`의 실행 예시, 이 handoff의 저장소 경로를 새 위치로 갱신했다. 남은 이전 경로 표기는 역사 메모 `HANDOFF.md`와 recovery 보고서/사전 감사 스냅샷에 한정되어 보존했다. `git diff --check` 통과; 기능 테스트는 실행하지 않았다.
- 이번 작업으로 변경된 파일: `docs/auth-final-architecture.md`, `docs/firestore-rules-migration-plan.md`, `docs/firestore-rules-version-comparison.md`, `docs/handoff/CURRENT_HANDOFF.md`, `docs/my-web-overnight-full-audit-report.md`, `scripts/generate-blog-pdfs.py`.
- cross-project 내용을 포함한 `docs/handoffs/archive-2026-07-09-CODEX_HANDOFF_now_backup.md`는 제거 상태로 유지한다. 나머지 archive는 유지한다.
- 작업 종료 시 위 6개 파일에 unstaged 변경이 있다. 기존 index 변경은 없으며, push/pull/fetch/merge/rebase/switch/checkout/reset/clean/stash 또는 branch 변경은 수행하지 않았다. `GIT_COMMIT = SKIPPED`, `GIT_PUSH = NOT_PERFORMED`.
- 다음 작업: production 및 owner-preview manifest 범위를 바꾸지 않은 채 Emulator 인증 Browser에서 legacy UI의 역할별 목록/상세/허용·거부 CRUD/direct URL/logout 조합 중 남은 항목을 이어서 검증한다. App Next non-owner 경로는 현재 `owner-preview-only` 정책으로 막히는 범위를 그대로 기록한다. 남은 조합 검증 뒤 최종 regression 및 선택적 stage/commit 게이트를 다시 평가한다. teacher의 assignment-scoped trusted backend endpoint 미연결은 기존 fail-closed 제한으로 유지한다.
- 다음 작업은 남아 있는 legacy UI role matrix 검증이다. 이 경로 점검은 기존 기능 검증 범위를 변경하지 않았다. IAM은 `HOLD` 유지.
- Cross-device readiness: `READY_WITH_WARNINGS` — 현재 경로, branch/HEAD, upstream 동기화 및 변경 파일을 기록했다. 이전 경로는 역사 기록에서만 남는다. 기존 남은 검증 및 IAM HOLD는 위 상태 그대로 유지한다.
