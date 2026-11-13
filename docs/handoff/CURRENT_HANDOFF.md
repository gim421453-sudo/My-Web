# MY WEB 현재 작업 인계

## 2026-11-13 integrated full validation

Branch `codex/full-validation-20261113` merges all 5 independent follow-up branches from base `1874119`. Found and fixed pre-existing manifest cache mismatch: source fix `0476483`. Final PASS: root npm test (669 auth modules), login-copy, release gate 33/33, manifest 18/18, typecheck + main/admin compile builds, Node 22 Functions unit 559/559, active Rules 171/171, configured teacher scope 9/9, candidate Rules 30/30, Functions integration 11 flows, full Browser 20/20 in one run (fail/cancel/skip/todo 0). Complete backend wrapper executed successfully. See `docs/full-validation-20261113.md`. Fresh audit findings unchanged: root 55, production-only 14, Functions 16, Rules tooling 49. Existing functional limitations/manual checks remain. All test services shut down. Conditional push authorized by user after tests; main merge/deploy/IAM/environment publication not performed. READY_WITH_WARNINGS.


## 2026-11-13 dependency audit branch

- Branch: `codex/dependency-audit-20261113`, base `1874119`. Current lockfile audits completed: root 55 (20 high), production-only 14 (5 high), Functions 16 (3 high), Rules tools 49 (20 high).
- Added `docs/dependency-audit-20261113.md` with scope, advisory links, remediation decisions and reproduction commands. No manifests, lockfiles, application code or Rules changed.
- Next: vendor-supported upgrade candidates in a separate remediation change with complete regression. No force fix or override applied. IAM/production HOLD remains. Status: READY_WITH_WARNINGS.
## 2026-11-13 backend validation

Branch `codex/backend-rules-validation-20261113`, base `1874119`. PASS: Node 22 Functions 557/557, active Rules 171/171, configured teacher scope 9/9, Functions integration all 11 scripts. Added `scripts/validate-backend-local.sh` and `docs/backend-validation-20261113.md`. Component commands executed; whole wrapper not rerun. Setup failures (ADC guard, concurrent logging-port race) diagnosed and successful isolated/sequential runs completed. No product/Rules/dependency changes. IAM/production HOLD. READY_WITH_WARNINGS; next: local UI/print/offline validation in its own branch.
## 2026-11-13 UI print and offline validation

Branch `codex/ui-print-offline-20261113`, base `1874119`. Added 2 meaningful Browser cases: local legacy/App Next display/print capture and 60-second offline/reconnect. Display+runtime successful rerun 2/2; offline case passed in earlier targeted run. Whole 20-case suite NOT RUN; original 18-case baseline previously PASS. Findings: mixed-schema title missing from legacy table/report, open mobile sidebar overlay, App Next generic print includes controls/diagnostics. See `docs/testing/ui-print-offline-20261113.md`; demo artifacts in ignored tmp. Actual production comparison, hours offline and physical printing remain MANUAL_REQUIRED. No UI policy/production/IAM changes. READY_WITH_WARNINGS; next: review/fix documented parity and print issues separately.
## 2026-11-13 timetable concurrency contract review

Branch `codex/timetable-concurrency-review-20261113`, base `1874119`. Added `docs/timetable-cell-uniqueness-contract.md` and deterministic late legacy-writer characterization. Existing service can leave 2 occupants after preflight; this is evidence of the limitation, not a fix. Timetable tests 10/10 PASS and root npm test PASS (Asia/Seoul). Proposed trusted operation + server occupancy + fencing/backfill + all-writer cutover; no browser-only uniqueness claim. No product code, Rules, schema migration or deployment changed. Next: implement/review the server protocol and rollout as a separate authorized change; IAM/production HOLD. READY_WITH_WARNINGS.
## 2026-11-13 school write scope design and branch index

Branch `codex/school-scope-design-20261113`, base `1874119`. Added `docs/school-write-scope-followup-design.md` and 2 negative authority-boundary tests: manager cannot use teacher resolver; student assignment does not authorize a timetable cell. Node 22 Functions build PASS; policy tests 63/63 PASS, no fail/skip/cancel/todo. No endpoint, Rules, UI permission or production exports changed. Proposed narrow student-scoped attendance transaction first; manager delegation and timetable-specific authorization need separate explicit contracts. Added `docs/followup-branches-20261113.md` indexing all 5 independent local branches and remaining work. No push/merge/deploy/publication. READY_WITH_WARNINGS. Next: review branch results, select implementation follow-up; existing school timetable denial and IAM HOLD remain.


## 2026-10-22 Codex 프로젝트 현황 Wiki 조사

