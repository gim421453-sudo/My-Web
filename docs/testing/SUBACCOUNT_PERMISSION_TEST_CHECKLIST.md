# 서브계정 권한 점검 체크리스트

## 범위와 안전 조건

- 상태: 자동 Rules/회귀 검증은 2026-09-30 PASS. 역할별 legacy UI 전체 화면 조합은 미완료다. 최종 게이트 재개 시도에서 demo Emulator와 격리 Vite 화면은 시작했으나 Computer Use 승인이 시간 초과되어 브라우저 입력은 하지 않았다. Rules Emulator `39/39`, Functions integration 11개 묶음, root `npm test`, Functions 단위 테스트 `557/557`, typecheck, build/build:admin 및 `git diff --check`의 기존 PASS 결과를 유지한다. production 연결·쓰기·배포는 없었다.
- 대상: Firebase Auth 상태, canonical `systemOwners/{uid}`, 활성 workspace membership, 프런트엔드 메뉴·액션, 직접 URL, Firestore Rules 및 trusted backend permission/scope resolver.
- production 데이터·Rules·Functions는 읽거나 변경하지 않는다. 실제 계정 대신 자동 테스트 fixture 또는 Firebase Emulator 계정만 사용한다.
- IAM은 `HOLD`이며 이번 앱 권한 점검 범위가 아니다. 새 generation, credential refresh, IAM read/write, authority store/evidence 변경을 하지 않는다.
- 계정 비밀번호·token·secret은 이 문서에 기록하지 않는다. 체크할 때도 실제 이메일 대신 fixture role과 비식별 테스트 UID를 쓴다.

## Canonical 역할 모델

| 역할 | 근거와 경계 | 메뉴/기능 기대치 |
|---|---|---|
| `system_owner` | 활성 `systemOwners/{uid}`에서만 전역 역할로 결정한다. workspace membership 역할이 아니다. | 전역 관리자 메뉴 가능. workspace 업무는 명시된 workspace가 있을 때만 접근하며 임의 workspace를 만들거나 선택한 것으로 간주하지 않는다. |
| `super_manager` | 현재 workspace의 활성 canonical membership 역할. | workspace 관리자 기능 및 낮은 역할 관리 가능. 다른 `super_manager` 부여는 불가. |
| `manager` | 현재 workspace의 활성 canonical membership 역할. | 관리자 기능 가능. `teacher`, `normal`, `viewer`, `print_account`만 부여·관리할 수 있고 manager/super_manager는 불가. |
| `teacher` | 현재 workspace의 활성 canonical membership 역할이며 데이터 작업은 별도 assignment/relationship scope가 필요하다. | 업무 화면은 정책에 따라 노출할 수 있지만, 역할만으로 전체 학생·학년 데이터를 읽거나 수정해서는 안 된다. |
| `normal` | 현재 workspace의 활성 canonical membership 역할. | 비관리자 화면만 노출. 직접 membership/role 변경은 불가. |
| `viewer` | 현재 workspace의 활성 canonical membership 역할. | 읽기 전용. 모든 membership 및 일반 데이터 쓰기는 거부되어야 한다. |
| `print_account` | 현재 workspace의 활성 canonical membership 역할. | 출력 관련 화면만 최소 노출. 일반 업무 데이터 쓰기 및 role 관리 불가. |

계정 상태 `pending`, `rejected`, `disabled`, 비활성 membership, 누락·오류 authority는 보호된 업무 화면을 허용하지 않는다. `users.role`, `users.globalRole`, localStorage 및 client-supplied role은 권한 근거가 아니다.

## 자동 점검 기록

