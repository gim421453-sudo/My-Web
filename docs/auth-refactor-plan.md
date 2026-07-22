# Auth Refactor Plan

## 목적
기존 UI와 기능을 유지하면서 로그인, 세션, 워크스페이스, 권한 계층만 React/TypeScript 기준으로 안정화하기 위한 단계별 계획입니다.

## 기본 원칙
- 기존 `app.js`와 정적 UI는 새 구조 검증 전까지 삭제하지 않습니다.
- Firebase Auth는 인증만 담당합니다.
- AppSession 생성은 `onAuthStateChanged` 한 곳에서만 수행합니다.
- 로그인 함수는 `signInWithEmailAndPassword` 또는 provider sign-in만 실행합니다.
- 선택 작업은 로그인 성공 이후 best-effort로 실행합니다.
- Firestore Rules는 이번 단계에서 배포하지 않습니다.
- role 기준은 `users.globalRole`과 `workspaces/{workspaceId}/members/{uid}.role`로 통일합니다.

## 새 모듈 목표 구조
요구된 최종 모듈은 다음입니다.

```text
src/auth/authTypes.ts
src/auth/authErrors.ts
src/auth/authService.ts
src/auth/sessionService.ts
src/auth/AuthProvider.tsx
src/auth/RouteGuard.tsx
src/workspace/workspaceService.ts
src/workspace/membershipService.ts
src/permissions/roles.ts
src/permissions/permissions.ts
src/permissions/permissionService.ts
```

현재 유사 파일은 `src/services/*`, `src/context/AuthContext.tsx`, `src/constants/roles.ts`, `src/utils/permissions.ts`에 흩어져 있습니다. 새 파일을 먼저 작성하고, 기존 파일은 shim 또는 re-export로 점진 연결합니다.

## AppSession 목표 타입

```ts
interface AppSession {
  uid: string;
  email: string;
  displayName: string;
  status: "active";
  globalRole: "system_owner" | "user";
  currentWorkspaceId: string | null;
  currentWorkspaceRole: WorkspaceRole | null;
}
```

내부 로딩 중에는 pending/rejected/disabled/workspace missing 상태를 session이 아니라 typed error 또는 account state로 표현합니다.

## 오류 코드
`src/auth/authErrors.ts`에서 다음 코드를 표준화합니다.

- `USER_DOCUMENT_MISSING`
- `ACCOUNT_PENDING`
- `ACCOUNT_REJECTED`
- `ACCOUNT_DISABLED`
- `EMAIL_NOT_VERIFIED`
- `WORKSPACE_MISSING`
- `MEMBERSHIP_MISSING`
- `MEMBERSHIP_DISABLED`
- `INVALID_ROLE`
- `NETWORK_UNAVAILABLE`
- `PERMISSION_DENIED`
- `UNKNOWN`

정책:

- `USER_DOCUMENT_MISSING`, `ACCOUNT_DISABLED`는 명시적 로그아웃 후보입니다.
- `ACCOUNT_PENDING`, `ACCOUNT_REJECTED`는 Auth 로그아웃보다 상태 화면을 우선합니다.
- `NETWORK_UNAVAILABLE`, `PERMISSION_DENIED`는 원인 표시 후 세션 강제 삭제를 피합니다.

## 단계 1: 분석 문서 작성
이번 단계입니다.

산출물:

- `docs/auth-current-flow.md`
- `docs/auth-problems.md`
- `docs/firestore-role-map.md`
- `docs/auth-refactor-plan.md`

코드 동작 파일은 수정하지 않습니다.

검증:

- 문서 파일 존재 확인
- `npm run build`
- lint/test 스크립트 존재 여부 확인

## 단계 2: 인증 기반 작성
기존 UI 연결 없이 새 TypeScript auth 기반을 작성합니다.

작업:

1. `src/auth/authTypes.ts`
2. `src/auth/authErrors.ts`
3. `src/auth/authService.ts`
4. `src/auth/sessionService.ts`
5. `src/workspace/membershipService.ts`
6. `src/workspace/workspaceService.ts`
7. `src/permissions/roles.ts`
8. `src/permissions/permissions.ts`
9. `src/permissions/permissionService.ts`

핵심 규칙:

- `authService.loginWithEmail`은 Auth sign-in만 실행합니다.
- `authService.loginWithGoogle`도 provider sign-in만 실행합니다.
- `sessionService`의 `onAuthStateChanged` subscriber만 `loadAppSession`을 호출합니다.
- `loadAppSession`은 순서대로 `users/{uid}` -> status -> globalRole -> currentWorkspaceId -> nested member를 읽습니다.
- workspaceId가 null이면 workspace 컬렉션을 읽지 않습니다.
- pending/rejected/disabled는 보호 데이터 쿼리를 시작하지 않습니다.

비동기 경쟁 방어:

- `sessionLoadVersion` 또는 `AbortController` 스타일 token을 둡니다.
- `onAuthStateChanged`, `reloadSession`, `switchWorkspace`마다 버전을 증가시킵니다.
- 완료된 요청이 최신 버전이 아니면 상태 반영을 버립니다.

선택 작업 분리:

