## 2026-11-14 PC 인수: App Next parity 안정화

- 작업 브랜치 `codex/feat-app-next-parity-hardening`, Cloud 인수 HEAD `21d2e9867ddbf1f35e99ce821e7422f484bd3056`, 기준 main `cda1f1de2d18b835a4aa8dd92afba9271f28e3b2`. 최종 커밋 및 원격 상태는 Git refs로 확인한다. main 병합·운영 배포는 승인 범위 밖이다.
- Cloud 구현의 모바일 sidebar, 공지·일정·시간표 인쇄, mixed 일정 표시 및 재연결을 유지했다. PC에서 sidebar 닫힘·작은 화면 넘침, 긴 공지·빈 목록 인쇄, 공지·시간표 재연결, 공지 workspace 전환과 일정·시간표 세션별 캐시 격리를 보완했다. 교시 삭제 fail-closed와 IAM HOLD를 유지한다.
- PC demo/loopback 검증: npm test, typecheck, main/admin 기본 build lifecycle, release gate 33/33, manifest 및 사전 배포 검사 각 18/18, Functions 단위 559/559 및 통합 11개, active Rules 171/171, configured/candidate 39/39, Browser 33/33 통과. Functions/Rules 검사는 최종 UI 전용 수정 전에 실행했으며 해당 코드에는 변경이 없다. 증거는 작업 worktree `tmp/pc-parity-validation-1d27abe9`에 보존한다.
- PC audit: 루트 32(높음 14), 운영 의존성 10(높음 5), Functions 9(높음 1), Rules 도구 33(높음 14). 중복 집계일 수 있으며 취약점 해결이나 실제 악용 가능성을 단정하지 않는다. 의존성 변경 없이 별도 업데이트 계획만 기록했다.
- 잔여: 실기기·접근성·실물 프린터 및 다른 브라우저 수동 QA, mixed 데이터 전체 조합, 저장 중 단절·토큰 만료·지연 응답 경쟁의 결정적 검증. A~D는 부분 완료, E는 감사 완료다. 상세 결과와 한계는 `docs/app-next-parity-hardening-handoff.md`를 따른다.
## 2026-11-13 PC·Cloud 최종 통합 검증 기록

- 최신 승인 범위는 Windows PC 로컬 통합과 GitHub main 반영 및 조건부 로컬 동기화다. 이전 클라우드 이전 취소 기록과 PC 단독 검증의 READY_FOR_MAIN_FF=NO는 당시 상태로 보존한다.
- 최종 브랜치 codex/integrate-myweb-pc-cloud-final-20261113에서 PC 문서 커밋 0e5861b와 Cloud 2cb0d88을 통합했다. handoff의 한 충돌은 양쪽 기록을 모두 보존해 해결했다. PC 시간표 관리 소스와 Cloud의 독립 변경은 원본과 대조했다.
- 새 통합 트리 검증 PASS: 루트 테스트·typecheck·main/admin 전체 build lifecycle, release gate 33/33, manifest 18/18, 관리 단위 6/6, row 단위 10/10, Functions 단위 559/559 및 통합 11개, active Rules 171/171, configured/candidate Rules 39/39, Browser 전체 21/21(실패/취소/skip/todo 0). demo Firebase 및 loopback Emulator만 사용했다.
- PC lockfile 감사 결과는 루트 32(높음14), 운영 의존성10(높음5), Functions9(높음1), Rules 도구33(높음14)이다. Cloud의 과거 수치와 구분하며 의존성 변경·취약점 해결을 주장하지 않는다. 감사 종료 코드1은 finding 결과다.
- 교시 삭제 period-delete-blocked는 계속 fail-closed다. 임의 ID legacy 동시성 검사는 한계 재현이며 서버 보장이 아니다. 학교 scope는 설계·음성 테스트만 추가됐고 새 운영 권한/endpoint는 없다. IAM HOLD, Rules·Functions runtime·legacy app.js·의존성 무변경을 유지했다.
- 원본 사용자 파일과 patch는 기존 백업 및 C:\dev\_git-safety\My-Web-pc-cloud-final-20261113-6af94dbb에 보존했다. 사용자 문서의 추가 문장은 모두 통합본에 존재한다. CLOUD_HANDOFF.md와 CLAUDE.md.mainpc-old는 추적하지 않는다.
- 잔여 수동 QA: legacy mixed 일정 표시/내보내기 parity, 모바일 sidebar, App Next 전용 인쇄 layout, 실물 인쇄·실제 운영 데이터·장시간 offline. 새 PDF 텍스트 검사에서 canonical 제목은 양쪽에 있고 mixed 제목은 App Next에만 있다.
- 상세 검증은 docs/pc-cloud-final-integration-20261113.md, 로그·최종 동기화 증거는 최종 worktree tmp/pc-final-validation-20261113에 보존한다. 이 커밋은 검증 시점의 기록이며 최종 원격·로컬 SHA는 Git refs와 final-state.json으로 확인한다. 운영 Firebase 접근·배포·IAM 변경은 없다.

## 2026-11-12 Codex Cloud 이전 취소