- 역할/멤버십/초대/계정 상태의 기존 회귀 검사: `npm test` 결과를 아래 최종 실행란에 기록한다.
- Functions `permissionPolicy`는 명시적 역할 allowlist를 사용한다. `teacher`의 학생·출결·성적·기록 권한은 `assigned` scope로 이어지고, 미확인·불일치 assignment/relationship는 거부 또는 unverifiable로 처리한다.
- `resolveTeacherAssignedScope`는 active teacher membership, workspace 일치, 활성·유효기간 assignment, target 학생/반/과목 및 canonical enrollment/registry 증거를 확인한다. 이 trusted backend resolver는 현재 구형 화면의 학사 데이터 write endpoint에 연결되어 있지 않다.
- 민감 행 UI 필터는 canonical role을 사용해야 하며 레거시 프로필 role만으로 관리 권한을 부여하면 안 된다. 이 항목의 회귀 검사는 `test-school-security-role-lockdown.mjs`에 포함한다.
- `firebase.json`이 지정하는 Rules 파일은 `firestore.rules`이다. 기존 `tests/firestore/*.rules.test.mjs`는 별도 파일 `firestore.rules.next`를 로드하므로, 그 통과 결과만으로 configured Rules의 동작을 검증했다고 간주하지 않는다.
- configured `firestore.rules`는 teacher의 관리자 전용 settings 쓰기와 inactive canonical user profile의 stale active membership 접근을 거부한다. `viewer`·`print_account` 직접 쓰기, workspace 격리, teacher 민감 학사 직접 쓰기 제한도 유지한다. configured active Rules 9개, candidate workspace Rules, candidate auth Rules 합계 `39/39 PASS`.
- Browser SDK Emulator 역할별 허용·거부 schedule CRUD와 workspace B 직접 read/create/update/delete: `system_owner 9/9`, `super_manager 10/10`, `manager 12/12`, `teacher 11/11`, `normal 10/10`, `viewer 11/11`, `print_account 11/11 PASS`. pending/rejected/disabled_profile은 각 `10/10 PASS`. 기존 super_manager Auth 세션 유지 중 membership을 viewer로 바꾼 stale permission 관리자 설정 쓰기도 `permission-denied`로 차단했다.
- App Next direct URL은 system_owner의 `admin-preview`/`workspace-preview` 허용, 로그아웃 후 보호 URL의 로그인 화면 fallback을 확인했다. non-owner 역할은 두 경로 모두 기존 `owner-preview-only` release gate에서 차단되므로 해당 role guard 통과는 `NOT VERIFIED`이며 pilot 제한으로 기록한다.

## 계정별 화면·직접 URL 매트릭스

표시된 메뉴는 코드에 정의된 접근 후보이며, 실제 수동 로그인 결과는 아래 실행 칸에 별도로 기록한다. 화면 숨김은 보안 경계가 아니며 데이터 요청은 Rules/backend에서 다시 거부해야 한다.

| fixture 역할 | 대시보드·계정·공지·시간표 등 일반 화면 | 관리자 미리보기 `#/admin-preview` | workspace 미리보기 `#/workspace-preview` | 직접 URL·비활성/미승인 차단 |
|---|---|---|---|---|
| `system_owner` | 활성 session에서 허용; workspace 데이터는 선택된 canonical workspace에 한정 | 허용 | workspace가 있을 때 허용 | 미승인/비활성 계정은 차단 |
| `super_manager` | workspace 메뉴 정책 범위에서 허용 | 관리자 메뉴 정책에 따라 허용 | 허용 | 다른 workspace 및 미등록 route는 차단 |
| `manager` | workspace 메뉴 정책 범위에서 허용 | 관리자 메뉴 정책에 따라 허용 | 허용 | 다른 workspace 및 미등록 route는 차단 |
| `teacher` | teacher 메뉴 정책 범위에서 허용; 학생 데이터는 assignment scope 필수 | 차단 | 허용되나 workspace 필요 | 담당 대상 밖 direct URL/ID는 Rules/backend 거부 필요 |
| `normal` | 일반 사용자 메뉴 정책 범위에서 허용 | 차단 | 차단 | 관리자 direct URL 및 다른 workspace 차단 |
| `viewer` | 읽기 전용 메뉴 범위에서 허용 | 차단 | 차단 | 모든 쓰기·관리자 direct URL 차단 |
| `print_account` | 출력/자료/시험 일정의 제한 메뉴 | 차단 | 차단 | 일반 데이터 쓰기·관리자 direct URL 차단 |

## 데이터 CRUD 권한 표

각 cell은 수동/Emulator로 확인한 뒤 `PASS`, `FAIL`, `NOT VERIFIED`, `N/A` 중 하나와 테스트 결과 파일을 기록한다. 아래는 의도된 정책 요약이며 실행 결과가 아니다.

