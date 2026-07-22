# Workspace Notice Source Map

작성일: 2026-07-22

## 범위

이번 문서는 공지 재등장 원인 조사를 위한 읽기 전용 source map이다. 실제 Firestore 데이터 삭제, Rules 수정, 운영 화면 변경은 하지 않았다.

## 운영 정적 앱 source

운영 공지 관리 화면은 `app.js`의 `renderNoticesSplitV81()` 경로를 사용한다.

흐름:

1. `services/workspaceDataService.js`가 `workspaces/{workspaceId}/notices`를 `onSnapshot`으로 구독한다.
2. snapshot row를 `{ id, ...data }` 형태로 변환한다.
3. `store.notices`에 반영한다.
4. `filteredRowsV7("notices")`와 `visibleNotices()`가 화면용 필터를 적용한다.
5. `renderNoticesSplitV81()`가 일반 공지와 시스템 공지를 분리 표시한다.

운영 화면의 기준 source:

```text
workspaces/{currentWorkspaceId}/notices
```

주의:

- `store.notices`는 화면 메모리 상태다.
- 새로고침 후에는 Firestore listener 결과가 다시 `store.notices`를 채운다.
- 삭제 버튼은 먼저 메모리 배열을 제거하고 저장을 예약하므로, 원격 delete가 실패하면 새로고침 뒤 문서가 다시 보인다.

## app-next source

app-next 워크스페이스 공지 탭은 신규 `AuthProvider` session의 `currentWorkspaceId`를 기준으로 1회 조회한다.

기준 source:

```text
workspaces/{session.currentWorkspaceId}/notices
```

기본 조회:

```text
getDocs(collection(db, "workspaces", workspaceId, "notices"))
```

개발 진단용 서버 강제 조회:

```text
getDocsFromServer(collection(db, "workspaces", workspaceId, "notices"))
```

서버 강제 조회 요청은 app-next에서 다음 mode로 구분한다.

```text
default
server
clear-memory-and-server
```

완료 진단은 다음 값을 따로 표시한다.

```text
lastRequestedReadMode
lastCompletedReadMode
lastReadStartedAt
lastReadCompletedAt
fromCache
pendingWrites
```

`server` 또는 `clear-memory-and-server` 실패 시에는 cached/default 결과를 성공처럼 재사용하지 않고 `lastCompletedReadMode = server-failed`로 남긴다.

app-next는 다음 source를 병합하지 않는다.

- top-level `notices`
- top-level `systemNotices`
- `notifications`
- localStorage notice fixture
- 정적 기본 배열

## workspace 동일 여부 확인

현재 코드 기준으로 운영 화면과 app-next 모두 현재 로그인 session의 workspace를 사용한다. 단, 운영 앱은 legacy session/current role fallback을 포함하므로 실제 비교는 브라우저에서 다음 진단으로 확인한다.

1. 운영 화면 콘솔에서 `window.PMWorkspaceDataService?.diagnostics?.()` 실행
2. app-next 공지 탭 개발 진단에서 `workspace present`, `workspace role`, `data source` 확인
3. 전체 workspaceId는 UI에 노출하지 않고, 동일 여부만 비교한다.

app-next는 `currentWorkspaceFingerprint`를 표시한다. 이는 `currentWorkspaceId`를 SHA-256으로 해시한 앞 8자리이며, 전체 workspaceId를 UI에 표시하지 않는다.

Firebase Console에서 대응 workspace를 찾는 방법:

1. `users/{현재 사용자 uid}` 문서에서 `currentWorkspaceId`를 확인한다.
2. Console의 `workspaces/{currentWorkspaceId}` 문서를 연다.
3. 해당 문서 ID를 별도 SHA-256 도구로 해시해 앞 8자리가 app-next의 `currentWorkspaceFingerprint`와 같은지 확인한다.
4. 확인 후 `notices` 하위 컬렉션 문서 수를 본다.

## 7개 문서 schema/source 확인

사용자 브라우저 진단 결과:

```text
raw read count = 7
filtered count = 7
displayed count = 7
excluded count = 0
data source = workspaces/{workspace}/notices
```

이번 작업에서 app-next 개발 진단에 `schema/source sequence`를 추가했다. 이 값은 각 문서의 전체 ID, 제목, 이메일, 전체 workspaceId를 표시하지 않고 다음만 보여준다.

- order
- schemaKind
- sourceKind
- categoryField
- dateField
- contentField
- authorField
- hasDate
- hasSafeAuthor

따라서 7개 각각의 schema/source kind는 app-next 공지 탭에서 확인할 수 있다.

## 캐시와 원격 구분

| 구분 | 확인 방법 | write 여부 |
| --- | --- | --- |
| Firestore 기본 조회 | app-next `공지 새로고침` | 없음 |
| Firestore 서버 조회 | app-next `서버 강제 조회` | 없음 |
| React 메모리 상태 | app-next `메모리 비우고 서버 조회` | 없음 |
| 운영 store | `window.PMWorkspaceDataService?.diagnostics?.()`와 운영 공지 화면 | 없음 |
| localStorage legacy | 운영 앱의 `saveStore()`/초기 store 흐름 확인 필요 | 저장 예약 가능 |