- 사용자가 클라우드 인계 계획을 전면 취소했다. CLOUD_HANDOFF.md의 판정을 CANCELLED로 갱신했다. 클라우드 연결·백업·인계 브랜치·커밋·푸시는 진행하지 않는다. 기존 로컬 프로젝트, 기존 개발 작업, 미커밋 변경 및 미추적 파일은 보존한다. 클라우드 이전과 무관한 기존 개발 작업은 취소하거나 되돌리지 않는다.

## 2026-11-12 Codex Cloud 인계 준비 (취소 이전의 과거 기록)

- 기능 개발 중단. 현재 main HEAD 1874119, 기존 진단 문서 변경과 미추적 CLAUDE.md.mainpc-old를 보존했다. CLOUD_HANDOFF.md에 환경·검사·비밀정보 점검과 백업·별도 브랜치 계획을 기록했다.
- 상태 BLOCKED: 사용자 승인에 따른 외부 백업·복원 검증, 추적 자료 공개 적합성 검토, GitHub 및 클라우드 연결과 인계 브랜치 전달은 미실행. Rules 로그 삭제 금지와 운영/IAM HOLD 유지.

- 2026-11-11 추가 확인: 로그를 삭제하지 않는 Rules --preflight PASS (demo 프로젝트, loopback 8083, Java 21 및 Firebase CLI 확인). 실제 Rules Emulator 테스트는 자동 승인 심사 거부로 NOT RUN. 기존 루트 firestore-debug.log 보존.

## 2026-11-11 진단 요약

- 사용자 승인으로 현재 main(HEAD 1874119)에서 진단했다. 상세 검사 결과와 기존 인계 브랜치 차이는 docs/handoff/CURRENT_HANDOFF.md 참조.
- 기본 테스트·타입 검사·격리 Vite 빌드 통과. owner preview manifest 전용 검사는 v=1 기대와 실제 v=4의 불일치로 17/18. npm audit에서 루트 32건, Functions 9건, Rules 도구 32건이 보고됐다. Rules 실행은 기존 로그 삭제 위험으로 자동 승인 심사에서 거부되었고 Browser/Functions 실행 검사는 미실행이다.
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

## 2026-11-12 App Next 시간표 관리 최종 안전성 검토 (당시 결과; 최신은 2026-11-13 기록)

- 당시 기준 main HEAD는 1874119fa5c7a871840df6a18c071455935f1788이며, 시간표 기능 브랜치 codex/feat-app-next-timetable-management-batch의 최종 커밋은 7f72dda9d35334f01cc63b65eebe4b20d938501f다. main 작업 트리와 사용자의 기존 변경은 별도 보존했다.
- App Next 시간표 set create/update/archive/unarchive/reactivate, 교시 add/time edit 및 기존 row CRUD를 유지한다. app.js V135 legacy writer는 tt-<set>-<day>-<period>-<timestamp> 형태의 classRow.id를 쓰며 활성 교시 확인과 row 저장을 하나의 transaction으로 묶지 않는다. Firestore Rules는 period 참조를 검증하지 않아 period delete race를 차단할 수 없다. management service는 period delete를 period-delete-blocked로 fail-closed하고 UI에서도 버튼을 비활성화한다.
- 최종 검증 PASS: npm test, npm run typecheck, management unit 6/6, row unit 9/9, release gate 33/33, Browser recovery 19/19, 기본 npm run build lifecycle, npm run build:admin, browser test 구문 검사, git diff --check. build는 demo 설정을 사용했다. root config와 dist 산출물은 실행 전 부재 확인, 생성 후 해시 검사해 tmp/final-safety-review-20261112-194028-2770b42f/build-artifacts에 보존했다.
- Emulator는 demo Auth/Firestore 및 loopback Vite만 사용했다. Rules warning은 권한 거부 테스트의 generic L539/L541 평가 및 fallback L1014와 일치하지만 log가 request path/uid를 제공하지 않아 요청별 귀속은 미확인이다. Node MetadataLookupWarning(ETIMEDOUT/ENOTFOUND)도 있었고 테스트는 통과했다. 기존 로그와 스크린샷은 SHA-256 일치로 보존했다.
- 변경은 tracked 8개 수정, 신규 source/test 4개, staged 0이며 commit/push/merge하지 않았다. Rules, Functions, manifest/lockfile, legacy app.js와 Firebase root config diff는 0이다. main 사용자 AGENTS.md, CURRENT_HANDOFF.md, CLOUD_HANDOFF.md, CLAUDE.md.mainpc-old의 사전·사후 해시는 동일하다. origin URL을 변경하지 않았다.
- 남은 수동 확인: 운영 화면의 legacy/mixed 시간표와 인쇄 비교 및 장시간 offline UX. 교시 삭제를 다시 허용하려면 별도 승인 아래 server-side 참조/경쟁 방지 계약을 먼저 설계해야 한다. 상세 파일·Git·테스트 보고는 docs/handoff/CURRENT_HANDOFF.md의 최신 항목을 따른다. COMMIT_READY=YES(당시 fail-closed 범위); 당시 commit/push/merge는 미수행.

## 연동 규칙 (지금은 구현하지 않음)
## 2026-11-13 시간표 관리 통합 검증 (PC 단독 검증 당시 상태)

