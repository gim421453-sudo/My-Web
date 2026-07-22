# Notifications 읽기 전용 설계

## 목표

`Notifications` 화면을 신규 AuthProvider 기반 읽기 전용 화면으로 구현하기 전, 다음 단계에서 표시할 최소 UI와 데이터 규칙을 정리합니다. 이번 단계에서는 구현하지 않았습니다.

브라우저 확인 주소는 `http://127.0.0.1:5173` 기준으로만 사용합니다.

## 기존 화면 상태

`src/pages/Settings/Notifications.tsx`는 현재 `return null`만 수행합니다. 기존 화면 동작을 보존하려면 기능 플래그 off 상태에서는 placeholder를 유지하는 방식이 적합합니다.

## 권장 데이터 우선순위

1. Firestore `notifications/{notificationId}`
2. Firestore 조회 실패 또는 결과 없음일 때 localStorage `pm:notifications:v1`

Firestore와 localStorage 결과를 무조건 합치지 않습니다. 중복 판정 기준은 `notificationId`입니다.

## 권장 조회 방식

최소 조회 조건:

```text
notifications
where uid == session.uid
where workspaceId == session.currentWorkspaceId
```

정렬 후보:

```text
createdAt desc
```

다만 `orderBy("createdAt", "desc")`를 추가하면 Firestore 복합 인덱스가 필요할 수 있으므로, 구현 단계에서 permission/index 오류를 별도 안내로 처리해야 합니다.

## currentWorkspaceId 영향

`currentWorkspaceId`가 있는 active 계정:

- 본인 `uid`와 현재 workspaceId 기준 알림 목록 조회 가능

`currentWorkspaceId`가 null인 active 계정:

- 현재 서비스 함수 기준 워크스페이스 알림은 조회하지 않는 것이 안전합니다.
- 개인/시스템 알림 중 workspaceId가 null인 구조는 `firestore.rules.next` 후보에는 가능성이 있으나, 현재 배포 rules와 서비스 함수는 workspaceId를 요구합니다.

표시 권장 문구:

```text
현재 선택된 워크스페이스가 없어 워크스페이스 알림을 불러올 수 없습니다.
로그인은 정상적으로 유지되고 있습니다.
```

system_owner라도 전체 알림 컬렉션을 조회하지 않습니다.

## 신규 AuthProvider 필요 값

Notifications 읽기 전용 화면에서 필요한 값:

| 값 | 용도 |
| --- | --- |
| `phase` | 상태별 화면 분기 |
| `session.uid` | 본인 알림만 조회 |
| `session.email` | 필요 시 마스킹 표시 |
| `session.status` | active 외 상태에서 조회 차단 |
| `session.globalRole` | system owner 안내 및 진단 |
| `session.isSystemOwner` | 전체 조회 금지 안내 및 예외 상태 표시 |
| `session.currentWorkspaceId` | 현재 조회 조건 |
| `session.currentWorkspaceRole` | 향후 workspace 알림 권한 판단 |
| `reloadSession` | 계정 상태 다시 확인 |

## 상태별 화면

| Auth phase 또는 status | 표시 방식 |
| --- | --- |
| `initializing` | 인증 상태를 확인하고 있습니다. |
| `signed_out` | 로그인이 필요합니다. 자동 이동 없음 |
| `loading_session` | 계정 정보를 불러오고 있습니다. |
| `authenticated` + active | 알림 목록 조회 |
| `account_action_required` + pending | 계정 승인을 기다리고 있습니다. 목록 조회 없음 |
| `account_action_required` + rejected | 계정 승인이 거절되었습니다. 목록 조회 없음 |
| `account_action_required` + disabled | 계정 사용이 제한되어 있습니다. 목록 조회 없음 |
| `error` | 계정 정보를 불러오지 못했습니다. 자동 로그아웃 없음 |

## 최소 읽기 전용 UI 필드

권장 표시 필드:

- 알림 제목
- 간단한 내용
- 알림 유형
- 발생 시각
- 현재 읽음 상태
- 관련 서비스

표시하지 않을 필드:

- 전체 UID
- 전체 workspaceId
- 전체 이메일
- `relatedId` 원문
- 내부 문서 경로
- 초대 코드 원문
- 오류 stack
- 토큰류

