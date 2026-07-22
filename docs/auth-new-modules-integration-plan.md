# New Auth Modules Integration Plan

작성일: 2026-07-21

## 현재 상태

신규 인증 모듈은 `src/auth`, `src/workspace`, `src/permissions`에 독립적으로 작성되었습니다. 기존 운영 앱의 `index.html`, `app.js`, 루트 `services/`에는 연결하지 않았습니다.

## 연결 순서

### 1. React 전환 화면에서 shadow mode 검증

- 신규 `AuthProvider`를 별도 React entry 또는 내부 테스트 라우트에만 연결
- 기존 `src/context/AuthContext.tsx`는 유지
- 실제 운영 정적 앱 로그인은 유지
- 세션 warning을 콘솔 또는 개발자 화면에만 표시

### 2. 기존 AuthContext 교체 준비

- 기존 `context/AuthContext`가 수행하는 로그인/로그아웃/세션 로딩 책임 목록 작성
- 신규 `AuthProvider`의 `phase`, `session`, `error`로 매핑
- 로그인 함수에서 세션 생성 호출 제거 계획 수립
- Firestore 실패 시 자동 signOut 되는 기존 로직 제거 시나리오 작성

### 3. Guard 교체

- 기존 `RequireAuth`, `RequireWorkspaceRole`, `ProtectedRoute`를 삭제하지 않고 신규 `RouteGuard`와 병행 검증
- 화면별 필요 조건 정리
  - 인증만 필요한 화면
  - workspace가 필요한 화면
  - 특정 permission이 필요한 화면
- 충분히 검증 후 라우트별로 하나씩 교체

### 4. 데이터 마이그레이션 시점

신규 모듈 연결 전에 다음 결정이 필요합니다.

- `owner_ws_RAOf...` 최종 유지 승인
- `users.globalRole`을 `system_owner`로 동기화할지 승인
- `currentWorkspaceId`가 삭제된 workspace를 가리키는 오너 계정을 어느 workspace로 연결할지 승인
- legacy membership 정리 승인

데이터 마이그레이션은 별도 dry-run 결과를 보고 승인 후 진행합니다.

### 5. Rules 교체 시점

Firestore Rules는 신규 클라이언트 쿼리와 마이그레이션이 맞춰진 뒤 Emulator 테스트를 통과해야 교체합니다.

교체 전 확인:

- `systemOwners/{uid}` 권위 기준 반영
- `workspaces/{workspaceId}/members/{uid}` nested 기준 반영
- 일반 사용자의 self role/status/globalRole 변경 차단
- manager가 super_manager 수정 불가
- viewer/print_account 쓰기 제한

## 롤백 방법

신규 모듈은 아직 기존 운영 앱에 연결하지 않았으므로, 문제가 생기면 신규 `src/auth`, `src/workspace`, `src/permissions` import를 제거하면 됩니다.

운영 정적 앱은 다음 파일을 계속 사용합니다.

- `index.html`
- `app.js`
- 루트 `services/*.js`

따라서 이번 단계의 코드는 운영 앱에 직접 영향을 주지 않습니다.

## 아직 연결하지 않은 부분

- `app.js` 로그인 교체
- `index.html` script 변경
- 루트 `services` 변경
- 기존 `src/context/AuthContext.tsx` 교체
- 기존 Guard 삭제
- Firestore Rules 교체
- 실제 데이터 마이그레이션

