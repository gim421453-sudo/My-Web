# Notifications 데이터 소스 감사

## 범위

이번 문서는 `Notifications` 읽기 전용 화면을 구현하기 전에, 현재 프로젝트에서 알림 데이터를 어디서 읽고 쓰는지 확인한 결과입니다. 구현, Firestore write, Rules 수정/배포, 운영 정적 앱 수정은 하지 않았습니다.

브라우저 확인 기준 origin은 `http://127.0.0.1:5173`입니다.

## 조사한 코드 경로

| 경로 | 확인 내용 |
| --- | --- |
| `src/pages/Settings/Notifications.tsx` | 현재 `return null`만 있는 placeholder입니다. |
| `src/auth/*` | 신규 AuthProvider/AppSession에서 `phase`, `uid`, `status`, `globalRole`, `isSystemOwner`, `currentWorkspaceId`, `currentWorkspaceRole`, `reloadSession` 제공을 확인했습니다. |
| `src/context/AuthContext.tsx` | 기존 React AuthContext입니다. 이번 후보 화면에서는 신규 AuthProvider 사용을 우선해야 합니다. |
| `src/services/notificationService.ts` | modular Firestore 기반 `notifications` create/read/update 함수가 있습니다. |
| `src/services/firestoreSchema.ts` | `collections.notifications = "notifications"` 및 `NotificationDoc` 타입이 있습니다. |
| `src/services/deviceService.ts` | `pushToken` 저장 함수가 있으나 알림 문서가 아니라 `user_devices` 문서의 푸시 토큰입니다. |
| `services/notificationService.js` | 운영 정적 앱용 localStorage 알림 facade입니다. |
| `services/authService.js` | Firebase 로그인 후처리에서 환영 알림을 `notifications/{notificationId}`에 씁니다. |
| `services/chatService.js` | 채팅 스레드의 `readBy`, `unreadByUid`를 관리합니다. 알림 컬렉션은 아니지만 읽지 않음 상태 후보입니다. |
| `app.js` | 설정 보조 섹션에서 로컬 `PMNotificationService.listNotifications`로 미읽음 개수를 표시합니다. |
| `firestore.rules` | `notifications/{notificationId}` 규칙이 있습니다. |
| `firestore.rules.next` | `notifications/{notificationId}` 후보 규칙이 있습니다. |

## 검색 키워드 결과

확인한 키워드:

```text
notifications
notificationSettings
userNotifications
systemNotifications
workspaceNotifications
pushToken
fcmToken
readAt
isRead
unread
markAsRead
notificationPreferences
```

실제 알림 데이터 경로로 확인된 것은 `notifications`와 localStorage `pm:notifications:v1`입니다. `notificationSettings`, `userNotifications`, `systemNotifications`, `workspaceNotifications`, `fcmToken`, `notificationPreferences`는 현재 코드상 별도 데이터 경로로 확인되지 않았습니다.

## 실제 데이터 경로

| 데이터 소스 | 경로 또는 키 | 읽기 코드 위치 | 쓰기 코드 위치 | 판정 |
| --- | --- | --- | --- | --- |
| Firestore 알림 | `notifications/{notificationId}` | `src/services/notificationService.ts`의 `listNotifications(workspaceId, uid)` | `src/services/notificationService.ts`의 `createNotification`, `markNotificationRead`; `services/authService.js`의 `firebaseCreateWelcomeNotification` | 실제 알림 데이터 후보 |
| 로컬 fallback | localStorage `pm:notifications:v1` | `services/notificationService.js`의 `listNotifications` | `services/notificationService.js`의 `createNotification`, `markRead` | 운영 정적 앱용 local fallback |
| 채팅 읽지 않음 상태 | `chatThreads/{threadId}.readBy`, `chatThreads/{threadId}.unreadByUid` | `app.js`의 채팅 UI, `services/chatService.js` | `services/chatService.js`의 `markRead`, 메시지 전송/스레드 생성 | 알림 목록과 별도. “채팅 알림” 후보지만 직접 통합 대상 아님 |
| 지원 스레드 읽지 않음 상태 | `supportThreads/{threadId}.readBy`, `supportThreads/{threadId}.unreadByUid` | Rules에 경로 존재, UI/서비스 일부 참조 | 지원 스레드 업데이트 규칙 존재 | 알림 컬렉션과 별도 |
| 푸시 토큰 | `user_devices/{deviceId}.pushToken` | 직접 목록 조회 없음 | `src/services/deviceService.ts`의 `savePushToken`; `services/deviceService.js`의 `savePushToken`은 TODO | 알림 설정이 아니라 기기 문서 필드 |

