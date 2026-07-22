# VerifyEmail 신규 AuthProvider 통합

작성일: 2026-07-21

## 선택 이유

`src/pages/VerifyEmail.tsx`는 후보 조사에서 가장 안전한 B 후보였습니다. 계정 본인의 이메일 인증 상태와 계정 상태만 읽기 전용으로 표시할 수 있고, workspace 데이터 쓰기나 관리자 기능과 직접 연결되지 않습니다.

## 현재 기존 화면 상태

기존 `VerifyEmail`은 `return null`인 placeholder였습니다. 이번 작업에서도 기본 호출은 placeholder로 유지했습니다.

```tsx
<VerifyEmail />
```

위 형태는 기존처럼 아무 UI도 렌더하지 않습니다.

## 신규 Provider 적용 범위

개발 확인용 HTML entry를 추가했습니다.

```text
http://127.0.0.1:5173/verify-email.html?newAuthVerify=on
```

`?newAuthVerify=on` 또는 `VITE_ENABLE_NEW_AUTH_VERIFY_EMAIL=true`일 때만 다음 구조로 렌더합니다.

```tsx
<AuthProvider>
  <VerifyEmail mode="new-auth" />
</AuthProvider>
```

`VerifyEmail` 내부 신규 화면은 `src/auth/useAuth.ts`의 신규 `useAuth()`와 `AppSession`을 실제 상태 공급자로 사용합니다.

## 기능 플래그

- Query: `?newAuthVerify=on`, `?newAuthVerify=off`
- Env: `VITE_ENABLE_NEW_AUTH_VERIFY_EMAIL=true|false`
- 우선순위: query -> env -> false
- 기본값: false
- 개발 확인용 entry 기준으로 사용

롤백:

```text
http://127.0.0.1:5173/verify-email.html?newAuthVerify=off
```

또는 `.env`에서:

```text
VITE_ENABLE_NEW_AUTH_VERIFY_EMAIL=false
```

## 읽기 전용 제한

이번 화면은 다음을 하지 않습니다.

- 인증 이메일 재전송
- 이메일 변경
- 로그아웃
- 계정 삭제
- 워크스페이스 변경
- 승인 신청
- 알림 저장
- Firestore write
- Auth 사용자 수정
- browser storage 삭제

## 상태별 UI

| phase | 표시 문구 |
|---|---|
| `initializing` | 인증 상태를 확인하고 있습니다. |
| `signed_out` | 로그인이 필요합니다. |
| `loading_session` | 계정 정보를 불러오고 있습니다. |
| `authenticated` | 계정 상태 정보를 표시합니다. |
| `account_action_required` | 계정 상태에 따른 안내를 표시합니다. |
| `error` | 계정 정보를 불러오지 못했습니다. |

자동 리다이렉트와 자동 로그아웃은 하지 않습니다.

## emailVerified 처리

| 값 | 표시 문구 |
|---|---|
| `true` | 이메일 인증이 완료되었습니다. |
| `false` | 이메일 인증이 필요합니다. |

이번 단계에서는 인증 메일 재전송 버튼을 만들지 않았습니다.

## 계정 status 처리

| status | 표시 문구 |
|---|---|
| `active` | 계정이 정상적으로 활성화되어 있습니다. |
| `pending` | 계정 승인을 기다리고 있습니다. |
| `rejected` | 계정 승인이 거절되었습니다. |
| `disabled` | 계정 사용이 제한되어 있습니다. |
| 기타 | 계정 상태를 확인할 수 없습니다. |

## currentWorkspaceId null 처리

다음 상태는 오류가 아닙니다.

```text
authenticated
status = active
currentWorkspaceId = null
currentWorkspaceRole = null
```

표시 문구:

```text
현재 선택된 워크스페이스가 없습니다.
로그인은 정상적으로 유지되고 있습니다.
```

워크스페이스가 없다는 이유로 로그아웃하거나 error 상태로 바꾸지 않습니다.

## system_owner 처리

system owner 세션은 다음 값을 그대로 표시합니다.

```text
전역 역할: system_owner
시스템 오너: 예
```

예상 정상값:

```text
globalRole = system_owner
isSystemOwner = true
currentWorkspaceRole = super_manager
```

legacy warning은 실패가 아니라 `warning codes`에만 표시합니다.

## 민감 정보 마스킹

- 전체 UID는 표시하지 않습니다.
- 이메일은 `ki***1@example.com` 형태로 마스킹합니다.
- token, invitation code, API key는 표시하지 않습니다.
- workspaceId 전체값은 표시하지 않고 존재 여부만 표시합니다.

## 브라우저 확인 방법

개발 서버:

```powershell
npm.cmd run dev
```

신규 모드:

```text
http://127.0.0.1:5173/verify-email.html?newAuthVerify=on
```

기존 placeholder:

```text
http://127.0.0.1:5173/verify-email.html?newAuthVerify=off
```

`localhost`는 사용하지 않습니다.

## 다음 단계 후보

다음 후보는 `src/pages/Settings/LoginDevices.tsx`입니다. 단, 읽기 전용 기기 목록으로 제한해야 하며 기기 삭제/해제 기능은 다음 단계 범위에서 제외해야 합니다.