- 목표: Codex 담당 8개 프로젝트의 현재 Git/handoff 상태를 Obsidian 프로젝트 지식베이스로 정리했다. My Web 기능 코드나 설정은 수정하지 않았고, 이번 조사에서 테스트·빌드·배포·Git 동기화를 실행하지 않았다.
- Obsidian Vault `C:/dev/Obsidian`의 flat Project 노트를 보강했다. 통합 대시보드와 근거 조사는 정본을 `Wiki/00-Projects-Dashboard.md`, `Wiki/Codex-Projects-Audit-2026-10-22.md`에 두고 Project 쪽에는 기존 구조를 따르는 바로가기 노트를 둔다. 2026-10-22 Daily와 Wiki log도 갱신했다. 전체 소스 전수 review는 하지 않았으며 이전 테스트 결과는 날짜를 붙여 기록했다.
- 현재 실제 Git 대조: branch `feat/format-readiness-diagnostics`, HEAD `f3f2c6b`, `origin/feat/format-readiness-diagnostics`와 정렬. tracked working tree clean; 미추적 `CLAUDE.md.mainpc-old`, `firestore-debug.log`가 남아 있다. 이 조사자는 Git 조작을 하지 않았다.
- 진단 충돌: 10-19 handoff의 npm audit 0 기록과 10-20 별도 Codex 진단의 root 16건(12 high, 4 moderate), production 4 high 결과를 분리 기록했다. 이번 조사에서 audit을 다시 실행하지 않았다.
- 완료/제한: Obsidian 링크 및 민감정보 패턴 검사를 수행했다. 전체 source audit, 새 테스트, production service 확인은 NOT RUN. 다른 저장소의 후속 Git 문서 commit은 이번 조사와 별개로 실제 status/log에서 관측해 Wiki에 최신 snapshot으로 반영했다.
- 다음 작업: `Wiki/00-Projects-Dashboard.md`의 P0부터 다음 프로젝트를 선택한다. My Web 쪽에서는 포맷 전에 브라우저 localStorage/IndexedDB와 Codex 개인 설정 보존 여부를 확인한 뒤 `docs/handoff/FORMAT_RECOVERY.md`를 따른다. IAM HOLD 및 production 금지는 유지한다.
- 교차 기기 상태: Obsidian 변경은 로컬 미커밋이며 commit/push하지 않았다. Wiki 내용이 다른 기기에 동기화됐다고 가정하지 않는다.

Last updated: 2026-10-19 (Asia/Seoul)
Status: REMOTE_CODE_BACKUP_COMPLETE_LOCAL_DATA_BACKUP_REQUIRED

## 2026-10-19 최신 포맷 전 정밀진단

- 실제 저장소 루트는 `C:\dev\My Web`이며 `origin/main` 최신화 후 기준 커밋 `350addc` (`350addceaff3d2a059b4cd02ea6b2b5727fc6f7e`)에서 진단 브랜치 `feat/format-readiness-diagnostics`를 만들었다. `main`과 `origin/main`은 진단 시작 시 동일 커밋이었다. 진단 시작 때 tracked 변경은 없었다. 현재 tracked 변경은 이 진단 내용을 기록한 `AGENTS.md`와 이 handoff뿐이다. 미추적 `CLAUDE.md.mainpc-old`와 이번 Emulator 실행으로 생성된 `firestore-debug.log`는 보존한다. 커밋/푸시/배포는 하지 않았다.
- 회귀 PASS: `npm test`, 로그인 문구 검사, 시간표 row CRUD 9/9, release gate 33/33, `npm run typecheck`, root 및 admin 빌드, recovery Browser Emulator 18/18, Firestore Rules Emulator 39/39, Functions 단위 557/557, Functions Emulator 통합 11개 흐름. 각 Emulator 통합 결과는 production access 0으로 보고했다. 브라우저 테스트에는 fail/cancel/skip/todo가 없었다.
- 빌드는 `--ignore-scripts`로 실행해 `.env` 기반 설정 생성 및 후처리 lifecycle script를 건너뛰었다. Functions 최신 소스는 기존 ignored `functions/lib`에 컴파일했으며 clean/delete 단계는 실행하지 않았다. 루트 `.env`는 읽거나 수정하지 않았다.
- root, Functions, Firestore Rules 도구 세 lockfile에 대한 `npm audit`는 모두 `0 total`이다. 감사 결과는 현재 저장 lockfile 기준이다. 최종 `git diff --check` PASS다.
- 진단 중 표시된 경고: Vite의 HTML classic script 번들 안내, Firebase Emulator의 기본 logging/hub 포트 점유로 대체 포트 선택, Functions 패키지 버전 안내, Emulator CLI의 ADC 감지 경고. 회귀/통합은 성공 종료했고 각 통합 시나리오가 production access 0을 보고했지만, 운영 Firebase 자체를 검사한 것은 아니다. 앱/관리자 빌드 모두 완료됐다.
- 상태: `READY_WITH_WARNINGS`. 자동 검증은 통과했지만 운영 화면/인쇄 비교, 장시간 offline UX, 브라우저 로컬 데이터 및 Codex 개인 설정의 포맷 전 보존 여부는 별도 확인이 남아 있다. IAM HOLD 및 운영 데이터/deploy 금지를 유지한다.
- 다음 단계: 브라우저 localStorage/IndexedDB와 Codex 개인 설정에 보존이 필요한 자료가 있는지 포맷 전에 확인한다. 포맷 후 `FORMAT_RECOVERY.md` 절차로 새 clone을 준비하고 demo 검증을 다시 실행한다. 진단 산출물/사용자 파일은 자동 삭제하지 않는다.

