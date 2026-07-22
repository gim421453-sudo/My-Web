# Workspace Notice Delete Audit

작성일: 2026-07-22

## 결론 요약

현재 증상은 React 표시 문제가 아니라 `workspaces/{workspaceId}/notices` 원격 문서가 실제로 남아 있거나, 삭제 뒤 운영 앱 bootstrap/동기화 흐름이 다시 저장했을 가능성이 높다.

사용자가 확인한 app-next 진단은 다음과 같다.

```text
raw read count = 7
filtered count = 7
displayed count = 7
excluded count = 0
data source = workspaces/{workspace}/notices
```

## 운영 삭제 흐름

운영 공지 카드 삭제 버튼:

```text
app.js
renderNoticeCardsV81(key, rows)
-> requirePassword(() => deleteRow(key, row.id))
```

공통 삭제 함수:

```text
deleteRow(key, id)
-> markWorkspaceDeleted(key, id)
-> store[key] = store[key].filter((row) => row.id !== id)
-> saveStore()
-> renderPage(key)
```

중요한 점:

- 이 함수 자체는 `deleteDoc()`을 직접 기다리지 않는다.
- 화면 배열에서는 즉시 사라질 수 있다.
- 원격 삭제는 `services/workspaceDataService.js`의 pending delete flush에 의존한다.
- 원격 삭제가 실패해도 현재 UI가 성공처럼 보일 수 있다.

## 실제 Firestore delete 경로

`services/workspaceDataService.js`의 `flush()`에서 pending delete가 처리된다.

```text
pendingDeletedIdsByKey[key]
-> isPrivilegedContext(currentContext)일 때만 batch.delete(...)
-> workspaces/{workspaceId}/{key}/{id}
```

공지의 실제 delete 경로:

```text
workspaces/{workspaceId}/notices/{noticeId}
```

원격 삭제 조건:

```text
currentContext.role in ["system_owner", "super_manager", "manager"]
```

비관리자가 공지 삭제 UI에 도달했거나, role 로딩이 비어 있거나, 권한이 꼬인 상태면 local array만 지워지고 원격 삭제가 안 될 수 있다.

## 시스템 관리자 전용 삭제 흐름

시스템 오너 워크스페이스 공지 관리 쪽은 별도 서비스 함수를 사용한다.

```text
services/systemAdminService.js
deleteWorkspaceNotice(workspaceId, id)
-> workspaces/{workspaceId}/notices/{id}.delete()
-> adminLogs 기록
```

이 경로는 직접 Firestore delete를 호출한다. 일반 공지 관리 화면의 `deleteRow()` 경로와 다르다.

## 삭제 권한

현재 배포 후보가 아닌 로컬 `firestore.rules` 기준:

```text
workspaces/{workspaceId}/notices/{noticeId}
read: system_owner 또는 workspace member
create: system_owner 또는 member + role super_manager/manager/teacher/normal
update/delete: system_owner 또는 workspace manager 또는 authorUid == request.auth.uid
```

`firestore.rules.next` 후보 기준:

```text
read: readGeneralWorkspaceData(workspaceId)
create: writeNormalData(...)
update: manager 또는 owner
delete: system_owner 또는 workspace admin 또는 owner
```

이번 작업에서는 Rules를 수정하거나 배포하지 않았다.

## 자동 생성/복원 후보

운영 앱에는 초기 store 기본 공지가 존재한다.

```text
app.js initial store.notices
```

`services/workspaceDataService.js`의 collection listener는 첫 snapshot이 비어 있고 localRows가 있으면 bootstrap save를 예약할 수 있다.

```text
if snapshot.empty && localRows.length:
  if key가 민감 컬렉션이 아니거나 privileged면 scheduleBootstrapSave(...)
```

`notices`는 sensitive collection 목록에 없다. 따라서 다음 상황에서는 공지가 다시 만들어질 수 있다.

1. Firestore notices가 실제로 비어 있음
2. 브라우저 메모리/localStorage에 notices가 남아 있음
3. workspace sync가 시작됨
4. bootstrap save가 예약됨
5. Firestore에 다시 set됨

## 현재 가장 가능성 높은 원인

1순위:

```text
운영 화면에서 메모리 배열만 제거되고 Firestore delete가 성공하지 않았다.
```

근거:

- app-next 서버/기본 read count가 7이다.
- app-next는 localStorage나 system notices를 병합하지 않는다.
- 운영 삭제 함수가 직접 remote delete 성공을 기다리지 않는다.

서버 강제 조회 진단에서 `lastCompletedReadMode=server`와 `fromCache=false` 상태로 7개가 나오면 이 가설의 가능성이 가장 높다.

2순위:

```text
Firestore 문서를 실제로 삭제했지만, empty snapshot + localRows bootstrap이 다시 생성했다.
```

근거:

- workspace sync에 empty snapshot bootstrap 저장 경로가 있다.
- `notices`는 bootstrap에서 제외되는 민감 컬렉션이 아니다.

이 경우 Firebase Console에서 문서 ID 또는 `createdAt`/`updatedAt` 변화가 보일 수 있다.

## 향후 UI 개선 필요

- 삭제 버튼은 원격 delete 성공을 확인한 뒤 성공 메시지를 표시해야 한다.
- permission-denied를 숨기지 말아야 한다.
- 삭제 후 `getDocsFromServer`로 서버 문서 수를 재확인해야 한다.
- bulk delete는 별도 설계와 2단계 확인 뒤 구현해야 한다.
