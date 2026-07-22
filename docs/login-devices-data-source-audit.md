# LoginDevices 데이터 소스 감사

## 범위

이번 문서는 `LoginDevices` 읽기 전용 화면을 구현하기 전에, 현재 코드와 Firebase 구조에서 실제로 존재하는 로그인 기기/세션 데이터 출처를 확인한 결과입니다. 운영 정적 앱(`index.html`, `app.js`, 루트 `services/*`)과 Firestore Rules, 실제 데이터는 수정하지 않았습니다.

브라우저 확인 기준 origin은 `http://127.0.0.1:5173`입니다.

## 조사한 코드 경로

| 경로 | 확인 내용 |
| --- | --- |
| `src/pages/Settings/LoginDevices.tsx` | 현재 `return null`만 있는 빈 화면입니다. |
| `src/context/AuthContext.tsx` | 기존 React AuthContext입니다. `session`, `loading`, `authError`, `login`, `logout`, `reloadSession`을 제공합니다. |
| `src/auth/*` | 신규 AuthProvider/AppSession 구조입니다. `uid`, `email`, `status`, `globalRole`, `currentWorkspaceId`, `currentWorkspaceRole`, `isSystemOwner`를 제공합니다. |
| `src/services/deviceService.ts` | modular Firestore 기반 `user_devices` read/write 함수가 있습니다. |
| `src/services/firestoreSchema.ts` | `collections.userDevices = "user_devices"` 및 `UserDeviceDoc` 타입이 있습니다. |
| `src/services/sessionService.ts` | Auth 세션 감시와 로그아웃 요청 TODO 함수가 있습니다. 서버 세션 해제는 미구현입니다. |
| `services/deviceService.js` | 운영 정적 앱용 localStorage facade입니다. `pm:user_devices:v1`, `pm:device:id`를 사용합니다. |
| `services/sessionService.js` | 운영 정적 앱용 sessionStorage facade입니다. 기기 로그아웃은 Cloud Functions 필요 TODO입니다. |
| `services/authService.js` | Firebase 로그인 후처리에서 `user_devices/{deviceId}`에 실제 Firestore setDoc을 수행합니다. |
| `app.js` | 로그인 완료 후 로컬 `PMDeviceService.registerLoginDevice`, Firebase 세션 복원 후 `PMAuthService.firebaseRegisterDevice` 호출이 있습니다. 설정 보조 섹션에서 로컬 기기 수를 표시합니다. |
| `firestore.rules` | `match /user_devices/{deviceId}` 규칙이 있습니다. 현재 배포 후보상 `workspaceId is string` 및 membership 조건이 중요합니다. |
| `firestore.rules.next` | `user_devices` 규칙 후보가 있으며 workspaceId null 허용 정책을 별도로 준비한 흔적이 있습니다. |

## 실제 존재하는 데이터 경로

| 후보 경로 | 코드상 존재 | 읽기 위치 | 쓰기 위치 | 판정 |
| --- | --- | --- | --- | --- |
| `user_devices/{deviceId}` | 예 | `src/services/deviceService.ts`의 `listDevices(uid, workspaceId)` | `src/services/deviceService.ts`의 `registerLoginDevice`, `touchDevice`, `savePushToken`; `services/authService.js`의 `firebaseRegisterDevice` | 실제 Firestore 기기 데이터 후보 |
| localStorage `pm:user_devices:v1` | 예 | `services/deviceService.js`의 `listDevices` | `services/deviceService.js`의 `registerLoginDevice`, `touchCurrentDevice` | 운영 정적 앱의 로컬 fallback/facade |
| localStorage `pm:device:id` | 예 | `services/deviceService.js`의 `currentDeviceId` | `services/deviceService.js`의 `currentDeviceId` | 현재 브라우저 식별용 로컬 ID |
| sessionStorage `pm-current-user` | 예 | `services/sessionService.js`의 `currentSession` | `startSession`, `endCurrentSession` | 현재 탭 세션 표시용, 기기 목록 아님 |
| `users/{uid}/devices` | 아니오 | 없음 | 없음 | 현재 코드상 없음 |
| `users/{uid}/sessions` | 아니오 | 없음 | 없음 | 현재 코드상 없음 |
| `loginDevices` | 아니오 | 없음 | 없음 | 현재 코드상 없음 |
| `authSessions` | 아니오 | 없음 | 없음 | 현재 코드상 없음 |
| `deviceSessions` | 아니오 | 없음 | 없음 | 현재 코드상 없음 |
| `activeSessions` | 아니오 | 없음 | 없음 | 현재 코드상 없음 |
| `trustedDevices` | 아니오 | 없음 | 없음 | 현재 코드상 없음 |
| `userDevices` | 상수명만 존재 | `collections.userDevices` | `collections.userDevices` | 실제 컬렉션명은 `user_devices` |

## `user_devices` 현재 필드

`src/services/firestoreSchema.ts`와 `services/authService.js` 기준 필드는 다음과 같습니다.

| 필드 | 현재 의미 | 민감도 |
| --- | --- | --- |
| `deviceId` | 문서 ID 또는 로컬 기기 ID | 낮음. 단, 외부 노출은 마스킹 권장 |
| `uid` | 소유 사용자 UID | 민감. UI 노출 금지 |
| `workspaceId` | 소속 workspace | 민감. 일반 UI 노출 금지 |
| `deviceName` | `navigator.platform` 기반 이름 | 낮음 |
| `deviceType` | `mobile` 또는 `desktop` 추정 | 낮음 |
| `browser` | 현재 구현에서는 raw user agent 저장 | 주의. UI에는 원문 표시 금지 |
| `os` | `navigator.platform` | 낮음-주의 |
| `lastLoginAt` | 마지막 로그인 기록 시각 | 안전 |
| `lastActiveAt` | 마지막 활동 갱신 시각 | 안전 |
| `pushToken` | 푸시 토큰 | 민감. UI 표시 금지 |
| `isCurrentDevice` | 현재 기기 여부 플래그 | 안전하나 신뢰도 제한 |
| `revokedAt` | 해제 시각 후보 | 안전. 해제 기능은 미구현 |

