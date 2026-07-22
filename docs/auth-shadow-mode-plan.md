# Auth Shadow Mode Plan

## 목적

2.5단계 Shadow Mode는 기존 `index.html + app.js` 운영 인증 흐름을 그대로 두고, 신규 `src/auth` 모듈이 같은 Firebase 사용자를 읽어 계산한 `AppSession`을 병렬 비교하기 위한 검증 계층입니다.

Shadow 결과는 권한 판정, 화면 이동, 로그아웃, Firestore 수정에 사용하지 않습니다. 차이와 warning만 개발 환경 콘솔 또는 테스트 fixture에서 확인합니다.

## 병행 구조

```text
기존 app.js / 기존 AuthContext
  - 실제 로그인
  - 기존 UI 표시
  - 기존 권한 판정
  - 기존 라우팅과 로그아웃 담당

src/auth/shadow
  - 기존 세션 snapshot 읽기
  - 신규 sessionService로 AppSession 계산
  - 두 결과 비교
  - 개발 전용 마스킹 로그 출력
```

## 읽기 전용 보장

Shadow Mode는 다음 후보를 읽기만 합니다.

- `window.PM_AUTH_SHADOW_LEGACY_SNAPSHOT`
- `window.PMAuthLegacySession`
- `window.PM_CURRENT_USER`
- `window.PMAuthService.loadAuthState()`
- `localStorage["pm-auth-v31"]`
- `sessionStorage["pm-current-user"]`
- Firebase compat `window.firebase.auth().currentUser`

Shadow Mode는 다음 작업을 하지 않습니다.

- `localStorage` / `sessionStorage` 저장
- Firestore write
- Auth 사용자 수정
- `users.globalRole` 또는 `currentWorkspaceId` 수정
- workspace/member 문서 수정
- 기존 사용자 로그아웃
- 기존 화면 이동
- 기존 guard 교체
- Rules 변경 또는 배포

## 신규 AppSession 계산

신규 `buildAppSession()` 정책을 그대로 사용합니다.

- `systemOwners/{uid}` 존재 시 `globalRole: "system_owner"`
- `users.globalRole` 불일치는 `GLOBAL_ROLE_MISMATCH` warning
- `users.role/currentRole/workspaceRole`의 `system_owner` 값은 `LEGACY_ROLE_PRESENT` warning
- 잘못된 `currentWorkspaceId`는 세션 workspace로 사용하지 않음
- system owner는 유효 owner workspace의 nested `super_manager` 멤버십을 fallback으로 계산 가능
- Firestore 문서는 자동 수정하지 않음

## 개발 환경 전용 로그

`ShadowAuthObserver`의 기본값은 `enableLogging = import.meta.env.DEV`입니다.

로그에는 다음만 포함합니다.

- 마스킹된 uid
- 마스킹된 email
- 비교 boolean 요약
- mismatch code/severity/message
- session warning code/message
- timestamp

로그에는 다음을 포함하지 않습니다.

- 전체 UID
- 전체 이메일
- Firebase token
- 초대 코드
- 전화번호
- 서비스 계정 정보
- Firestore 문서 전체 원문

## 단계적 연결 방법

1. fixture 테스트에서 `src/auth/shadow` 동작 확인
2. React 전환 화면에서만 `ShadowAuthObserver`를 dev 전용으로 삽입
3. 실제 Firebase 사용자로 콘솔 comparison 확인
4. mismatch가 운영 앱 동작과 다를 때 문서화
5. 운영 app.js에는 아직 연결하지 않음
6. mismatch 기준이 안정화된 뒤에만 실제 AuthProvider/RouteGuard 연결 후보 재검토

## 실제 연결 지점 후보

이번 단계에서는 연결하지 않습니다. 이후 후보만 기록합니다.

- React 전환 앱의 최상단 `AuthProvider` 내부 또는 주변
- 신규 `/debug/auth-shadow` 같은 개발 전용 화면
- Vite dev 빌드에서만 렌더링되는 진단 컴포넌트

`index.html`, `app.js`, 루트 `services/*.js`에 직접 연결하는 것은 기존 운영 로그인 안정화 전까지 보류합니다.