- 통합 worktree C:\dev\\My-Web\\tmp\\codex-branches\\integration-review-timetable-management, 브랜치 codex/integration-review-timetable-management. 기능 커밋 5b4ec27, 7f72dda를 포함하며 이번 검증 뒤 문서 커밋 docs: reconcile timetable management handoff를 이 브랜치에 생성했다. main과 기능 브랜치는 변경하지 않았고 push/merge도 하지 않았다.
- main 문서 diff의 모든 추가 행을 통합본과 대조했다. main 사용자 파일 4개의 원본·보호 백업 SHA-256은 기존 manifest와 모두 일치한다. 백업: C:\dev\\_git-safety\\My-Web-main-merge-prep-20261112-221220-90082648.
- 교시 삭제는 임의 ID legacy writer와의 경쟁을 Rules/schema/Functions가 막지 못해 계속 fail-closed다. row CRUD, 교시 추가·시간 수정, set lifecycle 및 일반·학교·프로그램 호환성은 유지된다. IAM은 HOLD다.
- 통합 worktree 검증: npm test, npm run typecheck, release gate 33/33, 관리 단위 6/6, row 단위 9/9, npm run build, npm run build:admin, Browser recovery 19/19 모두 PASS.
- 두 빌드와 Browser는 demo demo-myweb-recovery-e2e 값 및 loopback Emulator만 사용했다. main firebase-config.local.js SHA-256은 실행 전후 동일하다. 운영 Firebase 접근·데이터 변경·배포·Rules/Functions/IAM 변경은 없다.
- 빌드의 classic script 및 React Router use client 경고와 Browser의 MetadataLookupWarning(ETIMEDOUT/ENOTFOUND)은 남았으나 자동 검증은 통과했다. 새 firestore-debug.log는 삭제하지 않고 보존했다(2,980행, error-level 18, warning-level 9, SHA-256 BDD1B36010C3151B3389F451C270150EF68FBC9A2A594505777745453EB2D7E5). 요청 경로/사용자 식별 정보가 없어 개별 로그 귀속은 NOT_VERIFIED다.
- origin/main은 fetch 후에도 main HEAD 1874119fa5c7a871840df6a18c071455935f1788과 같고, main에는 사용자 수정 AGENTS.md, docs/handoff/CURRENT_HANDOFF.md 및 미추적 CLOUD_HANDOFF.md, CLAUDE.md.mainpc-old가 남아 있다. 두 미추적 파일은 존재하며 통합 브랜치 .gitignore에서 ignored다.
- READY_FOR_MAIN_FF=NO: 커밋 그래프는 fast-forward 가능하지만 main tracked 문서 두 개가 미커밋이므로 이번에는 main을 이동하지 않았다. 다음 단계에서는 위 두 tracked 파일만 백업과 통합 커밋 포함 여부를 재확인한 뒤 처리한다.


- 모든 프로젝트는 다른 프로젝트 없이 단독으로 빌드, 실행, 테스트가 통과해야 한다. 연동 코드는 지금 만들지 않는다.
- 나중 연동을 위한 입구만 남긴다: 외부와 주고받는 경계(API 엔드포인트, 이벤트, 설정값)는 한 모듈에 모으고, 연동 대상 주소와 키는 .env로 분리한다. 기능 플래그가 꺼져 있으면 연동 코드는 동작하지 않는다.
- 예정된 연동은 docs/integration.md 한 파일에 적는다: 상대 프로젝트, 방향(누가 호출), 요청/응답 형태, 상태(계획/미착수/구현).
- 상대 프로젝트의 담당이 다른 AI여도 저장소는 읽기만 하고, 필요한 변경은 docs/integration.md에 요청으로 남긴다. 상대 저장소를 직접 수정하지 않는다.
- 연동 때문에 현재 프로젝트의 구조를 크게 바꾸지 않는다.

## 포맷 전 통합 인계 (2026-10-19)

- 로그인 문구 `4856347`과 시간표 row CRUD `6cb8546`은 각각 origin 작업 브랜치에 보존했다. `codex/docs-format-recovery`에서 통합·재검증하고 main에 fast-forward했다. 코드 통합 커밋 `1f3e08dcc4da9c67c8c53e962195af3c26b1908d`의 origin/main push와 원격 SHA 일치를 확인했다. 코드 충돌은 없었고 문서 충돌만 두 작업 기록을 보존해 해결했다. 현재 작업 브랜치는 main이며 문서 마무리만 수행한다.
- 포맷 후 재개는 `docs/handoff/FORMAT_RECOVERY.md` 순서를 따른다. 사용자가 2026-10-19 루트 `.env` 파일의 별도 백업 완료를 확인했다. 파일 내용/백업 위치는 조사하지 않았다. 브라우저 로컬 데이터와 Codex 개인 설정은 별도 보존 여부 미확인이다. production/deploy/IAM 작업은 재개하지 않는다.
- 통합 상태에서 로그인 회귀·시간표 단위 9/9·npm test(auth 모듈 668개)·typecheck·두 빌드·release gate 33/33·전체 browser 18/18 PASS를 2026-10-19 재확인했다. Functions/별도 전체 Rules는 재실행하지 않았다. 최종 main 반영 여부는 CURRENT_HANDOFF 최신 항목을 따른다.
- main에서도 npm test/로그인 회귀/typecheck/release gate 33/33을 재검증해 통과했다. 미커밋 기능 변경과 debug log 잔존은 없고 시간표 worktree도 원격과 동기화했다. `.env` 외부 백업 완료를 사용자가 확인했다. 브라우저 로컬 데이터·Codex 개인 설정 보존 여부는 미확인이다. 아래 10/17 이전 미커밋 문구는 과거 기록이다.

