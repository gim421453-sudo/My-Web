# React AuthProvider 통합 후보 조사

작성일: 2026-07-21

## 한 줄 결론

현재 일반 React 화면 중 신규 `AuthProvider`를 바로 적용할 수 있는 A 등급 화면은 없습니다. 대부분의 일반 `src/pages/*` 파일은 실제 UI와 라우트가 없는 placeholder이며, 운영 기능은 여전히 `index.html` + `app.js` 정적 앱이 담당합니다.

## 조사 범위

조사 대상:

- `src/pages/**/*.tsx`
- `src/components/**/*.tsx`
- `src/context/AuthContext.tsx`
- 개발 전용 React 진입점:
  - `src/dev-shadow/*`
  - `src/dev-diagnostics/*`
  - `src/dev-auth-preview/*`

제외 원칙:

- `index.html`, `app.js`, 루트 `services/*` 기반 운영 화면은 이번 React 후보 조사에서 제외
- Firestore write가 있는 화면 제외
- 로그인, 회원가입, 사용자 관리, 워크스페이스 관리, 승인 관리, 시간표, 방과후/동아리/특강, 공지 작성 제외

## 현재 React 구조 요약

현재 React/TypeScript 구조는 독립 운영 앱이라기보다 전환 준비 코드와 개발 전용 진단 화면이 섞여 있습니다.

- 일반 앱 라우팅용 `src/main.tsx`, `src/App.tsx`는 존재하지 않습니다.
- 실제 HTML 진입점은 개발 전용 화면 중심입니다.
  - `owner-admin-diagnostics.html`
  - `auth-provider-preview.html`
  - `shadow-auth-test.html`
- 일반 페이지 파일은 대부분 `return null`만 가진 placeholder입니다.
- 기존 React 인증은 `src/context/AuthContext.tsx`가 담당하지만, 실패 시 `signOut(auth)`를 호출하는 레거시 성격이 남아 있습니다.
- 신규 인증은 `src/auth/AuthProvider.tsx`, `src/auth/useAuth.ts`, `src/auth/sessionService.ts` 기준으로 분리되어 있습니다.

## 등급 기준

### A: 바로 적용 가능

- 실제 라우트 또는 HTML 진입점이 있음
- 화면 UI가 존재함
- Firestore write 없음
- 삭제, 승인, 설정 저장, 계정 수정 없음
- 신규 `useAuth()`로 바꿔도 운영 앱 영향이 없음
- `currentWorkspaceId === null`을 정상 상태로 표시 가능
- 권한 Guard를 최소 1개만 적용 가능

### B: 소규모 정리 후 적용 가능

- 파일은 있으나 UI나 라우트가 비어 있음
- 읽기 전용 화면으로 만들 수 있음
- 신규 Provider 연결 자체는 위험이 낮음
- 단, 실제 화면/라우트/문구를 조금 만들어야 하므로 이번 단계에서는 바로 통합하지 않음

### C: 아직 적용하면 안 됨

- 로그인, 회원가입, 사용자 관리, 설정 저장, 승인, 삭제, 운영 데이터 수정과 관련됨
- Firestore write가 있거나 향후 write 성격이 강함
- 기존 AuthContext/Guard와 라우팅 구조가 얽혀 있음
- 이미 이전 단계에서 개발 전용 검증 대상으로 사용했거나, 다음 일반 화면 전환 후보로 부적합함

## 후보별 상세

### 1. `src/pages/VerifyEmail.tsx`

- 화면/컴포넌트: `VerifyEmail`
- 실제 라우트/진입 방법: 현재 확인된 독립 진입점 없음
- 현재 인증 의존성: 없음
- localStorage 사용: 없음
- legacy role/currentRole/workspaceRole 사용: 없음
- Firestore read/write: 없음
- 요구 권한: 없음 또는 `authenticated`
- currentWorkspaceId 필요 여부: 필요 없음
- system_owner 처리: 별도 필요 없음
- 신규 AuthProvider 전환 난이도: 낮음
- 운영 영향도: 낮음
- 롤백 가능성: 높음
- 등급: B

판단: 계정 상태/이메일 인증 상태를 읽기 전용으로 표시하는 화면으로 만들기 좋습니다. 다만 현재 `return null`이라 실제 UI와 라우트가 없어 “바로 적용”은 아닙니다.

### 2. `src/pages/Settings/LoginDevices.tsx`

- 화면/컴포넌트: `LoginDevices`
- 실제 라우트/진입 방법: 현재 확인된 독립 진입점 없음
- 현재 인증 의존성: 없음
- localStorage 사용: 없음
- legacy role/currentRole/workspaceRole 사용: 없음
- Firestore read/write: 없음
- 요구 권한: `authenticated` 또는 `system.read`가 아닌 본인 기기 조회 권한
- currentWorkspaceId 필요 여부: 필수 아님
- system_owner 처리: 전역 오너라도 본인 기기 조회로 제한 가능
- 신규 AuthProvider 전환 난이도: 낮음-중간
- 운영 영향도: 낮음
- 롤백 가능성: 높음
- 등급: B

