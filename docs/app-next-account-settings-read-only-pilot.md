# app-next 계정 상태 및 설정 읽기 전용 Pilot

## 한 줄 요약

`/app-next.html` 안에 신규 `AuthProvider` 기반 계정 상태와 설정 요약 읽기 전용 화면을 추가한다. 운영 정적 앱 `index.html + app.js`는 변경하지 않는다.

## 진입 주소

- `http://127.0.0.1:5173/app-next.html#/account`
- `http://127.0.0.1:5173/app-next.html#/settings-readonly`
- 롤백 비교: `http://127.0.0.1:5173/app-next.html?newAuthRequireAuth=off#/account`

## Provider 및 Guard

구조:

```text
AuthProvider
→ LegacyAuthAdapterProvider
→ RequireAuth
→ AppNextAccountReadOnly
```

이 파일럿은 기존 `src/context/AuthContext.tsx`를 mount하지 않는다. 운영 앱의 로그인 가드, 시간표, 공지 작성·삭제 흐름도 건드리지 않는다.

## 표시 항목

계정 상태 화면은 신규 AppSession과 Firebase Auth 현재 사용자 상태에서 다음 범주만 표시한다.

- authenticated 여부
- status
- emailVerified
- 로그인 제공자 범주: Google, 이메일/비밀번호, 복수 제공자, 알 수 없음
- persistence 범주: local, session, none, unknown
- 마스킹된 이메일
- warning 개수
- global role 범주
- workspace role 범주
- workspace 존재 여부
- system owner 여부

전체 이메일, UID, 전체 workspaceId, 문서 ID, 토큰, Firebase 설정값은 표시하지 않는다.

## 쓰기 금지

계정/설정 읽기 전용 화면에서는 다음을 호출하지 않는다.

- `sendEmailVerification`
- `updateEmail`
- `updatePassword`
- `sendPasswordResetEmail`
- `deleteUser`
- `linkWithCredential`
- `unlink`
- `reauthenticateWithCredential`
- `setPersistence`
- `signOut`
- Firestore `getDoc/getDocs/onSnapshot/addDoc/setDoc/updateDoc/deleteDoc/writeBatch/runTransaction`

화면 진입 기준 기대 카운트:

```text
accountReadCount = 0
accountWriteAttemptCount = 0
accountActiveListenerCount = 0
settings.writeControlCount = 0
settings.writeAttemptCount = 0
```

## 상태 처리

- `active`: 계정/설정 화면 표시
- `active + currentWorkspaceId=null`: 정상 표시, 워크스페이스 없음 안내
- `system_owner`: 전역 역할로만 표시, workspace role로 변환하지 않음
- `pending/rejected/disabled`: 계정 상태 안내 route로 유지, 읽기 전용 설정 화면은 렌더하지 않음
- `signed_out/loading/error`: 기존 app-next route policy에 따른 안내, 자동 로그아웃 없음

## 개발 진단

개발 환경에서만 다음 snapshot을 사용할 수 있다.

```js
window.PMAppNextAccountDiagnostics?.snapshot?.()
window.PMAppNextSettingsReadOnlyDiagnostics?.snapshot?.()
```

진단에는 민감값 대신 범주와 카운터만 포함한다.

## 수동 비교 체크리스트

1. `http://127.0.0.1:5173/app-next.html#/account` 진입
2. 계정 상태가 표시되는지 확인
3. 이메일이 마스킹되어 있는지 확인
4. 인증 메일 발송, 비밀번호 변경, 계정 삭제, 저장 버튼이 없는지 확인
5. `window.PMAppNextAccountDiagnostics?.snapshot?.()`에서 read/write/listener 카운트가 0인지 확인
6. `http://127.0.0.1:5173/app-next.html#/settings-readonly` 진입
7. 설정 요약이 읽기 전용으로 표시되는지 확인
8. `window.PMAppNextSettingsReadOnlyDiagnostics?.snapshot?.()`에서 write control/write attempt가 0인지 확인
9. 운영 앱 `http://127.0.0.1:5173/`의 로그인, 시간표 V111, 공지 흐름이 그대로인지 확인

## 롤백

개발 환경에서는 `?newAuthRequireAuth=off`로 계정/설정 파일럿의 `RequireAuth` 소비자를 비활성 안내 화면으로 되돌릴 수 있다. 운영 정적 앱으로 자동 이동하지 않는다.