## 과거 로그인 문구 수정 인계 (2026-10-17 당시 상태)

- `codex/fix-login-copy`, 기준 HEAD `cf55bed`에서 로그인 기본 이름을 `통합 관리프로그램`으로 변경하고 초대 안내 문구의 HTML 및 동적 생성 경로를 제거했다. 기존 기본 이름은 표시 시에만 새 이름으로 처리하고 사용자 지정 이름과 저장 데이터는 보존한다. 인증 기능/Rules/의존성은 변경하지 않았다.
- `npm test` PASS. 추가 검증은 `node scripts/test-login-copy.mjs`로 실행한다. 변경은 미커밋 상태이며 stage/commit/push/merge는 수행하지 않았다. 이전 시간표 작업 worktree는 변경하지 않았다.

## 과거 시간표 인계 요약 (2026-10-17 당시 상태)

- 시간표 row/cell CRUD를 `codex/feat-app-next-timetable-row-crud`에서 이어서 구현했다. worktree는 `C:\dev\My-Web\tmp\codex-branches\feat-app-next-timetable-row-crud`, 기준 HEAD는 `cf55bedbfb6657ead3e3286fe9e231768a77a29c`다. main 작업과 stage/commit/push/merge는 하지 않았다. 변경은 로컬 unstaged/untracked 상태이며 upstream이 없어 ahead/behind는 미확인이다.
- 기존 주간 격자와 조회 normalization을 보존하고, 명시적으로 선택한 기존 set의 활성 교시에만 수업 추가/수정/단일 삭제를 연결했다. 쓰기 경로는 `workspaces/{workspaceId}/timetable`뿐이다. set/period/program 자동 생성이나 수정은 없고 기존 row ID·binding·unknown 필드는 유지한다. 문서 서버 확인과 목록 서버 재조회 뒤에만 성공을 표시한다.
- 권한은 Rules와 운영 정책의 교집합이다. system_owner/super_manager는 C/U/D, manager는 personal/academy에서만 C/U/D, teacher는 personal/academy에서만 C/U, normal은 알려진 모드에서 C/U, viewer/print_account는 조회만 가능하다. 학교 모드 manager/teacher 및 미확인 모드의 일반 역할은 fail closed 한다. 학교 제한은 클라이언트 운영 정책이며 새 서버 Rules를 추가한 것이 아니다.
- 실제 검증: 시간표 단위 9/9, npm test(auth 모듈 668개), typecheck/build/build:admin, release gate 33/33, 전체 browser recovery 18/18 PASS(기존 15개 + 시간표 3개, fail/skip/todo 0). Node 24.18.0 / JRE 21, demo Firebase와 loopback만 사용했다. desktop/mobile 캡처 및 모바일 가로 넘침 검사를 수행했다.
- 잔여 제한: 운영 화면과 mixed/legacy 표시·출력의 수동 비교, 장시간 오프라인 UX는 MANUAL_REQUIRED다. 동일 cell ID transaction은 App Next 동시 생성을 차단하지만 임의 ID를 쓰는 legacy 클라이언트와의 동시 생성 전체를 서버에서 보장하지는 않는다. 기존 npm advisory 및 IAM HOLD 유지. 상세 계약과 최종 Git 상태는 시간표 문서와 `docs/handoff/CURRENT_HANDOFF.md`를 참조한다.

- 최종 Git 검증: `git diff --check` PASS; 금지 Rules·manifest/lockfile·Functions·legacy app.js·workspaceDataService 및 Firebase 생성 설정 diff 0. Emulator/Vite 종료와 파일 잠금 해제를 확인하고 이번 firestore-debug.log를 제거했다. tracked 변경 15개 + 신규 4개가 남았으며 로그 잔존 없음. 필수 자동 검사 조건을 충족해 `COMMIT_READY`; stage/commit/push/merge는 수행하지 않았다.

## 이전 일정 CRUD 인계 기록 (2026-10-16)

