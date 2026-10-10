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

- 현재 브랜치: `main`
- 현재 확인된 HEAD: `69e2565e40ee24461a8470d61f3d6dc4cd96f49b`
- upstream: `origin/main`, ahead 0 / behind 0
- 이번 작업: 저장소 OWNER를 Codex로 명시하고, 담당표/연동 규칙/Claude 차단 설정/연동 메모/핸드오프를 문서화한다.
- 알려진 Git 상태 이슈: `git status`와 `git diff`가 `fatal: this operation must be run in a work tree`로 실패한다. `git rev-parse --is-inside-work-tree`는 `true`, `git branch --show-current`는 `main`, `git log -5`와 upstream rev-list는 정상 확인됐다.
- 이번 작업에서 앱 코드, 의존성, 빌드 설정, 앱 런타임 설정은 변경하지 않는다.
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