## 알림 유형 라벨 제안

현재 실제 코드에서 확인된 `type`은 `system`, `app`입니다. 다음 단계 UI는 존재하지 않는 유형을 새로 만들지 말고, 현재 값만 안전하게 라벨링합니다.

| 저장값 | 표시 라벨 |
| --- | --- |
| `system` | 시스템 알림 |
| `app` | 앱 알림 |
| 기타 문자열 | 일반 알림 |

채팅의 `unreadByUid`는 `notifications` 컬렉션과 별도이므로, 첫 읽기 전용 구현에는 포함하지 않는 것이 안전합니다.

## 읽음 상태

현재 저장 필드:

```text
read: boolean
```

읽기 전용 UI에서는 다음처럼 표시만 합니다.

- `read === true`: 읽음
- `read !== true`: 안 읽음

읽음 처리와 전체 읽음은 write가 필요하므로 제외합니다.

## Firestore와 local fallback

Firestore 우선:

- `notifications` 컬렉션에서 `uid`와 `workspaceId` 기준 조회

local fallback:

- `pm:notifications:v1`에서 현재 uid/workspaceId 항목만 필터
- Firestore 실패 또는 결과 없음일 때만 사용
- Firestore 결과와 합쳐 중복 표시하지 않음

## Rules 영향

현재 배포 rules:

- 본인 uid 알림 read는 가능해야 합니다.
- create/update는 workspaceId string + workspace member 조건이 있어 workspace 없는 계정의 로그인 후처리 알림 생성이 실패할 수 있습니다.
- workspace manager는 같은 workspace 알림을 읽거나 삭제할 수 있습니다.

후보 rules:

- `optionalWorkspaceReferenceAllowed`로 workspaceId null 허용 방향이 준비되어 있습니다.

이번 단계에서 Rules는 수정하지 않았습니다. 다음 구현 단계에서 `permission-denied`가 발생하면 UI 문구로 안내하고 자동 로그아웃하지 않아야 합니다.

## 인덱스 영향

현재 조회 조건만 사용하면:

```text
workspaceId == value
uid == value
```

정렬이 없으므로 별도 인덱스 요구 가능성은 낮습니다.

다음 단계에서 최근순 정렬을 추가하면:

```text
workspaceId == value
uid == value
orderBy createdAt desc
```

복합 인덱스가 필요할 수 있습니다. 구현 시 인덱스 오류는 “현재 인덱스 설정으로 알림을 정렬할 수 없습니다.” 같은 개발 안내로 처리하는 것이 좋습니다.

## 민감 정보 마스킹

권장:

- 이메일: `ab***z@example.com`
- relatedId: 기본 숨김
- message: 긴 내용은 요약하고, 토큰/초대코드/전화번호 패턴은 마스킹
- workspaceId/uid: 표시 금지

## 제외 기능

이번 읽기 전용 단계에서 구현하지 않을 기능:

- 읽음 처리
- 전체 읽음
- 알림 삭제
- 알림 설정 저장
- 푸시 토큰 갱신
- 알림 수신 여부 변경
- FCM 발송

`requestPushSend`와 `savePushToken`은 서버/FCM 준비가 필요한 TODO 상태입니다.

## 구현 가능성

판정: **B. 기존 데이터는 있으나 정규화가 필요**

이유:

- Firestore와 local fallback 데이터 소스가 존재합니다.
- 본인 uid/workspaceId 기준으로 최소 목록을 읽을 수 있습니다.
- 하지만 알림 유형, 읽음 시각, 정렬, 보관 기간, 민감정보 마스킹, workspaceId null 정책은 아직 정규화가 필요합니다.

## 다음 단계 권고

1. `Notifications.tsx`를 기능 플래그 기반 신규 AuthProvider 읽기 전용 화면으로 구현합니다.
2. Firestore read-only adapter를 `src/pages/Settings` 또는 `src/services` 내부에 추가합니다.
3. write API는 import하지 않습니다.
4. `uid` 필터와 workspaceId null 안내를 테스트합니다.
5. `permission-denied`와 인덱스 오류를 자동 로그아웃 없이 표시합니다.
6. 채팅 unread는 첫 구현에서 제외하고 별도 설계 후보로 둡니다.
