# Firestore Role Map

## 목적
현재 Firestore 사용자/역할/워크스페이스 관련 컬렉션 사용처와 최종 통합 방향을 정리합니다.

## 목표 모델

### users/{uid}
최종 사용자 문서는 전역 계정 상태만 저장합니다.

```ts
{
  email: string | null,
  displayName: string,
  status: "active" | "pending" | "rejected" | "disabled",
  globalRole: "system_owner" | "user",
  currentWorkspaceId: string | null,
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

### workspaces/{workspaceId}/members/{uid}
워크스페이스 내부 권한의 단일 기준입니다.

```ts
{
  uid: string,
  role: "super_manager" | "manager" | "teacher" | "normal" | "viewer" | "print_account",
  status: "active" | "disabled" | "invited",
  joinedAt: Timestamp,
  updatedAt: Timestamp
}
```

## 역할 분리 기준
- `system_owner`는 전역 역할이며 workspace role이 아닙니다.
- `super_manager`, `manager`, `teacher`, `normal`, `viewer`, `print_account`는 workspace role입니다.
- 화면 권한은 `users/{uid}.globalRole`과 현재 workspace member role을 조합해 계산합니다.
- Firestore Rules도 같은 필드만 봐야 합니다.

## 현재 users 문서 필드 지도
현재 코드에서 users 문서에 쓰이거나 읽히는 필드는 다음과 같습니다.

| 필드 | 현재 의미 | 최종 처리 |
| --- | --- | --- |
| `uid` | Firebase Auth uid | 유지 |
| `email` | 계정 이메일 | 유지 |
| `displayName` | 화면 이름 | 유지 |
| `status` | 계정 상태 | 유지, 값 표준화 |
| `globalRole` | 전역 역할 | 유지, `system_owner`/`user`만 허용 |
| `currentWorkspaceId` | 현재 workspace | 유지 |
| `role` | 전역 역할 또는 workspace 역할로 혼용 | 호환 기간 후 제거 |
| `currentRole` | 현재 권한으로 혼용 | 호환 기간 후 제거 |
| `workspaceRole` | workspace 권한 복제 | 호환 기간 후 제거 |
| `workspaceId` | currentWorkspaceId 호환 필드 | 호환 기간 후 제거 |
| `workspace_id` | local legacy 호환 필드 | 호환 기간 후 제거 |
| `active` | status legacy | 호환 기간 후 제거 |
| `disabled` | status legacy | 호환 기간 후 제거 |
| `pendingWorkspaceId` | 승인 대기 workspace | 유지 가능, 승인 후 null |
| `pendingInviteCodeId` | 승인 대기 초대코드 | 유지 가능, 승인 후 null |

## 현재 멤버 컬렉션 3종 사용처

### workspace_members/{workspaceId_uid}
가장 많이 쓰이는 legacy root collection입니다.

주요 사용처:

- `services/authService.js`
  - 활성 멤버 탐색
  - 로그인 중 root member 읽기
  - 관리자 계정만 root member 복구
- `services/systemAdminService.js`
  - root member 전체 구독
  - 권한 변경/복구/활성화/비활성화/삭제 시 쓰기
- `services/invitationService.js`
  - local fallback 및 일부 remote member 저장
- `services/workspaceService.js`
  - local authState 기반 workspace switch
- `app.js`
  - 계정 관리, 권한 sync, realtime member local cache
- `scripts/set-system-owner.mjs`
  - system owner workspace member 생성
- `scripts/delete-non-owner-accounts.mjs`
  - 삭제 대상 탐색
- `firestore.rules`
  - `isWorkspaceMember`, `workspaceRole`, root match

### workspaceMembers/{workspaceId_uid}
표준 root collection을 의도한 흔적이지만 실제 앱 사용은 적습니다.

주요 사용처:

- `services/authService.js`
  - `firebaseEnsureUserStructure`에서 `standardMemberRef`로 set
- `scripts/set-system-owner.mjs`
  - system owner member 생성
- `scripts/initialize-firebase-schema.mjs`
  - schema marker
- `firestore.rules`
  - `isWorkspaceMember`, `workspaceRole`, root match
- `src/services/firestoreSchema.ts`
  - 이름은 `workspaceMembers`지만 값은 nested collection id `"members"`로 정의

### workspaces/{workspaceId}/members/{uid}
최종 기준으로 삼아야 할 nested collection입니다.

주요 사용처:

- `services/authService.js`
  - 로그인 중 member 읽기
  - nested member 생성/복구
- `services/systemAdminService.js`
  - nested member 확인/구독/권한 변경/복구/삭제
  - `collectionGroup("members")`로 전체 nested member 조회
- `app.js`
  - workspace members realtime 구독
- `src/services/authAccess.ts`
  - `loadAppSession`에서 현재 role 읽기
- `src/services/workspaceService.ts`
  - workspace switch 검증
- `src/services/workspaceMemberService.ts`
  - 사용자 목록 페이지 조회
- `src/services/userApprovalService.ts`
  - 승인 시 member 생성
- `src/services/memberAdminService.ts`
  - 역할 변경
- `firestore.rules`
  - `isWorkspaceMember`, `workspaceRole`, nested match

## 우선순위 제안
마이그레이션 전까지 role 해석 우선순위는 다음처럼 고정합니다.

1. `users/{uid}.globalRole == "system_owner"`이면 전역 system owner
2. 현재 workspace는 `users/{uid}.currentWorkspaceId`
3. 현재 workspace role은 `workspaces/{currentWorkspaceId}/members/{uid}.role`
4. nested member가 없으면 로그인 세션은 workspace role 없음으로 처리
5. legacy root member는 로그인 세션 자동 권한 부여에 사용하지 않고, 마이그레이션/복구 화면에서만 참고

현재 코드 일부는 `workspace_members`에서 workspaceId를 발견하거나 `users.role`을 fallback으로 사용합니다. 이 fallback은 마이그레이션 기간에는 진단용으로만 남기고, 세션 권한 부여 기준에서는 제거해야 합니다.

## Firestore Rules 현재 상태
현재 `firestore.rules`는 다음 특징을 가집니다.

- `isSystemOwner()`가 `systemOwners/{uid}` 또는 `users/{uid}.role == "system_owner"`를 봅니다.
- `isWorkspaceMember(workspaceId)`가 세 멤버 구조를 모두 확인합니다.
- `workspaceRole(workspaceId)`도 nested, `workspaceMembers`, `workspace_members` 순서로 role을 가져옵니다.
- `users/{uid}`는 본인 read를 허용합니다.
- workspace manager는 같은 workspace의 users 문서를 읽거나 업데이트할 수 있습니다.
- `workspaces/{workspaceId}/members/{uid}`는 사용자 자신도 자기 uid member를 create/update할 수 있는 경로가 있습니다.
- root `workspace_members`와 `workspaceMembers`도 사용자가 자기 member 문서를 create할 수 있는 경로가 있습니다.

## Rules 위험 지점
1. 사용자가 member 문서를 직접 create/update할 수 있는 규칙은 역할 상승 위험이 있습니다.
2. `users.role == "system_owner"`를 system owner 판정에 쓰면, users 업데이트 권한 버그가 곧 전역 권한 상승으로 이어질 수 있습니다.
3. 세 멤버 컬렉션을 모두 허용하면 하나만 잘못 남아도 권한이 살아납니다.
4. 일반 계정이 `workspaceId`가 없을 때 workspace query를 실행하면 Rules에서 막히는 것이 정상입니다.
5. `systemNotices`는 signed in이면 모두 read 가능하므로 로그인 전 렌더링에서는 읽지 않아야 합니다.

## 목표 Rules 수정안 방향
이번 단계에서는 Rules를 배포하지 않습니다. 수정 방향은 다음입니다.

- `isSystemOwner()`는 최종적으로 `users/{uid}.globalRole == "system_owner"` 또는 별도 `systemOwners/{uid}` 중 하나로 명확히 정합니다.
- `isWorkspaceMember()`는 최종적으로 `workspaces/{workspaceId}/members/{request.auth.uid}`만 봅니다.
- 사용자는 자신의 member role을 직접 바꿀 수 없습니다.
- 일반 사용자의 `users/{uid}` update는 허용된 프로필 필드와 검증된 `currentWorkspaceId` 변경만 허용합니다.
- 역할 변경은 `system_owner`, `super_manager`, `manager`의 상위 역할 규칙으로만 허용합니다.
- legacy root member 컬렉션은 읽기/쓰기 모두 점진적으로 차단하고, 마이그레이션 스크립트만 Admin SDK로 처리합니다.

## 마이그레이션 전 데이터 점검 쿼리 계획
실제 실행은 다음 단계 이후 dry-run 스크립트에서만 수행합니다.

1. 모든 `users` 문서 조회
2. 모든 `workspace_members` 문서 조회
3. 모든 `workspaceMembers` 문서 조회
4. 모든 `workspaces/*/members/*` 문서 조회
5. uid + workspaceId 기준으로 병합
6. role/status 충돌 탐지
7. nested member가 없는 계정 목록 생성
8. users.currentWorkspaceId가 없지만 active member가 있는 계정 목록 생성
9. system_owner인데 globalRole이 없는 계정 목록 생성
10. disabled/active/status 충돌 목록 생성

## 롤백 계획
- 마이그레이션은 기본 dry-run으로만 시작합니다.
- 실제 쓰기 전 원본 문서 스냅샷을 JSONL로 저장합니다.
- nested member 생성은 idempotent `set(..., { merge: true })`만 사용합니다.
- 기존 `workspace_members`, `workspaceMembers`는 즉시 삭제하지 않습니다.
- Rules 전환 전 최소 한 릴리즈 동안 legacy 읽기는 진단 화면에서만 유지합니다.
- 문제 발생 시 `users.currentWorkspaceId`와 nested member를 이전 JSONL 기준으로 되돌리는 rollback 스크립트를 제공합니다.

## 최종 수렴 순서
1. 세션 계산 기준을 nested member로 변경
2. 관리자 권한 변경이 nested member와 users.currentWorkspaceId만 갱신하도록 정리
3. legacy root member는 동기화 대상이 아니라 migration source로 격하
4. dry-run 보고서 생성
5. 실제 마이그레이션
6. Rules 수정안 검토
7. Rules 배포
8. legacy 필드/컬렉션 제거 계획 작성
