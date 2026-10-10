OWNER: Codex

## 프로젝트 담당표 (고정, 변경 계획 없음)

| 담당 | 프로젝트 |
| --- | --- |
| Claude | HoliDay-management / program-hub-v0.1(노트북 program-hub) / firesystem-sim(노트북 fire-simulation) / apartment-simulator / Drane / school-selfstudy-attendance |
| Codex | Web Record(노트북 Web-Record) / chat-service / Hwp / PDF2HWP(노트북 PDF-TO-HWP) / MeMo / Print-Scan(노트북 PrintScan) / My Web(노트북 My-Web) / SchoolControl(school.-control) |
| HOLD | Book-First(BookCoverStudio) / backup-control-center |
| 공유 | Obsidian (별도 규칙) |

## 규칙

- 이 저장소의 OWNER와 다른 AI는 이 저장소를 수정, 생성, 삭제하지 않는다(읽기만 가능). 담당 변경은 하지 않는다.
- 다른 담당의 프로젝트 폴더는 열어서 수정하지 않는다. 필요한 변경은 사용자에게 알린다.
- HOLD 프로젝트는 사용자가 풀기 전까지 아무도 수정하지 않는다.
- 작업 시작 전 AGENTS.md, 핸드오프, git status, 현재 브랜치를 읽는다. 작은 단위로 수정 → 확인 → 커밋. 큰 변경 전에는 git-rollback.cmd mark <name>. 백업 파일(.bak)은 만들지 않는다.
- 삭제, 강제 푸시, 히스토리 수정, 데이터 삭제는 먼저 묻는다. API 키/비밀번호/토큰은 코드에 넣지 않고 .env로 분리한다.
- 작업이 끝나면 핸드오프와 AGENTS.md를 함께 갱신한다. 실행/테스트하지 않은 것은 "동작한다"고 쓰지 않는다.

## 연동 규칙 (지금은 구현하지 않음)

- 모든 프로젝트는 다른 프로젝트 없이 단독으로 빌드, 실행, 테스트가 통과해야 한다. 연동 코드는 지금 만들지 않는다.
- 나중 연동을 위한 입구만 남긴다: 외부와 주고받는 경계(API 엔드포인트, 이벤트, 설정값)는 한 모듈에 모으고, 연동 대상 주소와 키는 .env로 분리한다. 기능 플래그가 꺼져 있으면 연동 코드는 동작하지 않는다.
- 예정된 연동은 docs/integration.md 한 파일에 적는다: 상대 프로젝트, 방향(누가 호출), 요청/응답 형태, 상태(계획/미착수/구현).
- 상대 프로젝트의 담당이 다른 AI여도 저장소는 읽기만 하고, 필요한 변경은 docs/integration.md에 요청으로 남긴다. 상대 저장소를 직접 수정하지 않는다.
- 연동 때문에 현재 프로젝트의 구조를 크게 바꾸지 않는다.

## 현재 인계 요약 (2026-10-10)

