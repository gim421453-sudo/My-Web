# Membership Cleanup Dry-run Plan

작성일: 2026-07-21

## 원칙

- 최종 기준 멤버십: `workspaces/{workspaceId}/members/{uid}`
- 이번 단계 작업: 문서화 및 dry-run 계획만
- 금지 작업: 멤버 생성, 수정, 삭제, orphan 복구, workspace 삭제, Auth 수정

## 레거시 멤버 문서별 처리 계획

| source collection | document ID | uid | workspaceId | role | status | workspace | user | Auth | nested | 권장 처리 | 이유 | 실제 처리 전 승인 | 롤백 방법 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `workspace_members` | `owner_ws_RAOf..._RAOf...` | `RAOf****Vax1` | `owner_ws_RAOf0oP1TegBjP1xV8wqwr04Vax1` | `super_manager` | `active` | 있음 | 있음 | 있음 | 있음 | `duplicate-legacy-record` | nested canonical member가 이미 동일 역할/상태로 존재 | nested member가 최종 기준임을 승인 | 백업 JSON으로 legacy 문서 재생성 |
| `workspaceMembers` | `owner_ws_RAOf..._RAOf...` | `RAOf****Vax1` | `owner_ws_RAOf0oP1TegBjP1xV8wqwr04Vax1` | `super_manager` | `active` | 있음 | 있음 | 있음 | 있음 | `duplicate-legacy-record` | snake/camel/nested 3중 중복 | nested member가 최종 기준임을 승인 | 백업 JSON으로 legacy 문서 재생성 |
| `workspace_members` | `ws_RAOf..._RAOf...` | `RAOf****Vax1` | `ws_RAOf0oP1TegBjP1xV8wqwr04Vax1` | `super_manager` | `active` | 있음 | 있음 | 있음 | 없음 | `manual-review-required` | 삭제 검토 workspace의 유일한 legacy membership이며 workspace 유지 여부 미확정 | `ws_RAOf...` 삭제/유지 결정 | 삭제 전 backup 후 문서 재생성 |
| `workspace_members` | `null_RVTg...` | `RVTg****Fmo1` | `null` | `normal` | `active` | 없음 | 있음 | 있음 | 없음 | `cleanup-candidate` | workspaceId가 null이라 nested migration 금지 | 삭제 승인 및 백업 확인 | 백업 JSON으로 legacy 문서 재생성 |
| `workspace_members` | `ws_X6We..._RAOf...` | `RAOf****Vax1` | `ws_X6WeHgl3KFe3mxodRLN8NNAkNBc2` | `system_owner` | `active` | 없음 | 있음 | 있음 | 없음 | `orphan-deleted-workspace` | 존재하지 않는 workspace 참조 | 삭제 승인 및 백업 확인 | 백업 JSON으로 legacy 문서 재생성 |
| `workspaceMembers` | `ws_X6We..._RAOf...` | `RAOf****Vax1` | `ws_X6WeHgl3KFe3mxodRLN8NNAkNBc2` | `system_owner` | `active` | 없음 | 있음 | 있음 | 없음 | `orphan-deleted-workspace` | camel legacy 중복이며 존재하지 않는 workspace 참조 | 삭제 승인 및 백업 확인 | 백업 JSON으로 legacy 문서 재생성 |

## 요청된 분류 반영

### null workspace 참조 1개

- 권장 분류: `cleanup-candidate`
- 자동 복구: 금지
- nested migration: 금지

### 존재하지 않는 `ws_X6We...` 참조 2개

- 권장 분류: `orphan-deleted-workspace`
- 자동 복구: 금지
- nested migration: 금지

### `ws_RAOf...` 관련 legacy membership

- 권장 분류: `manual-review-required`
- workspace 유지 여부 확정 전 nested migration 금지

### `owner_ws_RAOf...` 관련 legacy duplicate

- 권장 분류: `duplicate-legacy-record`
- nested canonical member가 이미 있으므로 나중에 정리 후보
- 단, 실제 삭제는 백업과 사용자 승인 후에만 가능

## nested migration 포함 기준

다음 조건을 모두 만족할 때만 후보로 올립니다.

- workspace 문서가 실제 존재
- workspace가 유지 대상으로 확정
- user 문서가 존재
- Firebase Auth 사용자가 존재
- legacy 역할과 상태가 유효
- 삭제된 workspace가 아님
- 사용자의 수동 승인 또는 명확한 근거가 있음

## nested migration 제외 기준

- `null` workspaceId
- 존재하지 않는 workspaceId
- 삭제된 workspace
- 삭제 검토 중인 `ws_RAOf...`
- UID가 없는 멤버십
- 사용자 문서가 없는 멤버십
- 역할 또는 상태가 충돌하는 멤버십

## 실제 처리 전 필요한 승인

1. `owner_ws_RAOf...`를 최종 유지 workspace로 확정
2. `ws_RAOf...`를 삭제할지, 유지할지 결정
3. legacy membership 삭제 전 백업 위치 확인
4. `workspace_members`와 `workspaceMembers` 중복 정리 범위 승인
5. 실제 삭제/정리 스크립트를 dry-run으로 먼저 검증

## 롤백 원칙

- 정리 전 Firestore export 또는 문서 단위 JSON 백업을 생성합니다.
- 삭제 작업은 batch 단위와 삭제 대상 목록을 남깁니다.
- 실패 시 백업 JSON으로 동일 문서 ID에 재생성합니다.
- Rules 변경과 데이터 정리는 같은 단계에서 동시에 진행하지 않습니다.
