# App Next 시간표 row/cell CRUD 및 set/period 관리

## 현재 계약 (2026-11-12)

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

### set·교시 관리

- `AppNextTimetableManagement`는 기존 timetable 화면의 guarded 영역에 연결된다. 생성·수정·lifecycle 쓰기는 `workspaces/{workspaceId}/timetableSets`, 교시 쓰기는 `workspaces/{workspaceId}/periodTimes`에 한정한다. 선택한 set의 workspace 경계를 서버에서 다시 읽어 검사하고 각 변경 뒤 문서 및 전체 목록을 서버에서 확인한다.
- set 생성·수정은 이름 중복, 분류, 날짜 범위, 메모 길이를 검증한다. 수정은 `kind/type` 연결을 유지한다. set 자체를 삭제하지 않으며 보관·보관 해제·재활성화만 제공한다. lifecycle 변경은 timetable rows와 periodTimes를 제거하지 않는다.
- 교시는 set 전용 periodTime을 추가하고 시각·중복 번호·시간 겹침을 검증하며 기존 교시의 시간 수정도 지원한다. 공통 교시는 상속 표시만 하며 수정·삭제하지 않는다. 교시 삭제는 안전성 검토 결과 현재 서버 계약으로 경쟁 상태를 차단할 수 없어 service에서 fail-closed 처리하고 UI 버튼을 비활성화했다.
- app.js의 legacy V132/V135 경로는 canonical App Next cell ID가 아닌 classRow.id를 timetable document ID로 사용한다. V135는 tt-<set>-<day>-<period>-<timestamp> 형태의 ID를 만들고 활성 교시 server read 뒤 별도 row write를 실행한다. set/period 확인과 row write가 한 transaction이 아니어서 삭제와 직렬화되지 않는다. firestore.rules의 workspace generic write(L539)는 set/period 참조를 검증하지 않고 fallback L1014는 거부만 한다. 따라서 period 삭제 transaction은 임의 ID legacy 생성과 직렬화되지 않아 삭제 직후 orphan row가 가능하다. 현재 Rules/schema/Functions를 변경하지 않는 범위에서는 보장할 수 없어 period delete API는 쓰기 없이 차단한다. 다른 set/period 작업과 row CRUD는 유지한다.

### set·교시 관리 권한

| 역할 | 관리 권한 |
| --- | --- |
| system_owner | 가능 |
| super_manager | 가능 |
| manager | personal/academy만 가능 |
| teacher / normal / viewer / print_account | 불가 |

활성 세션·canonical workspace 일치·서버의 실제 operationMode를 서비스에서 재검사한다. manager의 school/unknown 모드 관리 요청은 fail closed 한다.

### 실제 검증 및 남은 점검

- npm test, npm run typecheck, management unit 6/6, timetable row unit 9/9, release gate 33/33, Browser recovery 19/19 PASS. 수정한 브라우저 테스트 구문 검사와 최종 git diff --check도 PASS.
- 기본 npm run build lifecycle 및 npm run build:admin 모두 PASS했다. 설정 생성기는 cwd인 현재 worktree의 firebase-config.local.js, pm-firebase-config.js, pm-env.js만 출력하고 실행 전 이 파일·dist·dist-admin이 없음을 확인했다. demo placeholder를 사용했고 main Firebase 설정의 사전·사후 SHA-256이 일치했다. build 산출물 81개 파일은 해시 검증 후 tmp/final-safety-review-20261112-194028-2770b42f/build-artifacts 아래 보존해 worktree root의 기존 부재 상태를 복구했다.
- Build 경고는 기존 HTML classic script 및 React Router use client 안내다. Browser run에서 Node MetadataLookupWarning(ETIMEDOUT/ENOTFOUND)이 있었지만 loopback demo Emulator suite는 완료됐다.
- Firestore Emulator log에 9개 Rules warning block이 남았다. create/update는 generic workspace write L539, delete는 L541을 평가한 뒤 fallback L1014에서 거부됐다. Browser suite의 권한 없는 role 거부 확인과 일치하며 관련 성공/거부 assertion은 모두 통과했다. 로그에는 path/uid가 없어 각 block을 특정 테스트 요청과 1:1 연결하는 것은 NOT_VERIFIED다. 기존 log와 screenshots는 사전 SHA-256과 동일하게 복원했고 새 Emulator log는 임시 검토 폴더에 보존했다.
- demo Firebase Auth/Firestore Emulator와 loopback Vite만 사용했다. 운영 접근, 배포, Rules/Functions/dependency/legacy app.js 변경은 없다. MANUAL_REQUIRED: 운영 화면과 mixed/legacy 표시·인쇄 비교, 장시간 offline UX.