판단: “본인 로그인 기기 목록 읽기 전용”으로 제한하면 좋은 후보입니다. 단, 기기 해제/삭제 버튼이 들어가면 write 기능이 되므로 이번 통합 후보에서는 읽기 전용으로만 제한해야 합니다.

### 3. `src/pages/Settings/Notifications.tsx`

- 화면/컴포넌트: `Notifications`
- 실제 라우트/진입 방법: 현재 확인된 독립 진입점 없음
- 현재 인증 의존성: 없음
- localStorage 사용: 없음
- legacy role/currentRole/workspaceRole 사용: 없음
- Firestore read/write: 없음
- 요구 권한: `notices.read` 또는 본인 알림 읽기
- currentWorkspaceId 필요 여부: workspace 알림이면 필요, 개인 알림이면 선택
- system_owner 처리: `isSystemOwner`이면 시스템 알림 읽기 가능
- 신규 AuthProvider 전환 난이도: 중간
- 운영 영향도: 낮음
- 롤백 가능성: 높음
- 등급: B

판단: 알림 “설정” 화면으로 만들면 write 위험이 커집니다. 다음 단계에서는 설정 변경 없이 “알림 읽기 전용”으로만 좁혀야 합니다.

### 4. `src/pages/Login.tsx`

- 화면/컴포넌트: `LoginPage`
- 실제 라우트/진입 방법: React router 기반으로 작성되어 있으나 현재 일반 앱 진입점 없음
- 현재 인증 의존성: 기존 `src/context/AuthContext`
- localStorage 사용: 직접 사용 없음
- legacy role/currentRole/workspaceRole 사용: 직접 사용 없음
- Firestore read/write: 직접 없음. 기존 auth service 내부 의존
- 요구 권한: 없음
- currentWorkspaceId 필요 여부: 없음
- system_owner 처리: 로그인 후 세션 로딩에 영향
- 신규 AuthProvider 전환 난이도: 높음
- 운영 영향도: 큼
- 롤백 가능성: 중간
- 등급: C

판단: 로그인 화면은 명시 제외 대상입니다. 신규 Provider 전면 전환 단계 전까지 건드리면 안 됩니다.

### 5. `src/pages/Register.tsx`

- 화면/컴포넌트: `Register`
- 실제 라우트/진입 방법: 없음
- 현재 인증 의존성: 없음
- Firestore read/write: 없음
- 등급: C

판단: 회원가입은 명시 제외 대상입니다. 현재 placeholder라도 다음 통합 후보로 삼지 않습니다.

### 6. `src/pages/ForgotPassword.tsx`

- 화면/컴포넌트: `ForgotPassword`
- 실제 라우트/진입 방법: 없음
- 현재 인증 의존성: 없음
- Firestore read/write: 없음
- 등급: C

판단: 비밀번호 재설정은 인증 액션 화면입니다. 읽기 전용 후보가 아니므로 제외합니다.

### 7. `src/pages/Settings/UserManagement.tsx`

- 화면/컴포넌트: `UserManagement`
- 실제 라우트/진입 방법: 없음
- 현재 인증 의존성: 없음
- Firestore read/write: 현재 파일 자체는 없음
- 예상 요구 권한: `members.read`, `members.manage_lower_roles`, `members.manage_super_manager`
- currentWorkspaceId 필요 여부: 필요
- system_owner 처리: 민감
- 신규 AuthProvider 전환 난이도: 높음
- 운영 영향도: 큼
- 롤백 가능성: 낮음-중간
- 등급: C

판단: 사용자 관리는 명시 제외 대상입니다. placeholder라도 다음 후보로 사용하지 않습니다.

### 8. `src/components/ProtectedRoute.tsx`

- 화면/컴포넌트: `ProtectedRoute`
- 실제 라우트/진입 방법: 화면이 아니라 guard 컴포넌트
- 현재 인증 의존성: 기존 `src/context/AuthContext`
- legacy role/currentRole/workspaceRole 사용: `session.currentRole`
- Firestore read/write: 없음
- 등급: C

판단: 화면이 아니며 기존 Guard 교체는 금지 사항입니다. 다음 화면 통합 대상이 아닙니다.

### 9. `src/components/guards/RequireAuth.tsx`

- 화면/컴포넌트: `RequireAuth`
- 실제 라우트/진입 방법: 화면이 아니라 guard 컴포넌트
- 현재 인증 의존성: 기존 `src/context/AuthContext`
- Firestore read/write: 없음
- 등급: C

판단: 기존 Guard 교체 금지 조건 때문에 제외합니다.

### 10. `src/components/guards/RequireWorkspaceRole.tsx`

