# Firestore Rules Security Review

작성일: 2026-07-21

## 범위

- 검토 대상: `firebase.json`에서 배포 소스로 지정된 `firestore.rules`
- 후보 산출물: `firestore.rules.next`
- 테스트 후보: `tests/firestore/auth.rules.test.mjs`, `tests/firestore/workspace.rules.test.mjs`
- 실제 Firebase 배포: 하지 않음
- 실제 데이터 변경: 하지 않음

Firebase CLI에는 현재 배포된 규칙을 직접 가져오는 `firestore:rules:get` 명령이 없어 콘솔 배포본 자체를 내려받지는 못했습니다. 대신 이 저장소의 `firebase.json`이 `firestore.rules`를 배포 소스로 가리키는 것을 확인했고, 해당 파일을 기준으로 분석했습니다.

## 데이터베이스 확인

- Firebase project: `my-management-app-8a933`
- Firestore database: `(default)`
- Location: `asia-northeast3`
- Edition: `STANDARD`
- Mode: `FIRESTORE_NATIVE`

## 현재 규칙 주요 위험

1. `users/{uid}`의 권한 근거가 `role`, `workspaceId`, `currentWorkspaceId`에 섞여 있어 신규 구조의 `globalRole/currentWorkspaceId`와 불일치합니다.
2. `isSystemOwner()`가 `users.role == "system_owner"`와 `systemOwners/{uid}`를 섞어 사용합니다. `globalRole` 기준이 아니므로 새 권한 구조와 어긋납니다.
3. `systemOwners/{uid}` 문서 존재만으로 오너 판단이 일부 가능해지는 구조라, 사용자 상태가 disabled인 경우까지 확실히 차단되지 않습니다.
4. `selfUserUpdateAllowed()`가 `globalRole`, `role`, `currentRole`, `status`, `workspaceId`, `currentWorkspaceId`, `disabled`를 변경 후보로 포함합니다.
5. 일반 사용자가 자기 `status`를 `pending -> active`로 바꾸거나 `disabled=false`로 복구하려는 공격 표면이 있습니다.
6. `workspaces/{workspaceId}/members/{uid}`에서 사용자가 자기 멤버 문서를 직접 만들 수 있고, 요청 데이터의 role을 충분히 제한하지 않습니다.
7. 레거시 `workspace_members/{workspaceId_uid}`, `workspaceMembers/{workspaceId_uid}`에서도 자기 멤버 문서 생성이 가능해 역할 상승 위험이 있습니다.
8. `canWriteWorkspaceData()`가 비민감 컬렉션에 매우 넓은 쓰기 권한을 부여합니다. viewer/print_account 같은 읽기 중심 역할과 맞지 않습니다.
9. manager와 super_manager가 워크스페이스 삭제 및 멤버 관리에서 거의 동일하게 취급됩니다.
10. manager가 super_manager를 수정/삭제하지 못하도록 하는 역할 서열 검사가 부족합니다.
11. 워크스페이스 관리자가 `users/{uid}` 문서를 직접 삭제할 수 있습니다.
12. 워크스페이스 관리자가 `users/{uid}`의 전역 역할 또는 레거시 role 필드를 잘못 바꿀 가능성이 있습니다.
13. `invitations` update 권한이 기존 `resource.data.workspaceId`가 아니라 새 `request.resource.data.workspaceId`를 기준으로 평가되어 workspaceId 변경 공격에 취약합니다.
14. `user_devices`, `notifications`는 `workspaceId is string`을 요구해 워크스페이스가 아직 없는 사용자 로그인 후처리가 실패할 수 있습니다.
15. 세 멤버 컬렉션이 모두 권한 근거가 될 수 있어 권한 복구/동기화 시 불일치가 생깁니다.

## 후보 규칙의 보안 방향

`firestore.rules.next`는 아래 원칙으로 작성했습니다.

- 기본 거부 유지: 마지막 `match /{document=**}`는 `false`
- 전역 역할 기준: `users/{uid}.globalRole`
- 워크스페이스 역할 기준: `workspaces/{workspaceId}/members/{uid}`
- `workspace_members`, `workspaceMembers`: 읽기 호환만 허용, 권한 근거로 사용하지 않음
- 일반 사용자의 자기 `users/{uid}` 수정 필드 제한:
  - 허용: `displayName`, `emailVerified`, `lastLoginAt`, `updatedAt`, 검증된 `currentWorkspaceId`
  - 금지: `status`, `disabled`, `globalRole`, `role`, `currentRole`, `workspaceRole`
- 멤버 문서 self-create/self-update로 역할 선택 금지
- 역할 서열:
  - `system_owner`: 모든 워크스페이스 역할 관리 가능
  - `super_manager`: manager 이하만 관리
  - `manager`: teacher, normal, viewer, print_account만 관리
  - teacher 이하: 역할 관리 불가
- 워크스페이스 삭제:
  - `system_owner` 또는 해당 워크스페이스 `super_manager`만
- `user_devices`, `notifications`: `workspaceId`가 없거나 null이어도 자기 로그인 후처리는 허용
- `invitations` update/delete: 기존 `resource.data.workspaceId` 기준으로만 허용하고 workspaceId 변경 거부

## Auditor Assessment