| 역할 | read | create | update | delete | 필수 scope |
|---|---|---|---|---|---|
| `system_owner` | system 정책·허용된 workspace 범위 | 명시적으로 허용된 관리자 작업만 | 명시적으로 허용된 관리자 작업만 | 명시적으로 허용된 관리자 작업만 | 전역 owner proof 및 대상 workspace 정책 |
| `super_manager` | 활성 workspace에서 허용된 범위 | 관리자 allowlist | 관리자 allowlist | 관리자 allowlist | canonical membership + 같은 workspace |
| `manager` | 활성 workspace에서 허용된 범위 | 하위 role/업무 allowlist | 관리 가능한 하위 role/업무 allowlist | 허용된 관리자 작업만 | canonical membership + role delegation 경계 |
| `teacher` | 허용 화면에서만, 민감 행은 소유/공개 규칙 적용 | 현재 구형 직접 경로는 거부; trusted scoped endpoint 연동 후 재평가 | 현재 구형 직접 경로는 거부; trusted scoped endpoint 연동 후 재평가 | 거부 | canonical teacher assignment + active enrollment/registry 관계 |
| `normal` | 일반 사용자에게 허용된 범위 | 자기/업무 정책에서 명시된 경우만 | 자기/업무 정책에서 명시된 경우만 | 명시된 경우만 | canonical membership 및 소유/관계 증거 |
| `viewer` | 허용된 읽기만 | 거부 | 거부 | 거부 | canonical membership + workspace 일치 |
| `print_account` | 출력 DTO/자료로 제한된 범위 | 일반 업무 데이터는 거부 | 일반 업무 데이터는 거부 | 거부 | 승인된 print DTO 범위 |

### UI·backend·Rules 대조 메모

- Functions canonical catalog와 구형 `app.js`/`shared/permissions.js`의 역할별 허용 범위가 완전히 동일하다고 가정하지 않는다. 서로 다른 경로의 허용 목록을 대조하고 미연결은 blocker로 기록한다.
- `firestore.rules.next`를 설정된 Rules와 같은 것으로 부르지 않는다. 두 파일의 teacher 민감 데이터 직접 쓰기는 모두 제한했지만, 실제 앱과 Rules/backend 간 역할 catalog 전체 정합성은 여전히 수동/Emulator 확인이 필요하다.
- Firebase Emulator 검증은 설정된 파일을 명시적으로 불러와 실행하고 production이 아닌 `demo-*` project ID만 사용한다.
- 다른 workspace, 다른 학년/반/학생 ID를 조작한 읽기·쓰기, membership 없는 요청, inactive membership, 사용자 프로필의 역할 위조를 각각 negative case로 포함한다.

## 브라우저 수동 테스트 실행란

각 행은 Emulator 전용 fixture 계정으로 로그인하고, 새 탭 direct URL 및 숨겨진 버튼의 직접 이벤트도 검사한다. 실제 비밀번호나 계정 식별자는 남기지 않는다.

| 역할 | 로그인·승인 | 허용 화면/작업 | 차단 화면/작업 | direct URL·다른 workspace | 실행 결과/증거 |
|---|---|---|---|---|---|
| `system_owner` | PASS | Browser SDK Rules 일반 데이터 CRUD PASS | system_owner 역할 자체 부여 deny PASS | workspace B 직접 CRUD 허용; App Next 두 direct preview 허용 | demo Emulator Browser, 2026-09-30 |
| `super_manager` | PASS | Browser SDK Rules 허용 CRUD PASS | systemOwners 및 system_owner 역할 grant deny PASS | workspace B 직접 CRUD deny; App Next URL은 owner-preview-only 차단 | demo Emulator Browser, 2026-09-30 |
| `manager` | PASS | Browser SDK Rules 허용 CRUD PASS | 상위 super_manager 수정·삭제와 systemOwners write deny PASS | workspace B 직접 CRUD deny; App Next URL은 owner-preview-only 차단 | demo Emulator Browser, 2026-09-30 |
| `teacher` | PASS | Browser SDK Rules schedule create/update PASS | delete, 비담당 attendance read/write, settings write deny PASS | workspace B 직접 CRUD deny; App Next URL은 owner-preview-only 차단 | demo Emulator Browser, 2026-09-30 |
| `normal` | PASS | Browser SDK Rules schedule create/update PASS | delete, 자기 role 승격 및 관리자 settings write deny PASS | workspace B 직접 CRUD deny; App Next URL은 owner-preview-only 차단 | demo Emulator Browser, 2026-09-30 |
| `viewer` | PASS | 동일 workspace 일반 데이터 read PASS | schedule/notice/settings create/update/delete deny PASS | workspace B 직접 CRUD deny; App Next URL은 owner-preview-only 차단 | demo Emulator Browser, 2026-09-30 |
| `print_account` | PASS | 동일 workspace 일반 데이터 read PASS | schedule/notice/settings create/update/delete deny PASS | workspace B 직접 CRUD deny; App Next URL은 owner-preview-only 차단 | demo Emulator Browser, 2026-09-30 |
| `pending` / `rejected` / `disabled_profile` | PASS 로그인 | 보호 workspace read deny PASS | active membership의 schedule create/update/delete deny PASS | App Next 계정 상태 화면 fallback | demo Emulator Browser, 2026-09-30 |
| `disabled_auth` | Auth 로그인 차단 | N/A | `auth/user-disabled` 확인 | N/A | demo Auth Emulator, 2026-09-30 |