- 일정 CRUD 작업: `codex/feat-app-next-schedule-crud`, worktree `tmp/codex-branches/feat-app-next-schedule-crud`, 기준 HEAD `6e1e0b9`. 시작 시 작업 트리는 깨끗했고 로컬 main/origin/main 기준도 같은 커밋이었다. 이 브랜치는 upstream이 없어 ahead/behind는 미확인이다. main 작업 및 stage/commit/push/merge는 수행하지 않았다.
- App Next 기존 `#/schedules-readonly` 경로를 유지하며 canonical 일정 CRUD를 구현했다. 활성 Rules와 legacy 기본 action 권한은 일치한다: system_owner/super_manager/manager는 생성·수정·삭제, teacher/normal은 생성·수정만 가능하며 작성자 제한은 없다. viewer/print_account는 조회만 가능하다. RequireAuth와 RequireWorkspaceRole, 서비스 preflight 및 서버 Rules로 workspace/권한 경계를 유지한다.
- `workspaces/{workspaceId}/schedules`의 운영 필드와 동일한 데이터를 쓰며 marker/별도 collection/migration은 없다. create/update는 write 후 `getDocFromServer`의 전체 편집 필드를 확인하고 delete는 서버 부재를 확인한다. 완료 문구는 목록 서버 재조회까지 통과해야 표시한다. 중복 제출 ref guard와 저장 중 수동 조회의 오래된 응답 재사용 방지를 추가했다. alternate 날짜 schema는 조회를 유지하되 자동 변환 없이 운영 화면에서 수정한다.
- 최종 검증: 전체 browser suite 15/15 PASS(기존 13개 + 일정 2개, skip/todo 0), npm test PASS(auth 모듈 659개), typecheck/build/build:admin PASS, release gate 32/32 PASS. 서비스 오류·server-confirm mismatch는 실제 서비스에 fake SDK를 넣어 deterministic하게 검증했다. 모바일 가로 넘침 검사와 desktop/mobile 캡처도 완료했다. Node 24.18.0 / Temurin JRE 21, demo project + loopback만 사용했다.
- 2026-10-16 최종 정리: Rules/Functions/의존성 manifest·lockfile 및 운영 앱 코드 diff 0, 생성 Firebase 설정 diff 0, `git diff --check` PASS. Emulator/Vite 종료와 파일 잠금 해제를 확인한 뒤 이번 `firestore-debug.log`를 삭제했다. 수정 파일 15개와 새 파일 4개가 unstaged/untracked 상태이며 stage/commit/push/merge는 하지 않았다. `COMMIT_READY`; IAM HOLD와 기존 npm advisory, 수동 비교 항목은 유지한다. 상세 내용은 `docs/handoff/CURRENT_HANDOFF.md`와 `docs/app-next-schedules-read-only-pilot.md`에 기록한다.

## 이전 공지 CRUD 인계 기록 (2026-10-15; 현재 일정 작업 상태는 위 요약 참조)

- App Next 공지 CRUD 최종 검증을 `codex/feat-app-next-core-crud` worktree에서 완료했다. Browser recovery suite `13/13 PASS`; `npm test`, `npm run typecheck`, `npm run build`, `npm run build:admin`, `git diff --check`도 통과했다. demo project와 loopback Emulator만 사용했으며 production 접근/데이터 변경/deploy/IAM/Rules/Functions/dependency 변경은 없었다.
- browser suite 실행 전 지정 포트에 stale emulator listener가 없고 locator 파일도 없었다. suite가 demo Auth/Firestore Emulator를 시작해 정상 종료했고, stale emulator 프로세스 종료는 불필요했다. 생성된 `firestore-debug.log`는 종료 및 잠금 해제 확인 후 삭제했다. 기존 `tmp/recovery-browser-emulator-debug.log`는 이번 실행 산출물이 아니어서 보존했다.
- 수정된 마지막 오류·지연 UI 테스트까지 통과했다. Firebase WebChannel 내부 confirmation read를 개별 HTTP 요청으로 차단하는 brittle E2E 주입은 제거되어 있고, 네트워크/server-confirm 오류 분류는 deterministic 유틸 테스트 경계에서 검사한다. build의 기존 Vite 비모듈 script 및 React Router `use client` 경고는 비차단 경고로 남았다.
- Git worktree 및 branch 확인: `codex/feat-app-next-core-crud`, HEAD `9bf213f`. Firebase 설정 생성 파일 diff는 없으며, 금지 파일 diff는 0이다. 상세 변경 목록은 `docs/handoff/CURRENT_HANDOFF.md`를 참조한다. commit/push/merge는 하지 않았다.
- 남은 수동 비교 항목은 운영 앱과 App Next의 legacy 공지 표시/정렬을 실제 사용자 화면 기준으로 대조하는 것이다. 브라우저 자동화 역할 및 CRUD 검증에는 남은 `MANUAL_REQUIRED`가 없다. 최종 요청 검증 조건을 충족해 `COMMIT_READY`이며, 사용자 제한에 따라 stage/commit/push/merge는 수행하지 않았다.

## 과거 인계 요약 (2026-10-12; 당시 결과는 위 최신 요약과 `docs/handoff/CURRENT_HANDOFF.md` 참조)

- 현재 별도 작업 브랜치 `codex/feat-app-next-core-crud`에서 App Next 공지 CRUD vertical slice를 구현했다. active Firestore Rules 변경 없이 기존 `workspaces/{workspaceId}/notices` 권한 계약을 사용하며, `system_owner`/`super_manager`/`manager`는 App Next 표식 공지를 관리하고 `teacher`/`normal`은 본인 공지만 관리한다. `viewer`/`print_account`는 쓰기 불가다. `RequireWorkspaceRole`, 서비스 계층, server-confirmed UI, 입력/권한/네트워크 오류 처리 및 테스트를 추가했다.
- 마지막 완료 전체 browser suite는 사용자 확인 기준 13개 중 12 PASS, 1 FAIL이다. 남은 실패는 Firestore WebChannel 내부의 confirmation read를 특정 HTTP request로 mock하려던 테스트 설계였다. E2E에서 transport 차단을 제거하고, unavailable 및 server-confirm 오류 분류를 관련 유틸에 deterministic error로 주입하는 단위 검사로 분리했다. 삭제 matcher는 완료 상태 문구를 확인한다. 제품 권한/서버 확인 코드는 수정하지 않았다. 신규 단위 검사는 통과했으나 targeted 및 전체 browser 실행은 현재 실행 컨텍스트에서 Emulator Hub 4400이 열리지 않아 테스트 본체에 도달하지 못했다. 13/13은 미확인이다. browser gate 미충족으로 전체 후속 regression/build는 실행하지 않았다. commit/push/merge는 하지 않았다.
- `.git` 연결 파일은 존재하고 `git rev-parse`는 worktree 루트를 반환하지만, 현재 실행 권한에서 `git status`/`git diff`가 `must be run in a work tree`로 실패했다. 최종 변경 목록과 금지 파일 무변경은 재확인 필요하다. `firestore-debug.log` 제거는 파일 접근 거부로 완료되지 않았다. 상세 결과는 `docs/handoff/CURRENT_HANDOFF.md`를 참조한다.

