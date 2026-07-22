# Auth Final Architecture

작성일: 2026-07-21

## 범위

이번 단계는 기존 운영 정적 앱(`index.html`, `app.js`, 루트 `services/`)을 건드리지 않고, React/TypeScript 전환을 위한 신규 인증 기반 모듈을 독립적으로 작성하는 단계입니다.

## 전역 역할

전역 역할은 다음 둘뿐입니다.

```ts
type GlobalRole = "system_owner" | "user";
```

`system_owner`는 워크스페이스 역할이 아닙니다. 서비스 전체 권한을 의미하며, 신규 모듈은 `systemOwners/{uid}` 문서 존재 여부를 권위 기준으로 사용합니다.

## 워크스페이스 역할

워크스페이스 내부 역할은 다음입니다.

```ts
type WorkspaceRole =
  | "super_manager"
  | "manager"
  | "teacher"
  | "normal"
  | "viewer"
  | "print_account";
```

`system_owner`는 `WorkspaceRole`에 포함하지 않습니다.

## 사용자 상태

최종 상태 필드는 다음 값만 허용합니다.

```ts
type AccountStatus = "pending" | "active" | "rejected" | "disabled";
```

레거시 `active`, `disabled`는 읽기 호환만 제공합니다. 문자열 `"false"`와 `"true"`는 명시적으로 정규화합니다.

상태 판정 우선순위:

1. `status`가 허용된 값이면 `status` 사용
2. `status`가 없거나 유효하지 않으면 `disabled` 정규화
3. `disabled` 판정이 불가능하면 `active` 사용
4. 모두 없으면 `pending`

충돌이 있으면 데이터를 수정하지 않고 `STATUS_FIELD_CONFLICT` warning을 생성합니다.

## AppSession

신규 세션 모델은 [src/auth/authTypes.ts](<C:\Users\USER\Documents\My Web\src\auth\authTypes.ts>)에 있습니다.

```ts
interface AppSession {
  uid: string;
  email: string | null;
  displayName: string | null;
  emailVerified: boolean;
  status: AccountStatus;
  globalRole: GlobalRole;
  currentWorkspaceId: string | null;
  currentWorkspaceRole: WorkspaceRole | null;
  isSystemOwner: boolean;
  isAuthenticated: boolean;
  warnings: SessionWarning[];
}
```

경고는 로그인 실패와 분리됩니다. 예를 들어 `GLOBAL_ROLE_MISMATCH`, `LEGACY_ROLE_PRESENT`, `LEGACY_MEMBERSHIP_PRESENT`는 진단용 경고이며 자동 로그아웃 사유가 아닙니다.

## systemOwners 권위 기준

현재 과도기 기준:

- `systemOwners/{uid}`: 서버 권위 기준
- `users.globalRole`: 앱 세션과 UI용 미러 필드
- `users.role`: 기존 `app.js` 호환용 레거시 필드

현재 데이터에는 `systemOwners/{uid}`가 있으나 `users.globalRole`이 `user`인 불일치가 있습니다. 신규 모듈은 `systemOwners/{uid}`가 있으면 `system_owner`로 계산하고 `GLOBAL_ROLE_MISMATCH` warning을 남깁니다. 실제 `users.globalRole` 수정은 하지 않습니다.

현재 기존 `index.html` + `app.js` 앱에서 이 오너 계정은 정상 로그인되고 있습니다. 따라서 `users.globalRole == "user"` 또는 삭제된 `currentWorkspaceId`가 현재 운영 앱의 오너 로그인을 막고 있다고 단정하지 않습니다. 신규 모듈도 같은 원칙으로 오너 로그인 성공을 유지하고, 불일치는 warning으로만 기록합니다.

## 멤버십 권위 기준

최종 기준:

```text
workspaces/{workspaceId}/members/{uid}
```

레거시 컬렉션:

```text
workspace_members
workspaceMembers
```

신규 권한 판정에는 사용하지 않습니다. 다만 같은 `(workspaceId, uid)`에 레거시 문서가 있으면 `LEGACY_MEMBERSHIP_PRESENT` warning으로 진단합니다.

## 워크스페이스 정책

최종 유지 후보:

```text
owner_ws_RAOf0oP1TegBjP1xV8wqwr04Vax1
```

삭제 검토 후보:

```text
ws_RAOf0oP1TegBjP1xV8wqwr04Vax1
```

신규 모듈은 삭제 검토 workspace를 자동 선택, 자동 연결, 자동 마이그레이션 대상으로 사용하지 않습니다.

`currentWorkspaceId == null`인 active 사용자는 정상 인증 세션으로 처리합니다. 워크스페이스가 필요한 화면은 Route Guard가 `/select-workspace`로 안내합니다.

system owner의 `currentWorkspaceId`가 존재하지 않는 workspace를 가리키는 경우에도 로그인은 유지합니다. 단, 존재하지 않는 workspace를 세션의 현재 workspace로 사용하지 않습니다. 대신 `systemOwners/{uid}`가 존재하고 유지 대상 owner workspace에서 nested member role이 `super_manager`로 확인되면, Firestore를 수정하지 않고 세션 계산상 해당 owner workspace와 `super_manager` 역할을 사용합니다.

## 오류 정책

오류 코드는 [src/auth/authErrors.ts](<C:\Users\USER\Documents\My Web\src\auth\authErrors.ts>)에서 관리합니다.

네트워크 오류, Firestore 일시 오류, 부가 작업 오류는 자동 로그아웃으로 처리하지 않습니다. 명시적 로그아웃, 토큰 무효화, 사용자 삭제 같은 상황만 세션 종료 후보입니다.

## 부가 작업 분리

로그인 성공 후 다음 작업은 인증 성공의 필수 조건이 아닙니다.

- `user_devices` 등록
- `notifications` 생성
- 환영 알림
- 로그 기록
- 레거시 필드 보정
- 멤버 문서 보정

`PostLoginTask` 인터페이스는 준비되어 있으며, 실패해도 세션은 유지되어야 합니다.

## 핵심 파일

- [src/auth/sessionService.ts](<C:\Users\USER\Documents\My Web\src\auth\sessionService.ts>)
- [src/auth/AuthProvider.tsx](<C:\Users\USER\Documents\My Web\src\auth\AuthProvider.tsx>)
- [src/workspace/workspaceService.ts](<C:\Users\USER\Documents\My Web\src\workspace\workspaceService.ts>)
- [src/permissions/permissionService.ts](<C:\Users\USER\Documents\My Web\src\permissions\permissionService.ts>)
