# App Next 일정 조회 및 CRUD

## 한 줄 요약

`/app-next.html#/schedules-readonly`는 같은 workspace의 운영 일정 데이터를 조회하고, 활성 Rules가 허용하는 역할에 canonical 일정 CRUD를 제공한다. 기존 route 이름은 호환성을 위해 유지한다.

## 범위

- 운영 앱 `index.html + app.js`는 수정하지 않는다.
- Firestore 경로는 `workspaces/{currentWorkspaceId}/schedules`만 사용한다.
- 자동 첫 로드는 `getDocs` 1회 조회를 사용한다.
- 수동 새로고침과 CRUD 서버 확인 완료 후 현재 workspace cache를 무효화하고 서버에서 목록을 재조회한다.
- 읽기 service는 계속 listener 없이 조회만 수행한다. 별도 CRUD service가 같은 collection에 `setDoc`, `updateDoc`, `deleteDoc`을 수행하고 각 작업 후 `getDocFromServer`로 결과를 확인한다.
- 필터 변경, 상세 보기, 카드 전환은 클라이언트 메모리에서만 처리한다.

## 운영 일정 스키마

운영 앱에서 확인한 주요 필드는 다음이다.

- `title`
- `date`
- `start_time`
- `end_time`
- `type`
- `importance`
- `status`
- `memo`

조회는 기존 `name`, `subject`, `scheduleDate`, `startAt`, `startTime`, `endTime`, `category`, `priority`, `content`, `description`, `location`, `place`, `room` fallback을 유지한다. 편집은 `title`/`date`와 운영 snake_case 시간 필드로 표현되는 canonical 일정에 한정한다. alternate 날짜·시간 표현은 자동 migration하지 않고 운영 화면에서 수정한다. 수정 시 unknown 필드와 기존 작성자·장소 정보는 보존한다.

새 문서는 자동 생성한 Firestore ID를 `id`에도 저장하고 현재 `workspaceId`/`workspace_id`, `createdByUid`, 생성/수정 서버 timestamp를 기록한다. App Next marker는 사용하지 않는다. 상태는 운영 화면의 `예정`, `진행 중`, `완료`, `취소`를 사용하며 기존 실제 옵션은 편집 시 유지한다.

## 역할별 CRUD

| 역할 | 조회 | 생성 | 수정 | 삭제 |
| --- | --- | --- | --- | --- |
| system_owner | 현재 workspace | 허용 | 허용 | 허용 |
| super_manager / manager | 현재 workspace | 허용 | 허용 | 허용 |
| teacher / normal | 현재 workspace | 허용 | 허용(작성자 제한 없음) | 거부 |
| viewer / print_account | 현재 workspace | 거부 | 거부 | 거부 |

근거는 활성 `firestore.rules`의 `canWriteWorkspaceData` 및 generic collection create/update/delete와 legacy `defaultActionPermissionsV31`이다. UI와 서비스는 Rules보다 넓은 권한을 주지 않는다. system_owner는 canonical 전역 권한이며 workspace role로 변환하지 않는다. 쓰기에는 현재 선택 workspace가 필요하다.

입력 검증, 동기적 ref 기반 중복 제출 guard, 진행/권한/인증/workspace/network/quota/서버 미확인 오류 처리를 제공한다. 쓰기 응답만으로 성공을 표시하지 않으며 문서 서버 확인과 목록 재조회까지 완료해야 한다. 수정/삭제는 대상 문서를 서버에서 먼저 읽어 경로·workspace·지원 schema를 확인한다. 삭제에는 확인 대화상자를 사용한다.

## Route 정책

- route: `#/schedules-readonly`
- Guard: `AuthProvider -> LegacyAuthAdapterProvider -> RequireAuth -> AppNextSchedulesReadOnly`; 쓰기 영역은 `RequireWorkspaceRole`을 추가 적용한다. release manifest는 활성 workspace 역할에게 경로를 열며 실제 쓰기 권한은 Guard/service/Rules가 판정한다.
- `signed_out`, `pending`, `rejected`, `disabled`, `error`는 기존 app-next 계정 상태 화면 정책을 따른다.
- `active + currentWorkspaceId=null`은 route 접근은 허용하지만 Firestore 조회는 실행하지 않고 안내만 표시한다.
- `system_owner`는 전역 역할로 유지하며 workspace role로 변환하지 않는다.

## 화면 구성

- 일정 상태 요약
- 오늘 일정
- 다가오는 일정
- 완료 또는 지난 일정
- 필터 결과
- 상태, 유형, 중요도, 날짜 범위 필터
- 상세 보기 및 일정 등록/수정/삭제 폼
- workspace 없음, 로딩, 오류, 빈 상태