- 과거 main 상태 기록: `FULL_REGRESSION_PASS_WITH_DEPENDENCY_ADVISORIES`. 당시 코드 기준 커밋은 `6058771` (`fix: reduce firestore membership rules expression budget`)이고, 문서 갱신은 main에 커밋·푸시 완료됐다. 아래 요약은 해당 시점의 기록이다.
- Firestore Rules: membership 역할 변경 경로에서 `canUpdateMembershipRole`로 기존 역할 관리 권한과 요청 역할 부여 권한을 통합해 평가식 사용량을 줄였다. 자기 역할 변경 금지, `system_owner` 권한, 기존 역할 허용 범위를 유지했다. Rules Emulator 전체 suite `171/171 PASS`; 변경은 `main`에 반영 및 push 완료.
- 의존성 조사: `codex/dependency-audit-remediation` 결과는 main에 반영하지 않았다. root 감사 16건(높음 12, 보통 4), production-only 높은 위험 4건, Rules 도구 16건(높음 12, 보통 4), Functions 0건이다. Firebase 13/Rules Unit Testing 6 시험은 expression 한도 문제 재발과 감사 개선 부재로 철회했고, `firebase-tools` 14.23.0 하향은 critical 1건 포함 22건으로 악화되어 철회했다. 검증된 안전한 remediation은 없으며 manifest/lockfile은 기준 상태다.
- 전체 회귀: 별도 `codex/full-regression`에서 `npm test`, `npm run typecheck`, `npm run build`, `npm run build:admin` 통과, Functions 단위 테스트 `557/557`, Functions Emulator 통합 11개 흐름, Browser E2E `11/11` 통과. 최종 Rules suite `171/171 PASS`. 격리 런타임은 Node `22.23.2`/Temurin JRE 21 계열, demo project와 loopback emulator만 사용했다. 운영 Firebase 접근 및 배포는 없었다.
- 남은 작업은 npm advisory 후속 조사, 필요 시 Node 22 개발환경 정식화, 기존 수동 UI/출력 검증뿐이다. 별도 승인 전까지 IAM은 `HOLD`로 유지한다. 강제 override, major downgrade, `npm audit fix --force`는 적용하지 않았다.

## 과거 인계 요약 기록 (2026-10-11; 현재 상태는 위 요약과 `docs/handoff/CURRENT_HANDOFF.md` 참조)

