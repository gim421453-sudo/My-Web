# app-next 일정 조회 전용 Pilot

## 한 줄 요약

`/app-next.html#/schedules-readonly`는 운영 정적 앱의 일정 데이터를 같은 workspace 기준으로 읽기 전용 조회하는 React Pilot 화면이다.

## 범위

- 운영 앱 `index.html + app.js`는 수정하지 않는다.
- Firestore 경로는 `workspaces/{currentWorkspaceId}/schedules`만 사용한다.
- 자동 첫 로드는 `getDocs` 1회 조회를 사용한다.
- 사용자가 `새로고침` 버튼을 누를 때만 현재 workspace cache를 무효화하고 서버 우선 조회를 1회 수행한다.
- `onSnapshot`, `addDoc`, `setDoc`, `updateDoc`, `deleteDoc`, `writeBatch`, `runTransaction`은 사용하지 않는다.
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

호환을 위해 `name`, `subject`, `scheduleDate`, `startAt`, `startTime`, `endTime`, `category`, `priority`, `content`, `description`, `location`, `place`, `room` 같은 읽기 전용 fallback만 허용한다. 원문 데이터는 수정하지 않는다.

## Route 정책

- route: `#/schedules-readonly`
- Guard: `AuthProvider -> LegacyAuthAdapterProvider -> RequireAuth -> AppNextSchedulesReadOnly`
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
- 읽기 전용 상세 보기
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
- 새로고침 중 같은 workspace 요청이 이미 진행 중이면 기존 in-flight 요청을 공유하고 중복 loader로 기록하지 않는다.
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
- `scheduleWriteAttemptCount`: 항상 `0`
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
11. 두 값이 증가하지 않으면 Firebase Console에서 `workspaces/{workspace}/schedules` 서버 문서 수가 실제 증가했는지 확인한다.
12. 수동 새로고침 후 `manualRefreshCount`, `cacheInvalidationCount`, `forceReloadCount`, `scheduleLoadCount`, `scheduleReadCount`, `firestoreReadCount`가 1씩 증가하는지 확인한다.
13. 진단에서 write/listener 카운터가 0인지 확인한다.
14. 운영 정적 앱 일정 화면과 항목 수 및 주요 표시값을 비교한다.

## 롤백

이번 변경은 app-next 내부 route와 문서/테스트에 한정된다. 문제가 있으면 app-next의 `schedules-readonly` route 연결과 새 일정 파일만 제거하면 운영 정적 앱은 그대로 유지된다.