### 2026-09-30 후속 브라우저 점검

- PowerShell 기본 `java -version`은 OpenJDK 21.0.12.1 LTS를 확인했다. 사용자 제공 `JAVA_HOME` 경로의 Temurin Java 21도 실행했고, Firebase CLI가 Java child process를 spawn하여 `demo-myweb-browser` Auth/Firestore Emulator를 loopback `127.0.0.1:9399`/`127.0.0.1:8384`에서 기동했다. 시스템 환경변수는 변경하지 않았다.
- active Rules에서 `settings` 공통 write allowlist 누락으로 teacher가 관리자 설정을 만들 수 있고, `users/{uid}` 비활성 상태가 active membership을 무효화하지 않는 결함을 재현했다. `firestore.rules`에서 settings를 공통 allowlist에서 제외하고 canonical user profile의 active 상태를 workspace/system-owner 권한의 계정 상태 전제로 추가했다.
- Browser SDK Rules matrix: `system_owner 9/9`, `super_manager 10/10`, `manager 12/12`, `teacher 11/11`, `normal 10/10`, `viewer 11/11`, `print_account 11/11 PASS`. non-owner workspace B direct CRUD는 모두 `permission-denied`; canonical system_owner의 교차 workspace 경로는 허용됐다.
- pending/rejected/disabled_profile은 active membership이 남아도 보호 workspace read/write가 거부되고 각 `10/10 PASS`; Auth-disabled 계정은 `auth/user-disabled`로 로그인 차단됐다. super_manager 세션을 유지한 채 nested role을 viewer로 강등한 뒤 관리자 설정 write가 `permission-denied`로 차단됐다.
- App Next direct URL: system_owner의 `admin-preview`와 `workspace-preview`는 `accessAllowed=true`; 로그아웃 후 direct protected URL은 로그인 화면 및 `signed-out` fallback을 보였다. 다른 여섯 활성 role은 둘 다 `owner-preview-only` release gate로 차단되어 role guard 자체는 미검증이다.
- 임시 Vite harness의 로그인과 역할별 화면을 확인했다. `system_owner` 전체 CRUD, `super_manager`/`normal` 생성, `manager` 목록·상세, `teacher` 목록·상세 및 일반 일정 수정, `viewer` 읽기 전용 UI, `print_account` 전용 출력 UI를 확인했다. 역할 전환마다 로그아웃 후 새 역할로 로그인했고, 로그아웃 때 로그인 화면 복귀를 확인했다.
- `startCurrentUserRealtimeV50`에서 선언되지 않은 `previousRole`을 참조하는 `ReferenceError`를 발견해 콜백 진입 때 이전 역할을 캡처하도록 `app.js`를 보정했다. 기존 탭은 이전 스크립트 오류를 계속 보여 주었지만, 별도 localhost 포트의 최신 수정본에서는 teacher 로그인 후 같은 오류가 기록되지 않았다.
- 이전 UI 흐름의 역할별 목록·상세 일부 결과는 유지한다. 이번 추가 Browser SDK 검증은 direct Rules read/CRUD 권한을 대상으로 하며, 모든 legacy UI list/detail/CRUD 조합을 새로 확인한 것으로 확대 해석하지 않는다.
- 최종 회귀: root `npm test` PASS (격리 7/7, 역할 보안 86개, 인증 보안 22/22 및 adapters/auth/timetable), `npm --prefix functions test` 557/557, Functions Emulator integration 11개 묶음 PASS, typecheck PASS, build/build:admin PASS, active/candidate Rules 총 39/39 PASS, `git diff --check` PASS. 빌드의 비모듈 script/sourcemap/chunk size 경고는 유지됐다.
- Emulator는 demo project와 loopback만 사용했다. 임시 harness/config/log와 Emulator/Vite 프로세스를 정리했다. production 프로젝트·데이터에 연결하지 않았다.

### 2026-09-30 최종 게이트 재개 시도

