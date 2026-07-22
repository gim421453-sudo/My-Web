# Firestore Rules Version Comparison

작성일: 2026-07-21

## 범위와 안전 원칙

- 실제 Firebase 배포: 하지 않음
- Firestore 데이터 수정: 하지 않음
- Firebase Auth 사용자 수정: 하지 않음
- 기존 `firestore.rules` 수정: 하지 않음
- 기존 `firestore.rules.next` 수정: 하지 않음
- `firebase.json` 수정: 하지 않음
- `app.js`, `services/*.js`, `index.html` 수정: 하지 않음

## 현재 실제 데이터 상태 요약

읽기 전용 감사 스크립트 [audit-user-auth-data.mjs](<C:\Users\USER\Documents\My Web\scripts\audit-user-auth-data.mjs>) 실행 결과를 기준으로 정리했습니다.

- Firestore `users` 문서 수: 3
- Firebase Auth 사용자 수: 3
- `status`: 전부 `active`
- `disabled`: Boolean `false` 1개, 문자열 `"false"` 2개, 문자열 `"true"` 0개
- `active`: Boolean `true` 2개, 필드 없음 1개
- `globalRole`: 전부 `user`
- 레거시 `role/currentRole/workspaceRole == system_owner`: 1개
- `systemOwners/{uid}` 문서는 있으나 `users.globalRole != system_owner`: 1개
- `currentWorkspaceId == null`인 active 사용자: 2개
- 존재하는 `workspaces` 문서: 2개
- 감사 기준상 유효해 보이는 워크스페이스: 2개
- `workspace_members` 문서 수: 4
- `workspaceMembers` 문서 수: 2
- nested `workspaces/{workspaceId}/members/{uid}` 문서 수: 1
- orphan membership: 3개
- 같은 사용자/워크스페이스 조합 중복: 2개
- role mismatch: 0개
- status mismatch: 0개

사용자 전제에는 “현재 오너 워크스페이스 외 나머지 워크스페이스는 삭제됨”이라고 되어 있습니다. 그러나 읽기 전용 감사에서는 비활성/삭제 플래그가 없는 `workspaces` 문서가 2개로 관측되었습니다. 따라서 이번 계획에서는 두 번째 워크스페이스를 자동 복구하거나 자동 연결하지 않고, “수동 확인 필요”로 분류합니다.

감사 출력:

- [auth-data-audit.json](<C:\Users\USER\Documents\My Web\output\auth-data-audit.json>)
- [auth-data-audit.md](<C:\Users\USER\Documents\My Web\output\auth-data-audit.md>)

## 세 Rules 파일 정보

| 파일 | 용도 | 실제 배포 여부 | 줄 수 | 바이트 | 마지막 수정 시간 | SHA-256 | firebase.json 대상 |
| --- | --- | --- | ---: | ---: | --- | --- | --- |
| `firestore.rules.console-current` | Firebase Rules API에서 읽은 현재 콘솔 배포본 | 예 | 385 | 13267 | 2026-07-21T05:58:30.480Z | `92e1ab755ae213b4141fb39d18c93c542b0f79da802c5541a5ba41fabefaf09d` | 아니오 |
| `firestore.rules` | 저장소의 현재 배포 대상 | 콘솔과 다름, 다음 deploy 대상 | 818 | 28567 | 2026-07-08T17:23:51.947Z | `37eb8f688a8889cf52995fa54e94c8baf02d145bba5d7fdf0df6d5606e00e3f1` | 예 |
| `firestore.rules.next` | 강화 후보 Rules | 아니오 | 1210 | 43134 | 2026-07-21T05:35:46.605Z | `14b791ab4367b7142350cdc140af844b7b65f1b27b588bb91e7fd6a2da743114` | 아니오 |

`firebase.json`은 `"rules": "firestore.rules"`를 가리킵니다. 따라서 현재 상태에서 아래 명령을 실행하면 `firestore.rules.next`가 아니라 기존 `firestore.rules`가 배포됩니다.

```powershell
firebase deploy --only firestore:rules
```

## 1. console-current ↔ firestore.rules

### 핵심 차이

- 콘솔 배포본은 `workspace_members`와 nested members만 멤버 근거로 봅니다.
- 루트 `firestore.rules`는 `workspaceMembers`까지 멤버 근거에 추가합니다.
- 루트 `firestore.rules`는 민감 컬렉션, 공개 동의, teacher 읽기 등 helper가 늘어났습니다.
- 콘솔 배포본의 마지막 wildcard는 `system_owner`에게 명시되지 않은 모든 문서 read/write를 허용합니다.
- 루트 `firestore.rules`의 마지막 wildcard는 기본 deny이지만, workspace 내부 wildcard가 여전히 넓은 쓰기를 허용합니다.

