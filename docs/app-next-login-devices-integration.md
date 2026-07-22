# app-next 로그인 기기 조회 읽기 전용 통합

## 요약

`/app-next.html` 내부에 `계정 상태`와 `로그인 기기` 탭을 추가하고, 로그인 기기 탭은 신규 `AuthProvider` 세션을 기준으로 현재 사용자 본인의 기기 기록만 읽기 전용으로 조회한다.

운영 정적 앱(`index.html`, `app.js?v=111`)과 기존 `src/context/AuthContext.tsx`는 이 통합 범위에 포함하지 않았다.

## 실제 데이터 구조 조사 결과

프로젝트 코드에서 실제 사용 중인 로그인 기기 컬렉션은 다음 하나다.

| 구분 | 값 |
| --- | --- |
| Firestore 컬렉션 | `user_devices` |
| schema 정의 | `src/services/firestoreSchema.ts` |
| 정적 앱 쓰기 | `services/authService.js` |
| 로컬 fallback | `services/deviceService.js`, `localStorage["pm:user_devices:v1"]` |
| React standalone 읽기 | `src/pages/Settings/loginDevicesReadonlyService.ts` |

확인된 주요 필드는 다음과 같다.

| 필드 | 용도 |
| --- | --- |
| `deviceId` | 기기 식별자 |
| `uid` | 사용자 소유권 |
| `workspaceId` | 기존 운영 앱에서 저장 시 포함 |
| `deviceName` | 표시용 기기 이름 |
| `deviceType` | desktop/mobile/tablet 등 |
| `browser` | 브라우저 또는 user agent 기반 값 |
| `os` | 운영체제 |
| `lastLoginAt` | 로그인 시각 |
| `lastActiveAt` | 마지막 활동 시각 |
| `pushToken` | 푸시 토큰 |
| `isCurrentDevice` | 현재 기기 여부 |
| `revokedAt` | 해제 시각 후보 |

다음 경로는 코드에서 실제 로그인 기기 데이터 source로 사용되지 않았다.

- `users/{uid}/devices`
- `users/{uid}/sessions`
- `loginDevices`
- `authSessions`
- `loginSessions`
- `deviceSessions`
- `userSessions`
- `trustedDevices`

## 기존 login-devices 화면과의 관계

기존 별도 entry는 다음 파일로 존재한다.

- `login-devices.html`
- `src/pages/Settings/loginDevicesMain.tsx`
- `src/pages/Settings/LoginDevices.tsx`
- `src/pages/Settings/loginDevicesReadonlyService.ts`

기존 standalone 화면은 신규 `AuthProvider`를 선택적으로 사용할 수 있지만, 읽기 조건에 `workspaceId`를 요구한다. 이번 `app-next` 화면은 `workspaceId`가 없어도 본인 `uid` 기준으로 조회할 수 있게 별도 read-only 서비스를 추가했다.

## app-next 화면 구조

`app-next`는 React Router를 추가하지 않고 내부 state 기반 탭만 사용한다.

- `계정 상태`: 기존 계정 상태 및 이메일 인증 확인 화면
- `로그인 기기`: 현재 로그인 계정의 기기 목록 읽기 전용 화면

Provider 구조는 기존 app-next 기준을 유지한다.

```text
AuthProvider
→ LegacyAuthAdapterProvider
→ AppNext
```

`src/context/AuthContext.tsx`는 mount하지 않는다.

## 읽기 방식

Firestore 조회는 1회 조회만 사용한다.

```text
collection: user_devices
filter: uid == current uid
method: getDocs
```

실시간 listener(`onSnapshot`)는 사용하지 않는다. 탭 전환 반복으로 listener가 누적되는 구조가 아니다.

Firestore에서 결과가 없을 때만 기존 로컬 fallback `pm:user_devices:v1`을 읽는다. fallback도 읽기 전용이며 새 기기 문서를 생성하지 않는다.

## 현재 기기 판정