## 필터 정책

- 상태 옵션은 `전체`, `오늘`, `예정`, `완료`, `지난 일정`, `날짜 확인 필요`를 고정 제공한다.
- 유형 옵션은 운영 canonical 유형과 실제 조회 데이터의 유형을 합쳐서 제공한다.
- 중요도 옵션은 `높음`, `보통`, `낮음`과 실제 조회 데이터의 중요도 값을 합쳐서 제공한다.
- 날짜 범위는 시작일만, 종료일만, 양쪽 모두 선택 가능하다.
- 시작일이 종료일보다 늦으면 안내를 표시하고 Firestore 재조회는 하지 않는다.

## 새로고침 정책

- 자동 렌더, StrictMode 재호출, 같은 route 재렌더는 기존 in-flight 요청을 공유하거나 cache를 재사용한다.
- 사용자가 `새로고침` 버튼을 누르면 현재 workspace cache만 삭제하고 서버 우선 조회를 1회 수행한다.
- 서버 새로고침 시 이전 조회가 진행 중이면 완료를 기다린 뒤 새 서버 조회를 수행한다. 저장 이전 조회를 쓰기 성공의 목록 결과로 재사용하지 않는다.
- 새로고침은 Firestore write나 listener를 만들지 않는다.
- 마지막 서버 조회 결과는 `scheduleRawReadCount`, `totalScheduleCount`, `hiddenScheduleCount`, `invalidScheduleCount`로 구분한다.
- 운영 앱에서 새 일정을 추가했는데 수동 새로고침 후 `scheduleRawReadCount`가 증가하지 않으면 app-next 표시 문제가 아니라 서버 `workspaces/{workspace}/schedules` 문서 수가 증가하지 않은 상태로 본다.

## 상세 보기 정책

- `상세 보기` 버튼은 `type="button"`이며 form submit이나 route 이동을 하지 않는다.
- `href="#"`, hash 변경, `scrollIntoView`를 사용하지 않는다.
- 상세 내용은 클릭한 일정 카드 안에만 바로 펼쳐진다.
- 목록 위에 별도 상세 패널을 삽입하지 않아 첫 클릭 시 페이지가 위로 이동하지 않게 한다.
- 상세에는 제목, 일자, 시간, 유형, 상태, 중요도, 장소, 설명을 표시한다.
- 문서 ID, 전체 workspaceId, UID 등 내부 값은 표시하지 않는다.
- 선택 상태는 배열 index나 제목이 아니라 내부 stable key와 클릭한 카드 key를 함께 사용한다.
- stable key는 문서 ID 원문을 노출하지 않는 내부 해시/내용 기반 값이다.
- 같은 일정이 오늘/필터 결과처럼 여러 구역에 동시에 보여도 클릭한 카드 하나만 펼친다.
- 선택 일정이 필터 결과에서 사라지면 상세 패널은 닫힌다.

## 진단

개발 환경에서 다음 API를 제공한다.

```js
window.PMAppNextSchedulesDiagnostics?.snapshot?.()
```

주요 기대값:

- `scheduleLoadCount`: 동일 workspace loader 실제 시작 횟수
- `scheduleReadCount`: `schedules` 컬렉션 조회 횟수
- `scheduleWriteAttemptCount`: 검증을 통과해 시작한 쓰기 시도 횟수
- `scheduleCreateCount`, `scheduleUpdateCount`, `scheduleDeleteCount`: 문서 서버 확인 성공 횟수
- `lastScheduleWriteResult`: `none`, `pending`, `server-confirmed`, `failed`
- `scheduleListenerStartCount`: 항상 `0`
- `scheduleActiveListenerCount`: 항상 `0`
- `duplicateLoadDetected`: React StrictMode in-flight 재사용은 `false`
- `manualRefreshCount`: 사용자가 새로고침 버튼을 누른 횟수
- `cacheInvalidationCount`: 수동 새로고침으로 현재 workspace cache를 무효화한 횟수
- `forceReloadCount`: 수동 서버 우선 reload 횟수
- `detailPanelOpen`: 일정 상세 패널 표시 여부
- `selectedSchedulePresent`: 선택된 일정 존재 여부
- `selectedScheduleMatchCount`: 선택 key와 일치하는 일정 수. 정상은 `1`
- `detailSelectionMismatchDetected`: 선택 불일치 감지 여부. 정상은 `false`
- `filterStatusOptionCount`, `filterTypeOptionCount`, `filterImportanceOptionCount`: 필터 옵션 개수
- `scheduleRawReadCount`: 서버/기본 조회에서 읽은 원본 일정 수
- `lastScheduleReadMode`: `default`, `server`, `cache` 중 마지막 조회 방식
- `lastScheduleSourceCollection`: `workspaces/{workspace}/schedules`
- `lastScheduleFromCache`, `lastSchedulePendingWrites`: Firestore snapshot metadata
- `selectedFilter`: 필터 signature만 표시

