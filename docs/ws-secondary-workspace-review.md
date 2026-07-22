# Secondary Workspace Review

작성일: 2026-07-21

## 감사 범위

- 대상 workspace: `ws_RAOf0oP1TegBjP1xV8wqwr04Vax1`
- 기준 자료: `output/workspace-integrity-audit.json`
- 모드: 읽기 전용 검토
- 금지한 작업: Firestore 수정, Firebase Auth 수정, Rules 변경, workspace 삭제, 멤버십 마이그레이션

## 현재 분류

이 workspace는 삭제 검토 후보입니다. 다만 하위 컬렉션 5개와 legacy membership 1개가 남아 있어 자동 삭제 대상이 아닙니다.

현재 분류: `manual-review-required`

## Workspace 문서 필드

| 필드 | 값 |
| --- | --- |
| workspaceId | `ws_RAOf0oP1TegBjP1xV8wqwr04Vax1` |
| name | `김민준 workspace` |
| title | 없음 |
| ownerUid | `RAOf****Vax1` |
| status | 없음 |
| active | 없음 |
| disabled | 없음 |
| deleted | 없음 |
| deletedAt | 없음 |
| archived | 없음 |
| archivedAt | 없음 |
| createdAt | `2026-06-18T05:22:13.009Z` |
| updatedAt | `2026-06-18T05:22:13.009Z` |

삭제/보관 상태를 직접 나타내는 값은 발견되지 않았습니다. 문서 자체만 보면 삭제 완료 상태라고 단정할 수 없습니다.

## 하위 컬렉션

| 하위 컬렉션 | 문서 수 | 최신 수정 흔적 |
| --- | ---: | --- |
| `notices` | 3 | `2026-06-19T01:42:41.121Z` |
| `afterschoolPrograms` | 1 | `2026-06-18T12:16:01.526Z` |
| `clubPrograms` | 1 | `2026-06-18T12:16:01.526Z` |
| `specialLecturePrograms` | 1 | `2026-06-18T12:16:01.526Z` |
| `settings` | 1 | `2026-06-18T12:16:01.526Z` |

## 실제 사용자 데이터 존재 여부

운영 데이터로 보일 수 있는 문서가 일부 존재합니다.

- 공지 `notices`: 3개
- 방과후 프로그램 `afterschoolPrograms`: 1개
- 동아리 프로그램 `clubPrograms`: 1개
- 특강 프로그램 `specialLecturePrograms`: 1개
- 설정 `settings`: 1개

반대로 다음 주요 데이터는 발견되지 않았습니다.

- nested members: 0개
- 학생/친구/인물/출결/시험/성적/수업자료/급식/시간표 계열 주요 데이터: 발견되지 않음
- 초대코드/가입 요청: 발견되지 않음

## 사용자 및 멤버십 참조

| 항목 | 수 |
| --- | ---: |
| `users.currentWorkspaceId` 참조 | 0 |
| `users.workspaceId` 참조 | 0 |
| `users.workspaceIds[]` 참조 | 0 |
| `workspace_members` 참조 | 1 |
| `workspaceMembers` 참조 | 0 |
| nested members | 0 |

legacy membership 1개가 존재하지만 nested canonical member가 없고, 사용자의 현재 workspace 참조도 없습니다. 따라서 최종 nested members 기준으로는 아직 활성 workspace라고 보기 어렵습니다.

## 코드 참조 여부

다음 검색을 수행했습니다.

```powershell
rg "ws_RAOf0oP1TegBjP1xV8wqwr04Vax1|owner_ws_RAOf0oP1TegBjP1xV8wqwr04Vax1" app.js services shared src docs scripts -n
```

검색 결과 직접 하드코딩된 참조는 발견되지 않았습니다. 다만 런타임에서는 `users.currentWorkspaceId`, legacy membership, workspace 선택 상태에 따라 간접 참조될 수 있으므로 데이터 정리 전 확인이 필요합니다.

## 테스트 데이터 가능성

테스트 또는 과거 자동 생성 데이터일 가능성이 있습니다.

- 생성 시각이 오너 workspace보다 빠릅니다.
- nested member가 없습니다.
- 사용자 currentWorkspaceId 참조가 없습니다.
- 하위 데이터가 공지/프로그램/설정 중심으로 적습니다.

하지만 `notices` 3개와 프로그램 데이터가 있으므로 “무조건 테스트 데이터”라고 확정할 수 없습니다.

## 삭제 시 영향

삭제하면 다음 데이터가 사라집니다.

- workspace root 문서
- `notices` 3개
- `afterschoolPrograms` 1개
- `clubPrograms` 1개
- `specialLecturePrograms` 1개
- `settings` 1개
- `workspace_members`의 `ws_RAOf...` legacy membership 1개

현재 운영 화면에서 직접 참조하는 사용자는 발견되지 않았지만, 과거 화면 상태나 legacy 조회 로직이 남아 있으면 영향을 받을 수 있습니다.

## 백업 대상

삭제 검토 전 최소 백업 대상은 다음입니다.

- `workspaces/ws_RAOf0oP1TegBjP1xV8wqwr04Vax1`
- `workspaces/ws_RAOf0oP1TegBjP1xV8wqwr04Vax1/notices/*`
- `workspaces/ws_RAOf0oP1TegBjP1xV8wqwr04Vax1/afterschoolPrograms/*`
- `workspaces/ws_RAOf0oP1TegBjP1xV8wqwr04Vax1/clubPrograms/*`
- `workspaces/ws_RAOf0oP1TegBjP1xV8wqwr04Vax1/specialLecturePrograms/*`
- `workspaces/ws_RAOf0oP1TegBjP1xV8wqwr04Vax1/settings/*`
- `workspace_members/ws_RAOf0oP1TegBjP1xV8wqwr04Vax1_RAOf****Vax1`

## 삭제 후보 판단 근거

- 사용자의 현재 workspace 참조가 없습니다.
- nested members가 없습니다.
- 하위 데이터 규모가 유지 후보 workspace보다 훨씬 작습니다.
- 사용자는 오너 workspace 외 다른 workspace를 삭제했다고 인식하고 있습니다.

## 유지 후보 판단 근거

- workspace 문서에 deleted/archived/disabled 값이 없습니다.
- 하위 컬렉션 5개에 실제 문서가 존재합니다.
- legacy membership 1개가 존재합니다.

## 수동 확인 필요

1. `notices` 3개가 실제 필요한 공지인지 확인
2. 방과후/동아리/특강 프로그램 3개가 현재 운영 화면에 필요한지 확인
3. `settings/app` 내용이 현재 앱 설정과 충돌하지 않는지 확인
4. 삭제 전 export 또는 별도 백업을 남길지 결정
5. legacy membership을 삭제할지, 유지할지, 마이그레이션 제외 상태로 남길지 결정
