# app-next Google 로그인 통합

## 한 줄 요약

실사용 계정이 Google 로그인 계정이므로 `/app-next.html`의 신규 로그인 화면에 Google popup 로그인을 우선 추가했다. 운영 정적 앱의 Google 로그인과 bootstrap/write 흐름은 변경하지 않았다.

## 기존 운영 앱 Google 로그인 방식

기존 운영 정적 앱은 다음 경로를 사용한다.

```text
services/authService.js
firebaseLoginWithGoogle()
```

방식:

```text
GoogleAuthProvider
provider.setCustomParameters({ prompt: "select_account" })
signInWithPopup(...)
```

운영 앱은 Google 인증 성공 후 다음 후속 작업을 수행한다.

```text
firebaseEnsureUserStructure(...)
firebaseRegisterDevice(...)
firebaseCreateWelcomeNotification(...)
```

따라서 운영 앱 경로는 Firestore write가 발생할 수 있다.

## app-next Google 로그인 방식

app-next는 같은 popup 방식을 사용하되 인증만 수행한다.

```text
AuthProvider.signInWithGoogle()
GoogleAuthProvider
prompt: "select_account"
signInWithPopup(auth, provider)
```

성공 후:

```text
onAuthStateChanged
-> loadSessionReadOnlySafely
-> AppNext 상태 판정
```

## Firestore write 차단

app-next Google 로그인 함수는 다음을 수행하지 않는다.

- users 문서 생성/수정
- membership 생성/수정
- workspace bootstrap
- role/status 보정
- currentWorkspaceId 보정
- user_devices write
- notification write
- 운영 앱 redirect
- 자동 signOut

## UI 정책

- `appNextLogin`이 켜진 signed_out 상태에서 `Google로 로그인`을 우선 표시한다.
- 이메일/비밀번호 로그인은 개발용 고급 옵션으로 접어둔다.
- Google 로그인 중에는 버튼을 비활성화해 중복 popup 호출을 막는다.
- 취소/실패 시 로그인 화면을 유지한다.

## 오류 문구

사용자 화면에 Firebase 내부 값, token, UID, credential, stack trace를 표시하지 않는다.

처리 문구:

- `auth/popup-closed-by-user`: Google 로그인 창이 닫혔습니다.
- `auth/cancelled-popup-request`: 이전 Google 로그인 요청이 취소되었습니다. 다시 시도해 주세요.
- `auth/popup-blocked`: 브라우저에서 팝업을 허용해 주세요.
- `auth/account-exists-with-different-credential`: 이미 다른 로그인 방식으로 등록된 계정입니다.
- `auth/network-request-failed`: 네트워크 연결을 확인해 주세요.
- `auth/too-many-requests`: 로그인 시도가 너무 많습니다. 잠시 후 다시 시도해 주세요.
- `auth/unauthorized-domain`: 현재 도메인에서는 Google 로그인을 사용할 수 없습니다.

## COOP 경고

이전 콘솔의 `Cross-Origin-Opener-Policy policy would block the window.closed call` 경고는 Chrome/Firebase popup 흐름에서 비치명적으로 보일 수 있다. 현재 Vite 설정에서 COOP 보안 헤더를 강제로 설정하는 코드는 확인되지 않았다.

실제 Google 인증이 실패할 때만 redirect fallback을 별도로 검토한다. 경고를 숨기기 위해 보안 헤더를 약화하지 않는다.

## 브라우저 확인

```text
http://127.0.0.1:5173/app-next.html?appNext=on&appNextLogin=on
```

확인 순서:

1. 기존 운영 앱 탭을 모두 닫는다.
2. app-next 단독으로 연다.
3. Google 로그인 1회만 실행한다.
4. app-next 진단에서 `session write count = 0`, `bootstrap attempt count = 0`을 확인한다.
5. 콘솔에서 `commit user workspace bootstrap` 신규 로그가 없는지 확인한다.

## fallback

현재 선택은 popup이다. redirect fallback은 이번 단계에서 구현하지 않았다.

이유:

- 기존 운영 앱도 popup을 사용한다.
- app-next는 독립 entry라 popup 성공 후 같은 entry 상태 전환이 단순하다.
- popup과 redirect를 동시에 지원하면 세션 load 중복과 flag 보존 위험이 커진다.