- `demo-myweb-final-gate`의 Auth/Firestore Emulator와 합성 7-role fixture, 임시 Vite 화면을 loopback에서 시작했다. Firebase CLI의 Java spawn과 Vite/esbuild 자식 실행은 샌드박스에서 `EPERM`을 반환했으며 승인된 격상 실행 후 시작됐다.
- 실제 화면 입력은 Computer Use 창 선택 단계의 `Computer Use app approval timed out`로 막혔다. 로그인, CRUD, direct URL 역할 입력 및 logout을 이 시도에서 실행하지 않았으며, 이전 partial 결과를 전 역할 UI 통과로 확대하지 않는다.
- 임시 설정/seeder/Vite config/debug log는 제거했고 두 서버를 종료했다. 이번 재개 시도에서 테스트 스위트는 재실행하지 않았다. UI matrix 완료와 최종 commit gate는 계속 보류한다.

## 완료 판정

- [x] 역할별 Browser SDK Rules 자동 정책 검사 PASS (총 74/74 역할별 assertions)
- [x] configured active, candidate workspace 및 candidate auth Rules Emulator 회귀 `39/39 PASS`
- [ ] 메뉴·버튼과 direct URL이 역할 정책에 일치 (App Next owner-preview 경로만 검증; non-owner role guard는 release gate에 가려 미검증)
- [ ] teacher 담당/비담당 student, class, subject 및 workspace negative cases PASS
- [ ] manager/super_manager/system_owner delegation 경계 PASS
- [x] 비활성·미승인 사용자 프로필의 stale active membership workspace 권한 거부 PASS
- [x] 실제 브라우저에서 역할별 direct Rules CRUD, workspace 격리, 계정 상태, stale role 권한 및 로그아웃을 확인; UI 전 역할 CRUD와 App Next non-owner role guard 제한은 위에 별도 기록
- [x] IAM HOLD 유지; production 배포/데이터 변경 없음

### 2026-09-30 최종 headless Browser 검증 보충

- [x] Headless Playwright legacy UI recovery 검증: `npm run test:recovery:browser` — `11/11 PASS`; demo project와 loopback Auth/Firestore Emulator/Vite만 사용했다.
- [x] 일곱 역할의 로그인, schedule 목록·상세, 역할별 생성 버튼 권한 및 허용된 생성, workspace 격리, 로그아웃을 확인했다. `print_account`는 출력 전용 UI에 머무르고, pending/rejected/disabled 계정은 fail-closed였다.
- [x] 관리자에서 viewer로 로그아웃 전환 후 관리자 메뉴/생성 권한이 잔류하지 않음을 확인했다. App Next signed-out direct URL fallback 및 manager 차단/system_owner 허용도 검사했다.
- [x] 외부 요청은 Browser route에서 차단하고, Firebase compat SDK는 로컬 설치본을 사용했다. production 접근·write·배포는 없었다.
- [x] 같은 최종 회귀의 configured active/candidate Rules `39/39`, root `npm test`, Functions unit `557/557`, typecheck, build, build:admin, JavaScript 구문 검사 및 `git diff --check`는 PASS다. root lint script는 없다.
- [x] Functions Emulator integration: 동일 demo config/fixture/loopback ports에서 지원 Node 22.23.2로 `11/11 PASS`. Node 24.16.0은 health 및 앞의 9개 흐름 통과 후 `registryEnrollmentMutation` assertion으로 실패했으며, `functions/package.json`은 Node 22를 요구한다. 판정: `NODE_RUNTIME_ENVIRONMENT_MISMATCH`; 제품 code/security guard 변경 없음.
- [x] Functions worker의 `MYWEB_TRUSTED_BACKEND_MODE=emulator` 요구를 확인했다. Firebase CLI는 상위 process 임의 env를 worker로 전달하지 않으므로 emulator용 `functions/.env.local` 또는 동등한 function env 설정이 필요하다. 비교에서는 이 값을 양 runtime에 똑같이 적용했다.
- [x] `TypeError: fetch failed` 로그는 Firebase CLI의 optional VS Code SQL Connect notification endpoint에서 발생한 non-fatal 경고였다. corrected A/B에서는 function discovery 응답과 health route 초기화가 성공했고 404는 재현되지 않았다.
- 참고: 별도 Browser SDK role matrix `74/74` 및 이번 configured/candidate Rules `39/39`, headless UI `11/11`은 PASS다. 모든 role별 UI 수정·삭제 조합은 headless test가 주장하지 않는다. 실제 화면 크기/인쇄 외관만 `MANUAL_CHECK_REQUIRED`이며, 지원 UI가 없는 role×CRUD 조합은 `NOT_APPLICABLE`이다.
- 보조 4-profile candidate runner는 전용 `firebase-tools` 실행 파일 누락으로 preflight 실패했다. 루트 CLI 재시도는 helper의 고정 port 8085 시작 실패로 `NOT VERIFIED`; 필수 Rules suite/matrix 결과와 구분한다.
