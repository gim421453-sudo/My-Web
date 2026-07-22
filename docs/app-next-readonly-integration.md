# app-next 읽기 전용 React 실연결

## 한 줄 요약

`/app-next.html`은 기존 운영 정적 앱(`index.html + app.js?v=111`)과 분리된 신규 AuthProvider 기반 읽기 전용 React entry입니다.

## 선택한 첫 화면

첫 연결 화면은 `VerifyEmail` 성격의 계정 상태 및 이메일 인증 확인 화면입니다.

선택 이유:

- Firestore write 없이 Firebase Auth 상태만 확인할 수 있습니다.
- 계정 상태, 이메일 인증 여부, system_owner 판정, workspace null 상태를 읽기 전용으로 검증할 수 있습니다.
- 시간표, 사용자 관리, 승인, 역할 변경 같은 운영 데이터 변경 기능과 연결되지 않습니다.

## Entry 구조

- `app-next.html`
- `src/app-next/main.tsx`
- `src/app-next/AppNext.tsx`
- `src/app-next/appNextUtils.ts`
- `src/app-next/styles.css`

Vite build 산출물에 `app-next.html`이 포함되도록 `vite.config.js`의 `build.rollupOptions.input`에 독립 HTML entry를 등록했습니다.

## Provider 구성

```text
AuthProvider
→ LegacyAuthAdapterProvider
→ AppNext
```

`src/context/AuthContext.tsx`는 mount하지 않습니다.

미사용 근거:

- legacy AuthContext에는 세션 로드 실패 시 `signOut(auth)` 위험이 있습니다.
- app-next는 신규 인증 상태만 읽고 자동 로그아웃을 수행하지 않는 실연결 시험 화면입니다.

## 상태별 처리

| 상태 | 처리 |
| --- | --- |
| loading / initializing | 대기 화면 |
| signed_out | 로그인 필요 안내 |
| active | 계정 상태 표시 |
| active + workspace null | 정상 계정으로 표시하고 “현재 선택된 워크스페이스가 없습니다.” 안내 |
| pending | 승인 대기 안내 |
| rejected | 승인 거절 안내 |
| disabled | 비활성 안내 |
| error | 안전한 오류 안내, 자동 로그아웃 없음 |
| system_owner | 전역 역할로 표시, workspace role로 변환하지 않음 |

## 허용 Auth 작업

명시적 사용자 클릭으로만 실행합니다.

- `sendEmailVerification(firebaseUser)`
- `firebaseUser.reload()`
- `reloadSession()`

## 금지 작업

- Firestore write
- users 문서 수정
- status/role/workspace/membership 수정
- 자동 signOut
- 운영 정적 앱 자동 이동

## Feature Flag

환경 변수:

```text
VITE_ENABLE_APP_NEXT=false
```

개발 환경 query override:

```text
?appNext=on
?appNext=off
```

우선순위:

```text
query → env → false
```

production에서는 query override가 무시됩니다. production에서 이 entry를 열려면 배포 환경변수로 `VITE_ENABLE_APP_NEXT=true`를 명시해야 하며, 기본값은 false입니다.

## 브라우저 확인 주소

```text
http://127.0.0.1:5173/app-next.html?appNext=on
```

flag off 확인:

```text
http://127.0.0.1:5173/app-next.html
http://127.0.0.1:5173/app-next.html?appNext=off
```

## 개발 진단

개발 환경에서만 다음을 화면에 표시합니다.

- entry: `app-next`
- provider: `new`
- legacy AuthContext mounted: `false`
- LegacyAuthAdapter mounted
- Firestore write: `none`
- automatic signOut: `none`
- operational static app: `unchanged`

## 운영 앱 영향

다음 파일은 수정하지 않았습니다.

- `index.html`
- `app.js`
- `services/workspaceDataService.js`
- `src/context/AuthContext.tsx`
- `firestore.rules`
- `firestore.rules.next`

운영 정적 앱에서 `/app-next.html`로 자동 이동하는 연결도 추가하지 않았습니다.

## 남은 위험

- 실제 이메일 인증 메일 발송은 Firebase Auth 현재 사용자 세션에 의존하므로 브라우저에서 직접 확인해야 합니다.
- production build에서 `VITE_ENABLE_APP_NEXT=true`를 넣으면 entry가 활성화될 수 있으므로 배포 환경 변수는 기본 false를 유지해야 합니다.
- 이 화면은 읽기 전용 실연결 검증용이며 운영 React 라우터 전환을 의미하지 않습니다.

## 다음 단계 권고

1. `http://127.0.0.1:5173/app-next.html?appNext=on`에서 오너/일반 계정 상태를 확인합니다.
2. 이메일 미인증 계정에서 인증 메일 발송 버튼을 수동으로 확인합니다.
3. Firestore write가 발생하지 않는지 Network 탭에서 확인합니다.
4. 문제가 없을 때만 다음 읽기 전용 React entry 또는 제한 route 연결을 검토합니다.