- 최신 취약점 조사 후속(2026-10-10): 작업 브랜치는 `codex/dependency-investigation`, 기준 HEAD는 `eda5966a3ac62a03c730aa6915a3ad810cd8cd2a`이며 원격과 0 ahead / 0 behind다. root `firebase-admin`은 `13.6.0 → 14.5.0`, 별도 `tools/firestore-rules-tests`의 `firebase-tools`/Firebase SDK/Rules Unit Testing은 각각 `15.33.0`/`12.19.0`/`5.0.2` 계열로 갱신했다. 강제 override는 하지 않았다.
- 2026-10-11 npm 보안 레지스트리 재감사 완료: root 16건(높음 12, 보통 4), `npm audit --omit=dev` 4건(모두 높음), Rules 보조 패키지 16건(높음 12, 보통 4), Functions 0건. root 및 Rules 감사는 잔여 취약점 때문에 exit code 1로 종료했으며 레지스트리 연결/조회는 성공했다. root 감사 자동 권고는 Firebase 9.14.0, Firebase CLI 14.23.0 등 major downgrade를 제시하므로 적용하지 않았다.
- 취약점 조치: `npm audit fix`의 호환 범위 변경으로 root 및 보조 Rules 도구 감사 건수를 낮췄다. 남은 high advisory 중 `@grpc/grpc-js@1.9.16`은 Firebase Web SDK의 `@firebase/firestore@4.17.2`가 선언한 `~1.9.0` 경로이며, 보안 수정 버전은 그 범위 밖이다. `dist` 번들에는 gRPC 코드가 포함되지 않았고 Browser E2E는 통과했지만, 의존성 finding 자체는 남으며 전체 악용 불가를 증명하지 않는다. 적용 조건이 특정 서버 인증서/RBAC 구성인 두 advisory는 [GHSA-m9gg-hp2v-232j](https://github.com/advisories/GHSA-m9gg-hp2v-232j), [GHSA-f596-whhp-79r4](https://github.com/advisories/GHSA-f596-whhp-79r4)다.
- 검증: 취약점 수정 뒤 `npm test`, `npm run build`(타입 검사 포함), `npm run build:admin` 통과. 직전 후속 검증의 Firestore Rules Emulator 39/39 및 recovery Browser E2E 11/11도 통과했다. 2026-10-11 별도 `tools/firestore-rules-tests` 재실행은 체크섬 검증한 임시 Temurin JRE 21과 demo project/loopback에서 suite 본체까지 진행했지만 exit code 1이다. 사용자 프로필 및 invite 테스트 대부분은 통과하고, 기존 membership 허용 update 및 compatibility update 일부가 Firestore Rules 1,000 expression 평가 한도로 실패했다. 8083을 점유하던 이번 작업의 이전 Emulator Java 프로세스는 종료했고 기본 포트 및 임시 설정은 원복했다. 운영 Firebase 접속은 없었다.
- 변경 파일: `package.json`, `package-lock.json`, `tools/firestore-rules-tests/package.json`, `tools/firestore-rules-tests/package-lock.json`, `tools/firestore-rules-tests/tests/helpers.mjs`, `tools/firestore-rules-tests/tests/users.rules.test.mjs`, `CHANGELOG.md`, `AGENTS.md`, `docs/handoff/CURRENT_HANDOFF.md`. Emulator가 만든 `firestore-debug.log` 두 개는 미추적 상태로 남아 있어 커밋 대상이 아니다.
- 코드/의존성 조치 9개 파일은 `137c2ef` (`fix: reduce dependency audit vulnerabilities`)로 커밋되어 `origin/codex/dependency-investigation`에 푸시했다. 이어서 이 요약과 핸드오프를 푸시 결과에 맞게 갱신 중이다. 로그 두 개 외 tracked 변경은 없다.
- 현재 검토: `git diff --check` 통과. root와 Rules 보조 도구의 최상위 의존성 누락은 `npm ls --depth=0`에서 확인되지 않았다. 임시 JRE와 Emulator 프로세스는 정리했다. 로그 두 개(`firestore-debug.log`, `tools/firestore-rules-tests/firestore-debug.log`)는 테스트 산출물로 미추적 상태다. 다음 단계는 membership update 권한 규칙의 expression 비용을 분석하고 남은 advisory를 상위 SDK/CLI 호환성 단위로 분해하는 것이다. npm 감사는 재실행했으므로 레지스트리 재연결은 필요하지 않다.

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

For every meaningful development, bug-fix, refactor, security, or investigation task, use this default workflow:

1. Synchronize `main` with the latest `origin/main` before starting.
2. Do not implement, fix, refactor, or investigate directly on `main`.
3. Create a separate `codex/*` branch for each task, based on the synchronized `main`.
4. Prefer a separate Git worktree for each branch when practical.
5. Implement or investigate on the task branch/worktree.
6. Run checks appropriate to the change, such as tests, typecheck, build, Rules, Functions, or Browser validation.
7. Run `git diff --check`.
8. Do not use `git add .` or `git add -A` by default; explicitly stage only intended files.
9. Commit on the task branch and push it to `origin` as a recovery point.
10. Synchronize `main` with the latest `origin/main` again before integration.
11. Prefer `--ff-only` when merging the task branch into `main`.
12. If fast-forward is not possible, do not force it; inspect and resolve the divergence cause first.
13. Run the core regression checks again on `main` after integration.
14. Push `main` only after those checks pass.
15. Update `CURRENT_HANDOFF` and other relevant project documents to describe the final `main` state.
16. Verify the integration is present on `main` and the remote before cleaning up temporary worktrees or branches.

Branch naming recommendations:

- `codex/feat-*`
- `codex/fix-*`
- `codex/refactor-*`
- `codex/security-*`
- `codex/test-*`
- `codex/docs-*`
- `codex/investigation-*`

Investigation and experiments also use a separate branch/worktree. If they yield no source change, do not merge the experiment branch solely for that reason; integrate only the useful findings into final documentation. Keep debug/emulator logs, temporary runtimes, and generated artifacts out of commits unless intentionally required.

Never use `git reset --hard`; force push is prohibited by default. Direct pushes to `main` are limited to verified merge results and final documentation updates. Production Firebase data changes, production deployments, and IAM changes remain subject to existing approval and HOLD policies. For urgent fixes, use a `codex/fix-*` branch whenever practical.

Git operations (including fetch, branch/worktree creation, staging, commit, merge, push, and cleanup) remain subject to explicit user authorization under this repository policy. This documented workflow defines the sequence when those operations are authorized; it does not authorize destructive or force operations. The user may instead perform the Git commands themselves.

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

## 2026-11-13 audit handoff

Current audit results and decisions: `docs/dependency-audit-20261113.md`; historical zero-vulnerability counts are not current. No dependency changes in this branch.
## 2026-11-13 backend validation

Branch `codex/backend-rules-validation-20261113`, base `1874119`. PASS: Node 22 Functions 557/557, active Rules 171/171, configured teacher scope 9/9, Functions integration all 11 scripts. Added `scripts/validate-backend-local.sh` and `docs/backend-validation-20261113.md`. Component commands executed; whole wrapper not rerun. Setup failures (ADC guard, concurrent logging-port race) diagnosed and successful isolated/sequential runs completed. No product/Rules/dependency changes. IAM/production HOLD. READY_WITH_WARNINGS; next: local UI/print/offline validation in its own branch.
## 2026-11-13 UI print and offline validation

Branch `codex/ui-print-offline-20261113`, base `1874119`. Added 2 meaningful Browser cases: local legacy/App Next display/print capture and 60-second offline/reconnect. Display+runtime successful rerun 2/2; offline case passed in earlier targeted run. Whole 20-case suite NOT RUN; original 18-case baseline previously PASS. Findings: mixed-schema title missing from legacy table/report, open mobile sidebar overlay, App Next generic print includes controls/diagnostics. See `docs/testing/ui-print-offline-20261113.md`; demo artifacts in ignored tmp. Actual production comparison, hours offline and physical printing remain MANUAL_REQUIRED. No UI policy/production/IAM changes. READY_WITH_WARNINGS; next: review/fix documented parity and print issues separately.
## 2026-11-13 timetable concurrency contract review

Branch `codex/timetable-concurrency-review-20261113`, base `1874119`. Added `docs/timetable-cell-uniqueness-contract.md` and deterministic late legacy-writer characterization. Existing service can leave 2 occupants after preflight; this is evidence of the limitation, not a fix. Timetable tests 10/10 PASS and root npm test PASS (Asia/Seoul). Proposed trusted operation + server occupancy + fencing/backfill + all-writer cutover; no browser-only uniqueness claim. No product code, Rules, schema migration or deployment changed. Next: implement/review the server protocol and rollout as a separate authorized change; IAM/production HOLD. READY_WITH_WARNINGS.
## 2026-11-13 school write scope design and branch index

Branch `codex/school-scope-design-20261113`, base `1874119`. Added `docs/school-write-scope-followup-design.md` and 2 negative authority-boundary tests: manager cannot use teacher resolver; student assignment does not authorize a timetable cell. Node 22 Functions build PASS; policy tests 63/63 PASS, no fail/skip/cancel/todo. No endpoint, Rules, UI permission or production exports changed. Proposed narrow student-scoped attendance transaction first; manager delegation and timetable-specific authorization need separate explicit contracts. Added `docs/followup-branches-20261113.md` indexing all 5 independent local branches and remaining work. No push/merge/deploy/publication. READY_WITH_WARNINGS. Next: review branch results, select implementation follow-up; existing school timetable denial and IAM HOLD remain.

## 2026-11-13 integrated full validation

Branch `codex/full-validation-20261113` merges all 5 independent follow-up branches from base `1874119`. Found and fixed pre-existing manifest cache mismatch: source fix `0476483`. Final PASS: root npm test (669 auth modules), login-copy, release gate 33/33, manifest 18/18, typecheck + main/admin compile builds, Node 22 Functions unit 559/559, active Rules 171/171, configured teacher scope 9/9, candidate Rules 30/30, Functions integration 11 flows, full Browser 20/20 in one run (fail/cancel/skip/todo 0). Complete backend wrapper executed successfully. See `docs/full-validation-20261113.md`. Fresh audit findings unchanged: root 55, production-only 14, Functions 16, Rules tooling 49. Existing functional limitations/manual checks remain. All test services shut down. Conditional push authorized by user after tests; main merge/deploy/IAM/environment publication not performed. READY_WITH_WARNINGS.

## 2026-11-13 privacy-safe branch publication

All full validation checks passed. Initial atomic push rejected by GitHub GH007 (private author email); no refs accepted. Original local branches preserved without rewriting. Created 6 new codex/*-publish-20261113 branches with Codex noreply metadata and verified their initial trees match the corresponding original tested-content trees. Current branch is codex/full-validation-publish-20261113; mapping in docs/followup-branches-20261113.md. Only documentation changed afterward. Global/repository user identity was not overwritten. Retry push of publication branches follows this commit; exact remote result must be checked. Main/deploy/IAM/environment publication remain unchanged.

## 2026-11-13 remote push confirmed

GitHub accepted the atomic push of all 6 codex/*-publish-20261113 branches. Read-only git ls-remote verified each remote branch exactly matched its local commit, including integrated publication commit 0b8abe1. This final documentation commit records that confirmed result and is then pushed to the same integration branch. All original local branches/commits preserved; no force push/history rewrite/main merge/deployment/environment publication. Full validation remains PASS with documented existing vulnerabilities and manual limitations (READY_WITH_WARNINGS). Next: review codex/full-validation-publish-20261113 or choose a separately scoped remediation; GitHub remote now retains all work.

## 2026-11-13 Cloud parity hardening continuation

Latest user authorizes only codex/feat-app-next-parity-hardening commit/push from base cda1f1d; prior Cloud cancellation stays historical. Implementation148ea67: mobile sidebar, 3-route print, read-only mixed schedule display/export, schedule auto reconnect. Browser23/23 and required root/build/release/backend/Rules checks PASS; detailed limits/PC rechecks in docs/app-next-parity-hardening-handoff.md. Never relax period-delete-blocked, school scope or IAM HOLD. No main push/deploy/PC-file access.
