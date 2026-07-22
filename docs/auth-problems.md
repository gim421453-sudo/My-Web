# Auth Problems

## 목적
현재 로그인, 세션, 워크스페이스, 권한 시스템에서 발견된 문제를 위험도와 원인 중심으로 정리합니다.

## P0: 로그인 함수와 onAuthStateChanged가 세션을 중복 생성함
현재 정적 앱은 `onLoginV33`에서 `firebaseLoginWithEmail`을 호출하고, 이 함수 내부에서 `firebaseEnsureUserStructure`를 실행합니다. 동시에 `restoreFirebaseSessionV34`의 `onAuthStateChanged`도 `firebaseEnsureUserStructure`를 실행합니다.

React 구조도 비슷한 문제가 있습니다.

- `src/services/authService.ts`의 `loginWithEmail`이 `loadAppSession` 호출
- `src/context/AuthContext.tsx`의 `onAuthStateChanged`도 `loadAppSession` 호출

요구 원칙은 로그인 버튼이 Firebase Auth 로그인만 수행하고, 세션 생성은 `onAuthStateChanged` 한 곳에서만 수행하는 것입니다.

### 영향
- 로그인 성공 직후와 자동 로그인 이벤트가 경쟁할 수 있습니다.
- A 계정 로그아웃 직후 B 계정 로그인 시 이전 요청 결과가 최신 세션을 덮어쓸 수 있습니다.
- Firestore 부가 작업 실패가 로그인 실패로 표시됩니다.
- 새 React 구조로 전환할 때 동일한 문제가 재발할 수 있습니다.

## P0: 로그인 과정에서 선택 작업 실패가 로그인 실패로 전파됨
`services/authService.js`의 `firebaseLoginWithEmail`, `firebaseLoginWithGoogle`, `firebaseRegisterWithEmail`은 다음을 순차적으로 실행합니다.

- Auth 로그인 또는 가입
- `firebaseEnsureUserStructure`
- `firebaseRegisterDevice`
- `firebaseCreateWelcomeNotification`

기기 등록 또는 알림 생성은 선택 작업이어야 하지만 현재는 예외가 밖으로 전파될 수 있습니다.

### 영향
- `user_devices` 또는 `notifications` Rules 문제만으로 로그인 화면에 권한 오류가 표시될 수 있습니다.
- 사용자는 실제 인증 실패와 부가 기능 실패를 구분할 수 없습니다.

## P0: system_owner와 workspace role이 섞여 있음
요구 구조에서는 `system_owner`는 전역 역할이고, workspace role이 아닙니다. 그러나 현재 정적 앱은 다음 형태를 사용합니다.

- `users/{uid}.role = "system_owner"`
- `users/{uid}.currentRole = "system_owner"`
- `users/{uid}.workspaceRole = "super_manager"`
- workspace member에는 `role = "super_manager"`

Rules의 `isSystemOwner()`도 `systemOwners/{uid}`와 `users/{uid}.role == "system_owner"`를 함께 봅니다.

### 영향
- 시스템 오너가 workspace role처럼 메뉴/권한 계산에 섞일 수 있습니다.
- 특정 화면에서 system_owner가 아닌 계정도 `users.role` 조합에 따라 과한 권한을 받거나, 반대로 workspace member가 없어서 막힐 수 있습니다.
- 최종 구조의 `globalRole` 모델과 충돌합니다.

## P0: users 문서에 레거시 역할/워크스페이스 필드가 많이 남아 있음
현재 users 문서에는 다음 레거시 필드가 사용됩니다.

- `role`
- `currentRole`
- `workspaceRole`
- `workspaceId`
- `workspace_id`
- `currentWorkspaceId`
- `active`
- `disabled`

요구되는 최종 구조는 다음입니다.

- `globalRole`
- `currentWorkspaceId`
- `status`
- workspace role은 `workspaces/{workspaceId}/members/{uid}.role`

### 영향
- 어떤 파일은 `workspaceId`, 어떤 파일은 `currentWorkspaceId`, 어떤 파일은 `workspace_id`를 기준으로 삼습니다.
- 역할 변경 후 한 필드만 바뀌면 새로고침 시 다른 필드가 우선되어 권한이 되돌아갈 수 있습니다.
- `Missing or insufficient permissions`의 원인이 실제 Rules인지, 필드 불일치인지 추적하기 어렵습니다.

## P0: 멤버 컬렉션 3종이 동시에 쓰임
현재 사용 중인 멤버 구조는 다음 세 가지입니다.

- `workspace_members/{workspaceId_uid}`
- `workspaceMembers/{workspaceId_uid}`
- `workspaces/{workspaceId}/members/{uid}`

최종 기준은 `workspaces/{workspaceId}/members/{uid}` 하나입니다. 하지만 현재 코드는 세 구조를 동시에 읽고 씁니다.

### 영향
- 한 컬렉션만 수정되면 다른 화면에서 이전 권한이 보일 수 있습니다.
- `collectionGroup("members")`와 root member 조회가 관리자 전용 구독에 섞여 일반 계정에서 Rules 오류를 유발할 수 있습니다.
- 마이그레이션 전 우선순위가 명확하지 않으면 role 복구가 오히려 잘못된 값을 복구할 수 있습니다.

## P0: 일반 계정 초기 로딩에서 보호 데이터 구독이 시작될 수 있음
`workspaceDataService.start()`는 workspaceId가 있으면 주요 workspace 컬렉션을 대량 구독합니다. 일반 계정이 `status=pending`, workspaceId 누락, member 문서 누락 상태인데도 이 함수가 호출되면 Rules에서 막힙니다.