현재 기기는 Firestore 문서의 `isCurrentDevice` 값을 그대로 믿지 않는다. 기존 운영 앱이 과거 여러 `user_devices` 문서에 `isCurrentDevice: true`를 남길 수 있어, 이 값을 기준으로 삼으면 여러 기기가 동시에 현재 기기로 표시된다.

app-next의 현재 판정 기준:

1. 현재 브라우저에 이미 존재하는 정확한 식별값 `localStorage["pm:device:id"]`를 읽는다.
2. 이 값이 문서의 `deviceId` 또는 Firestore 문서 id와 정확히 일치할 때만 현재 기기 후보로 본다.
3. `sessionId`가 별도 제공되는 구조가 생기면 정확히 일치하는 `sessionId`도 후보로 볼 수 있다.
4. `userAgent`, 브라우저 이름, OS, `isCurrentDevice` 저장값만으로는 현재 기기로 확정하지 않는다.
5. 같은 정확한 식별값을 가진 문서가 여러 개면 `lastActiveAt`, `updatedAt`, `createdAt` 순으로 가장 최근 문서 하나만 현재 기기로 표시한다.

정확한 식별값이 없거나 매칭되는 문서가 없으면 “현재 기기를 정확히 식별할 수 없습니다.” 안내를 표시하고 모든 기기를 일반 기기로 표시한다.

개발 환경에서만 각 카드에 다음 판정 이유를 표시한다.

| 값 | 의미 |
| --- | --- |
| `exact-id` | 정확한 현재 식별값과 일치해 현재 기기로 선택됨 |
| `no-exact-id` | 정확한 식별값 매칭이 없어 일반 기기로 표시 |
| `duplicate-exact-id-resolved` | 동일 식별값 중복 문서라 최신 1개만 현재 기기로 선택되고 이 문서는 일반 기기로 표시 |

## 상태별 처리

| 상태 | 처리 |
| --- | --- |
| `loading` | 불러오는 중 표시 |
| `signed_out` | 로그인 필요 안내 |
| `active` | 기기 목록 조회 |
| `active + workspace null` | 정상 조회 |
| `pending/rejected/disabled` | 계정 상태 안내, 기기 조회 차단 |
| `error` | 오류 안내, 자동 로그아웃 없음 |
| `system_owner` | 전역 역할로 정상 처리 |

워크스페이스가 없어도 본인 기기 목록 조회는 허용한다.

## 민감 정보 처리

화면에는 다음을 표시하지 않는다.

- 전체 UID
- 전체 workspaceId
- 전체 deviceId/sessionId
- 전체 user agent 원문
- 전체 IP
- 토큰 또는 push token

마스킹 정책:

- IP: `123.45.xxx.xxx`
- device/session id: 끝 4자리만 표시, 예: `...a1b2`
- 브라우저/OS: 원문 user agent 대신 요약값

## 쓰기 및 로그아웃 기능 제외

이번 화면은 다음을 포함하지 않는다.

- Firestore `setDoc`, `updateDoc`, `deleteDoc`, `writeBatch`, `runTransaction`
- `onSnapshot`
- 기기 로그아웃 버튼
- 세션 삭제 버튼
- 강제 토큰 폐기
- 자동 `signOut`

## 개발 진단

개발 환경에서는 로그인 기기 화면에 다음 진단만 표시한다.

```text
entry: app-next
screen: login-devices
provider: new
legacy AuthContext mounted: false
device data source
read count
write API imported: false
automatic signOut: none
```

민감한 식별자는 표시하지 않는다.

## 브라우저 확인 주소

```text
http://127.0.0.1:5173/app-next.html?appNext=on
```

## 남은 위험

- 현재 Firestore Rules가 `user_devices` self-read를 허용하지 않는 배포 상태라면 permission-denied가 표시될 수 있다. 이 화면에서는 우회하지 않는다.
- 기존 운영 앱이 quota 또는 local account 오판으로 기기 문서를 쓰지 못한 계정은 빈 상태로 표시될 수 있다.
- 기존 `browser` 값이 raw user agent인 문서는 요약 표시가 정확하지 않을 수 있다.
- `lastActiveAt` 값은 기존 저장 로직의 기록값이므로 현재 시각과 다를 수 있다.
