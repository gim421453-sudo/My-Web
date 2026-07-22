# 3단계 3차 통합: 첫 기존 React 화면 신규 AuthProvider 제한 적용

## 대상 화면

- `shadow-auth-test.html`
- React 진입점: `src/dev-shadow/main.tsx`
- 기존 화면: `src/dev-shadow/ShadowAuthTestApp.tsx`
- 신규 모드 화면: `src/dev-shadow/FirstReactScreenAuthPanel.tsx`

## 선택 이유

이 화면은 이미 존재하는 개발 전용 React/TypeScript 화면이며, 운영 앱의 `index.html`, `app.js`, 루트 `services/*`와 분리되어 있습니다. 기존 동작도 Firebase Auth와 legacy session snapshot을 읽고 비교하는 용도라서 사용자 데이터 저장, 삭제, 승인, 설정 변경 같은 쓰기 기능이 없습니다.

로그인 화면, 사용자 관리, 워크스페이스 관리, 시간표, 방과후/동아리/특강, 공지 작성, 시스템 설정은 이번 단계 대상에서 제외했습니다.

## 기존 인증 의존성

기존 `ShadowAuthTestApp`은 다음 값을 직접 읽습니다.

- Firebase Auth `onAuthStateChanged`
- `auth.currentUser`
- 개발 환경에서만 legacy session snapshot
- 신규 shadow comparison repository

기능 플래그가 꺼져 있으면 이 기존 화면을 그대로 렌더합니다.

## 신규 Provider 사용 범위

`?newAuthScreen=on` 또는 `VITE_ENABLE_NEW_AUTH_FOR_FIRST_REACT_SCREEN=true`일 때만 다음 구조로 렌더합니다.

```tsx
<AuthProvider>
  <FirstReactScreenAuthPanel />
</AuthProvider>
```

`FirstReactScreenAuthPanel`은 신규 `useAuth()`에서 제공하는 `phase`, `session`, `error`, `reloadSession`을 실제 상태 공급자로 사용합니다. legacy snapshot은 개발 환경에서 읽기 전용 비교 패널로만 표시합니다.

## 기능 플래그

- Query: `?newAuthScreen=on`, `?newAuthScreen=off`
- Env: `VITE_ENABLE_NEW_AUTH_FOR_FIRST_REACT_SCREEN=true|false`
- 우선순위: query -> env -> false
- 기본값: false
- 운영 빌드: 항상 false

즉시 롤백은 아래 URL로 가능합니다.

```text
http://127.0.0.1:5173/shadow-auth-test.html?newAuthScreen=off
```

## 상태 처리

신규 모드는 다음 상태를 화면에 표시합니다.

- `initializing`: 인증 상태 확인 중
- `signed_out`: 로그인이 필요합니다
- `loading_session`: 사용자 세션을 불러오는 중
- `authenticated`: 정상 세션 정보 표시
- `account_action_required`: pending/rejected/disabled 상태 안내
- `error`: 오류 표시 및 세션 다시 불러오기 버튼

오류 또는 reload 실패 시 자동 로그아웃하지 않습니다.

## 권한 Guard

적용 권한은 하나만 사용합니다.

```text
workspace.read
```

권한이 없으면 다음 문구만 표시합니다.

```text
이 화면을 볼 권한이 없습니다.
```

Firestore write, 워크스페이스 전환, 자동 로그아웃, 운영 로그인 이동은 하지 않습니다.

## currentWorkspaceId null 처리

아래 상태는 정상 세션으로 봅니다.

```text
authenticated
status = active
currentWorkspaceId = null
currentWorkspaceRole = null
```

워크스페이스가 필요한 권한 판단에서는 다음 문구를 표시합니다.

```text
현재 선택된 워크스페이스가 없습니다.
```

로그아웃이나 오류 상태로 만들지 않습니다.

## system_owner 처리

신규 `AppSession.isSystemOwner`와 `globalRole = system_owner`를 그대로 사용합니다. `system_owner`는 전역 역할이며 workspace role 비교 대상에 넣지 않습니다. legacy role 불일치는 warning으로만 표시됩니다.

## 테스트 결과

자동 테스트는 `scripts/test-auth-modules.mjs`에 추가했습니다.

검증 대상:

- 기능 플래그 기본값과 query/env 우선순위
- 신규 Provider 렌더 소스 확인
- 기존 fallback 유지
- 모든 phase 메시지
- currentWorkspaceId null
- system_owner 권한
- 권한 허용/거부
- reloadSession 성공/실패 UI
- Firestore write import 없음
- localStorage/sessionStorage 삭제 없음
- production 기본 off

## 다음 후보

다음 단계에서 운영 React 화면으로 더 넓히기 전 후보는 읽기 전용 계정 상태 화면입니다. 단, 현재 `src/pages/VerifyEmail.tsx`는 실제 UI가 없고, 로그인/가입/설정 화면은 제외 대상이므로 별도 최소 읽기 화면을 먼저 확정해야 합니다.
