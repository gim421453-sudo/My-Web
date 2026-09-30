# 감사 전 CURRENT_HANDOFF 기록

이 파일은 2026-09-27 cross-project recovery audit 시작 직전의 `docs/handoff/CURRENT_HANDOFF.md` 본문을 보존한다. 당시 검증 상태는 역사 기록이며, 현재 사실은 최신 `docs/handoff/CURRENT_HANDOFF.md`를 기준으로 한다.

# MY WEB 현재 작업 인계

Last updated: 2026-09-27 (Asia/Seoul)
Status: READY_WITH_WARNINGS

## 프로젝트 및 복구 기준

- 저장소 루트: `C:/Users/USER/Documents/My Web`
- 프로젝트: `personal-management-webapp` (`My-Web`)
- 브랜치: `checkpoint/notice-auth-recovery-20260723`
- HEAD: `392a72110009d0f9ad3dbeff585416adbd542133`
- upstream: `origin/checkpoint/notice-auth-recovery-20260723`, 로컬 ahead 0 / behind 0. 이번 작업에서 fetch하지 않았으므로 원격 최신성은 `NOT VERIFIED`.
- 설정 버전: 루트 `package.json` `1.0.0`, Functions `package.json` `0.1.0`. 릴리스·배포 완료를 뜻하지 않음.
- 복구 배경: fresh clone 기준으로 정상 개발 변경만 선별 복원된 상태를 검증했다. 이전 handoff의 HEAD `1446252...`, 18개 문서 변경, "소스 변경 없음" 기록은 현재 checkout과 일치하지 않아 폐기한다.

## 현재 phase 및 구현 상태

- phase: 역할·권한 복구 검증 완료, Emulator/브라우저 동적 검증 대기.
- 기존 앱: `index.html`, `app.js`, `services/`, `shared/` 기반 브라우저 앱과 `app-next.html`, `src/` React/TypeScript 화면이 공존하며 점진 통합 중.
- canonical 권한 모델: 전역 `system_owner`는 활성 `systemOwners/{uid}`로만 판정하며 workspace role이 아니다. workspace role은 활성 canonical `workspaces/{workspaceId}/members/{uid}`의 `super_manager`, `manager`, `teacher`, `normal`, `viewer`, `print_account`만 사용한다.
- trusted backend: explicit permission allowlist, canonical membership, assignment/registry/enrollment scope resolver를 포함한다. `TRUSTED_BACKEND_AUTHORITY_ENABLED` 기본값은 OFF이며 production transport/export/cutover는 완료되지 않았다.
- teacher: resolver는 담당 assignment와 대상 relationship을 fail-closed로 확인하지만, 구형 학사 write 경로에 연결되어 있지 않다. 따라서 민감 학사 데이터의 교사 직접 client write와 UI 편집은 차단 상태를 유지한다.

## 보존된 정상 개발 변경

다음은 복구 대상 7개 경로와 실제 Git 상태가 일치한 변경이며 보존한다.

1. `app.js`: 민감 행 필터의 privileged/teacher 판정이 raw profile role이 아닌 `effectiveMenuRoleV59` canonical resolver를 사용한다. teacher의 민감 학사 편집 action은 trusted assigned-scope write 경로가 없을 때 숨긴다.
2. `docs/testing/SUBACCOUNT_PERMISSION_TEST_CHECKLIST.md`: 7개 역할, route/UI/CRUD, scope negative case, Emulator 및 브라우저 수동 검증 범위를 문서화한다.
3. `firestore.rules`: active Rules. 교사의 민감 학사 직접 write를 차단한다.
4. `firestore.rules.next`: candidate Rules. 활성 Rules가 아니며 별도 migration/cutover 검토 대상이다.
5. `scripts/test-school-security-role-lockdown.mjs`: canonical role, teacher write gate, active Rules 정적 회귀를 검사한다.
6. `tests/firestore/configured-rules.teacher-scope.test.mjs`: `firebase.json`이 지정하는 active Rules를 직접 로드하는 Emulator 테스트다.
7. `tests/firestore/workspace.rules.test.mjs`: candidate Rules 테스트이며 안전한 `demo-*` project ID를 사용한다.

## 이번 작업에서 수정한 사항

