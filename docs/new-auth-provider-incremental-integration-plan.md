# 신규 AuthProvider 점진 통합 계획

작성일: 2026-07-21

## 전제

사용자 보고 기준으로 P0/P1 브라우저 회귀 테스트가 완료되었다. 이번 계획은 통과한 P0/P1 안정화 범위만 다음 단계의 전제로 삼는다.

- 기존 운영 앱 `index.html` + `app.js` 로그인은 아직 교체하지 않는다.
- Firebase 데이터 수정, Firestore Rules 배포, workspace/membership 마이그레이션은 하지 않는다.
- 신규 `AuthProvider`는 운영 화면이 아니라 개발 전용 또는 비중요 React 화면에서만 실제 상태 공급자로 사용한다.
- Shadow Mode는 유지하며, 신규 세션과 기존 세션 비교 결과를 경고/차단 기준으로 활용한다.

## 1. 첫 통합 대상 화면 후보

1순위: `owner-admin-diagnostics.html`

- React entry: `src/dev-diagnostics/main.tsx`
- 화면 컴포넌트: `src/dev-diagnostics/OwnerAdminDiagnosticsApp.tsx`
- 목적: 오너/관리자 화면 버그 수집, Shadow 결과 확인, 안전한 진단 요약 생성

2순위 후보: `shadow-auth-test.html`

- React entry: `src/dev-shadow/main.tsx`
- 화면 컴포넌트: `src/dev-shadow/ShadowAuthTestApp.tsx`
- 목적: 신규 세션과 기존 레거시 세션 비교 검증

## 2. 선택 이유

`owner-admin-diagnostics.html`을 첫 대상으로 선택한다.

- 운영 앱의 메뉴, 데이터 CRUD, 로그인 폼을 건드리지 않는다.
- 이미 개발 전용 진단 화면이라 실패해도 운영 사용자의 주요 흐름을 막지 않는다.
- 현재 직접 `onAuthStateChanged(auth, ...)`를 사용하므로 신규 `AuthProvider`와 비교하기 쉽다.
- Shadow 결과, 기존 role/currentRole/workspaceRole, 신규 AppSession 역할을 한 화면에서 수집할 수 있다.
- P0/P1 회귀 테스트 이후 남은 위험을 “로그아웃/권한 꼬임”이 아니라 진단 화면에서 먼저 관찰할 수 있다.

## 3. 기존 AuthContext와 신규 AuthProvider 병행 방식

1. 기존 `src/context/AuthContext.tsx`는 그대로 둔다.
2. 신규 `src/auth/AuthProvider.tsx`는 `owner-admin-diagnostics.html` entry 안에서만 감싼다.
3. 기존 운영 앱 `index.html`, `app.js`, 루트 `services/*.js`는 변경하지 않는다.
4. `OwnerAdminDiagnosticsApp`은 다음 두 값을 동시에 보여준다.
   - 기존 Firebase/Legacy snapshot: `readLegacySessionSnapshot`
   - 신규 AuthProvider session: `useAuth().session`
5. 기존 직접 `onAuthStateChanged` 경로는 fallback으로 유지한다.
6. 신규 세션 로딩 실패가 기존 진단 화면 전체 실패가 되지 않도록 `SessionWarning` 영역에만 표시한다.

## 4. 롤백 스위치

권장 스위치:

- 환경변수: `VITE_ENABLE_NEW_AUTH_PROVIDER_DIAGNOSTICS=true`
- URL query switch: `?newAuth=on` / `?newAuth=off`

동작:

- 스위치 off: 기존 `OwnerAdminDiagnosticsApp`의 직접 Firebase 상태 읽기만 사용
- 스위치 on: `<AuthProvider>`로 감싼 `OwnerAdminDiagnosticsApp`에서 `useAuth()` 병행 표시

롤백 방법:

1. `.env`에서 `VITE_ENABLE_NEW_AUTH_PROVIDER_DIAGNOSTICS` 제거 또는 `false`
2. 또는 URL에 `?newAuth=off`를 붙여 즉시 비활성화
3. dev 서버 재시작
4. 기존 진단 화면이 직접 Firebase auth 상태만 사용하도록 복귀

## 5. 기존 세션과 신규 세션 불일치 처리

불일치가 발생해도 자동 로그아웃하지 않는다.

표시 기준:

- `uid` 불일치: critical, 신규 Provider 결과를 운영 교체 후보에서 제외
- `globalRole` 불일치: warning, `systemOwners/{uid}` fallback이면 로그인 유지
- `currentWorkspaceId` 불일치: warning, 신규 세션은 존재하는 workspace만 current로 인정
- `workspaceRole` 불일치: warning, nested member 기준 role을 우선 표시
- 기존은 authenticated, 신규는 error: critical, 해당 계정은 통합 대상 제외
- 신규은 authenticated, 기존 legacy snapshot 없음: warning, dev 화면에서만 계속 표시

