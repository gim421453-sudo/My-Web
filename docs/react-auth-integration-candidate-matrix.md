# React AuthProvider 통합 후보 매트릭스

작성일: 2026-07-21

## 요약

| 등급 | 개수 | 의미 |
|---|---:|---|
| A | 0 | 현재 상태에서 바로 신규 `AuthProvider` 적용 가능 |
| B | 3 | 소규모 UI/라우트 정리 후 읽기 전용으로 적용 가능 |
| C | 10 | 제외 대상, 이미 검증 완료, 또는 아직 적용하면 안 됨 |

## 등급 기준

| 등급 | 기준 |
|---|---|
| A | 실제 화면/진입점이 있고, Firestore write가 없고, 운영 영향 없이 신규 Provider를 바로 적용 가능 |
| B | 파일은 있으나 placeholder이거나 라우트가 없어 소규모 정리 후 적용 가능 |
| C | 명시 제외 대상, write 위험, 기존 Guard 교체 대상, 이미 이전 단계에서 검증된 개발 화면 |

## 후보 매트릭스

| 등급 | 파일 | 화면/컴포넌트 | 진입 방법 | 현재 인증 의존성 | storage | legacy role 사용 | Firestore read | Firestore write | 요구 권한 | workspace 필요 | system_owner 처리 | 난이도 | 운영 영향 | 롤백 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| B | `src/pages/VerifyEmail.tsx` | `VerifyEmail` | 없음 | 없음 | 없음 | 없음 | 없음 | 없음 | `authenticated` | 아니오 | 별도 처리 불필요 | 낮음 | 낮음 | 높음 |
| B | `src/pages/Settings/LoginDevices.tsx` | `LoginDevices` | 없음 | 없음 | 없음 | 없음 | 없음 | 없음 | `authenticated` | 아니오 | 본인 기기 조회로 제한 | 낮음-중간 | 낮음 | 높음 |
| B | `src/pages/Settings/Notifications.tsx` | `Notifications` | 없음 | 없음 | 없음 | 없음 | 없음 | 없음 | `authenticated` 또는 `notices.read` | 선택 | 오너는 읽기 허용 가능 | 중간 | 낮음 | 높음 |
| C | `src/pages/Login.tsx` | `LoginPage` | React router 가정, 현재 앱 진입 없음 | 기존 `src/context/AuthContext` | 직접 없음 | 직접 없음 | 간접 가능 | 간접 가능 | 없음 | 아니오 | 로그인 흐름에 영향 | 높음 | 큼 | 중간 |
| C | `src/pages/Register.tsx` | `Register` | 없음 | 없음 | 없음 | 없음 | 없음 | 없음 | 없음 | 아니오 | 해당 없음 | 높음 | 큼 | 중간 |
| C | `src/pages/ForgotPassword.tsx` | `ForgotPassword` | 없음 | 없음 | 없음 | 없음 | 없음 | 없음 | 없음 | 아니오 | 해당 없음 | 중간 | 중간 | 중간 |
| C | `src/pages/Settings/UserManagement.tsx` | `UserManagement` | 없음 | 없음 | 없음 | 없음 | 없음 | 현재는 없음, 기능상 write 예상 | `members.read/manage` | 예 | 민감 | 높음 | 큼 | 낮음-중간 |
| C | `src/components/ProtectedRoute.tsx` | `ProtectedRoute` | 화면 아님 | 기존 `src/context/AuthContext` | 없음 | `session.currentRole` | 없음 | 없음 | 메뉴별 | 예 | 기존 service 기준 | 높음 | 큼 | 중간 |
| C | `src/components/guards/RequireAuth.tsx` | `RequireAuth` | 화면 아님 | 기존 `src/context/AuthContext` | 없음 | 없음 | 없음 | 없음 | 인증 | 아니오 | 해당 없음 | 높음 | 큼 | 중간 |
| C | `src/components/guards/RequireWorkspaceRole.tsx` | `RequireWorkspaceRole` | 화면 아님 | 기존 `src/context/AuthContext` | 없음 | 기존 `utils/permissions` | 없음 | 없음 | role guard | 예 | 기존 role helper | 높음 | 큼 | 중간 |
| C | `src/dev-shadow/ShadowAuthTestApp.tsx` | `ShadowAuthTestApp` | `http://127.0.0.1:5173/shadow-auth-test.html` | Firebase Auth direct + shadow | 읽기 전용 | 읽기 전용 | 있음 | 없음 | 개발 진단 | 선택 | shadow 비교 | 이미 적용 | 낮음 | 높음 |
| C | `src/dev-diagnostics/OwnerAdminDiagnosticsApp.tsx` | `OwnerAdminDiagnosticsApp` | `http://127.0.0.1:5173/owner-admin-diagnostics.html?newAuth=on` | 선택형 신규 Provider | 읽기 전용 | 읽기 전용 | 있음 | 없음 | 개발 진단 | 선택 | 표시 전용 | 이미 적용 | 낮음 | 높음 |
| C | `src/dev-auth-preview/AuthProviderPreviewApp.tsx` | `AuthProviderPreviewApp` | `http://127.0.0.1:5173/auth-provider-preview.html?preview=on` | 신규 Provider | 읽기 전용 | 읽기 전용 | Provider 내부 read | 없음 | 개발 미리보기 | 선택 | 표시 전용 | 이미 적용 | 낮음 | 높음 |

## 추천 후보 Top 3

| 순위 | 후보 | 선택 이유 | 예상 수정 파일 | 필요 권한 | 위험 요소 | 확인 주소 기준 | 롤백 |
|---:|---|---|---|---|---|---|---|
| 1 | `VerifyEmail` | 계정 상태 표시라 workspace 데이터 없이 검증 가능 | `src/pages/VerifyEmail.tsx`, 향후 라우트 | `authenticated` | 현재 UI/라우트 없음 | `http://127.0.0.1:5173` | 플래그 off 또는 placeholder 복귀 |
| 2 | `LoginDevices` | 본인 기기 읽기 전용으로 제한 가능 | `src/pages/Settings/LoginDevices.tsx`, 향후 라우트 | `authenticated` | 삭제/해제 버튼 추가 금지 | `http://127.0.0.1:5173` | 플래그 off 또는 read-only 제거 |
| 3 | `Notifications` | 읽기 전용 알림 목록이면 session/permission 검증에 적합 | `src/pages/Settings/Notifications.tsx`, 향후 라우트 | `authenticated` 또는 `notices.read` | 읽음 처리/설정 저장은 write | `http://127.0.0.1:5173` | 플래그 off 또는 read-only 제거 |

## 부적합 항목 요약

- `LoginPage`: 로그인 화면은 명시 제외 대상이며 기존 로그인 구조에 직접 영향이 큼
- `Register`: 회원가입은 명시 제외 대상
- `ForgotPassword`: 인증 액션 화면이라 읽기 전용 후보가 아님
- `UserManagement`: 사용자 관리/권한 변경/승인 기능과 연결될 가능성이 높음
- 기존 Guard 컴포넌트: 이번 단계 금지 사항인 기존 Guard 교체에 해당
- 개발 전용 화면 3개: 이미 이전 단계에서 사용 또는 검증 완료

## 최종 판단

현재 일반 React 화면 중 A 등급은 없습니다.

안전한 다음 단계는 `VerifyEmail`을 “계정 상태 읽기 전용 화면”으로 최소 구현한 뒤 신규 `AuthProvider`를 붙이는 것입니다. 다만 이 작업은 실제 UI와 라우트 정리가 필요하므로, 다음 단계 요구사항에서 “새 UI 최소 구현 허용” 여부를 먼저 명확히 해야 합니다.