- `firestore.rules`: `viewer`와 `print_account`가 generic workspace write 경로를 직접 호출해 쓰는 것을 차단했다. 또한 request payload의 `workspaceId` 또는 `workspace_id`가 URL workspace 경로와 다르면 거부한다. `system_owner`, 관리자, 기존 `teacher`/`normal` 일반 업무 정책은 임의로 재설계하지 않았다.
- `scripts/test-school-security-role-lockdown.mjs`: 읽기 전용 역할 직접 write 차단과 workspace payload 경로 일치 정적 회귀를 추가했다. 현재 보안 규칙 정적 검사는 86개다.
- `tests/firestore/workspace.rules.test.mjs`: candidate Rules의 test project ID를 `demo-myweb-workspace-rules`로 변경했다.
- `docs/handoffs/archive-2026-07-09-CODEX_HANDOFF_now_backup.md`: 현재 참조되지 않는 다른 프로젝트 경로가 다수 섞인 과거 보관 인계 문서를 제거했다. 기능 소스·정상 개발 변경은 삭제하지 않았다.
- `AGENTS.md`, `CHATGPT_PROJECT_INSTRUCTIONS.md`: 현재 Git 저장소 루트 밖과 sibling repository에 자동 접근·수정하지 않는 경계를 명시했다.
- `README.md`, `CHANGELOG.md`, `docs/deployment/DEPLOYMENT.md`, `docs/testing/SUBACCOUNT_PERMISSION_TEST_CHECKLIST.md`: 현재 권한 변경과 검증 결과를 반영했다. `DEVLOG_AUTO_UPDATE=false`를 유지하며 개발일지는 수정하지 않았다.

## 권한 및 Firestore Rules 감사

- PASS: UI의 민감 행 필터는 canonical 역할을 사용하며 profile `role`만으로 privileged/teacher 권한을 주지 않는다.
- PASS: active Rules의 canonical nested membership 권한 원천, role grant hierarchy, membership immutable fields/allowlist, legacy membership read-only 처리, system owner registry 판정을 정적 회귀로 확인했다.
- PASS: 교사의 민감 컬렉션 create/update는 role만으로 통과하지 않으며, teacher-created row로 위장한 update도 active Rules 회귀 테스트에 포함된다.
- PASS: active generic Rules write는 `viewer`/`print_account`를 차단하고 payload workspace 경로 일치를 요구한다.
- PASS: candidate Rules와 active Rules의 teacher 민감 직접 write 차단 테스트를 준비했다.
- KNOWN ISSUE (Medium): legacy active Rules, candidate Rules, legacy UI 메뉴/action 목록, Functions permission catalog는 완전히 동일한 세부 권한 매트릭스가 아니다. 예를 들어 일반 업무 컬렉션의 teacher/normal write 범위는 cutover 전 정책 대조가 더 필요하다. 현재 기능을 깨지 않기 위해 이 작업에서 일괄 통합하지 않았다.
- KNOWN ISSUE (Medium): trusted assignment-scope resolver가 레거시 academic write endpoint에 아직 연결되지 않았다. fail-closed 제약을 유지한다.

## 검증 결과

- `npm install --ignore-scripts`: PASS — 기존 lockfile 의존성 복구, audit 결과 0 취약점.
- `npm run typecheck`: PASS.
- `npm test`: PASS — app target isolation 7/7, security role-lockdown 86, auth security 22/22, trusted backend client adapter 128/128, auth modules 및 timetable/notice stability 검사 통과.
- `npm run build`: PASS — 루트 `dist` 생성. Vite의 non-module script 및 큰 chunk 경고는 출력됐으나 build 실패는 아님.
- `npm --prefix functions install --ignore-scripts`: PASS — lockfile 의존성 복구. Node.js 22 선언 대비 현재 Node.js 24.16.0 `EBADENGINE` 경고가 있었음.
- `npm --prefix functions test`: PASS — 557/557. 설치 후 audit은 moderate 취약점 7개를 보고했으며, 상세 triage/upgrade는 이번 범위에서 수행하지 않았다.
- `firebase emulators:exec --only firestore --config firebase.rules-test.json --project demo-myweb-rules-audit ...`: `BLOCKED_BY_ENVIRONMENT` — `java -version`을 실행할 수 없어 Firestore Emulator를 시작하지 못했다. production 연결·쓰기·배포는 수행하지 않았다.
- 런타임 smoke: localhost Vite에서 `/` 및 `/app-next.html`이 각각 HTTP 200으로 응답했다. 실제 로그인, role별 화면, direct route, console/network, Firebase permission-denied는 실제 계정 또는 Emulator가 필요해 `BLOCKED_BY_ENVIRONMENT`.
- lint: `NOT AVAILABLE` — 루트 `package.json`에 lint script 없음.
- `git diff --check`: PASS.

