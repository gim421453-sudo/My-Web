# App Next 시간표 row/cell CRUD

## 현재 계약 (2026-10-17)

기존 조회 pilot을 확장했으며 호환 경로 `app-next.html#/timetable-readonly`를 유지한다. 기존 weekly grid와 mixed/legacy read normalization은 그대로 사용한다. 아래 과거 pilot 기록의 쓰기 금지·owner preview 설명은 현재 CRUD 정책이 아니다.

- 인증 Guard: AuthProvider → RequireAuth → 시간표 화면; 편집은 RequireWorkspaceRole과 서비스 정책을 추가 적용한다. 활성 canonical session과 선택 workspace가 필요하다. 서버 Rules가 최종 권한을 판정한다.
- canonical row: `workspaces/{workspaceId}/timetable/{rowId}`. `timetableSets`, `periodTimes`, workspace 및 settings/app은 검증용 조회만 수행한다. collection은 복수형 `timetables`가 아니다.
- 생성 schema: id, setId, day, period, subject, name, teacher, room, memo, time, start, end, workspaceId, workspace_id, createdAt, updatedAt. 프로그램 set에만 기존 sourceType/programId/programName을 상속한다. 표시 이름에서 programId를 만들거나 프로그램을 생성하지 않는다.
- 수정: 원래 문서 ID에 subject/name/teacher/room/memo와 updatedAt만 patch한다. set alias, slot, time, program binding 및 unknown 필드는 보존한다. 삭제는 해당 row 한 개뿐이며 set/period/다른 row를 건드리지 않는다.
- set binding: setId/timetableSetId/scheduleSetId/timetableId/timetable_id를 인정하되 populated alias가 충돌하면 편집을 거부한다. binding 없는 legacy row는 실제 선택 set ID가 school인 호환 경로만 인정하고 추론 binding을 저장하지 않는다. orphan은 기존 조회 정책대로 제외한다.
- 교시: 명시적으로 저장된 visiblePeriodCount/periodCount와 실제 periodTimes로 활성 교시를 결정한다. set 전용 time이 공통 time보다 우선하며 비활성 교시를 제외한다. 조회 fallback 8교시는 쓰기 근거가 아니고 임의 1~12 생성도 없다.
- set: 기존 유효 set을 사용자가 명시적으로 선택해야 쓰기 가능하다. 종료/보관/삭제/비활성 set은 편집하지 않는다. invalid selection을 첫 set으로 바꿔 저장하지 않는다. sessionStorage에 자동 write하지 않는다.

### 역할별 권한

| 역할 | 생성 | 수정 | 삭제 |
| --- | --- | --- | --- |
| system_owner | 가능 | 가능 | 가능 |
| super_manager | 가능 | 가능 | 가능 |
| manager | personal/academy | personal/academy | personal/academy |
| teacher | personal/academy | personal/academy | 불가 |
| normal | 알려진 school/personal/academy | 알려진 school/personal/academy | 불가 |
| viewer | 불가 | 불가 | 불가 |
| print_account | 불가 | 불가 | 불가 |

학교 manager/teacher는 운영 assignment scope 검증이 없어 fail closed 한다. unknown mode는 system_owner/super_manager 외 쓰기를 거부한다. 작성자 제한을 새로 추정하지 않는다. 학교 제한은 기존 운영 정책과의 교집합인 클라이언트 제한이며 새 Firestore Rules의 서버 강제를 뜻하지 않는다.

### 서버 확인과 오류

create/update/delete는 Firebase transaction으로 단일 row만 쓰고 각각 getDocFromServer로 예상 값 또는 부재를 확인한다. 이후 getDocsFromServer 목록 재조회까지 성공해야 UI 완료가 표시된다. render 중 write, optimistic success, window test hook 또는 transport interception은 없다. 입력/권한/네트워크/한도/confirmation 오류는 안전한 alert로 전달하고 busy ref로 중복 제출을 막는다.

생성 전 legacy 점유를 서버 목록으로 검사하고 App Next 생성은 set/day/period 기반 deterministic ID transaction으로 경쟁을 차단한다. 임의 ID를 쓰는 legacy 클라이언트의 동시 생성까지 전체 보장하는 서버 유일성 제약은 이번 범위가 아니다. 중복 기존 row는 자동 정리하지 않는다.

### 실제 검증 및 남은 점검