## 소유권과 workspaceId 의존성

- Firestore 경로는 최상위 `user_devices/{deviceId}`입니다.
- `src/services/deviceService.ts`의 읽기 함수는 `uid`와 `workspaceId`를 모두 조건으로 사용합니다.
- `services/authService.js`의 Firestore 쓰기는 로그인 사용자의 `uid`와 workspaceId를 저장합니다.
- `services/authService.js`는 workspaceId가 없으면 `firebaseRegisterDevice`에서 `null`을 반환하고 Firestore 기기 문서를 만들지 않습니다.
- 현재 `firestore.rules`는 `user_devices` create/update에서 `workspaceId is string`과 workspace member 조건을 요구합니다. 따라서 workspace가 없는 계정의 로그인 후처리는 rules에 막히거나 아예 쓰기를 건너뛸 수 있습니다.
- `firestore.rules.next`에는 workspaceId null 정책을 완화하려는 후보 규칙이 있으나, 이번 단계에서는 교체/배포하지 않았습니다.

## currentSession 표시 가능성

현재 기기 여부는 제한적으로만 표시할 수 있습니다.

- 운영 정적 앱은 localStorage `pm:device:id`로 현재 브라우저 기기 ID를 유지합니다.
- `services/authService.js`는 이 ID를 Firestore `user_devices/{deviceId}` 문서 ID로 사용합니다.
- React `src/services/deviceService.ts`는 `addDoc`을 사용하므로 문서 ID와 `deviceId` 필드가 일치하지 않을 수 있습니다.
- 여러 탭/브라우저/origin이 섞이면 `isCurrentDevice`가 여러 문서에서 true가 될 수 있습니다.
- 따라서 읽기 전용 UI에서는 “현재 기기 추정” 정도로만 표시하는 것이 안전합니다.

## 세션 해제 기능 존재 여부

기기 로그아웃/세션 해제는 현재 구현되어 있지 않습니다.

- `services/sessionService.js`
  - `requestLogoutDevice(deviceId)` → `{ status: "todo_cloud_functions_required" }`
  - `requestLogoutAllDevices(uid)` → `{ status: "todo_cloud_functions_required" }`
- `src/services/sessionService.ts`
  - `requestLogoutDevice(deviceId)` → `{ status: "todo_server_function_required" }`
  - `requestLogoutAllDevices(uid)` → `{ status: "todo_server_function_required" }`

특정 기기 로그아웃, 전체 기기 로그아웃, refresh token revoke는 Cloud Functions와 Firebase Admin SDK가 필요합니다.

## Firebase Auth 클라이언트 SDK 한계

현재 설치된 Firebase Auth 타입 기준으로 웹 클라이언트 `User`는 다음 정보를 제공합니다.

- 현재 사용자 `uid`, `email`, `emailVerified`, `providerData`
- `metadata.creationTime`, `metadata.lastSignInTime`
- `getIdToken`, `getIdTokenResult`, `reload`, `delete`
- `refreshToken`
- MFA 관련 `multiFactor`

하지만 클라이언트 SDK만으로 “현재 계정이 로그인된 모든 기기/세션 목록”을 조회하는 API는 확인되지 않았습니다. 따라서 LoginDevices 화면은 Firebase Auth에서 직접 기기 목록을 가져오는 방식이 아니라, 앱이 별도로 기록한 `user_devices` 컬렉션을 읽어야 합니다.

토큰성 값인 `refreshToken`, ID token, push token은 UI에 표시하거나 로그로 남기면 안 됩니다.

## 보안 표시 기준

안전하게 표시 가능:

- 마스킹된 기기명
- 파싱된 브라우저 종류
- 파싱된 운영체제 종류
- 마지막 활동 시간
- 첫 로그인 시간
- 현재 기기 여부 추정

주의 또는 표시 금지:

- 전체 IP
- 정확한 위치
- user agent 원문
- refresh token
- access token
- session cookie
- push token
- device fingerprint

## 읽기 가능성

현재 코드만 기준으로는 `user_devices`가 유일한 실제 Firestore 기기 데이터 후보입니다. 다만 읽기에는 다음 조건이 붙습니다.

- 본인 문서: `resource.data.uid == request.auth.uid`이면 읽기 가능
- 시스템 오너: 읽기 가능
- 워크스페이스 관리자: 해당 `workspaceId`의 관리자면 읽기 가능
- workspaceId가 null이거나 누락된 문서 정책은 현재 배포 rules와 후보 rules가 다릅니다.

## 결론

구현 가능성은 **B. 기존 데이터는 있으나 정규화가 필요**입니다.

근거:

- `user_devices` 컬렉션과 서비스 함수가 존재합니다.
- 운영 로그인 후처리에서 Firestore `user_devices/{deviceId}`를 기록합니다.
- 단, 운영 localStorage facade와 React Firestore service가 서로 저장 방식이 다릅니다.
- raw user agent와 push token이 포함될 수 있어 표시 필드 정리가 필요합니다.
- 현재 기기 판정은 로컬 deviceId와 문서 ID 기준으로만 추정 가능합니다.
- workspaceId가 없는 계정 또는 rules 정책에 따라 로그인 후처리 실패 가능성이 남아 있습니다.
