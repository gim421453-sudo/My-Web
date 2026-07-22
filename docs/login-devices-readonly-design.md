# LoginDevices 읽기 전용 설계

## 목표

`LoginDevices`는 신규 AuthProvider 전환 후보로 쓰기 좋은 비중요 읽기 전용 화면입니다. 이번 단계에서는 구현하지 않고, 현재 데이터로 어떤 UI를 만들 수 있는지만 설계합니다.

브라우저 확인 주소는 `http://127.0.0.1:5173` 기준으로만 사용합니다.

## 구현 가능성

판정: **B. 기존 데이터는 있으나 정규화가 필요**

사용 가능한 실제 데이터 소스:

- Firestore `user_devices/{deviceId}`
- 운영 정적 앱 localStorage `pm:user_devices:v1`
- 현재 기기 식별 localStorage `pm:device:id`

읽기 전용 React 화면의 기준 데이터는 Firestore `user_devices`로 두는 것이 가장 적합합니다. localStorage 데이터는 운영 정적 앱의 fallback/facade이므로 신규 React 화면의 주 데이터로 쓰지 않는 것이 좋습니다.

## 권장 조회 방식

최소 조회 조건:

```text
user_devices
where uid == session.uid
where workspaceId == session.currentWorkspaceId
```

단, `currentWorkspaceId`가 없는 active 사용자도 로그인 상태 자체는 정상일 수 있으므로 다음처럼 처리합니다.

- `currentWorkspaceId` 있음: `user_devices` 읽기
- `currentWorkspaceId` 없음: “현재 선택된 워크스페이스가 없어 로그인 기기 목록을 불러올 수 없습니다.” 표시
- system_owner이고 workspace가 없는 경우: 로그아웃하거나 오류로 만들지 않음

향후 rules가 본인 `uid` 기준 단독 조회를 안정적으로 허용하도록 정리되면 workspaceId 조건을 완화할 수 있습니다. 이번 설계에서는 현재 서비스 함수와 rules 영향 때문에 workspaceId가 필요하다고 봅니다.

## 신규 AuthProvider에서 필요한 값

LoginDevices 읽기 전용 화면에 필요한 값:

| 값 | 용도 |
| --- | --- |
| `phase` | `signed_out`, `loading_session`, `authenticated`, `account_action_required`, `error` 상태 표시 |
| `session.uid` | 본인 기기만 조회 |
| `session.email` | 화면 보조 설명에 마스킹 표시 가능 |
| `session.status` | active가 아니면 데이터 접근 차단 |
| `session.currentWorkspaceId` | 현재 서비스 함수 기준 `user_devices` 조회 조건 |
| `session.isSystemOwner` | system_owner 예외 안내 및 진단 표시 |
| `reloadSession` | 세션 다시 불러오기 버튼에 사용 가능 |

workspaceId가 완전히 불필요하지는 않습니다. 현재 `src/services/deviceService.ts`의 `listDevices(uid, workspaceId)`가 workspaceId를 요구하고, 현재 배포 rules도 workspace membership을 참조하기 때문입니다.

## 상태 처리

| 상태 | 화면 처리 |
| --- | --- |
| `initializing` / `loading_session` | “세션을 확인하는 중입니다.” |
| `signed_out` | “로그인이 필요합니다.” 자동 이동 없음 |
| `account_action_required` | 승인 대기/거절/비활성 안내. 기기 데이터 조회 없음 |
| `error` | 오류 안내와 “다시 확인” 버튼. 자동 로그아웃 없음 |
| `authenticated` + workspace 있음 | 본인 `user_devices` 읽기 |
| `authenticated` + workspace 없음 | 워크스페이스 선택 필요 안내 |

## 읽기 전용 표시 필드

권장 최소 필드:

| UI 표시명 | 데이터 출처 | 표시 정책 |
| --- | --- | --- |
| 현재 기기 | `deviceId`와 localStorage `pm:device:id`, 또는 `isCurrentDevice` | “현재 기기 추정”으로 표시 |
| 기기 종류 | `deviceType` | `desktop`, `mobile`을 한글 라벨로 표시 |
| 기기명 | `deviceName` | 너무 길면 축약 |
| 브라우저 | `browser`에서 파싱 | user agent 원문 표시 금지 |
| 운영체제 | `os` 또는 `browser`에서 파싱 | 원문이 길면 축약 |
| 첫 로그인 시간 | `lastLoginAt` | 날짜/시간 포맷 |
| 마지막 활동 | `lastActiveAt` | 날짜/시간 포맷 |
| 해제 상태 | `revokedAt` | 값이 있으면 “해제 요청됨/해제됨” 정도로 표시 |