```json
{
  "score": 1,
  "summary": "현재 firestore.rules는 역할 상승, 사용자 문서 과다 수정, 레거시 멤버 컬렉션 불일치, manager 권한 과다 문제가 있어 배포 상태로는 권한 구조 안정성이 낮습니다. firestore.rules.next는 nested members 기준과 역할 서열 검사를 적용한 강화 후보이며, Emulator 테스트 통과와 클라이언트 마이그레이션 전까지는 프로토타입으로만 보아야 합니다.",
  "findings": [
    {
      "check": "Authority Source",
      "severity": "critical",
      "issue": "users.role, systemOwners 문서, 세 멤버 컬렉션이 동시에 권한 근거로 사용됩니다.",
      "recommendation": "globalRole과 workspaces/{workspaceId}/members/{uid}로 권한 근거를 통일합니다."
    },
    {
      "check": "Privilege Escalation",
      "severity": "critical",
      "issue": "일반 사용자가 자기 멤버 문서를 만들거나 수정하면서 privileged role을 넣을 수 있는 경로가 있습니다.",
      "recommendation": "멤버 생성/수정은 상위 관리자만 수행하고, role 서열 검사를 규칙에 넣습니다."
    },
    {
      "check": "Update Bypass",
      "severity": "critical",
      "issue": "selfUserUpdateAllowed가 status, disabled, role 계열 필드를 변경 후보로 포함합니다.",
      "recommendation": "자기 수정은 표시명, 이메일 인증 상태, 마지막 로그인, 검증된 현재 워크스페이스만 허용합니다."
    },
    {
      "check": "Role Hierarchy",
      "severity": "major",
      "issue": "manager와 super_manager의 멤버 관리/워크스페이스 삭제 권한이 충분히 분리되지 않습니다.",
      "recommendation": "manager는 teacher 이하만 관리하고, 워크스페이스 삭제는 system_owner/super_manager로 제한합니다."
    },
    {
      "check": "Business Logic vs Rules",
      "severity": "major",
      "issue": "workspaceId가 없는 사용자의 로그인 후처리 컬렉션 쓰기가 차단될 수 있습니다.",
      "recommendation": "user_devices와 notifications에서 workspaceId null 정책을 명확히 허용합니다."
    },
    {
      "check": "Invitation Integrity",
      "severity": "major",
      "issue": "invitations update가 변경 후 workspaceId 기준으로 권한을 판단합니다.",
      "recommendation": "기존 resource workspaceId와 request workspaceId가 같을 때만 업데이트를 허용합니다."
    }
  ]
}
```

## 필수 테스트 매핑

| 번호 | 항목 | 테스트 파일 |
| --- | --- | --- |
| 1 | 미로그인 사용자 거부 | `auth.rules.test.mjs` |
| 2 | 일반 사용자의 super_manager self-create 거부 | `workspace.rules.test.mjs` |
| 3 | 일반 사용자의 자기 멤버 role 수정 거부 | `workspace.rules.test.mjs` |
| 4 | pending -> active 자기 변경 거부 | `auth.rules.test.mjs` |
| 5 | disabled=false 자기 복구 거부 | `auth.rules.test.mjs` |
| 6 | globalRole 자기 변경 거부 | `auth.rules.test.mjs` |
| 7 | currentRole 자기 변경 거부 | `auth.rules.test.mjs` |
| 8 | 검증되지 않은 currentWorkspaceId 변경 거부 | `auth.rules.test.mjs` |
| 9 | manager의 system_owner 변경 거부 | `auth.rules.test.mjs` |
| 10 | manager의 users 삭제 거부 | `auth.rules.test.mjs` |
| 11 | manager의 super_manager 수정/삭제 거부 | `workspace.rules.test.mjs` |
| 12 | manager의 teacher 이하 수정 성공 | `workspace.rules.test.mjs` |
| 13 | viewer 쓰기 거부 | `workspace.rules.test.mjs` |
| 14 | print_account 일반 쓰기 거부 | `workspace.rules.test.mjs` |
| 15 | teacher 허용 컬렉션 쓰기 성공 | `workspace.rules.test.mjs` |
| 16 | teacher 관리자 컬렉션 쓰기 거부 | `workspace.rules.test.mjs` |
| 17 | system_owner 정상 접근 | `auth.rules.test.mjs` |
| 18 | disabled system_owner 거부 | `auth.rules.test.mjs` |
| 19 | workspace 없는 사용자 기본 세션 읽기 성공 | `auth.rules.test.mjs` |
| 20 | user_devices workspaceId null 정책 | `auth.rules.test.mjs` |
| 21 | notifications workspaceId null 정책 | `auth.rules.test.mjs` |
| 22 | workspace_members 레거시 호환 정책 | `workspace.rules.test.mjs` |
| 23 | workspaceMembers 레거시 호환 정책 | `workspace.rules.test.mjs` |
| 24 | nested members 기준 접근 | `workspace.rules.test.mjs` |
| 25 | invitation workspaceId 변경 공격 거부 | `workspace.rules.test.mjs` |

## 남은 검증 필요

- `firestore.rules.next`는 Firebase CLI `deploy --only firestore:rules --dry-run`에서 컴파일 성공했습니다.
- `firestore.rules.next`는 아직 Emulator 테스트 케이스로 실행 검증하지 않았습니다.
- 테스트 러너 의존성 `@firebase/rules-unit-testing`이 현재 설치되어 있지 않습니다.
- 기존 정적 앱이 레거시 `workspace_members`, `workspaceMembers`, `users.role/workspaceId`에 의존하는 쓰기는 강화 규칙에서 실패할 수 있습니다.
- 운영 적용 전 클라이언트 쿼리를 nested members와 `currentWorkspaceId` 기준으로 맞춰야 합니다.
