# Auth Shadow Comparison Policy

## 비교 대상

Legacy snapshot은 기존 앱이 저장하거나 노출하는 인증 상태를 읽기 전용으로 수집한 값입니다.

New shadow session은 `src/auth/sessionService.buildAppSession()`이 계산한 `AppSession`입니다.

## 필드별 비교 기준

| 항목 | Legacy | New AppSession | 판단 |
| --- | --- | --- | --- |
| uid | `uid/id/userId` | `uid` | 다르면 critical |
| 인증 상태 | `isAuthenticated` | `isAuthenticated` | 다르면 critical |
| status | `status`, `active`, `disabled` 추론 | `status` | 다르면 warning, 인증 상태까지 다르면 critical |
| system owner | `isSystemOwner`, `role/currentRole/workspaceRole/globalRole == system_owner` | `isSystemOwner` | 다르면 critical |
| globalRole | `globalRole` 또는 legacy owner 추론 | `globalRole` | owner 의미가 유지되면 warning, 권한 강등이면 critical |
| workspaceId | `currentWorkspaceId/workspaceId/workspace_id` | `currentWorkspaceId` | 보통 warning |
| workspaceRole | `workspaceRole/currentRole/role` | `currentWorkspaceRole` | 보통 warning |

## 레거시 의미 매핑

기존 앱에서는 `system_owner`가 전역 역할과 워크스페이스 역할 위치에 모두 섞여 있을 수 있습니다.

- `legacy.role == "system_owner"` + `new.globalRole == "system_owner"`는 의미상 owner 유지로 봅니다.
- `legacy.workspaceRole == "system_owner"` + `new.currentWorkspaceRole == "super_manager"`는 새 구조에서 정상화된 결과일 수 있으므로 warning으로 둡니다.
- `users.globalRole == "user"` + `systemOwners/{uid}` 존재 + `new.globalRole == "system_owner"`는 `GLOBAL_ROLE_MISMATCH` warning입니다.
- 잘못된 `legacy.currentWorkspaceId`를 새 세션에서 제외하고 owner workspace fallback을 쓰는 것은 로그인 실패가 아닙니다.

## Severity 정책

### critical

- UID가 다름
- 기존 로그인 성공인데 신규 세션이 없음
- 인증 상태가 다름
- 기존 system owner인데 신규가 일반 사용자로 계산됨
- 신규가 system owner인데 기존에 owner 근거가 전혀 없음

### warning

- `users.globalRole` 미러 값 불일치
- legacy workspace role이 `system_owner`이고 신규 workspace role이 `super_manager`
- legacy workspaceId와 신규 currentWorkspaceId가 다름
- status 불일치
- viewer/print_account/manager 같은 역할 차이 감지

### info

- legacy snapshot을 얻을 수 없음
- 기존 앱이 아직 shadow snapshot을 명시적으로 노출하지 않음
- 구조 차이로 인해 비교할 필드가 비어 있음

## 허용 가능한 warning

아래 warning은 기존 데이터 정규화 전까지 허용합니다.

- `GLOBAL_ROLE_MISMATCH`
- `LEGACY_ROLE_PRESENT`
- `WORKSPACE_NOT_FOUND`
- legacy `workspaceRole: "system_owner"`와 신규 `currentWorkspaceRole: "super_manager"` 차이

단, warning이 계속 누적되면 데이터 마이그레이션 계획에서 정리 대상으로 기록해야 합니다.

## Critical 판단 기준

Shadow Mode에서 critical이 나와도 운영 UI를 차단하지 않습니다. 대신 실제 연결 전에 반드시 원인을 확인합니다.

특히 다음 critical은 신규 AuthProvider 연결 전 해결이 필요합니다.

- `UID_MISMATCH`
- `AUTH_STATE_MISMATCH`
- `NEW_SESSION_MISSING`
- `SYSTEM_OWNER_MISMATCH`

## 개인정보 보호

비교 객체는 메모리 안에서만 사용하고, 로그 payload에는 `maskUid()`와 `maskEmail()`을 적용합니다.

로그 payload는 mismatch의 code/severity/message만 포함하고, raw legacy/new session 전체를 출력하지 않습니다.