- 최신 취약점 조사 후속(2026-10-10): 작업 브랜치는 `codex/dependency-investigation`, 기준 HEAD는 `eda5966a3ac62a03c730aa6915a3ad810cd8cd2a`이며 원격과 0 ahead / 0 behind다. root `firebase-admin`은 `13.6.0 → 14.5.0`, 별도 `tools/firestore-rules-tests`의 `firebase-tools`/Firebase SDK/Rules Unit Testing은 각각 `15.33.0`/`12.19.0`/`5.0.2` 계열로 갱신했다. 강제 override는 하지 않았다.
- 마지막으로 정상 완료된 npm 감사 결과: root 16건(높음 12, 보통 4), 운영 의존성만 4건(모두 높음), Rules 보조 패키지 16건(높음 12, 보통 4), Functions 0건. 이후 재감사는 네트워크 격리 및 의존성 메타데이터 외부 전송 검토 차단으로 실행하지 못했으므로 이 수치는 당시 결과이지 이번 확인에서 새로 검증한 수치가 아니다.
- 취약점 조치: `npm audit fix`의 호환 범위 변경으로 root 및 보조 Rules 도구 감사 건수를 낮췄다. 남은 high advisory 중 `@grpc/grpc-js@1.9.16`은 Firebase Web SDK의 `@firebase/firestore@4.17.2`가 선언한 `~1.9.0` 경로이며, 보안 수정 버전은 그 범위 밖이다. `dist` 번들에는 gRPC 코드가 포함되지 않았고 Browser E2E는 통과했지만, 의존성 finding 자체는 남으며 전체 악용 불가를 증명하지 않는다. 적용 조건이 특정 서버 인증서/RBAC 구성인 두 advisory는 [GHSA-m9gg-hp2v-232j](https://github.com/advisories/GHSA-m9gg-hp2v-232j), [GHSA-f596-whhp-79r4](https://github.com/advisories/GHSA-f596-whhp-79r4)다.
- 검증: 이번 후속 조치 뒤 `npm test`, `npm run build`(타입 검사 포함), `npm run build:admin`은 재실행해 통과했다. 직전 후속 검증의 Firestore Rules Emulator 39/39 및 recovery Browser E2E 11/11도 통과했다. 별도 `tools/firestore-rules-tests` 전체 suite는 fixture를 활성 사용자 프로필 계약에 맞춘 뒤에도 일부 membership 테스트가 Rules 평가식 1,000개 한도 초과로 실패해 PASS로 판정하지 않는다.
- 변경 파일: `package.json`, `package-lock.json`, `tools/firestore-rules-tests/package.json`, `tools/firestore-rules-tests/package-lock.json`, `tools/firestore-rules-tests/tests/helpers.mjs`, `tools/firestore-rules-tests/tests/users.rules.test.mjs`, `CHANGELOG.md`, `AGENTS.md`, `docs/handoff/CURRENT_HANDOFF.md`. Emulator가 만든 `firestore-debug.log` 두 개는 미추적 상태로 남아 있어 커밋 대상이 아니다.
- 현재 검토: `git diff --check` 통과. root와 Rules 보조 도구의 최상위 의존성 누락은 `npm ls --depth=0`에서 확인되지 않았다. 실서비스 Firebase는 사용하지 않았다. 다음 단계는 보조 Rules suite의 expression budget 실패 원인과 남은 npm advisory를 각각 격리해 분석한 뒤, 네트워크 허용 상태에서 `npm audit`을 새로 실행하는 것이다.

- 현재 브랜치: `codex/dependency-investigation`
- 조사 기준 커밋: `273cb52` (`fix: update dependency audit and stabilize emulator tests`), base는 원격에 푸시한 `main`의 `fb36b4d54a7e4278a836a6e4e865261c78e287de`다.
- 의존성 조사: Vite/esbuild 호환 업데이트만 반영했고 테스트 및 양쪽 빌드를 통과했다. root 감사 22건(높음 12, 보통 10), 운영 의존성 12건(높음 4, 보통 8), Functions 0건이다. Firebase Web SDK가 취약 범위의 `@grpc/grpc-js@1.9.16`을 선언 범위 `~1.9.0`으로 가져오는 것이 주요 잔여 경로이며, 강제 override는 하지 않았다.
- 미해결 조치: Firebase SDK/CLI/Admin 및 Rules 테스트 도구의 major 업데이트/권고 downgrade는 조사 브랜치에서 호환성 실험과 Emulator/운영자 스크립트 회귀 검증 후 별도 결정한다. 실서비스 Firebase 검증은 하지 않았다.
- 2026-10-10 전체 정밀진단 최신 결과: `npm test`, `npm run typecheck`, `npm run build`, `npm run build:admin`, Functions 단위 테스트 `557/557`, Functions Emulator 통합 테스트 `11/11`, Firestore Rules Emulator `39/39`, recovery Browser E2E `11/11` 통과. 의존성 후속 조치 뒤 `npm test`, 두 빌드와 타입 검사를 재통과했다.
- 의존성 감사: Vite를 7.3.7, esbuild를 0.28.2로 기존 호환 범위 안에서 갱신해 esbuild 취약점 1건을 제거했다. root `npm audit` 잔여 22건(12 high, 10 moderate), `npm audit --omit=dev` 12건(4 high, 8 moderate). Functions `npm audit`는 0건으로 재확인했다. `--force`/주요 버전 강제 변경은 하지 않았다.
- 잔여 위험: Firebase Web SDK의 `@firebase/firestore@4.17.2`가 `@grpc/grpc-js ~1.9.0`을 고정해 high 2개 advisory가 남는다. 버전 강제는 선언 범위 위반이다. 설치된 취약 버전은 확인되지만 이번 `dist/assets` 검색에서 gRPC 코드 포함은 찾지 못했다(브라우저 악용 가능성 전체를 증명하는 검사는 아님). Firebase CLI/Admin 및 Rules Unit Testing 경로의 나머지 advisory는 major 업데이트 또는 권고 downgrade가 제시되어 별도 호환성 검토 전 보류했다.
- 빌드 경고 조치: `AuthContext.tsx`의 불필요한 `use client` 지시문을 제거하고 Firebase 청크를 분리했다. 최대 앱 청크는 427.74 kB로 500 kB 초과 경고가 사라졌다. 비모듈 HTML `<script>` 안내와 React Router 의존성의 무시 가능한 `use client` 지시문 경고는 남아 있다.
- 남은 검증/위험: root 의존성 감사 잔여 취약점은 추가 상위 의존성/주요 버전 변경 검토가 필요하다. `lint` 스크립트는 없다. 실서비스 로그인/권한/데이터 경로와 배포는 건드리거나 검증하지 않았다.
- 변경 파일 7개는 조사 브랜치의 `273cb52`에 커밋했고, 문서 인계 갱신을 포함한 브랜치는 `origin/codex/dependency-investigation`에 푸시했다. 현재 작업 트리는 깨끗하며 main도 `origin/main`과 동기화되어 있다.
- 작업 트리 경로: 현재 세션에서 예전 OneDrive 경로는 존재하지 않고 저장소는 `C:\dev\My-Web`에 있다. Git 읽기/검사는 승인된 접근으로 수행했다.
# AGENTS.md

## Repository expectations
- 자동 개발·문서화·검증·인계 작업은 현재 Git 저장소 루트 안에서만 수행한다. 루트 밖 파일을 읽거나 만들거나 수정·삭제하지 않으며, Codex에 보이는 다른 프로젝트나 sibling repository를 조사·수정하지 않는다. 사용자가 명시적으로 요청한 경우에만 cross-project 작업을 수행한다.
- 변경 전에 관련 파일을 먼저 읽고 짧은 계획을 제안한다.
- 대규모 리팩터링보다 최소 변경을 선호한다.
- 새 의존성 추가 전에는 반드시 사용자 확인을 요청한다.
- 민감정보, 토큰, PII를 로그에 남기지 않는다.

## Commands
- Install: `npm install`
- Dev: `npm run dev`
- Lint: 현재 루트 `package.json`에 스크립트 없음
- Test: `npm test`
- Build: `npm run build`

## Code style
- TypeScript strict mode를 유지한다.
- 기존 컴포넌트/훅 패턴을 따른다.
- 테스트는 기존 테스트 스타일과 유사하게 작성한다.

## Done means
- 관련 테스트가 추가되거나 업데이트되어야 한다.
- lint/test 결과를 마지막 응답에 포함해야 한다.
- 변경 파일 목록과 의도를 요약해야 한다.

# Cross-device continuation policy

<!-- PROJECT_HANDOFF_POLICY_START -->

## Session startup

Before performing meaningful project work:

1. Read `docs/handoff/CURRENT_HANDOFF.md` when present.
2. Read and follow the `project-handoff` skill.
3. Treat the handoff file as continuation context, not unquestionable truth.
4. Verify important state against the actual repository/workspace before making changes.
5. If the handoff conflicts with verified repository state, trust the verified state and record the discrepancy in the next handoff update.

## Mandatory session handoff

After any meaningful:

- implementation
- bug fix
- refactor
- configuration change
- architecture/design work
- testing/debugging
- deployment preparation
- migration work
- project planning that changes future implementation

you MUST use the `project-handoff` skill before giving the final response.

Update:

`docs/handoff/CURRENT_HANDOFF.md`

This is a completion requirement, not an optional documentation step.

Do not finish the task first and leave the handoff for a later session.

## Handoff scope

The handoff must capture enough verified state for another device or session to continue without asking the user to restate prior work.

At minimum record:

- session objective
- completed work
- files changed
- decisions made
- verification/tests
- known issues
- exact next action
- environment/config requirements
- cross-device readiness

## Secrets

Never place secret values, credentials, tokens, passwords,
private keys, cookies, session data, or `.env` contents in handoff documentation.

Allowed:

- environment variable names
- secret file names
- service names
- Firebase/GCP/Cloudflare project aliases or IDs when non-secret
- configuration requirements

## Git policy

Codex may inspect Git state when necessary for accurate documentation.

Actual Git operations such as:

- clone
- init
- add
- commit
- pull
- push
- remote changes

are performed by the user unless the user explicitly changes this policy.

현재 Git 상태 조회와 diff 검증은 가능하지만, `fetch`, `merge`, `rebase`, `switch`, `checkout`, `reset`, `clean`, `stash` 및 force 작업도 사용자가 명시적으로 요청하기 전에는 수행하지 않는다.

## Final response requirement

After updating the handoff, include a short confirmation:

`Cross-device handoff updated.`

If the handoff could not be updated, explicitly state why.

<!-- PROJECT_HANDOFF_POLICY_END -->

<!-- PROJECT_DOCUMENTATION_POLICY_START -->
## Automatic project documentation
Before finishing meaningful project-changing work, use the `project-docs-manager` skill and read `PROJECT_DOCS.config`.

Managed documents:
- `README.md`
- `CHANGELOG.md`
- `docs/deployment/DEPLOYMENT.md`
- development logs under the configured root
- `docs/handoff/CURRENT_HANDOFF.md`

Rules:
1. README: update only when project purpose, setup, usage, major features, architecture, configuration, supported platforms, or useful repository structure materially changes.
2. CHANGELOG: update only for meaningful release-relevant changes. Use `Unreleased` when no verified release version is known.
3. Deployment docs: update only when build/release, hosting, environment, migration, domain/routing, rollback/recovery, or production verification behavior changes.
4. Development-log automation is controlled by `DEVLOG_AUTO_UPDATE` in `PROJECT_DOCS.config`.
5. When `DEVLOG_AUTO_UPDATE=false`, do not create or update development logs unless the user explicitly requests one.
6. Cross-device handoff remains mandatory after meaningful project-changing work.
7. Preserve existing project-specific documentation; never replace it with generic content unnecessarily.
8. Never write secret values into managed documents.
<!-- PROJECT_DOCUMENTATION_POLICY_END -->