- 화면/컴포넌트: `RequireWorkspaceRole`
- 실제 라우트/진입 방법: 화면이 아니라 guard 컴포넌트
- 현재 인증 의존성: 기존 `src/context/AuthContext`
- legacy role/currentRole/workspaceRole 사용: 기존 `utils/permissions`
- Firestore read/write: 없음
- 등급: C

판단: 기존 Guard 교체 금지 조건 때문에 제외합니다.

### 11. `src/dev-shadow/ShadowAuthTestApp.tsx`

- 화면/컴포넌트: `ShadowAuthTestApp`
- 실제 진입: `http://127.0.0.1:5173/shadow-auth-test.html`
- 현재 인증 의존성: Firebase Auth 직접 읽기 + shadow 비교
- localStorage/sessionStorage: legacy snapshot 읽기 전용
- Firestore read: shadow read repository
- Firestore write: 없음
- 등급: C

판단: 이미 3단계 3차에서 신규 Provider 선택 연결 대상이었습니다. 다음 신규 후보로 재사용하지 않습니다.

### 12. `src/dev-diagnostics/OwnerAdminDiagnosticsApp.tsx`

- 화면/컴포넌트: `OwnerAdminDiagnosticsApp`
- 실제 진입: `http://127.0.0.1:5173/owner-admin-diagnostics.html?newAuth=on`
- 현재 인증 의존성: 신규 Provider 선택 연결 또는 legacy direct
- Firestore read: shadow read repository
- Firestore write: 없음
- 등급: C

판단: 이미 3단계 1차에서 검증했습니다. 관리자 버그 수집용 개발 화면이라 다음 일반 화면 후보가 아닙니다.

### 13. `src/dev-auth-preview/AuthProviderPreviewApp.tsx`

- 화면/컴포넌트: `AuthProviderPreviewApp`
- 실제 진입: `http://127.0.0.1:5173/auth-provider-preview.html?preview=on`
- 현재 인증 의존성: 신규 `AuthProvider`
- Firestore write: 없음
- 등급: C

판단: 이미 3단계 2차 성격의 실제 Provider 미리보기 화면으로 사용했습니다. 다음 일반 React 후보가 아닙니다.

## 최종 추천 후보

### 1순위: `VerifyEmail`

- 선택 이유: 계정 상태 표시 성격이며 workspace 데이터가 필요 없습니다.
- 예상 수정 파일:
  - `src/pages/VerifyEmail.tsx`
  - 향후 라우트/진입점 파일
- 필요 권한: `authenticated`
- 위험 요소: 현재 실제 UI와 라우트가 없어 작은 화면 구현이 필요합니다.
- 브라우저 확인 방법: 향후 지정되는 라우트에서 `http://127.0.0.1:5173/...` 기준으로 확인
- 롤백 방식: 해당 라우트만 기존 placeholder 또는 legacy provider 경로로 되돌림

### 2순위: `LoginDevices`

- 선택 이유: 본인 세션/기기 목록 읽기 전용으로 제한하면 workspaceId 의존이 낮습니다.
- 예상 수정 파일:
  - `src/pages/Settings/LoginDevices.tsx`
  - 향후 라우트/진입점 파일
- 필요 권한: `authenticated`
- 위험 요소: 기기 삭제/해제 기능을 넣으면 write 화면이 되어 이번 단계 범위를 벗어납니다.
- 브라우저 확인 방법: 향후 지정되는 라우트에서 `http://127.0.0.1:5173/...` 기준으로 확인
- 롤백 방식: 기능 플래그 off 또는 read-only 컴포넌트 제거

### 3순위: `Notifications`

- 선택 이유: 알림 읽기 전용 화면으로 제한하면 신규 session/permission 표시 테스트에 적합합니다.
- 예상 수정 파일:
  - `src/pages/Settings/Notifications.tsx`
  - 향후 라우트/진입점 파일
- 필요 권한: 개인 알림은 `authenticated`, workspace 공지는 `notices.read`
- 위험 요소: 알림 설정 저장, 읽음 처리, 푸시 토큰 갱신은 write이므로 제외해야 합니다.
- 브라우저 확인 방법: 향후 지정되는 라우트에서 `http://127.0.0.1:5173/...` 기준으로 확인
- 롤백 방식: 기능 플래그 off 또는 read-only 컴포넌트 제거

## 권고

현재 일반 React 화면 중 안전하게 바로 전환할 A 후보는 없습니다.

다음 단계로 진행한다면 “기존 placeholder를 읽기 전용 계정 상태 화면으로 최소 구현하고 신규 AuthProvider를 붙이는” 방식이 가장 안전합니다. 그 대상은 `VerifyEmail`이 가장 적절합니다.

단, 사용자가 “기존 화면만, 새 UI 구현 없음”을 계속 요구한다면 운영 React 전환은 보류하고 개발 전용 화면 검증을 유지하는 것이 맞습니다.
