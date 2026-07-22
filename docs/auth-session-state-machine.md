# Auth Session State Machine

작성일: 2026-07-21

## 상태 목록

```ts
type AuthPhase =
  | "initializing"
  | "signed_out"
  | "loading_session"
  | "authenticated"
  | "account_action_required"
  | "error";
```

## 초기화

`AuthProvider`가 mount되면 `phase = "initializing"` 상태로 시작합니다. Firebase `onAuthStateChanged`가 단일 진입점입니다.

## 미로그인

Firebase user가 없으면:

- `firebaseUser = null`
- `session = null`
- `error = null`
- `phase = "signed_out"`

Route Guard는 `/login`으로 보냅니다.

## 세션 로딩

Firebase user가 있으면:

1. `phase = "loading_session"`
2. `users/{uid}` 자기 문서 읽기
3. 계정 상태 정규화
4. `systemOwners/{uid}` 확인
5. globalRole 계산
6. `currentWorkspaceId` 확인
7. workspaceId가 있으면 workspace와 nested member 확인
8. `AppSession` 생성

로그인 함수는 세션을 직접 만들지 않습니다.

## 정상 로그인

`status == active`이면:

- `phase = "authenticated"`
- `session.isAuthenticated = true`
- `currentWorkspaceId`가 null이어도 정상 세션입니다.

## 계정 상태 처리

`status`가 `pending`, `rejected`, `disabled`이면:

- 세션은 생성됩니다.
- `phase = "account_action_required"`
- 보호된 데이터 쿼리는 실행하지 않아야 합니다.
- Route Guard는 `/account-status`로 보냅니다.

## 워크스페이스 없음

다음은 오류가 아닙니다.

```text
status == active
currentWorkspaceId == null
```

워크스페이스가 필요한 화면만 `/select-workspace`로 안내합니다.

## 워크스페이스 또는 멤버십 문제

`currentWorkspaceId`가 있지만 workspace 문서가 없거나 nested member가 없으면:

- 자동 로그아웃하지 않습니다.
- `currentWorkspaceId`와 `currentWorkspaceRole`은 세션에서 null로 둡니다.
- `WORKSPACE_NOT_FOUND` 또는 `MEMBERSHIP_NOT_FOUND` warning을 남깁니다.

system owner는 예외적으로 로그인 성공을 유지하면서 owner workspace fallback을 시도합니다. `systemOwners/{uid}`가 있고, 유지 대상 owner workspace의 nested member role이 `super_manager`이면 세션 계산상 해당 workspace를 사용합니다. 이 동작은 Firestore 데이터를 수정하지 않습니다.

## 오류

Firestore permission denied, network unavailable 등은 `phase = "error"`로 표시할 수 있지만 자동 로그아웃 사유로 보지 않습니다. 이전 코드처럼 Firestore 검증 실패를 즉시 signOut으로 연결하지 않는 것이 핵심입니다.

## 로그아웃

로그아웃 시:

1. 진행 중인 세션 로드 generation을 무효화
2. Firebase signOut 실행
3. 세션 상태 초기화

## 요청 경합

`sessionLoadGeneration`으로 경합을 막습니다.

처리하는 상황:

- 로그인 직후 `onAuthStateChanged` 중복 호출
- A 계정 세션 로드 중 B 계정 로그인
- 세션 로드 중 로그아웃
- 워크스페이스 전환 중 로그아웃
- 느린 이전 요청이 최신 세션을 덮어쓰는 상황

오래된 요청은 `SESSION_SUPERSEDED`로 폐기됩니다.