기록 항목:

- legacy role/currentRole/workspaceRole
- new globalRole/currentWorkspaceRole
- status
- currentWorkspaceId
- warning code
- hasCriticalMismatch

## 6. currentWorkspaceId null 처리

신규 AuthProvider는 `currentWorkspaceId === null`을 로그인 실패로 처리하지 않는다.

상태 처리:

- `status !== active`: account action 화면/진단 경고
- `status === active && currentWorkspaceId === null`: `workspace-unlinked` 상태 표시
- workspace 없는 상태에서는 workspace 데이터 쿼리 실행 금지
- system_owner가 workspace 없이 로그인한 경우에는 전역 관리자 진단은 허용하되 workspace 작업은 비활성 표시

## 7. system_owner 처리

신규 모듈 기준:

- `systemOwners/{uid}` 문서가 있으면 `session.globalRole = "system_owner"`
- `users.globalRole !== "system_owner"`이면 `GLOBAL_ROLE_MISMATCH` warning
- 레거시 `users.role/currentRole/workspaceRole === "system_owner"`는 warning으로만 표시
- `currentWorkspaceId`가 삭제된 workspace를 가리켜도 system_owner 로그인은 유지
- 유효한 owner workspace를 명시 선택하면 nested member role `super_manager`를 workspace role로 표시

금지:

- 이 단계에서 `users.globalRole`, `currentWorkspaceId`, nested member 문서를 자동 수정하지 않는다.

## 8. Guard 교체 범위

이번 단계에서는 운영 라우트 Guard를 교체하지 않는다.

허용 범위:

- `owner-admin-diagnostics.html` 내부에서만 신규 `AuthProvider` 사용
- 필요 시 개발 전용 `DiagnosticsGuard`만 추가
- `RouteGuard`는 아직 운영 라우트에 연결하지 않음

아직 교체 금지:

- `index.html` 로그인
- `app.js` 로그인/세션 복원
- 기존 `RequireAuth`
- 기존 `RequireWorkspaceRole`
- 기존 `src/context/AuthContext`
- Firestore Rules

## 9. 테스트 항목

개발 전용 화면 기준:

1. `owner-admin-diagnostics.html` 스위치 off 진입
2. `owner-admin-diagnostics.html?newAuthProvider=1` 스위치 on 진입
3. 기존 앱 로그인 상태 유지 확인
4. 신규 `useAuth().phase`가 `authenticated` 또는 예상 상태로 표시
5. system_owner 계정에서 `globalRole = system_owner` 표시
6. 레거시 불일치가 warning으로만 표시
7. `hasCriticalMismatch = false`인 계정은 진단 화면 유지
8. `currentWorkspaceId = null` 또는 삭제 workspace 참조 시 workspace 데이터 쿼리 미실행
9. pending/rejected/disabled 계정은 보호 데이터 쿼리 없이 상태만 표시
10. 새로고침 후 기존 운영 앱 자동 로그아웃 없음
11. 로그아웃 후 진단 화면이 signed_out 표시
12. `permission-denied` 발생 시 경로와 session snapshot을 마스킹해 표시
13. Network에서 Firestore write 요청 없음
14. P0/P1 운영 화면 재진입 확인
15. `npm.cmd run typecheck`
16. `npm.cmd test`
17. `npm.cmd run build`

## 10. 실제 app.js 교체 전 남은 조건

다음 조건을 모두 만족하기 전에는 `app.js` 로그인 전체 교체를 진행하지 않는다.

- system_owner, super_manager, manager, teacher, normal, viewer, print_account 각각 Shadow critical 없음
- 승인 대기/pending 계정이 보호 데이터 쿼리를 실행하지 않음
- `currentWorkspaceId null` 계정의 로그인 유지 및 안내 표시 검증
- 동일 계정 새로고침/브라우저 재시작/로그아웃 후 재로그인 검증
- A 계정에서 B 계정으로 빠르게 전환해도 이전 세션 결과가 덮어쓰지 않음
- 기존 P0/P1 기능 회귀 없음
- Firestore Rules 후보가 Emulator 테스트를 통과
- 데이터 정규화 dry-run 결과 검토 완료
- legacy membership 정리 승인 완료
- rollback switch로 즉시 기존 로그인으로 복귀 가능

## 다음 실행 제안

1. `owner-admin-diagnostics.html` entry에만 신규 `AuthProvider`를 optional wrapper로 추가한다.
2. `OwnerAdminDiagnosticsApp`에 `useAuth()` 세션 표시 영역을 추가한다.
3. 스위치 off/on 각각 같은 계정으로 비교한다.
4. critical mismatch가 없을 때만 다음 비중요 React 화면으로 확장한다.