### 시스템 오너

| 항목 | console-current | firestore.rules |
| --- | --- | --- |
| 판단 기준 | `systemOwners/{uid}` 또는 `users.role == "system_owner"` | 동일 |
| `users.globalRole` 사용 | 안 함 | 안 함 |
| 사용자 status 확인 | `users.role` branch에서만 `status != "disabled"` | 동일 |
| `disabled == true` 처리 | `users.role` branch에서만 차단 | 동일 |
| `disabled == "true"` 처리 | 차단 안 됨 | 차단 안 됨 |
| systemOwners/users 불일치 | `systemOwners` 문서가 있으면 users 불일치에도 오너 가능 | 동일 |
| 비활성 system_owner | systemOwners 문서가 있으면 비활성 차단이 약함 | 동일 |

현재 실제 데이터에는 `systemOwners` 문서가 있으나 `users.globalRole != system_owner`인 사용자가 1명 있습니다. 두 규칙 모두 `globalRole`을 기준으로 쓰지 않기 때문에 이 불일치를 안전하게 해석하지 못합니다.

### users/{uid}

| 항목 | console-current | firestore.rules |
| --- | --- | --- |
| 본인 create | `role in pending/normal/viewer` | 동일 |
| 본인 read | 허용 | 허용 |
| 본인 update | `selfUserUpdateAllowed()` | `selfUserUpdateAllowed()` |
| 본인 delete | 불가 | 불가 |
| system_owner update/delete | 허용 | 허용 |
| workspace manager update/delete | 허용 | 허용 |
| status 변경 | 자기 update 허용 후보에 포함, `active`도 허용 | 자기 update 후보에 포함하나 조건 일부 강화 |
| active 변경 | 직접 필드 목록에는 없음 | 직접 필드 목록에는 없음 |
| disabled 변경 | 자기 update 허용 후보에 포함 | 자기 update 허용 후보에 포함 |
| globalRole 변경 | 자기 update 후보에 포함 | 자기 update 후보에 포함 |
| role 변경 | 자기 update 후보에 포함, system_owner는 제한 | 자기 update 후보에 포함, system_owner는 제한 |
| currentRole 변경 | 자기 update 후보에 포함 | 자기 update 후보에 포함 |
| workspaceRole 변경 | 명시 없음 | 명시 없음 |
| currentWorkspaceId 변경 | 자기 update 후보에 포함 | 후보에 포함, 기존 값 유지 조건 추가 |
| workspaceId 변경 | 자기 update 후보에 포함 | 후보에 포함, 기존 값 유지 조건 추가 |
| workspace_id 변경 | 없음 | 자기 update 후보에 포함, 기존 값 유지 조건 추가 |
| workspaceIds 변경 | 없음 | 없음 |
| pendingWorkspaceId 변경 | 자기 update 후보에 포함 | 자기 update 후보에 포함 |

현재 `disabled: "false"`가 2개이므로 두 규칙 모두 문자열 `"false"`를 Boolean false로 안전하게 정규화하지 않습니다. 단순히 `disabled != true`만 쓰면 `"true"`도 차단되지 않는 경로가 남습니다.

### 워크스페이스 및 멤버십

| 항목 | console-current | firestore.rules |
| --- | --- | --- |
| 최종 권한 근거 | `workspace_members` 우선, nested 보조 | nested, `workspaceMembers`, `workspace_members` 혼합 |
| `workspace_members` | self create 가능 | self create 가능 |
| `workspaceMembers` | 사용 안 함 | self create 가능 |
| nested members | self create/update 가능 | self create/update 가능 |
| 일반 사용자 자기 role 선택 | 차단 불충분 | 차단 불충분 |
| manager가 super_manager 수정 | 가능성이 있음 | 가능성이 있음 |
| manager가 teacher 이하 수정 | 가능 | 가능 |
| 삭제된 workspace membership | workspace 문서 존재 확인 없이 legacy membership이 권한 근거가 될 수 있음 | 동일 위험 |
| orphan membership 권한 | `workspace_members` orphan이 권한 근거가 될 수 있음 | `workspaceMembers`까지 위험 확장 |

현재 실제 데이터에는 orphan membership 3개와 legacy-only membership 3개가 있습니다. 두 규칙 모두 이를 권한 근거로 해석할 수 있어, 삭제된 워크스페이스 참조를 자동 복구하거나 연결하면 안 됩니다.

### 기타 컬렉션