## 버그 분류

- Critical: 0
- High: 2 수정됨 — 읽기 전용 `viewer`/`print_account`의 active generic workspace write 가능성, payload workspace 식별자와 URL 경로 불일치 허용 가능성.
- Medium: 2 알려짐 — Rules/UI/Functions 세부 권한 catalog drift, trusted assignment-scope write endpoint 미연결.
- Low: 0

## 환경, production 및 IAM

- Firebase Hosting은 `dist`를 public directory로, active Firestore Rules는 `firestore.rules`로 설정한다. Functions source/export는 루트 `firebase.json`에 설정되지 않았다.
- `dist-admin`은 존재하지만 당시 세션에서 재빌드하지 않았다. 어느 산출물도 production 배포 증거가 아니다.
- production Hosting/Functions/Rules 배포, Firestore production write, 실제 사용자 데이터 변경, billing, migration, CI/CD, domain, rollback은 `NOT VERIFIED`이며 수행하지 않았다.
- IAM은 `docs/IAM_HOLD_STATUS.md`에 따라 `HOLD`. authority store/evidence, IAM API, credential refresh, IAM mutation은 수행하지 않는다.
- Rules 동적 검증을 재개하려면 로컬 Java를 PATH에서 사용할 수 있어야 한다. 테스트는 `demo-*` project ID와 Emulator만 사용한다.

## Git 및 작업 트리

- 당시 미커밋 변경: `app.js`, `firestore.rules`, `firestore.rules.next`, `scripts/test-school-security-role-lockdown.mjs`, `tests/firestore/workspace.rules.test.mjs`, `docs/testing/SUBACCOUNT_PERMISSION_TEST_CHECKLIST.md`, `tests/firestore/configured-rules.teacher-scope.test.mjs`, 이 handoff 및 문서/지침 변경, 그리고 위 보관 handoff 삭제.
- 당시 staged 변경: 없음.
- Git add/commit/push/pull/fetch/merge/rebase/switch/checkout/reset/clean/stash/remote 변경: 수행하지 않음.
- 다른 프로젝트를 읽거나 수정하지 않았다. 현재 저장소에서 발견된 cross-project 보관 문서만 제거했다.

## 반복하지 않을 사항

- 현재 PASS된 root/Functions/typecheck/build 검사를 변경 영향이 없으면 처음부터 반복하지 않는다.
- `firestore.rules.next`를 active Rules로 간주하거나 배포하지 않는다.
- Emulator가 없는 상태에서 Rules 동적 PASS를 주장하지 않는다.
- `dist`/`dist-admin` 존재만으로 최신 production 배포를 주장하지 않는다.
- 기존 미커밋 정상 개발 변경을 삭제·초기화·되돌리거나 임의로 stage하지 않는다.
- `DEVLOG_AUTO_UPDATE=false` 상태에서 개발일지를 만들거나 수정하지 않는다.

## 당시 다음 정확한 작업

Java가 준비된 로컬 환경에서 `firebase.rules-test.json`으로 Firestore Emulator를 실행해 active `firestore.rules`와 candidate `firestore.rules.next`의 teacher/reader/workspace isolation CRUD 테스트를 통과시키고, 결과를 checklist에 기록한다.

## 당시 추가 다음 작업

1. Emulator 통과 뒤 비운영 fixture로 7개 역할의 로그인·메뉴·직접 URL·다른 workspace·쓰기 거부를 수동 검증한다.
2. 별도 범위 작업으로 legacy UI, active Rules, candidate Rules, Functions permission catalog의 차이를 수집하고, assignment-scope trusted write endpoint 연결 계획을 검토한다.
3. production 전환·Rules/Functions 배포·migration은 별도 승인과 runbook 없이는 시작하지 않는다.

## 당시 Cross-device readiness

`READY_WITH_WARNINGS` — 정상 개발 변경과 당시 수정·문서화 상태가 checkout에 맞게 기록되었다. Emulator 동적 검증, 실제 role별 브라우저 검증 및 세부 catalog 정합성은 남아 있다. 미커밋 변경은 사용자 Git 절차로 동기화해야 다른 기기에서 그대로 이어갈 수 있다.
