# Workspace Notice Reappearance Incident

작성일: 2026-07-22

## 증상

- 운영 공지 관리 화면에서 기존 공지를 제거하려고 했다.
- 새로고침 후 동일한 공지 7개가 다시 나타났다.
- app-next 진단도 `workspaces/{workspace}/notices`에서 7개를 읽었다.

## 영향 범위

확인된 source:

```text
workspaces/{workspaceId}/notices
```

확인되지 않은 source:

- 다른 workspace notices 병합
- top-level system notices 병합
- app-next localStorage 병합

app-next는 위 source를 병합하지 않는다.

## 사고 가설

### 가설 A: 원격 삭제 실패

운영 화면의 삭제는 먼저 `store.notices`에서 제거한 뒤 `saveStore()`를 호출한다. 실제 Firestore delete는 pending delete flush에서 처리된다.

삭제 권한이 없거나 role/context가 비어 있으면 원격 삭제가 수행되지 않고, 새로고침 시 Firestore에 남은 7개가 다시 보인다.

### 가설 B: 자동 bootstrap 복원

원격 notices가 비었지만 로컬 store/localStorage에 notices가 남아 있으면 workspace sync가 bootstrap save를 예약할 수 있다.

이 경우 Firebase Console에서 다음 차이가 보일 수 있다.

- 문서 ID가 새 ID로 바뀜: 재생성 가능성 큼
- 문서 ID가 동일함: 기존 문서 삭제 실패 가능성 큼
- `updatedAt`만 새로 바뀜: merge/set 재저장 가능성 큼
- `createdAt`도 새로 바뀜: bootstrap 또는 신규 생성 가능성 큼

### 가설 C: 다른 관리 화면에서 직접 삭제하지 않음

시스템 오너 전용 워크스페이스 공지 관리에는 직접 delete 함수가 있지만, 일반 운영 공지 화면의 공통 삭제와 구현이 다르다. 사용자가 어느 화면에서 삭제했는지에 따라 결과가 달라질 수 있다.

## 새 진단

app-next 공지 탭에 개발 전용 진단을 추가했다.

진단 항목:

- currentWorkspaceFingerprint
- lastRequestedReadMode
- lastCompletedReadMode
- lastReadStartedAt
- lastReadCompletedAt
- fromCache
- pendingWrites
- read mode
- raw read count
- filtered count
- displayed count
- excluded count
- schema/source sequence
- noticeReadCount
- noticeCreateCount = 0
- noticeUpdateCount = 0
- noticeDeleteCount = 0
- noticeSeedCount = 0
- noticeRestoreCount = 0
- noticeMergeSourceCount = 0
- lastNoticeWriteReason = none

진단 버튼:

- 기본 재조회
- 서버 강제 조회
- 메모리 비우고 서버 조회

모두 Firestore write를 하지 않는다.

## 서버 강제 조회 판정

이전 구현에서는 메모리 초기화 버튼이 서버 조회가 아니라 default 조회를 다시 호출했고, 요청 mode와 완료 mode가 분리되어 있지 않아 사용자가 서버 강제 조회를 눌렀는지 진단에서 확정하기 어려웠다.

현재 기준:

```text
기본 조회 -> lastRequestedReadMode=default, lastCompletedReadMode=default
서버 강제 조회 -> lastRequestedReadMode=server, lastCompletedReadMode=server
메모리 비우고 서버 조회 -> lastRequestedReadMode=clear-memory-and-server, lastCompletedReadMode=server
서버 조회 실패 -> lastCompletedReadMode=server-failed
```

`fromCache=false`이고 `lastCompletedReadMode=server`이면 Firestore 서버에서 받은 결과로 판정한다. `fromCache=true`이면 캐시 결과이므로 서버 원본 문서 수 판정에 사용하지 않는다.

## Firebase Console 확인 경로

1. Firebase Console
2. Firestore Database
3. `workspaces`
4. 현재 workspace 문서
5. `notices` 하위 컬렉션

현재 workspaceId 확인 방법:

- 운영 앱 개발 콘솔: `window.PMWorkspaceDataService?.diagnostics?.()`
- app-next 공지 탭: workspace 존재 여부와 source 확인
- 정확한 ID는 Firebase Console의 본인 `users/{uid}.currentWorkspaceId`에서 확인

확인할 항목:

- `notices` 문서가 실제 7개인지
- 삭제 직후 문서 수가 줄어드는지
- 새로고침 후 다시 7개가 되는지
- 기존 문서 ID가 그대로인지
- 새 문서 ID로 재생성되는지
- `createdAt`/`updatedAt`이 새로 바뀌는지
- `status`가 `deleted`/`archived`/`hidden`으로 바뀐 것인지
- app-next의 `currentWorkspaceFingerprint`와 Console에서 확인한 workspace가 대응되는지

## 다음 조사 순서

1. app-next에서 `서버 강제 조회` 실행
2. `lastCompletedReadMode=server`, `fromCache=false`인지 확인
3. 기본 조회 count와 서버 조회 count 비교
3. Firebase Console에서 실제 `notices` 문서 수 확인
4. 운영 화면 삭제 시 콘솔의 workspace sync diagnostics 확인
5. 삭제 직후 `window.PMWorkspaceDataService?.diagnostics?.()`의 `pendingKeys`, `lastFlushKeys`, `lastErrorCode`, `lastFlushOperationCount` 확인
6. 새로고침 후 문서 ID와 timestamp가 유지되는지 확인