- `user_devices`, `notifications`: 두 규칙 모두 `workspaceId is string`과 membership을 요구합니다. `currentWorkspaceId == null`인 active 사용자의 로그인 후처리 실패 가능성이 있습니다.
- `invitations`: 두 규칙 모두 update/create/delete에서 `request.resource.data.workspaceId` 기준을 사용합니다. workspaceId 변경 공격 가능성이 있습니다.
- `systemNotices`: 로그인 사용자는 읽고 system_owner만 쓸 수 있습니다.
- `systemIntegrations`, `systemIntegrationLogs`, `adminLogs`: system_owner 중심입니다.
- 채팅 관련 컬렉션은 루트 `firestore.rules`에만 더 상세하게 추가되어 있습니다.

## 2. firestore.rules ↔ firestore.rules.next

### 핵심 차이

- `firestore.rules.next`는 권한 기준을 `users.globalRole`과 nested members로 통일합니다.
- `workspace_members`, `workspaceMembers`는 읽기 호환만 허용하고 권한 근거로 사용하지 않습니다.
- `users/{uid}` 자기 update 허용 필드를 축소합니다.
- workspace 내부 컬렉션 wildcard 쓰기를 없애고 컬렉션별 권한을 명시합니다.
- manager와 super_manager의 역할 서열을 분리합니다.
- `user_devices`, `notifications`는 workspaceId가 null이어도 본인 로그인 후처리를 허용합니다.
- `invitations` update는 기존 `resource.data.workspaceId` 기준으로 workspaceId 변경을 막습니다.

### 시스템 오너

| 항목 | firestore.rules | firestore.rules.next |
| --- | --- | --- |
| 판단 기준 | `systemOwners/{uid}` 또는 `users.role` | `users.globalRole == "system_owner"` |
| systemOwners 사용 | 직접 권한 근거 | 관리/조회 문서로 남김 |
| users.role 사용 | 사용 | 사용 안 함 |
| users.globalRole 사용 | 안 함 | 사용 |
| status 확인 | 일부 branch | `userIsActive()`에서 필수 |
| disabled true 처리 | Boolean true만 일부 | Boolean true 차단 |
| disabled "true" 처리 | 차단 안 됨 | 현재 후보도 완전 정규화 필요 |
| systemOwners/users 불일치 | 오너 가능 | 오너 불가 |

주의: 현재 실제 데이터는 `globalRole`이 모두 `user`입니다. 그러므로 `firestore.rules.next`를 그대로 배포하면 현재 레거시 system_owner 사용자가 전역 오너 권한을 잃을 수 있습니다. 먼저 `systemOwners`와 `users.globalRole` 불일치 수동 검토가 필요합니다.

### users/{uid}

| 항목 | firestore.rules | firestore.rules.next |
| --- | --- | --- |
| 본인 create | role 기반 | `globalRole=user`, `status=pending`, `currentWorkspaceId=null` |
| 본인 read | 허용 | get 허용 |
| 본인 update | 광범위 | `displayName`, `emailVerified`, `lastLoginAt`, `updatedAt`, 검증된 `currentWorkspaceId` |
| 본인 delete | 불가 | 불가 |
| system_owner update/delete | 허용 | 허용 |
| workspace manager update | users 일부 승인 필드만 후보 | 승인성 필드만 후보 |
| workspace manager delete | 가능 | 불가 |
| status 변경 | 자기 변경 위험 | 자기 변경 차단 |
| disabled 변경 | 자기 변경 위험 | 자기 변경 차단 |
| globalRole 변경 | 자기 변경 후보 | 자기 변경 차단 |
| role/currentRole/workspaceRole | 레거시로 사용 | 최종 제거 후보, 자기 변경 차단 |
| workspaceIds | 권한 근거 아님 | 권한 근거 아님 |

### 워크스페이스 및 멤버십

| 항목 | firestore.rules | firestore.rules.next |
| --- | --- | --- |
| 최종 권한 근거 | 세 멤버 구조 혼합 | nested members만 |
| 일반 사용자 자기 멤버 생성 | 가능 | 불가 |
| 일반 사용자 자기 role 변경 | 가능성 있음 | 불가 |
| manager가 super_manager 수정/삭제 | 가능성 있음 | 불가 |
| manager가 teacher 이하 수정 | 가능 | 가능 |
| workspace 삭제 | manager/super_manager 가능 | system_owner/super_manager만 |
| orphan membership 권한 | 부여 가능 | 부여 안 함 |

현재 실제 데이터에는 nested member가 1개뿐입니다. `firestore.rules.next`는 legacy-only membership 3개를 권한 근거로 쓰지 않으므로, 배포 전 nested members 마이그레이션 dry-run이 필요합니다. 단, 삭제된 워크스페이스 참조는 복구 대상이 아닙니다.

### 역할별 동작 비교