## `notifications/{notificationId}` 현재 필드

`src/services/firestoreSchema.ts`, `src/services/notificationService.ts`, `services/authService.js` 기준:

| 필드 | 의미 | 비고 |
| --- | --- | --- |
| `notificationId` | 알림 ID | `services/authService.js`는 `welcome_${uid}` 사용, `src`는 `addDoc` 문서 ID 사용 |
| `workspaceId` | 소속 workspace | 현재 서비스 함수는 string을 요구합니다. 후보 타입은 `string | null`입니다. |
| `uid` | 알림 대상 사용자 | 본인 알림 필터 기준입니다. |
| `type` | 알림 유형 | 기본값/실사용 예: `system`, `app` |
| `title` | 알림 제목 | UI 표시 후보 |
| `message` | 알림 내용 | 개인정보 포함 가능성 있어 길이 제한/마스킹 필요 |
| `read` | 읽음 여부 | boolean |
| `createdAt` | 생성 시각 | serverTimestamp 또는 ISO string |
| `relatedId` | 관련 문서 ID | 내부 문서 경로/ID 노출 주의 |

확인되지 않은 필드:

- `readAt`
- `isRead`
- `unread`
- `notificationPreferences`
- `fcmToken`

## 의존성

| 항목 | 현재 상태 |
| --- | --- |
| uid 의존 여부 | 있음. `listNotifications(workspaceId, uid)`와 Rules 모두 본인 `uid` 기준을 사용합니다. |
| workspaceId 의존 여부 | 있음. 현재 read 함수는 `workspaceId`와 `uid`를 모두 조건으로 사용합니다. |
| 역할 의존 여부 | 본인 알림은 역할 의존이 약합니다. 관리자/오너는 Rules에서 타 사용자 또는 workspace 알림 접근 가능성이 있습니다. |
| 실시간 구독 여부 | 현재 알림 서비스는 `getDocs` 1회 조회입니다. `onSnapshot` 알림 구독은 확인되지 않았습니다. |
| 읽음 처리 방식 | `read: true`로 update합니다. 로컬 fallback도 `read: true`로 갱신합니다. |
| 삭제 방식 | `src/services/notificationService.ts`에는 삭제 함수 없음. Rules는 read/delete 조건이 있으나 클라이언트 함수는 확인되지 않았습니다. |
| 보관 기간 | 코드상 TTL, 만료, 보관 기간 정책 없음. |

## 알림 유형 분류

실제 코드 기준으로 확인된 유형:

| 유형 | 존재 여부 | 근거 |
| --- | --- | --- |
| 시스템 공지 알림 | 부분 존재 | `services/authService.js`가 `type: "system"` 환영 알림을 생성합니다. 시스템 공지 전체 연동은 별도 확인 필요. |
| 워크스페이스 공지 알림 | 명시 경로 없음 | `workspaceId` 필드는 있으나 공지 알림 생성 코드 확인 안 됨. |
| 개인 알림 | 존재 | `uid` 대상 알림 구조입니다. |
| 일정 알림 | 없음 | `type` 확장 가능성은 있으나 생성 코드 없음. |
| 과제 알림 | 없음 | 생성 코드 없음. |
| 출결 알림 | 없음 | 생성 코드 없음. |
| 시험 알림 | 없음 | 생성 코드 없음. |
| 채팅 알림 | 별도 후보 | `chatThreads.unreadByUid`, `readBy`가 있으나 `notifications`와 분리되어 있습니다. |
| 승인 요청 알림 | 없음 | `notifications` 생성 코드로 확인 안 됨. |
| 오류 또는 보안 알림 | 없음 | 생성 코드 없음. |
| 푸시 알림 설정 | TODO | `savePushToken`, `requestPushSend`는 TODO 또는 서버 함수 필요 상태입니다. |

