# app-next 알림 읽기 전용 통합

## 요약

`/app-next.html`에 `알림` 탭을 추가했다. 이 탭은 신규 `AuthProvider` 세션을 사용하지만 기존 운영 앱의 로그인 흐름, `index.html`, `app.js?v=111`, Firestore Rules, 실제 Firebase 데이터는 변경하지 않는다.

알림은 읽기 전용으로만 조회하며, 읽음 처리·삭제·생성·수정은 수행하지 않는다.

## 실제 알림 데이터 구조

프로젝트 코드에서 확인된 실제 알림 컬렉션은 다음 하나다.

| 항목 | 내용 |
| --- | --- |
| Firestore 컬렉션 | `notifications` |
| 문서 경로 | `notifications/{notificationId}` |
| schema 정의 | `src/services/firestoreSchema.ts` |
| modular read 함수 | `src/services/notificationService.ts`의 `listNotifications(workspaceId, uid)` |
| modular write 함수 | `createNotification`, `markNotificationRead` |
| 운영 local fallback | `services/notificationService.js`, `localStorage["pm:notifications:v1"]` |
| 로그인 후처리 write | `services/authService.js`의 `firebaseCreateWelcomeNotification` |

확인된 기본 필드는 다음과 같다.

| 필드 | 의미 |
| --- | --- |
| `notificationId` | 알림 식별자 |
| `workspaceId` | 워크스페이스 알림 범위. 기존 운영 write는 string을 요구 |
| `uid` | 수신 사용자 |
| `type` | `system`, `app`, `workspace` 등 표시용 유형 |
| `title` | 제목 |
| `message` | 내용 |
| `read` | 읽음 여부 |
| `createdAt` | 생성 시각 |
| `relatedId` | 관련 내부 식별자. UI에는 표시하지 않음 |

검색했지만 실제 알림 source로 확인되지 않은 별도 컬렉션:

- `userNotifications`
- `systemNotifications`
- `workspaceNotifications`
- `notificationRecipients`
- `notificationReads`

실제 수신자 필드는 현재 `uid`다. `recipientUid`, `targetUid`, `recipientUids`, `userId`는 app-next 정규화 유틸에서 방어적으로 인식하지만, Firestore 조회 조건으로 새로 사용하지 않았다.

## 기존 notifications.html 관계

기존 standalone 화면은 다음 파일로 구성되어 있다.

- `notifications.html`
- `src/pages/Settings/notificationsMain.tsx`
- `src/pages/Settings/Notifications.tsx`
- `src/pages/Settings/notificationsReadonlyService.ts`
- `src/pages/Settings/notificationsUtils.ts`

기존 화면은 `newAuthNotifications` 플래그로 신규 `AuthProvider`를 선택 사용할 수 있고, `workspaceId + uid` 조건으로 Firestore를 조회한다. `onSnapshot`은 사용하지 않는다.

이번 app-next 통합은 기존 화면을 수정하지 않고, app-next 전용 read-only 서비스와 유틸을 추가했다.

## app-next 탭 구조

현재 app-next 내부 탭:

- `계정 상태`
- `로그인 기기`
- `알림`

React Router는 추가하지 않았다. 기존 `activeTab` state 기반 전환을 유지한다.

## 조회 범위

Firestore 조회는 다음 조건으로 1회 수행한다.

```text
collection: notifications
where uid == current uid
limit 50
```

이후 화면 표시 전에 다음 범위만 남긴다.

| 상태 | 표시 범위 |
| --- | --- |
| active + workspace 있음 | 본인 `uid` 대상 + 현재 workspace 또는 workspace 없는 알림 |
| active + workspace null | 본인 `uid` 대상 + workspace 없는 개인/system 알림 |
| system_owner | 전체 알림이 아니라 본인 `uid` 대상 알림만 표시 |
| pending/rejected/disabled | 조회 차단 |

전체 `notifications` 컬렉션을 읽은 뒤 클라이언트에서 필터링하는 방식은 사용하지 않았다.

## workspace null 처리

`currentWorkspaceId`가 `null`이어도 계정이 active라면 알림 조회 자체는 허용한다. 다만 `workspaceId`가 있는 알림은 표시하지 않는다.

이 정책은 “workspace 없는 계정도 개인/system 알림만 확인 가능” 요구사항에 맞춘 것이다.

## system_owner 처리

`system_owner`는 전역 역할로만 취급한다.

system owner라는 이유로 전체 사용자 알림을 조회하지 않는다. 이번 화면은 항상 현재 로그인한 본인의 수신 알림만 표시한다.

## 읽음 상태 표시

읽음 상태는 다음 필드의 기존 저장값만 읽어 표시한다.

- `read`
- `isRead`
- `readAt`

읽음 처리, `readAt` 수정, 알림 클릭 write는 수행하지 않는다.

## 조회 방식 및 제한

- `getDocs()` 1회 조회
- `limit(50)` 적용
- `onSnapshot` 미사용
- `orderBy` 미사용

`orderBy("createdAt", "desc")`는 더 자연스러운 조회지만, 현재 인덱스 상태를 바꾸지 않기 위해 사용하지 않았다. 가져온 결과는 화면 표시 전에 `createdAt` 기준 최신순으로 정렬한다.

## 민감 정보 처리

표시하지 않는 값:

- 전체 UID
- 전체 workspaceId
- recipient UID 목록
- 내부 문서 ID
- `relatedId`
- 토큰
- 관리자 내부 메모
- 오류 stack

긴 제목과 내용은 요약해 표시한다.

## 오류 처리

| 상황 | 사용자 표시 |
| --- | --- |
| 데이터 없음 | `표시할 알림이 없습니다.` |
| 권한 오류 | `알림을 불러올 권한이 없습니다.` |
| 인덱스 오류 | `현재 조회에 필요한 인덱스가 준비되지 않았습니다.` |
| 기타 오류 | `알림 목록을 불러오지 못했습니다. 로그인 세션은 유지됩니다.` |

오류 원문, 프로젝트 ID, 쿼리 내부값은 화면에 표시하지 않는다.

## 개발 진단

개발 환경에서만 다음을 표시한다.

```text
entry: app-next
screen: notifications
provider: new
legacy AuthContext mounted: false
notification data source
query scope
read count
listener count: 0
write API imported: false
automatic signOut: none
```

## Firestore write 없음 근거

app-next 알림 파일은 다음 API를 import하지 않는다.

- `addDoc`
- `setDoc`
- `updateDoc`
- `deleteDoc`
- `writeBatch`
- `runTransaction`
- `onSnapshot`

알림 카드에는 클릭 write handler도 없다.

## 브라우저 확인 주소

```text
http://127.0.0.1:5173/app-next.html?appNext=on
```

상단 `알림` 탭에서 확인한다.

## 권한·인덱스 위험

- 현재 배포 Rules가 `notifications` self-read를 쿼리 형태로 허용하지 않으면 permission-denied가 표시될 수 있다.
- `uid == current uid` + `limit(50)`은 복합 인덱스를 피하기 위한 최소 쿼리다.
- `createdAt desc` 서버 정렬은 적용하지 않았으므로, 실제 알림이 50개를 초과하면 최신 50개를 완전 보장하지 못할 수 있다.
- 기존 운영 앱은 `workspaceId`가 없으면 환영 알림 생성을 건너뛴다. workspace 없는 계정은 알림이 비어 있을 수 있다.