| 역할 | firestore.rules | firestore.rules.next |
| --- | --- | --- |
| super_manager | manager와 유사하게 광범위 | 워크스페이스 삭제/관리 가능 |
| manager | 워크스페이스 삭제 및 멤버 관리 과다 | teacher 이하 관리, super_manager 수정 불가 |
| teacher | 일부 민감 쓰기 허용 | 수업/과제/출결/시험 중심 쓰기 |
| normal | 비민감 컬렉션 광범위 쓰기 가능 | notices/schedules 등 제한적 일반 쓰기 |
| viewer | 비민감 컬렉션 쓰기 가능성 | 읽기 전용 후보 |
| print_account | 비민감 컬렉션 쓰기 가능성 | 읽기/인쇄용 접근만 후보 |

## 3. console-current ↔ firestore.rules.next

`firestore.rules.next`는 콘솔 배포본과 권한 모델이 크게 다릅니다.

- 콘솔 배포본은 레거시 `workspace_members`를 권한 근거로 사용합니다.
- `firestore.rules.next`는 레거시 멤버십을 권한 근거에서 제외합니다.
- 콘솔 배포본은 `systemOwners` 문서가 있으면 users 문서 상태와 무관하게 오너가 될 수 있는 경로가 있습니다.
- `firestore.rules.next`는 `users.globalRole`과 active 상태를 요구합니다.
- 콘솔 배포본은 명시되지 않은 문서를 system_owner가 wildcard로 접근할 수 있습니다.
- `firestore.rules.next`는 명시되지 않은 문서를 기본 deny합니다.

현재 실제 데이터 기준으로는 `firestore.rules.next`가 더 안전하지만, 바로 배포하면 다음이 깨질 수 있습니다.

1. 레거시 system_owner 계정 권한
2. legacy-only membership 사용자의 워크스페이스 접근
3. `currentWorkspaceId == null` active 사용자의 자동 workspace 발견
4. 기존 `authService.js`의 로그인 중 사용자/멤버 문서 보정 쓰기
5. `workspace_members`/`workspaceMembers` 자동 복구 쓰기

## 기존 앱 호환성

### index.html + app.js + 루트 services

확인된 사용처:

- `services/authService.js`는 로그인 중 `users/{uid}` 문서를 만들거나 보정합니다.
- `services/authService.js`는 `workspace_members`를 먼저 조회합니다.
- `services/authService.js`는 `workspace_members`, `workspaceMembers`, nested members를 batch로 보정할 수 있습니다.
- `services/authService.js`는 `userData.disabled === true`만 disabled로 봅니다. 문자열 `"true"` 호환이 없습니다.
- `app.js`는 `currentUser.role`, `authWorkspaceState.currentRole`, `workspace_id`, `workspaceId`, `currentWorkspaceId`를 혼합해 사용합니다.
- `chatService.js`는 `role/currentRole/workspaceRole`을 normalize해서 씁니다.

따라서 `firestore.rules.next`를 배포하기 전에는 기존 로그인 보정 로직이 rules에 막힐 가능성이 큽니다. 특히 “로그인 중 자동 멤버십 복구”는 이번 데이터 상태에서는 삭제된 워크스페이스 멤버십을 되살릴 위험이 있으므로 먼저 제거 또는 dry-run화해야 합니다.

### src React/TypeScript

전환 중인 구조는 `globalRole/currentWorkspaceId`와 nested members 방향과 더 잘 맞습니다. 다만 실제 앱 진입점은 여전히 정적 `index.html + app.js + services` 구조가 중심이므로, React 인증 구조만 맞춘다고 운영 호환성이 보장되지는 않습니다.

## currentWorkspaceId == null 사용자 처리

현재 active 사용자 2명이 `currentWorkspaceId == null`입니다. 이 상태는 로그인 실패가 아니라 다음 흐름이어야 합니다.

1. Firebase Auth 성공
2. `users/{uid}` 본인 문서 읽기
3. `status == active`
4. `currentWorkspaceId == null`
5. 로그인 상태 유지
6. 워크스페이스 선택 또는 연결 요청 화면 표시

자동으로 오너 워크스페이스를 지정하면 안 됩니다. 향후 후보 자동 지정은 다음 조건을 모두 만족할 때만 검토합니다.

- 유효 워크스페이스가 정확히 하나
- 해당 사용자의 활성 nested member 문서가 존재
- 역할 값이 허용된 WorkspaceRole
- 삭제된 워크스페이스를 참조하지 않음

현재 감사에서는 유효해 보이는 워크스페이스가 2개이므로 자동 지정 조건을 만족하지 않습니다.

## output 디렉터리 Git 추적

`.gitignore`는 `output/pdf/`만 제외하고 `output/` 전체를 제외하지 않습니다. 이번 감사 결과는 기본 마스킹이지만, `--include-sensitive` 옵션을 사용하면 JSON에 원문 UID/이메일이 들어갈 수 있으므로 `output/auth-data-audit*.json|md`는 커밋 전 확인이 필요합니다.