## 포맷 전 통합 상태

- 원격 저장소: `https://github.com/gim421453-sudo/My-Web.git`, OWNER Codex. 통합 당시 루트는 `C:\dev\My-Web`, 기준은 `cf55bed`였다. 이후 최신화된 현재 경로/브랜치/커밋은 위의 최신 정밀진단 항목을 따른다. 로그인 브랜치 HEAD `4856347f72f90849b0989bb4f91bc06d930d9cda`는 원격과 일치했고 시간표 worktree의 19개 파일은 `6cb8546`으로 커밋해 origin에 보존했다.
- 이번 통합은 로그인 문구와 시간표 row CRUD만 포함한다. 코드 충돌은 없으며 AGENTS/이 문서의 인계 상태 충돌을 두 작업의 역사로 보존했다. dependency remediation/full-regression 조사 브랜치를 병합한 것이 아니다. 두 기능 브랜치는 서로 갈라져 있어 통합 브랜치에서 정상 merge commit을 만들었고 main은 해당 통합 결과로 fast-forward했다. 강제 처리와 히스토리 수정은 없다.
- 현재 제품: legacy `index.html + app.js` 유지, App Next 공지/일정/시간표 row CRUD 제공. 로그인 기본 이름은 `통합 관리프로그램`, 초대 안내 문구는 제거했으며 기존 사용자 지정 이름과 인증 버튼/동작은 유지한다. 시간표 계약은 `docs/app-next-timetable-read-only-pilot.md`, 일정/공지 계약은 각 integration/pilot 문서를 참조한다.
- 재개 지침: **`docs/handoff/FORMAT_RECOVERY.md`를 먼저 읽는다.** 포맷은 `.env`, 비추적 데이터, 브라우저 localStorage/IndexedDB 및 설치 런타임을 지운다. Git push만으로 이 항목들이 백업되지는 않는다. 사용자가 2026-10-19 `.env` 별도 백업 완료를 확인했다. 파일 내용과 백업 위치는 확인하지 않았다. 브라우저 로컬 데이터와 Codex 개인 설정 보존 여부는 미확인이다.
- 미해결: npm advisory, 운영 앱과 mixed/legacy 화면·정렬·출력 수동 비교, 장시간 offline UX, 임의 ID legacy 클라이언트와 App Next의 동시 생성 전체 유일성. 학교 manager/teacher assignment scope 미검증은 fail closed 유지. IAM HOLD; 운영 Firebase 접근/deploy/원격 권한 변경 금지.
- 통합 검증(2026-10-19): 로그인 문구 회귀 PASS, 시간표 단위 9/9 PASS, npm test PASS(auth 모듈 668개), typecheck/build/build:admin PASS, release gate 33/33 PASS, 전체 browser 18/18 PASS(fail/cancel/skip/todo 0). Node 24.18.0 / npm 11.16.0 / Java 21. 세션 demo build와 demo/loopback Emulator만 사용했다. Vite 비모듈 script/use client 경고는 비차단이다. Functions 및 별도 전체 Rules suite는 이번에 재실행하지 않았다.
- Rules/Functions/의존성 manifest·lockfile은 cf55bed 기준 diff 0이다. legacy app.js는 로그인 기본 문구/초대 안내 제거만 변경했다. 코드 로직 추가 수정 없이 두 작업을 통합했다.
- **원격 코드 체크포인트:** 통합 merge commit `1f3e08dcc4da9c67c8c53e962195af3c26b1908d`가 main과 origin/main에 반영됐고 `git ls-remote origin refs/heads/main`으로 일치를 확인했다. `origin/codex/docs-format-recovery`에도 이 통합 커밋을 보존했다. 이 항목 이후 문서 마무리 커밋은 main에 별도로 올리며, 최신 문서 SHA는 `git log -1`과 원격 조회로 확인한다(자기 커밋 SHA를 문서 내부에 고정하지 않음).
- main 병합 후 npm test, 로그인 문구 회귀, typecheck, release gate 33/33을 다시 실행해 PASS를 확인했다. 통합 브랜치에서 통과한 build/build:admin/browser 18/18과 main 제품 파일 내용은 동일하다. 문서 마무리 외 후속 기능 변경은 없다. `git diff --check` PASS, Emulator/Vite 종료 후 이번 firebase-debug.log/firestore-debug.log를 잠금 확인해 제거했다. `.env`와 개인 파일은 읽거나 커밋하지 않았다.
- 작업 보존 상태: 루트와 시간표 worktree 모두 변경 없이 정리됐고 Git stash 및 로컬 tag는 없었다. 기능 브랜치와 통합 브랜치는 원격 복구 지점으로 유지한다. 시간표 기존 worktree의 HEAD는 `6cb8546`이며 origin 작업 브랜치와 동기화되어 있다. 포맷 후에는 해당 경로/`.git` 링크를 복사하지 말고 main을 새 clone한다.
- 다음 PC 첫 단계: FORMAT_RECOVERY의 절차로 clone → main 최신화 → 정책/인계 읽기 → npm ci 및 Chromium/Java 설치 → demo 회귀 검증. 다음 개발은 새 codex/* branch/worktree에서 한다. **코드 원격 및 `.env` 별도 백업은 완료 확인됨. 브라우저 데이터·Codex 개인 설정은 백업 확인이 남아 있다.** 기존 IAM HOLD와 production 금지를 유지한다.

## 과거 로그인 문구 작업 (2026-10-17 당시 상태)

- 저장소 `C:\dev\My-Web`, 브랜치 `codex/fix-login-copy`, 기준 HEAD `cf55bedbfb6657ead3e3286fe9e231768a77a29c`. 시작 시 main/origin/main 작업 트리는 clean이었다. 별도 브랜치에서만 수정했고 stage/commit/push/merge는 하지 않았다.
- index.html/app.js의 기본 제목을 `통합 관리프로그램`으로 변경했다. 이전 기본 이름은 표시 단계에서만 치환하고 사용자 지정 이름 및 저장 데이터는 보존한다. 초대 안내 문구의 정적 HTML과 동적 재생성 및 직접 접근 코드를 함께 제거했다. 회원가입/초대코드 등록 버튼과 인증 로직은 유지한다.
- `npm test` PASS. 문구·기본 이름 호환 및 사용자 이름 보존 회귀 검사는 `scripts/test-login-copy.mjs`에 추가했다. 실제 로그인/운영 Firebase 검사는 수행하지 않았다. Rules/Functions/의존성/다른 시간표 worktree는 변경하지 않았다.
- 변경 파일: index.html, app.js, scripts/test-login-copy.mjs, AGENTS.md, 이 문서. 로컬 미커밋 상태이므로 다른 PC에서 자동 복구된다고 가정하지 않는다. 아래 일정 기록은 과거 상태다.

## 과거 시간표 작업 브랜치 인계 (2026-10-17 당시 상태)

- OWNER: Codex. worktree `C:\dev\My-Web\tmp\codex-branches\feat-app-next-timetable-row-crud`, 브랜치 `codex/feat-app-next-timetable-row-crud`, HEAD `cf55bedbfb6657ead3e3286fe9e231768a77a29c`. 기존 utils 변경을 보존하고 이어서 구현했다. upstream 없음; ahead/behind 미확인; fetch/main 수정/stage/commit/push/merge 없음. 아래 이전 일정 작업 기록은 과거 결과다.
- 완료: 시간표 주간 격자에 row 단위 생성·수정·삭제, RequireWorkspaceRole, 서비스 정책, 오류·중복 제출 방지와 서버 확인을 연결했다. 기존 `#/timetable-readonly` 경로와 read normalization은 유지한다. 명시적으로 선택한 set만 편집하며 invalid set을 자동 저장/교체하지 않는다.
- canonical 경로는 `workspaces/{workspaceId}/timetable`이다. set/periodTimes는 조회만 한다. create는 cell 기반 ID transaction, update는 원래 문서에 editable patch만 적용, delete는 정확한 row 한 개만 제거한다. 모든 작업은 `getDocFromServer`로 값/부재 확인 후 `getDocsFromServer` 목록 재조회까지 성공해야 완료 표시한다. unknown 필드, 기존 set alias, 기존 시간·프로그램 연결은 수정 시 보존한다.
- 권한: system_owner/super_manager C/U/D; manager personal/academy C/U/D; teacher personal/academy C/U; normal 알려진 school/personal/academy C/U; viewer/print_account 쓰기 금지. 학교 manager/teacher 및 unknown 모드 일반 역할은 운영 assignment scope 미검증으로 fail closed. 실제 서버 권한은 기존 Rules가 판정하며 이 클라이언트 제한을 새 서버 강제 정책으로 오인하지 않는다.
- 교시: 저장된 visiblePeriodCount/periodCount 및 실제 periodTimes만 사용하며 set 전용 시간이 공통 시간보다 우선한다. 비활성 교시는 제외한다. 조회의 기존 표시 fallback과 쓰기 활성 교시를 분리하며 임의 1~12 생성은 없다. 일반/학교 row에 program 필드를 추가하지 않고 프로그램 set의 기존 programId만 상속한다.
- 실제 검사: 전용 단위 9/9 PASS; `npm test` PASS(auth 모듈 668개); typecheck/build/build:admin PASS; release gate 33/33 PASS. browser 전체 18 tests / 18 pass / 0 fail / 0 skipped / 0 todo. 기존 15개와 시간표 3개 모두 통과했다. 관리자 3종 CRUD/서버 상태/새로고침, teacher/normal 수정 및 삭제 차단, viewer/print 쓰기 숨김, 학교 manager/teacher 차단, 프로그램 binding, invalid set/workspace, 비활성 membership 오류 UI, 다른 row/set/period 보존을 확인했다.
- 환경: Node 24.18.0, Temurin JRE 21. demo project + loopback Emulator만 사용했고 build도 세션 demo Firebase 값만 사용했다. production 접근/데이터 변경/deploy/IAM 변경 없음. Vite 비모듈 script와 React Router use client 경고는 비차단이다. 네트워크/confirmation 오류는 실제 서비스 fake SDK 단위 검사이며 WebChannel 차단이나 production hook은 없다.
- 화면 검증: `tmp/timetable-row-desktop.png`, `tmp/timetable-row-mobile.png` 생성, 모바일 document 가로 넘침 검사 PASS. tmp 산출물은 커밋 대상이 아니다.
- 변경 파일: AGENTS.md, CURRENT_HANDOFF.md, README.md, CHANGELOG.md, 시간표 문서; app-next.html, release manifest, AppNext.tsx, 시간표 격자/조회 서비스/진단/CSS; auth·release gate·browser 테스트. 신규 파일은 row editor/service/utils 및 전용 unit 스크립트다. 모두 unstaged/untracked 상태로 보존한다.
- MANUAL_REQUIRED: 운영 화면과 mixed/legacy 데이터의 실제 표시·출력 대조, 장시간 오프라인 UX. App Next끼리의 중복은 deterministic cell ID transaction으로 차단하고 기존 legacy 점유는 preflight로 차단하지만, 임의 ID legacy 클라이언트와의 동시 생성 전체를 보장하려면 별도 서버 계약이 필요하다. 이번 작업에서 Rules/backend를 변경하지 않는다.
- 다음 단계: 최종 diff 검토 및 위 수동 비교. 별도 지시 전 stage/commit/push/merge하지 않는다. 미커밋 변경은 원격에 없으므로 다른 PC에서 자동 복구되는 것으로 가정하지 않는다. npm advisory 후속 조사와 IAM HOLD는 그대로 유지한다.
- 최종 Git: `git diff --check` PASS. 금지 Rules 및 root/functions/Rules 도구 manifest·lockfile diff 0, Functions 코드 및 legacy app.js/workspaceDataService 무변경, Firebase 생성 설정 diff 0. Emulator/Vite 지정 포트 종료 및 로그 exclusive lock 해제를 확인한 뒤 이번 firestore-debug.log만 제거했다. 미추적 debug log 잔존 없음. tracked 변경 15개 + 신규 4개이며 tmp 캡처는 ignored 산출물이다.
- Cross-device readiness: `READY_WITH_WARNINGS` — 현재 경로/브랜치/HEAD와 실제 자동 검사, 로컬 미커밋 상태, upstream 없음, 수동 항목을 기록했다. 필수 자동 검사 및 Git 조건을 충족해 `COMMIT_READY`다. production 승인과 별개이며 stage/commit/push/merge는 수행하지 않았다.

## 이전 일정 작업 브랜치 인계 (2026-10-16)

- 저장소/worktree: `C:\dev\My-Web\tmp\codex-branches\feat-app-next-schedule-crud`; 브랜치 `codex/feat-app-next-schedule-crud`; HEAD `6e1e0b9ca8dd3c70a961904b050ef3806a5d7ec3`. 로컬 main/origin/main 기준도 동일하다(이번 작업에서 fetch하지 않음). upstream은 없으며 ahead/behind는 미확인이다. 시작 시 clean worktree였고 현재 변경은 모두 unstaged/untracked 상태다.
- 목적/완료: App Next 일정 조회 화면에 기존 운영 schema 기반 생성·수정·삭제, 권한 Guard, 서버 확인, 입력/오류/중복 제출 처리를 추가했다. 경로 `#/schedules-readonly`는 호환성을 위해 유지했다. marker 및 migration 없이 `workspaces/{workspaceId}/schedules`만 사용한다.
- 권한: canonical system owner와 활성 workspace 관리자 2종은 C/U/D, teacher/normal은 C/U(타 작성자 일정 포함), viewer/print_account는 읽기만 허용한다. 삭제는 teacher/normal 본인 일정에도 허용되지 않는다. Rules와 legacy `defaultActionPermissionsV31`에서 이 계약을 확인했다. 비활성 membership은 실제 Rules 쓰기 거부 후, 새 로그인에서는 workspace 조회 거부/session 오류로 fail-closed 된다.
- 서버 확인: create `setDoc`/update `updateDoc` 후 `getDocFromServer`로 편집 필드와 workspace를 검증한다. delete `deleteDoc` 후 서버 부재를 검증한다. 완료 상태는 서버 목록 재조회까지 성공한 뒤 표시한다. 수동 refresh가 저장과 겹치면 저장 이전 조회를 마친 뒤 새 서버 조회를 수행한다. 임의 transport 차단이나 production 테스트 hook은 없다.
- 호환성: 기존 canonical 일정은 marker 없이 수정 가능하고 unknown/작성자/장소 필드는 보존한다. `name`, `startAt` 등 mixed schema는 기존 읽기 fallback으로 계속 보인다. 날짜·시간 표현을 변환해야 하는 문서는 이번 편집 대상에서 제외하며 운영 화면을 사용한다.
- 검증: 전체 `npm run test:recovery:browser` 15/15 PASS, fail/skip/todo 0. 기존 13개와 새 일정 역할·오류 UI 2개가 통과했다. 7역할 권한과 실제 Firestore 상태, forged caller 역할의 Rules 거부, workspace 경계, 생성/수정/삭제 및 새로고침, legacy 필드 보존, mixed 조회, 입력 오류, 중복 submit/진행 상태/수동 조회 중첩, permission alert, 비활성 membership 차단, runtime/non-loopback 검사 포함이다. 단위 검사는 실제 service에 fake SDK를 주입해 unavailable 및 create/update/delete confirmation mismatch를 검사한다.
- 전체 회귀: `npm test` PASS(auth 모듈 659개), `npm run typecheck` PASS, `npm run build` PASS, `npm run build:admin` PASS. release gate 32/32 PASS. Node 24.18.0과 Temurin JRE 21을 사용했다. Firebase 세션 환경은 demo 값만 지정했고 browser는 demo-myweb-recovery-e2e와 loopback Emulator만 사용했다. Functions/전체 별도 Rules suite는 이번에 실행하지 않았다.
- 발견/조치: 일정 삭제 문구 조사 오류를 수정했다. legacy owner Browser 검사는 로그인 직후 데이터 동기화 및 자동 페이지 복원 완료 전에 메뉴를 클릭할 수 있어 준비 조건을 보강했다. 공지 release gate의 문자열 검사도 factory 기본 beta 값이 반영된 실제 manifest를 확인하도록 수정했다. 기존 제품 권한을 약화하지 않았다.
- 변경 파일: `app-next.html`, `src/app-next/{AppNext.tsx,AppNextSchedulesReadOnly.tsx,AppNextScheduleCrud.tsx,appNextScheduleCrudService.ts,appNextScheduleCrudUtils.ts,appNextSchedulesReadonlyService.ts,appNextDiagnostics.ts,styles.css}`, `shared/ownerPreviewReleaseManifest.js`, `scripts/{app-next-schedules-crud-tests.mjs,test-auth-modules.mjs,test-role-workspace-release-gate.mjs}`, `tests/browser/recovery-ui.e2e.test.mjs`, `README.md`, `CHANGELOG.md`, `AGENTS.md`, 이 handoff, 일정 Pilot 문서. 소스 삭제는 없다.
- Git/환경 최종 점검(2026-10-16): production Firebase read/write/deploy/IAM 변경 없음. Rules/Functions/의존성 및 금지 manifests/lockfiles diff 0, 운영 앱 `app.js`/`services` diff 0, 생성 Firebase 설정 diff 0. Emulator/Vite 종료와 파일 잠금 해제를 확인한 뒤 이번 `firestore-debug.log`를 삭제했다. `git diff --check` PASS. 수정 파일 15개 + 새 파일 4개이며 staged 변경은 없다. tmp runtime/스크린샷은 commit 대상이 아니다. 전날 완료한 자동 테스트 이후 기능 코드는 변경하지 않았고 이번 재개에서는 로그 정리·Git 점검·인계 마무리만 수행했다.
- 남은 일/알려진 제한: `MANUAL_REQUIRED`는 실제 사용자 기기의 운영 앱↔App Next 표시·정렬·필터·상세·출력 비교다. 혼합 날짜 schema 편집 지원은 별도 설계가 필요하다. 실제 offline transport 상황은 Browser 차단 hack 없이 단위 오류 주입으로 검사했으며 장시간 연결 끊김 UX는 수동 확인 대상이다. 기존 npm advisory 미해결/IAM HOLD 유지. 개발일지는 config에 따라 생성하지 않았다.
- 다음 단계: 변경 diff와 위 수동 비교 범위를 검토한다. 별도 사용자 지시 전까지 stage/commit/push/merge하지 않는다. upstream 없음과 로컬 미커밋 상태를 다음 PC에서 반드시 확인한다. 운영 데이터/Rules 배포/Functions 수정/의존성 조치는 이 작업을 이유로 재개하지 않는다.
- Cross-device readiness: `READY_WITH_WARNINGS` — 자동 검증은 통과했고 미커밋 변경, upstream 없음, 수동 비교와 기존 advisory를 기록했다. `COMMIT_READY`는 이 작업의 자동 검증 준비 상태이며 production 배포 승인이 아니다.

## 이전 공지 CRUD 인계 기록 (2026-10-15; 현재 상태는 위 일정 작업 참조)

- 작업 경로: `C:\dev\My-Web\tmp\codex-branches\feat-app-next-core-crud`; 브랜치 `codex/feat-app-next-core-crud`. 이 작업은 main에 반영하지 않았으며 commit/push/merge하지 않았다.
- App Next 공지 CRUD vertical slice를 추가했다. 신규 쓰기는 기존 `workspaces/{workspaceId}/notices` Rules 계약을 따르고, App Next 표식 문서만 수정/삭제 대상으로 제공한다. `system_owner`, `super_manager`, `manager`는 관리 표식 문서를 관리하고 `teacher`, `normal`은 본인 문서만 관리한다. `viewer`와 `print_account`는 쓰기 UI 및 서비스 정책에서 거부된다.
- UI는 기존 `RequireWorkspaceRole` guard, 새 공지 폼/목록, 권한·네트워크·한도 오류 안내를 사용한다. 쓰기 완료 후 `getDocFromServer` 및 서버 목록 재조회를 확인하며 optimistic success는 표시하지 않는다. 기존 legacy 화면/CRUD, Firestore Rules, Functions, 의존성은 수정하지 않았다.
- 최종 검증: `npm run test:recovery:browser` 13 tests / 13 pass / 0 fail / 0 skipped / 0 todo. 이어서 `npm test`, `npm run typecheck`, `npm run build`, `npm run build:admin` 모두 종료 코드 0으로 통과했다. 기존 Vite 비모듈 script 및 React Router `use client` 경고가 있었으나 빌드는 정상 완료했다.
- FAIL 원인/조치: 마지막 오류 테스트는 Playwright route로 Firestore Emulator 요청을 abort해 UI alert를 기대했다. Firestore Web SDK의 열린 WebChannel에서는 confirmation read가 독립된 안정적 HTTP request로 노출되지 않을 수 있어, 내부 메시지를 route 하나로 식별하는 방식은 brittle하다. E2E에서 네트워크 route를 통한 실패 주입을 제거했다. 브라우저는 기존 권한 거부 흐름으로 실제 `role=alert` 전달을 검증하고, `scripts/test-auth-modules.mjs`에서 `firestore/unavailable` 및 `app-next-write-unconfirmed` 오류를 유틸 경계에 직접 주입해 분류를 검사한다.
- 최종 service 재확인: create는 `addDoc` 후 `getDocFromServer(ref)`, update는 `updateDoc` 후 `getDocFromServer(ref)`, delete는 `deleteDoc` 후 `getDocFromServer(ref)` 결과의 부재를 확인한다. 제품 권한·데이터 계약과 Firestore 코드는 이번 최종 점검에서 변경하지 않았다.
- 검증 환경: 작업 디렉터리와 `.git` worktree 연결, 브랜치 `codex/feat-app-next-core-crud`, HEAD `9bf213f`를 확인했다. 시작 시 지정 emulator 포트 listener와 locator 파일은 없었다. demo Auth/Firestore Emulator가 suite 중 정상 기동·종료했고 stale 프로세스 종료는 불필요했다. 생성된 `firestore-debug.log`는 종료 및 단독 잠금 확인 후 제거했다. 2026-10-14에 생성된 기존 `tmp/recovery-browser-emulator-debug.log`는 이번 진단 산출물이 아니므로 보존했다.
- Git 최종 검증: Firebase 설정 파일 `pm-env.js`, `firebase-config.local.js`, `pm-firebase-config.js`에는 diff가 없다. 금지 파일(`firestore.rules`, package manifests/lockfiles, Functions 및 Rules 도구 manifests/lockfiles) diff 0. `git diff --check` 통과. 자세한 status/stat/name-status는 최종 보고에 기록한다. commit/push/merge는 수행하지 않았다.
- 남은 일: 운영 앱과 App Next의 legacy 공지 표시/정렬을 실제 사용자 화면 기준으로 수동 비교한다. 자동 browser CRUD/역할 검증의 `MANUAL_REQUIRED`는 없다. 필수 자동 검증 및 Git 조건을 충족해 `COMMIT_READY`다. 사용자 제한에 따라 stage/commit/push/merge는 수행하지 않았다.

## 최종 통합 상태 (2026-10-12)

- 저장소: `C:\dev\My-Web`; 브랜치 `main`; 코드 기준 커밋 `6058771` (`fix: reduce firestore membership rules expression budget`). 최종 문서 갱신은 main에 커밋·푸시 완료됐다. Rules expression budget 차단 요인은 해결됐고 전체 자동 회귀 기준은 통과했다. npm advisory는 미해결 잔여 위험이다.
- Rules 수정: membership 역할 변경의 Rules 평가식 사용량을 줄였다. `canUpdateMembershipRole` 경로로 기존 역할 관리 권한과 요청 역할 부여 권한을 통합했고, 자기 역할 변경 금지, `system_owner` 권한, 기존 역할 허용 범위를 유지했다. Firestore Emulator Rules 전체 suite `171/171 PASS`; 수정은 main에 반영 및 push 완료됐다.
- 의존성 조사 브랜치 `codex/dependency-audit-remediation`은 병합하지 않았다. root `npm audit` 16건(높음 12, 보통 4), `npm audit --omit=dev` 높은 위험 4건, Rules 도구 audit 16건(높음 12, 보통 4), Functions audit 0건이다. Firebase 13 / Rules Unit Testing 6 시험은 Rules 1000-expression 문제가 재발하고 audit 개선이 없어 철회했다. `firebase-tools` 14.23.0 하향은 critical 1건 포함 총 22건으로 악화되어 철회했다. 안전성이 검증된 dependency remediation은 없으며 package 및 lockfile은 기준 상태로 복원됐다.
- 전체 회귀 브랜치 `codex/full-regression`에서 `npm test`, `npm run typecheck`, `npm run build`, `npm run build:admin` 통과, Functions 단위 테스트 `557/557 PASS`, Functions Emulator 통합 11개 흐름 PASS, Browser E2E `11/11 PASS`였다. main baseline에서 발견된 Rules 1000-expression 실패는 Rules 수정 후 최종 suite `171/171 PASS`로 해결됐다.
- 격리 검증 런타임은 Node `22.23.2` / Temurin JRE 21 계열이며 demo project와 loopback emulator만 사용했다. 운영 Firebase 접근, 운영 데이터 변경, production 배포는 없었다.
- 잔여 작업: npm advisory 후속 조사; 필요 시 Node 22 개발환경 정식화; 기존 수동 UI/출력 검증. 별도 승인 전 IAM `HOLD`를 유지한다. 강제 override, major downgrade, `npm audit fix --force`는 적용하지 않았다.
- 작업 금지/반복 방지: dependency remediation 및 full regression 브랜치는 main에 병합하지 않았다. 코드, Firestore rules, dependency manifest/lockfile은 이 문서 통합 작업에서 수정하지 않는다. 미추적 `firestore-debug.log` 파일은 보존하며 변경하지 않는다.
- Git 운영 표준: 의미 있는 작업마다 main 최신화 후 별도 `codex/*` 브랜치와 가능하면 worktree에서 수행하고, 검증·명시적 stage·commit·원격 복구 지점·검증된 main 병합 순서를 따르는 정책을 채택했다. 조사 결과는 코드 변경이 없으면 문서에만 통합한다.
- Cross-device readiness: `READY_WITH_WARNINGS` — 현재 브랜치는 `codex/feat-app-next-core-crud`; Git status/diff는 실행 권한 문제로 미확인이다. App Next browser matrix와 최종 build 재확인은 emulator/파일쓰기 실행 환경 문제로 남아 있다. IAM HOLD 유지.

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
