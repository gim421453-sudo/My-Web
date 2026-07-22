# AuthProvider Preview Integration

작성일: 2026-07-21

## 적용 화면

첫 2차 통합 대상은 개발 전용 `auth-provider-preview.html`이다.

주소:

```text
http://127.0.0.1:5173/auth-provider-preview.html?preview=on
```

## 선택 이유

- 기존 운영 `index.html + app.js` 앱과 로그인 흐름을 건드리지 않는다.
- 사용자 관리, 워크스페이스 관리, 계정 삭제, 시간표, 공지 작성 같은 데이터 수정 화면이 아니다.
- 신규 `AuthProvider`를 실제 상태 공급자로 쓰면서도 운영 화면과 분리되어 즉시 롤백할 수 있다.
- Shadow 비교 화면보다 한 단계 더 나아가 `useAuth()` context를 직접 읽는다.

## 신규 Provider 실제 사용 범위

- `src/dev-auth-preview/main.tsx`에서 기능 플래그가 켜진 개발 환경일 때만 `<AuthProvider>`로 preview 앱을 감싼다.
- `src/dev-auth-preview/AuthProviderPreviewApp.tsx`는 `useAuth()`를 실제 상태 공급자로 사용한다.
- legacy session은 하단 읽기 전용 비교 패널에서만 `readLegacySessionSnapshot()`으로 읽는다.
- 로그아웃, 사용자 수정, 워크스페이스 수정, Firestore write는 연결하지 않았다.

## 기능 플래그

기본값은 false다.

우선순위:

```text
?preview=on|off
VITE_ENABLE_AUTH_PROVIDER_PREVIEW=true|false
false
```

운영 빌드에서는 `?preview=on`과 환경변수가 true여도 차단된다.

## 상태별 UI

- `initializing`: 인증 상태 확인 중
- `signed_out`: 로그인이 필요합니다
- `loading_session`: 사용자 세션을 불러오는 중
- `authenticated`: 정상 세션 정보 표시
- `account_action_required`: pending/rejected/disabled 등 계정 상태 확인 필요
- `error`: 오류 표시와 다시 시도 버튼

`authenticated` 상태에서 `currentWorkspaceId === null`이면 정상 로그인으로 표시한다.

표시 문구:

```text
연결된 현재 워크스페이스가 없습니다. 로그인을 정상적으로 유지하고 있습니다.
```

## system_owner 처리

- `systemOwners/{uid}` 기반으로 계산된 신규 세션의 `isSystemOwner`와 `globalRole`을 그대로 표시한다.
- `isSystemOwner=true`, `globalRole=system_owner`, `currentWorkspaceRole=super_manager` 조합을 정상으로 본다.
- 다음 warning은 로그인 실패로 처리하지 않는다.
  - `LEGACY_STATUS_FIELDS_PRESENT`
  - `LEGACY_ROLE_PRESENT`
  - `GLOBAL_ROLE_MISMATCH`
  - `WORKSPACE_NOT_FOUND`

## 권한 미리보기

신규 permissions 모듈의 `hasPermission()` 결과를 읽기 전용으로 표시한다.

표시 권한:

```text
workspace.read
workspace.manage
workspace.delete
members.read
members.invite
members.manage_lower_roles
lessons.read
lessons.write
assignments.read
assignments.write
attendance.read
attendance.write
exams.read
exams.write
data.print
```

각 결과는 `허용` 또는 `거부`로만 표시한다.

## 역할 관리 미리보기

`canManageWorkspaceRole()` 기반으로 다음 대상 역할을 표시한다.

```text
super_manager
manager
teacher
normal
viewer
print_account
```

`system_owner`는 workspace role이 아니므로 대상 역할 목록에 넣지 않는다. 다만 현재 세션이 system owner이면 전역 권한으로 모든 workspace role 관리 가능으로 표시한다.

## reloadSession 동작

버튼:

```text
세션 다시 불러오기
```

동작:

```text
reloadSession()
→ loading_session
→ authenticated 또는 account_action_required 또는 error
```

실패 시:

- Firebase Auth 로그인은 유지한다.
- 자동 로그아웃하지 않는다.
- localStorage/sessionStorage를 삭제하지 않는다.
- Firestore write를 수행하지 않는다.
- 다시 시도는 `reloadSession()`만 호출한다.

중복 클릭은 `reloadBusy`와 loading phase에서 버튼 disabled로 막는다.

## 롤백 방법

- 주소에서 `?preview=off`를 사용한다.
- `.env`에서 `VITE_ENABLE_AUTH_PROVIDER_PREVIEW=false`로 둔다.
- 문제가 있으면 `auth-provider-preview.html`과 `src/dev-auth-preview/*`만 제거하면 운영 앱에는 영향이 없다.

## 다음 통합 후보

1. 개발 전용 PermissionPreview 확장 화면
2. 읽기 전용 계정 상태 화면
3. 읽기 전용 워크스페이스 선택 미리보기

로그인 화면, 사용자 관리, 워크스페이스 관리, 계정 삭제, 시간표, 방과후/동아리/특강, 공지 작성 화면은 아직 통합 대상이 아니다.
