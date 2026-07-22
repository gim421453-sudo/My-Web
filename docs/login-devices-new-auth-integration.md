# LoginDevices 신규 AuthProvider 통합

## 기존 화면 상태

`src/pages/Settings/LoginDevices.tsx`는 기존에 `return null`만 수행하는 placeholder였습니다. 이번 단계에서도 기능 플래그가 꺼져 있으면 같은 placeholder 동작을 유지합니다.

## 적용 범위

이번 통합은 개발 확인용 `login-devices.html`에서만 신규 AuthProvider를 사용합니다. 운영 정적 앱의 `index.html`, `app.js`, 루트 `services/*`, Firestore Rules, Firebase 데이터 구조는 수정하지 않았습니다.

브라우저 확인 주소:

- 신규 모드: `http://127.0.0.1:5173/login-devices.html?newAuthDevices=on`
- 기존 모드: `http://127.0.0.1:5173/login-devices.html?newAuthDevices=off`

## 기능 플래그

사용 플래그:

```text
VITE_ENABLE_NEW_AUTH_LOGIN_DEVICES=true|false
```

query switch:

```text
?newAuthDevices=on
?newAuthDevices=off
```

우선순위:

```text
query -> env -> false
```

production에서는 query/env 값과 무관하게 기본 off입니다.

## 신규 AuthProvider 사용 값

`LoginDevices`는 신규 `useAuth()`에서 다음 값만 사용합니다.

- `phase`
- `session.uid`
- `session.email`
- `session.status`
- `session.currentWorkspaceId`
- `session.isSystemOwner`
- `reloadSession`
- `error.code`

사용하지 않는 것:

- legacy localStorage role
- legacy currentRole/workspaceRole 직접 판정
- `window.currentUser`
- app.js 전역 세션
- 기존 `src/context/AuthContext.tsx`

## 데이터 소스

우선순위:

1. Firestore `user_devices/{deviceId}`
2. Firestore 조회 실패 또는 결과 없음일 때만 localStorage `pm:user_devices:v1`

두 결과를 합쳐 표시하지 않습니다. 중복 판정 기준은 `deviceId`입니다.

## Firestore 조회 방식

읽기 전용 adapter:

```text
src/pages/Settings/loginDevicesReadonlyService.ts
```

조회 조건:

```text
collection: user_devices
where uid == session.uid
where workspaceId == session.currentWorkspaceId
```

Firestore write API는 import하지 않았습니다. `getDocs`, `collection`, `query`, `where`만 사용합니다.

## uid 필터

정규화 단계에서도 `device.uid === session.uid`를 다시 확인합니다. 다른 사용자의 기기 문서는 Firestore 결과나 local fallback에 섞여 있어도 표시하지 않습니다.

## workspaceId null 처리

`status === active`이지만 `currentWorkspaceId`가 없으면 Firestore 조회를 시도하지 않습니다.

표시 문구:

```text
현재 선택된 워크스페이스가 없어 기기 목록을 불러올 수 없습니다.
로그인은 정상적으로 유지되고 있습니다.
```

임의 workspaceId를 만들거나 system_owner라는 이유로 전체 기기를 조회하지 않습니다.

## Rules 영향

이번 단계에서 Rules는 수정하지 않았습니다.

`permission-denied`가 발생하면 다음 안내만 표시합니다.

```text
현재 보안 설정으로는 로그인 기기 목록을 불러올 수 없습니다.
로그인은 정상적으로 유지되고 있습니다.
```

Rules 우회, 모든 기기 컬렉션 전체 조회, 다른 workspaceId 대입은 하지 않습니다.

## 표시 필드

표시하는 필드:

- 현재 기기 여부
- 기기 이름
- 기기 종류
- 브라우저 요약
- 운영체제 요약
- 첫 로그인 시간
- 마지막 활동 시간
- 상태

상태:

- 현재 사용 중
- 최근 사용
- 해제된 기기

## 민감 정보 제외

UI에 표시하지 않는 정보:

- `pushToken`
- refresh token
- access token
- session cookie
- 전체 UID
- 전체 workspaceId
- raw user agent
- device fingerprint
- 전체 IP
- 정확한 위치
- API key

이메일은 `st***t@example.com` 형태로 마스킹합니다.

## 현재 기기 판정

우선순위:

1. `isCurrentDevice === true`
2. localStorage `pm:device:id`와 `deviceId` 일치

현재 기기로 표시되는 항목이 여러 개면 임의로 하나를 확정하지 않고 다음 경고를 표시합니다.

```text
현재 기기 정보가 중복되어 정확히 판별할 수 없습니다.
```

현재 기기 항목이 없으면 다음 안내를 표시합니다.

```text
현재 기기를 확인할 수 없습니다.
```

브라우저 fingerprint는 새로 만들지 않습니다.

## 새로고침 처리

버튼 두 개를 분리했습니다.

- `기기 목록 새로고침`: 현재 `uid`/`workspaceId` 기준 기기 목록만 다시 조회
- `계정 상태 다시 확인`: 신규 AuthProvider의 `reloadSession()`만 호출

둘 다 중복 클릭을 방지하고, 실패해도 자동 로그아웃하지 않습니다.

## 롤백 방식

즉시 롤백:

```text
http://127.0.0.1:5173/login-devices.html?newAuthDevices=off
```

또는 `.env`에서 다음 값을 false 또는 미설정으로 둡니다.

```text
VITE_ENABLE_NEW_AUTH_LOGIN_DEVICES=false
```

## 향후 Cloud Functions/Admin SDK 필요 기능

이번 단계에서 제외한 기능:

- 특정 기기 로그아웃
- 전체 기기 로그아웃
- 세션 해제
- refresh token revoke
- 신뢰 기기 등록/해제

위 기능은 Cloud Functions와 Firebase Admin SDK 기반 세션 관리가 필요합니다.

## 운영 앱 영향 없음

수정하지 않은 파일:

- `index.html`
- `app.js`
- 루트 `services/*`
- `firestore.rules`
- `firestore.rules.next`

신규 진입점은 `login-devices.html`이며, 운영 앱 메인 진입과 로그인 구조를 교체하지 않습니다.