- 기기 등록
- 알림 생성
- 레거시 데이터 보정
- 환영 알림 생성

위 작업은 `afterSessionReadyTasks(session)` 같은 별도 함수에서 `Promise.allSettled`로 처리합니다.

## 단계 3: 테스트 작성
테스트 도구는 현재 package에 명시되어 있지 않으므로 먼저 기존 테스트 환경을 확인합니다. 새 의존성은 사용자 확인 후에만 추가합니다.

최소 테스트 목록:

1. 정상 사용자 로그인
2. 시스템 오너 로그인
3. 승인 대기 사용자
4. 거절 사용자
5. 비활성 사용자
6. 사용자 문서 없는 Auth 계정
7. 워크스페이스 없는 사용자
8. 멤버 문서 없는 사용자
9. 비활성 멤버
10. 잘못된 역할
11. 로그인 중 네트워크 장애
12. 자동 로그인 중 네트워크 장애
13. 로그인 직후 로그아웃
14. A 계정에서 B 계정으로 빠르게 전환
15. 워크스페이스 전환
16. 워크스페이스 전환 실패
17. 새로고침 후 세션 복원
18. 여러 탭에서 로그아웃
19. Firestore Rules 거부
20. 레거시 멤버 데이터만 존재하는 사용자

권장 방식:

- Firebase SDK 호출을 interface로 감싸 mock 가능하게 합니다.
- Firestore emulator는 별도 단계에서 도입합니다.
- 새 테스트 의존성이 필요하면 사용자 확인 후 추가합니다.

## 단계 4: 기존 UI 연결
새 AuthProvider와 RouteGuard가 안정화되면 기존 정적 앱과 bridge를 만듭니다.

권장 순서:

1. `app.js`의 로그인 함수에서 직접 세션 생성 제거
2. compat 앱용 `window.PMAuthBridge` 작성
3. Firebase Auth 상태 변화가 bridge를 통해 local legacy user를 갱신
4. `buildNav`가 새 session role을 사용하게 변경
5. `PMWorkspaceDataService.start`는 session이 `active`이고 workspace role이 있을 때만 호출
6. 관리자 전용 구독은 `system_owner` 화면 진입 후에만 시작

이 단계에서도 기존 UI 컴포넌트 자체는 다시 만들지 않습니다.

## 단계 5: 데이터 마이그레이션
기본 dry-run 스크립트를 작성합니다.

예상 파일:

```text
scripts/migrate-members-to-nested.mjs
scripts/rollback-members-migration.mjs
```

dry-run 출력:

- 전체 users 수
- currentWorkspaceId 누락 active 사용자
- legacy member만 존재하는 사용자
- nested member만 존재하는 사용자
- role 충돌 사용자
- status 충돌 사용자
- system_owner/globalRole 충돌 사용자
- 실제 쓰기 대상 문서 목록

실제 쓰기 조건:

- 사용자가 명시적으로 `--apply`를 넣을 때만 쓰기
- 실행 전 대상 목록 출력
- `CONFIRM_MIGRATE_MEMBERS` 입력 필요
- 원본 JSONL 백업 생성

## 단계 6: 레거시 제거 계획
즉시 삭제하지 않고 다음 순서로 제거 목록을 작성합니다.

1. users legacy role 필드 읽기 제거
2. users legacy workspaceId 필드 읽기 제거
3. `workspace_members` 자동 쓰기 제거
4. `workspaceMembers` 자동 쓰기 제거
5. Rules에서 legacy member 허용 제거
6. localStorage auth mirror 제거
7. `app.js` 로그인 패치 레이어 축소

각 제거 전후로 기존 화면 기능 일치 확인이 필요합니다.

## switchWorkspace 설계
`switchWorkspace`는 다음을 원자적으로 처리해야 합니다.

1. 대상 workspace 문서 존재 확인
2. `workspaces/{workspaceId}/members/{uid}` 확인
3. member status가 active인지 확인
4. role 유효성 확인
5. `users/{uid}.currentWorkspaceId` 업데이트
6. `reloadSession` 실행
7. reload 실패 시 기존 세션 유지 및 user 문서 rollback 후보 표시

React 상태만 바꾸거나 Firestore 문서만 바꾸는 방식은 금지합니다.

## RouteGuard 통합 정책
단일 `RouteGuard`가 다음 상태를 처리합니다.

- 인증 없음 -> `/login`
- 로딩 중 -> 공통 로딩 화면
- 승인 대기 -> `/account-status`
- 거절 -> `/account-status`
- 비활성 -> `/account-status`
- 워크스페이스 없음 -> `/select-workspace`
- 권한 없음 -> `/unauthorized`
- 권한 있음 -> children 렌더링

정적 앱 연결 전에는 React route 정책 문서/테스트부터 확정합니다.

## Firestore Rules 수정안 작성 원칙
이번 계획 단계에서는 Rules 배포를 하지 않습니다.

수정안 방향:

- `users/{uid}`는 본인 read를 항상 허용합니다.
- 일반 사용자의 `users/{uid}` update는 허용 필드만 가능합니다.
- `globalRole`은 클라이언트가 직접 바꿀 수 없습니다.
- member role 변경은 상위 관리자만 가능합니다.
- 일반 사용자는 자기 member role/status를 직접 바꿀 수 없습니다.
- workspace 데이터는 nested member active 여부와 role로만 판단합니다.
- legacy member 컬렉션은 마이그레이션 완료 후 Rules에서 제거합니다.

## 단계별 보고 형식
각 단계 완료 시 다음을 남깁니다.

- 변경 파일
- 변경 이유
- 위험 요소
- 테스트 결과
- 롤백 방법
- 다음 단계

## 단계 1 검증 기록
2026-07-21 기준 1단계에서는 문서만 추가했고 앱 동작 코드는 수정하지 않았습니다.

변경 파일:

- `docs/auth-current-flow.md`
- `docs/auth-problems.md`
- `docs/firestore-role-map.md`
- `docs/auth-refactor-plan.md`

검증 명령:

- `npm run build`
  - PowerShell의 `npm.ps1` 실행 정책으로 첫 실행은 차단되었습니다.
  - `npm.cmd run build`로 재실행했습니다.
  - 결과: 실패
  - 주요 원인:
    - `react-router-dom` 의존성이 없어 `RequireAuth`, `RequireWorkspaceRole`, `Login.tsx`에서 module resolution 실패
    - 현재 React 타입 shim 또는 타입 설정 문제로 `react`의 `useState`, `useEffect`, `useMemo`, `useCallback`, `FormEvent` 타입을 찾지 못함
    - `AuthContext.tsx`에서 `Context.Provider` 타입 오류 발생
- `npm run lint`
  - 결과: 실패
  - 원인: `package.json`에 `lint` script가 없음
- `npm test`
  - 결과: 실패
  - 원인: `package.json`에 `test` script가 없음

해석:

- 이번 실패는 새로 추가한 문서 때문이 아니라 기존 `src/` React/TypeScript 전환 구조와 package script 미정비 때문입니다.
- AGENTS.md의 "새 의존성 추가 전 사용자 확인" 원칙에 따라 `react-router-dom` 등 새 의존성은 설치하지 않았습니다.
- 다음 단계에서 테스트 기반을 만들기 전에 `react-router-dom` 도입 여부, React 타입 shim 유지 여부, lint/test 도구 선택을 사용자에게 확인해야 합니다.

## 단계 1.5 검증 기록
2026-07-21 기준 1.5단계에서는 기존 정적 앱의 동작 파일을 수정하지 않고, React/TypeScript 전환 코드의 typecheck/build 기준선을 복구했습니다.

수정 파일:

- `package.json`
- `package-lock.json`
- `src/react-shims.d.ts`

작업 내용:

- `react-router-dom`을 dependencies에 추가했습니다.
  - 이유: `src/components/guards/RequireAuth.tsx`, `src/components/guards/RequireWorkspaceRole.tsx`, `src/pages/Login.tsx`가 실제로 `react-router-dom`을 import합니다.
- `@types/react`, `@types/react-dom`을 devDependencies에 추가했습니다.
  - 이유: React 19 런타임 패키지만으로는 TypeScript가 React 훅과 JSX 타입을 올바르게 해석하지 못했습니다.
- `src/react-shims.d.ts`의 불완전한 React module 선언을 제거하고 migration marker comment만 남겼습니다.
  - 이유: 기존 shim이 `useState`, `useEffect`, `useMemo`, `useCallback`, `FormEvent`, `Context.Provider` 타입을 가로막고 있었습니다.
- `typecheck` script를 추가하고, `build`가 `npm run typecheck && vite build`를 사용하도록 정리했습니다.

검증 명령:

- `npm install`
  - 결과: 성공, 변경 없음
  - npm audit 알림: 13 vulnerabilities reported
  - 자동 audit fix는 breaking change 가능성이 있어 실행하지 않았습니다.
- `npm run typecheck`
  - 결과: 성공
- `npm run build`
  - 결과: 성공
  - Vite가 정적 `<script>`를 bundle하지 않는다는 경고는 기존 `index.html + app.js + services/*.js` 구조 때문에 발생하는 예상 경고입니다.
- `npm run lint`
  - 결과: 미구성
  - 원인: `package.json`에 `lint` script 없음
- `npm test`
  - 결과: 미구성
  - 원인: `package.json`에 `test` script 없음

정적 앱 영향:

- `app.js`, 루트 `services/*.js`, `firestore.rules`, `index.html`은 이 단계에서 수정하지 않았습니다.
- React/TypeScript 타입 기준선만 복구했으므로 현재 운영 화면의 로그인/권한 동작은 변경하지 않았습니다.

## 롤백 전략
- 문서 단계는 파일 삭제 대신 archive 이동으로 되돌립니다.
- TypeScript auth 모듈은 기존 정적 앱에 연결하기 전까지 런타임 영향이 없습니다.
- bridge 연결 단계는 feature flag로 되돌릴 수 있게 합니다.
- 마이그레이션은 dry-run 기본, apply 전 JSONL 백업 필수입니다.
- Firestore Rules는 배포 전 로컬 수정안과 Console 게시본 차이를 기록합니다.
