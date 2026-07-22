# LoginDevices 신규 AuthProvider 테스트 체크리스트

브라우저 주소는 `127.0.0.1`만 사용합니다.

## 자동 테스트 결과

검증 명령:

```powershell
npm.cmd run typecheck
npm.cmd test
npm.cmd run build
```

테스트 스크립트에 LoginDevices 관련 항목을 추가했습니다.

## 필수 테스트 매핑

| 번호 | 항목 | 자동/수동 | 결과 기준 |
| --- | --- | --- | --- |
| 1 | 기능 플래그 기본 false | 자동 | `resolveLoginDevicesNewAuthFlag` false |
| 2 | query on | 자동/수동 | `?newAuthDevices=on`에서 신규 화면 |
| 3 | query off 우선 | 자동/수동 | env true보다 query off 우선 |
| 4 | initializing 화면 | 자동 | 안내 문구 존재 |
| 5 | signed_out 화면 | 자동/수동 | 로그인 필요 안내, 자동 이동 없음 |
| 6 | loading_session 화면 | 자동 | 계정 정보 로딩 문구 |
| 7 | authenticated 화면 | 자동/수동 | 기기 목록 표시 상태 |
| 8 | account_action_required 화면 | 자동 | 접근 제한 안내 |
| 9 | error 화면 | 자동 | 계정 정보 오류 안내 |
| 10 | active 계정 조회 | 자동/수동 | active에서만 조회 시도 |
| 11 | pending 조회 차단 | 자동 | pending 문구 |
| 12 | rejected 조회 차단 | 자동 | rejected 문구 |
| 13 | disabled 조회 차단 | 자동 | disabled 문구 |
| 14 | uid 필터 적용 | 자동 | 현재 uid만 남음 |
| 15 | 다른 uid 데이터 제외 | 자동 | 다른 uid 결과 0개 |
| 16 | workspaceId null 안내 | 자동/수동 | 로그인 유지 안내 |
| 17 | Firestore 결과 우선 | 수동 | Firestore 결과 있으면 local fallback 미사용 |
| 18 | local fallback 사용 | 자동/수동 | Firestore 실패/빈 결과 때만 사용 |
| 19 | deviceId 중복 제거 | 자동 | 중복 1개로 표시 |
| 20 | current device 표시 | 자동/수동 | 현재 사용 중 표시 |
| 21 | current device 중복 경고 | 자동 | 중복 경고 문구 |
| 22 | revokedAt 상태 표시 | 자동 | 해제된 기기 |
| 23 | Timestamp 정규화 | 자동 | Firestore Timestamp 처리 |
| 24 | 잘못된 시간값 처리 | 자동 | 확인할 수 없음 |
| 25 | pushToken 미표시 | 자동 | 정규화 결과에 미포함 |
| 26 | 전체 UID 미표시 | 자동 | 표시 필드에 UID 없음 |
| 27 | 전체 workspaceId 미표시 | 자동 | 표시 필드에 workspaceId 없음 |
| 28 | permission-denied 안내 | 자동/수동 | 보안 설정 안내 |
| 29 | reloadSession 실패 시 자동 로그아웃 없음 | 자동 | signOut 호출 없음 |
| 30 | Firestore write 없음 | 자동 | write API import 없음 |
| 31 | localStorage write 없음 | 자동 | set/remove/clear 없음 |
| 32 | Auth 사용자 수정 없음 | 자동 | Auth 변경 API 없음 |
| 33 | 기존 LoginDevices fallback 유지 | 자동/수동 | off에서 `return null` placeholder |

## 브라우저 수동 확인

1. 개발 서버 실행

```powershell
npm.cmd run dev -- --host 127.0.0.1 --port 5173
```

2. 기존 모드 확인

```text
http://127.0.0.1:5173/login-devices.html?newAuthDevices=off
```

기대 결과:

- 기존 placeholder 유지
- 신규 AuthProvider 화면이 표시되지 않음

3. 신규 모드 확인

```text
http://127.0.0.1:5173/login-devices.html?newAuthDevices=on
```

기대 결과:

- 로그인 상태면 계정 기준/기기 목록 화면 표시
- 미로그인 상태면 “로그인이 필요합니다.”
- 자동 리다이렉트 없음
- 자동 로그아웃 없음

4. 계정 상태 확인

- active: 기기 목록 조회 시도
- pending/rejected/disabled: 목록 조회 없이 상태 안내
- currentWorkspaceId 없음: workspace 안내만 표시

5. 보안 오류 확인

Firestore rules 때문에 `permission-denied`가 발생하면 다음 문구가 표시되어야 합니다.

```text
현재 보안 설정으로는 로그인 기기 목록을 불러올 수 없습니다.
로그인은 정상적으로 유지되고 있습니다.
```

## 민감 정보 확인

화면과 콘솔에서 다음이 노출되지 않는지 확인합니다.

- `pushToken`
- 전체 UID
- 전체 workspaceId
- raw user agent
- token/cookie/fingerprint
- API key

## 롤백 확인

다음 URL로 기존 모드 복귀:

```text
http://127.0.0.1:5173/login-devices.html?newAuthDevices=off
```

또는 `.env`:

```text
VITE_ENABLE_NEW_AUTH_LOGIN_DEVICES=false
```

## 다음 단계 후보

- 실제 브라우저에서 Firestore `user_devices` permission-denied 여부 확인
- workspaceId 없는 active 계정 정책 확정
- 세션 해제/기기 로그아웃은 Cloud Functions + Admin SDK 설계 후 별도 구현