## 읽기 전용 후보와 write 필요 기능

읽기 전용으로 가능한 항목:

- 최근 알림 목록
- 알림 제목
- 알림 유형
- 생성 시각
- 읽음/안 읽음 현재 상태
- 관련 서비스 추정: `type`, `relatedId` 기반
- 메시지 요약

write가 필요한 기능:

- 읽음 처리
- 전체 읽음
- 알림 삭제
- 알림 설정 저장
- 푸시 토큰 갱신
- 알림 수신 여부 변경

이번 단계에서는 위 write 기능을 구현하지 않았습니다.

## Rules 비교

### 현재 `firestore.rules`

`notifications/{notificationId}`:

- create/update:
  - 로그인 필요
  - `request.resource.data.uid == request.auth.uid`
  - `request.resource.data.workspaceId is string`
  - `isWorkspaceMember(workspaceId)` 필요
- read/delete:
  - system owner
  - 본인 uid
  - workspace manager

영향:

- 본인 알림 read는 가능해야 합니다.
- workspaceId 없는 사용자 또는 workspaceId null 알림 create/update는 어려울 수 있습니다.
- pending/rejected/disabled 제한은 함수 구조상 legacy status/disabled 판단과 membership 여부에 좌우됩니다.

### `firestore.rules.next`

`notifications/{notificationId}`:

- create/update:
  - 로그인 필요
  - `request.resource.data.uid == request.auth.uid`
  - `optionalWorkspaceReferenceAllowed(request.resource.data)`
- read/delete:
  - system owner
  - 본인 uid
  - `workspaceId`가 string이고 workspace admin

영향:

- workspaceId null 또는 없는 로그인 후처리 알림을 더 유연하게 허용하는 후보입니다.
- 이번 단계에서는 배포하지 않았습니다.

## 인덱스 영향

현재 `src/services/notificationService.ts` 조회는 다음 복합 조건입니다.

```text
where("workspaceId", "==", workspaceId)
where("uid", "==", uid)
```

`orderBy` 또는 `limit`은 없습니다. 이 조건만으로는 일반적으로 복합 인덱스 요구 가능성이 낮습니다. 다만 다음 단계에서 최근순 목록을 위해 `orderBy("createdAt", "desc")`를 추가하면 복합 인덱스가 필요할 수 있습니다.

실시간 구독은 현재 구현되어 있지 않지만, 같은 query로 `onSnapshot`을 붙이는 것은 구조상 가능합니다. 이번 단계에서는 구현하지 않았습니다.

## 민감 정보 위험

알림 데이터에 포함될 가능성이 있거나 UI에서 제외해야 할 정보:

| 정보 | 위험 | 권장 처리 |
| --- | --- | --- |
| 전체 UID | 높음 | 표시 금지 |
| 전체 이메일 | 중간-높음 | 필요 시 마스킹 |
| 전화번호 | 높음 | 표시 금지 또는 마스킹 |
| 학생/사용자 개인정보 | 높음 | 메시지 길이 제한, 민감 패턴 마스킹 |
| 오류 stack | 높음 | 표시 금지 |
| 토큰 | 매우 높음 | 표시 금지 |
| 초대 코드 | 높음 | 표시 금지 또는 마스킹 |
| 내부 문서 경로/relatedId | 중간 | 기본 숨김, 서비스명으로 변환 |
| 다른 workspaceId | 높음 | 표시 금지 |

## 결론

구현 가능성: **B. 기존 데이터는 있으나 정규화가 필요**

근거:

- Firestore `notifications/{notificationId}`와 localStorage `pm:notifications:v1`가 존재합니다.
- 본인 `uid`와 `workspaceId` 기준 조회 함수가 이미 있습니다.
- 현재 `Notifications.tsx`는 placeholder입니다.
- 실시간 구독, 정렬, 보관 기간, 알림 유형 표준화, 민감정보 마스킹은 아직 부족합니다.
- 채팅 unread 상태는 별도 데이터 구조라 Notifications 목록에 바로 섞기보다는 다음 단계에서 별도 후보로 설계해야 합니다.