- 전용 서비스/정책/static 단위 9/9 PASS. 실제 서비스 소스에 fake SDK를 넣어 unavailable/quota 및 create/update/delete confirmation 실패를 결정적으로 검증한다.
- npm test PASS(auth 모듈 668개), typecheck/build/build:admin PASS, release gate 33/33 PASS.
- Browser recovery 18/18 PASS(기존 15 + 신규 시간표 3, fail/skip/todo 0). 관리자 3종 CRUD·서버 상태·reload, teacher/normal 수정·삭제 차단, viewer/print 쓰기 숨김, 학교 manager/teacher 차단, 프로그램 연결, invalid set/workspace, 비활성 membership, 정확한 row 삭제와 set/period/다른 row 보존을 확인했다.
- desktop/mobile 캡처 및 모바일 가로 넘침 검사 PASS. demo Firebase + loopback만 사용했으며 production 접근/Rules/Functions/dependency/legacy app.js 변경은 없다.
- MANUAL_REQUIRED: 운영 화면과 mixed/legacy 표시·출력 비교, 장시간 오프라인 UX. 자동 브라우저 검사를 운영 데이터 검증으로 해석하지 않는다.

## 과거 read-only pilot 기록 (현재 쓰기 정책 아님)

## Summary

`app-next.html#/timetable-readonly` is a read-only React pilot for comparing the new AuthProvider session with the existing operational timetable data. It does not replace the operational static app.

Browser URL:

```text
http://127.0.0.1:5173/app-next.html#/timetable-readonly
```

## Scope

- Entry: `app-next.html`
- Route: `#/timetable-readonly`
- Guard chain: `AuthProvider -> LegacyAuthAdapterProvider -> RequireAuth -> AppNextTimetableReadOnly`
- Data source: existing workspace-scoped Firestore collections
- Write policy: no Firestore write, no listener, no mutation, no cleanup

## Operational Source Map

The operational static app still uses `index.html + app.js?v=111`.

The app-next pilot reads the same canonical workspace child collections:

```text
workspaces/{workspaceId}/timetable
workspaces/{workspaceId}/timetableSets
workspaces/{workspaceId}/periodTimes
```

The service file is intentionally narrow:

```text
src/app-next/appNextTimetableReadonlyService.ts
```

It uses one-time `getDocs()` reads only. It does not import or call `addDoc`, `setDoc`, `updateDoc`, `deleteDoc`, `writeBatch`, `runTransaction`, or `onSnapshot`.

## Route Policy

The route itself is authentication-protected but workspace-null safe.

- `signed_out`: handled by app-next login/status flow
- `pending`, `rejected`, `disabled`: account status screen, no timetable query
- `active + currentWorkspaceId`: reads timetable collections once
- `active + currentWorkspaceId = null`: route can render, but data read is blocked
- `system_owner`: treated as global role; `system_owner` is not used as a workspace role

## Display Model

The screen shows:

- Weekly timetable table
- Today's timetable summary
- Time rows from `periodTimes`
- `timetableSets` selection context
- Program/afterschool rows when recognizable from existing set metadata
- Duplicate-cell warning without modifying data

The pilot preserves existing data shape. If multiple rows exist for the same `setId + day + period`, every row remains visible and a warning is shown. The screen does not deduplicate, delete, migrate, or normalize Firestore data.

## Legacy Compatibility Notes

The operational timetable has two important read-time compatibility rules:

- `setId`, `timetableSetId`, and `scheduleSetId` are all treated as timetable-set connection fields.
- A timetable row without an explicit set id is included only when the active timetable set is the legacy `school` set. This matches the operational V102 helper behavior and is read-only; app-next does not write the inferred value back.

When no active set is supplied to app-next, the read-only adapter chooses the first non-program timetable set for the weekly table. This prevents a `방과후/특강/동아리` set returned first by Firestore from making the general weekly table look empty. Program rows remain in the separate program timetable section.

## Safety Rules

This pilot must not:

- Start a Firestore listener
- Write to Firestore
- Update localStorage/sessionStorage with timetable data
- Clean duplicate cells
- Repair orphan timetable rows
- Modify `app.js`, `index.html`, `services/workspaceDataService.js`, Firestore Rules, or V111 timetable code

## Diagnostics

Development diagnostics are exposed at:

```javascript
window.PMAppNextTimetableDiagnostics?.snapshot?.()
```

The snapshot reports counters and categories only:

- render/read/load/cache counts
- listener and write attempt counts, expected to stay `0`
- duplicate-cell group and item counts
- visible/empty/invalid cell counts
- route and role categories

It must not expose full UID, email, document ID, token, full Firestore path, or full workspaceId.

## Manual Comparison Checklist

Use `127.0.0.1`, not `localhost`.

1. Open `http://127.0.0.1:5173/` and confirm the operational timetable still works.
2. Open `http://127.0.0.1:5173/app-next.html#/timetable-readonly`.
3. Confirm the app-next page requires login through the new app-next auth flow.
4. Confirm active accounts with a workspace load the timetable once.
5. Confirm active accounts without a workspace see a safe empty state, not logout.
6. Compare weekday/period/subject/teacher/room with the operational timetable.
7. Confirm duplicate cells are shown with a warning instead of being removed.
8. Run `window.PMAppNextTimetableDiagnostics?.snapshot?.()` and verify write/listener counters are `0`.

## Rollback

The operational static app is unchanged. To stop using this pilot, do not open `#/timetable-readonly`; no production menu or operating route depends on it.