UID, 이메일, 전체 workspaceId, 문서 ID, Firestore 경로, 토큰, API 키는 진단에 포함하지 않는다.

## 수동 확인 주소

- app-next 일정 Pilot: `http://127.0.0.1:5173/app-next.html#/schedules-readonly`
- 운영 비교 화면: `http://127.0.0.1:5173/`

## 수동 체크리스트

1. app-next에서 로그인 상태가 유지되는지 확인한다.
2. `#/schedules-readonly`로 직접 진입한다.
3. workspace가 있으면 일정 목록이 표시되는지 확인한다.
4. workspace가 없으면 조회 없이 안내만 표시되는지 확인한다.
5. 오늘 일정, 다가오는 일정, 완료/지난 일정이 분리되는지 확인한다.
6. 유형/중요도/날짜 필터 변경 시 Firestore read count가 증가하지 않는지 확인한다.
7. 상세 보기 버튼이 데이터 수정 없이 열리고 닫히는지 확인한다.
8. 페이지 중간까지 스크롤한 뒤 상세 보기 버튼을 눌러 화면이 상단으로 이동하지 않는지 확인한다.
9. 같은 제목 일정이 있어도 클릭한 카드의 상세만 열리는지 확인한다.
10. 운영 앱에서 일정을 1건 추가한 뒤 app-next `새로고침` 버튼을 눌러 `scheduleRawReadCount`와 `totalScheduleCount`가 증가하는지 확인한다.
11. 두 값이 증가하지 않으면 demo Emulator의 서버 문서 수와 비교한다. 이 검증을 위해 운영 Firebase에 접근하지 않는다.
12. 수동 새로고침 후 `manualRefreshCount`, `cacheInvalidationCount`, `forceReloadCount`, `scheduleLoadCount`, `scheduleReadCount`, `firestoreReadCount`가 1씩 증가하는지 확인한다.
13. 쓰기 후 write/성공 카운터가 증가하고 listener 카운터는 0인지 확인한다.
14. 운영 정적 앱 일정 화면과 항목 수 및 주요 표시값을 비교한다.

## 롤백

이번 작업은 별도 `codex/feat-app-next-schedule-crud` worktree의 미커밋 변경이다. 운영 정적 앱·Rules·Functions·의존성은 바꾸지 않았다. 문제 발생 시 해당 브랜치 통합을 보류하고 Git 정책에 따라 변경 범위를 검토한다.

## 실제 최종 검증 (2026-10-15)

- `npm test` PASS(auth 모듈 659개), `npm run typecheck` PASS, `npm run build` PASS, `npm run build:admin` PASS.
- `npm run test:recovery:browser` 15/15 PASS: 기존 13개 + 일정 역할/오류 UI 2개. skip/todo 0. 일곱 역할, 타 작성자 canonical 일정 수정, teacher/normal 삭제 거부 및 viewer/print 쓰기 거부의 실제 Rules, scope mismatch, legacy 필드 보존/mixed 조회, 중복 제출/진행 상태/새로고침 중첩, 완료 후 목록과 서버 상태, 재접속 상태, 입력/권한 alert와 비활성 membership fail-closed를 확인했다.
- 실제 service에 fake SDK를 넣어 create/update/delete 확인 호출 및 mismatch, unavailable 분류를 deterministic하게 검사했다. WebChannel 내부 URL 차단이나 production hook은 사용하지 않았다.
- release gate 32/32 PASS. desktop/mobile 캡처와 모바일 가로 overflow 검사 PASS. Node 24.18.0 / Temurin JRE 21, demo project와 loopback만 사용했다.
- `MANUAL_REQUIRED`: 실제 기기에서 운영 앱과 App Next 표시·정렬·필터/상세·출력 비교, 장시간 offline 연결의 UX. alternate 날짜 schema 편집은 지원 범위 밖이다. 운영 Firebase 검증·배포는 하지 않았다.
- 최종 Git 정리(2026-10-16): `git diff --check` PASS, 금지 파일 및 생성 Firebase 설정 diff 0, Emulator/Vite 종료 및 테스트 debug log 제거 완료. stage/commit/push/merge는 수행하지 않았다.