표시하지 않을 필드:

- `uid`
- `workspaceId`
- `pushToken`
- raw `browser` user agent 원문
- token, cookie, fingerprint 계열 값

## 브라우저/OS 파싱 정책

`browser` 필드에는 현재 raw user agent가 들어갑니다. UI는 이 값을 그대로 보여주지 말고 클라이언트에서 다음처럼 요약해야 합니다.

- Chrome / Edge / Safari / Firefox / 기타
- Windows / macOS / Android / iOS / 기타

정확하지 않을 수 있으므로 세부 버전, 전체 user agent, 장치 fingerprint는 표시하지 않습니다.

## currentSession 표시 설계

현재 운영 앱은 `PMDeviceService.currentDeviceId()`로 `pm:device:id`를 만들고, Firebase 로그인 후처리도 이 값을 `user_devices/{deviceId}` 문서 ID로 사용합니다.

읽기 전용 화면에서는 다음 순서로 현재 기기를 추정합니다.

1. localStorage `pm:device:id`와 문서 ID 또는 `deviceId`가 일치하면 현재 기기
2. 일치하지 않지만 `isCurrentDevice === true`이고 `uid`가 본인이면 현재 기기 후보
3. 둘 다 아니면 일반 등록 기기

단, 여러 브라우저 탭이나 React `addDoc` 저장 문서가 섞이면 정확도가 떨어지므로 “추정” 라벨을 사용합니다.

## 제외 기능

이번 읽기 전용 단계에서 구현하지 않을 기능:

- 기기 로그아웃
- 특정 세션 해제
- 전체 기기 로그아웃
- 신뢰 기기 등록
- pushToken 갱신
- device fingerprint 생성
- IP/위치 표시

현재 `src/services/sessionService.ts`와 `services/sessionService.js` 모두 서버 함수 필요 TODO만 반환하므로, 세션 해제는 Cloud Functions + Firebase Admin SDK 설계 이후 별도 단계로 분리해야 합니다.

## 권한 Guard 제안

최소 권한:

```text
authenticated
```

추가 workspace 권한은 필수로 요구하지 않는 편이 안전합니다. 다만 현재 조회 함수가 `workspaceId`를 요구하므로, workspace가 없을 때는 데이터 조회를 하지 않고 안내만 표시합니다.

권한 없음 또는 비활성 상태:

```text
이 화면을 볼 권한이 없습니다.
```

자동 로그아웃, 자동 workspace 전환, Firestore write는 하지 않습니다.

## Rules 영향

현재 `firestore.rules` 기준:

- 본인 `uid` 기기 문서 읽기는 가능해야 합니다.
- create/update는 `workspaceId is string` 및 `isWorkspaceMember(workspaceId)` 조건을 요구합니다.
- workspace가 없는 계정은 로그인 기기 생성이 실패할 수 있습니다.

따라서 LoginDevices 읽기 전용 구현 전에 다음을 별도 단계에서 결정해야 합니다.

- workspace 없는 active 계정도 `user_devices`를 만들 수 있게 할지
- `workspaceId: null`을 허용할지
- 본인 uid 기준 읽기만으로 충분한지

이번 단계에서는 rules를 수정하지 않았습니다.

## 운영 앱 영향

이 설계는 문서만 추가하며 다음 파일을 수정하지 않습니다.

- `index.html`
- `app.js`
- 루트 `services/*`
- `firestore.rules`
- `firestore.rules.next`

따라서 운영 로그인, 기존 app.js 화면, Firebase 데이터에는 영향이 없습니다.

## 다음 단계 권고

1. `LoginDevices`를 신규 AuthProvider 기반 읽기 전용 화면으로 구현합니다.
2. `src/services/deviceService.ts`의 `listDevices` 반환 타입을 `UserDeviceDoc` 기반으로 정리합니다.
3. UI에는 파싱/마스킹된 필드만 표시합니다.
4. `pushToken`, raw user agent, UID, workspaceId는 숨깁니다.
5. 세션 해제 버튼은 구현하지 않고 “서버 기능 준비 전”으로 남깁니다.
6. workspaceId가 없는 계정의 안내 상태를 테스트합니다.
