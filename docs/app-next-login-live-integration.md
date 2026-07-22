# app-next 로그인 제한적 실연결

## 한 줄 요약

`/app-next.html`에 한해 신규 `AuthProvider` 기반 Google 로그인과 개발용 이메일/비밀번호 로그인을 제한적으로 연결했다. 운영 정적 앱(`index.html` + `app.js?v=111`)의 로그인 흐름은 변경하지 않았다.

## 적용 범위

- 대상 entry: `app-next.html`
- React entry: `src/app-next/main.tsx`
- 화면: `src/app-next/AppNext.tsx`
- 로그인 폼: `src/app-next/AppNextLogin.tsx`
- 플래그 유틸: `src/app-next/appNextUtils.ts`

`src/context/AuthContext.tsx`는 mount하지 않는다. app-next는 기존처럼 `AuthProvider -> LegacyAuthAdapterProvider -> AppNext` 구조만 사용한다.

## 기능 플래그

기본값은 꺼짐이다.

```text
VITE_ENABLE_APP_NEXT_LOGIN=false
```

개발 환경에서는 query override를 사용할 수 있다.

```text
http://127.0.0.1:5173/app-next.html?appNext=on&appNextLogin=on
http://127.0.0.1:5173/app-next.html?appNext=on&appNextLogin=off
```

우선순위:

1. development query `appNextLogin=on|off`
2. `VITE_ENABLE_APP_NEXT_LOGIN`
3. 기본값 `false`

production에서는 query override가 적용되지 않는다.

## 로그인 흐름

1. signed_out 상태에서 `appNextLogin`이 켜져 있으면 Google 로그인 버튼을 우선 표시한다.
2. 사용자가 로그인 유지 여부를 선택한다.
3. Google 버튼 클릭 시 Firebase Auth persistence를 설정한다.
4. `AuthProvider.signInWithGoogle()`만 호출한다.
5. 성공 후 화면 이동을 강제하지 않고 `onAuthStateChanged -> loadSessionReadOnlySafely` 전환을 기다린다.
6. 세션이 authenticated로 바뀌면 기존 app-next 계정 상태 화면으로 자연스럽게 전환된다.

이메일/비밀번호 로그인은 개발용 고급 옵션으로 접어둔다.

## Persistence

- 로그인 유지 해제: `browserSessionPersistence`
- 로그인 유지 체크: `browserLocalPersistence`

## 상태 처리

- loading: 세션 확인 중 안내, 제출 비활성화
- signed_out + 로그인 플래그 off: “현재 시험 로그인 화면은 비활성화되어 있습니다.”
- signed_out + 로그인 플래그 on: 로그인 폼 표시
- active: 계정 상태 화면 표시
- active + workspace null: 정상 상태로 표시, 로그아웃하지 않음
- pending/rejected/disabled: 상태 안내, 자동 로그아웃하지 않음
- error: 안전한 오류 안내, 자동 로그아웃하지 않음
- system_owner: 전역 역할로 표시

## 보안 및 안정성

- Firestore write API를 import하지 않는다.
- `signOut(auth)`를 호출하지 않는다.
- `useNavigate`, `window.location` 기반 redirect를 사용하지 않는다.
- app-next 세션 로더는 read-only 경로만 사용하며 user/workspace/member bootstrap을 수행하지 않는다.
- 동일 uid 세션 로드가 이미 진행 중이면 기존 in-flight load를 재사용한다.
- Firestore `resource-exhausted`가 발생하면 자동 재시도하지 않고 quota 안내 상태로 전환한다.
- Firebase 내부 용어, UID, token, stack trace를 사용자 오류에 표시하지 않는다.
- 중복 제출을 막기 위해 제출 중 버튼을 비활성화한다.
- 운영 정적 앱에서 app-next로 자동 이동하지 않는다.

## 운영 앱 영향 없음

다음 파일은 이번 로그인 연결에서 수정하지 않았다.

- `index.html`
- `app.js`
- `services/workspaceDataService.js`
- `src/context/AuthContext.tsx`
- `firestore.rules`
- `firestore.rules.next`

## 롤백

개발 환경에서 즉시 끄기:

```text
http://127.0.0.1:5173/app-next.html?appNext=on&appNextLogin=off
```

환경 변수 기본값도 `false`이므로 배포 환경에서는 별도 설정 없이는 로그인 폼이 표시되지 않는다.

## 남은 위험

- 실제 Firebase Auth 세션은 같은 origin(`127.0.0.1:5173`)에서 운영 정적 앱과 공유될 수 있다.
- 이 화면은 제한적 실연결이며, 운영 로그인 교체가 아니다.
- 회원가입과 비밀번호 재설정은 이번 범위에 포함하지 않았다.
- 운영 정적 앱 탭이 동시에 열려 있으면 같은 Firebase Auth 세션을 보고 기존 compat listener가 별도 작업을 수행할 수 있다. app-next 문제를 확인할 때는 운영 앱 탭을 먼저 닫고 재검증한다.