`systemAdminService`의 전역 구독은 반드시 시스템 관리자 화면에서만 시작되어야 합니다.

### 영향
- 로그인 직후 `Missing or insufficient permissions`가 발생합니다.
- 오류가 발생한 실제 collection/path를 모르면 users 문서 문제인지 workspace 데이터 문제인지 구분하기 어렵습니다.

## P1: 승인 대기 상태 이름이 일관되지 않음
코드에는 다음 상태가 섞여 있습니다.

- `pending`
- `waiting_approval`
- `active`
- `accepted`
- `rejected`
- `disabled`
- `withdrawn`

요구된 최종 users status는 다음입니다.

- `active`
- `pending`
- `rejected`
- `disabled`

### 영향
- `waiting_approval` 계정이 어떤 화면에서는 pending처럼, 어떤 Rules에서는 허용되지 않는 값처럼 처리될 수 있습니다.
- `accepted`는 멤버 상태에만 쓰는지 사용자 상태에도 쓰는지 불명확합니다.

## P1: 네트워크 오류와 계정 차단 오류가 같은 방식으로 처리됨
React `AuthProvider`는 `loadAppSession` 또는 `reloadSession` 실패 시 `signOut(auth)`를 호출합니다. 요구사항은 네트워크 오류는 강제 로그아웃하지 않는 것입니다.

### 영향
- Firestore 일시 장애, 오프라인, Rules 배포 지연 등이 계정 차단처럼 보일 수 있습니다.
- 여러 탭에서 한 탭의 일시 오류가 전체 로그아웃 경험을 만들 수 있습니다.

## P1: switchWorkspace가 세션 재로딩을 보장하지 않음
`src/services/workspaceService.ts`는 대상 member 확인 후 `users/{uid}.currentWorkspaceId`를 업데이트하지만, React 세션을 즉시 재로딩하지 않습니다.

정적 앱의 `PMWorkspaceService.switchWorkspace`는 local state를 직접 바꿉니다.

### 영향
- Firestore 문서는 바뀌었는데 UI 권한은 이전 workspace 기준으로 남을 수 있습니다.
- 실패 시 기존 세션 유지와 성공 시 세션 재계산 경계가 명확하지 않습니다.

## P1: Route Guard가 여러 개로 나뉘어 있음
현재 React 구조에는 다음 가드가 공존합니다.

- `ProtectedRoute`
- `RequireAuth`
- `RequireWorkspaceRole`

요구사항은 하나의 `RouteGuard` 정책입니다.

### 영향
- 어떤 화면은 메시지만 보여주고, 어떤 화면은 redirect합니다.
- pending/rejected/disabled/workspace 없음/권한 없음의 처리 결과가 화면마다 달라질 수 있습니다.

## P1: Firestore Rules와 클라이언트 기준 필드가 불일치함
Rules의 `isSystemOwner()`는 `systemOwners/{uid}` 또는 `users/{uid}.role == "system_owner"`를 봅니다. 최종 요구는 `users/{uid}.globalRole == "system_owner"` 중심입니다.

Rules의 `isWorkspaceMember()`는 세 멤버 컬렉션을 모두 봅니다. 최종 요구는 nested member 하나입니다.

### 영향
- 클라이언트는 새 구조로 판단했는데 Rules가 레거시 필드를 보고 허용/거부할 수 있습니다.
- 사용자 자신이 root member 문서를 create할 수 있는 기존 규칙은 역할 상승 공격 표면을 만들 수 있습니다.

## P2: 로컬 세션/legacy auth mirror가 운영 Auth와 섞임
`services/authService.js`는 `pm:auth:v1`과 `pm-auth-v31`을 계속 mirror합니다. 정적 앱은 Firebase user를 local auth user로 동기화한 뒤 기존 UI를 렌더링합니다.

### 영향
- Firebase 로그아웃 후에도 local/sessionStorage 값 때문에 UI가 남을 수 있습니다.
- 브라우저 뒤로가기/앞으로가기와 Firebase persistence가 겹칠 때 로그인 화면 우회처럼 보일 수 있습니다.

## P2: 기기/알림 facade가 localStorage와 Firestore 양쪽에 존재함
정적 `services/deviceService.js`, `services/notificationService.js`는 localStorage facade입니다. 반면 `authService.js`의 Firebase 로그인은 `user_devices`, `notifications`에 직접 쓰기도 합니다. `src/services/deviceService.ts`, `src/services/notificationService.ts`는 modular Firestore를 사용합니다.

### 영향
- 같은 기능이 세 경로로 갈라져 있습니다.
- 로그인 안정화 단계에서는 부가 작업으로 분리하고 실패를 삼켜야 합니다.

## P2: Firestore 인스턴스 edition 미확인
Firebase Firestore skill 기준으로 실제 Firestore database edition을 CLI로 확인해야 합니다. 이번 단계는 로컬 분석만 수행하고, 네트워크/배포 작업은 하지 않았으므로 edition은 확인하지 않았습니다.

### 영향
- Rules/SDK 구조 자체에는 큰 차이가 없을 수 있으나, 최종 배포 전 Firebase CLI로 대상 프로젝트와 database를 확인해야 합니다.

## 권장 우선순위
1. 새 `src/auth` 세션 모델 설계 문서 확정
2. 로그인 함수에서 `loadAppSession` 제거
3. `onAuthStateChanged` 단일 세션 생성 + 요청 버전 방어
4. 오류 코드 분류
5. 부가 작업을 로그인 성공 이후 best-effort로 이동
6. `users.globalRole/currentWorkspaceId/status`와 nested member 기준으로 세션 계산
7. 기존 정적 앱 연결은 가장 마지막에 최소 bridge로 진행
