# Workspace Sync Diagnostics

이 문서는 `window.PMWorkspaceDataService?.diagnostics?.()`와 `window.PMTimetableDiagnostics.workspaceSync()` 결과 해석 기준입니다.

## 진단 명령

브라우저 주소는 `http://127.0.0.1:5173/` 기준으로 사용합니다.

```javascript
window.PMTimetableDiagnostics.firebaseSession()
window.PMTimetableDiagnostics.workspaceSync()
window.PMWorkspaceDataService?.diagnostics?.()
window.PMTimetableDiagnostics.duplicateCells?.()
window.PMTimetableDiagnostics.renderCount?.()
```

## 주요 필드

| 필드 | 의미 |
| --- | --- |
| `workspaceId` | 내부 현재 workspaceId. 기존 호환을 위해 남아 있지만 공유 시 마스킹 필요 |
| `currentWorkspaceMasked` | 공유 가능한 마스킹 workspaceId |
| `listenerCount` | 현재 등록된 Firestore listener 수 |
| `activeListenerPaths` | 마스킹된 listener 경로 |
| `saveScheduledCount` / `scheduledCount` | 실제 원격 저장 예약 수 |
| `saveSkippedCount` | 저장 예약 차단 수 |
| `cancelledCount` | listener 없음, quota backoff 등으로 취소된 저장 수 |
| `flushedCount` | 실제 flush 시도 완료 횟수 |
| `lastFlushOperationCount` | 마지막 flush의 전체 write operation 추정 수 |
| `lastFlushKeys` | 마지막 flush 대상 컬렉션 |
| `pendingKeys` | 아직 flush 대기 중인 컬렉션별 문서 수 |
| `recentSaveReasons` | 최근 저장 예약 사유와 호출 스택 |
| `quotaBackoffUntil` | quota 초과 후 재시도 차단 만료 시각 |
| `duplicateStartAttempts` | 같은 workspace/store로 sync start가 중복 호출된 횟수 |
| `unsubscribeCount` | listener 해제 누적 수 |
| `startedAt` | 현재 sync 시작 시각 |

## 정상 기준

```text
로그인 후 workspaceId가 준비됨
listenerCount가 0이 아님
activeListenerPaths가 같은 경로를 중복 포함하지 않음
가만히 있을 때 saveScheduledCount가 증가하지 않음
renderCount 증가만으로 recentSaveReasons가 늘지 않음
lastFlushOperationCount가 전체 데이터 수가 아니라 변경 row 수에 가깝게 작음
```

## local account 오판 확인

```javascript
window.PMTimetableDiagnostics.firebaseSession()
```

확인할 값:

| 필드 | 기대 |
| --- | --- |
| `firebaseUid` | 로그인 중이면 `present` |
| `currentUserUidCandidates` | 후보가 있으면 `present` 배열 |
| `currentUserEmailMatchesAuth` | UID 연결 전이어도 email이 같으면 true 가능 |
| `isFirebaseBacked` | Firebase 로그인 사용자는 true |
| `activeWorkspaceId` | 마스킹된 workspaceId |
| `lastSkip.reason` | 반복적으로 `auth-user-not-bound-to-app-user-yet`에 머물면 세션 연결 문제 |

## 디버그 로그 켜기

상세 workspace sync 로그는 기본적으로 꺼져 있습니다. 필요할 때만 아래 중 하나를 사용합니다.

```javascript
sessionStorage.setItem("pm-debug-sync", "1")
```

또는 URL:

```text
http://127.0.0.1:5173/?pmDebugSync=1
```

끄기:

```javascript
sessionStorage.removeItem("pm-debug-sync")
```

## 민감정보 규칙

진단 공유 시 다음은 그대로 공유하지 않습니다.

- 전체 UID
- 전체 email
- 전체 workspaceId
- token
- service account key
- Firebase config 값

현재 진단 출력은 workspace 경로와 uid를 마스킹하도록 보강했습니다.

## 중단 기준

아래 중 하나면 앱 탭과 서버를 닫고 추가 조사를 먼저 합니다.

- `saveScheduledCount`가 아무 동작 없이 계속 증가
- `listenerCount`가 같은 탭 동작마다 배수로 증가
- `lastFlushOperationCount`가 단순 수업 1건 수정인데 수백~수천 이상
- `resource-exhausted` 재발
- `recentSaveReasons`에 같은 source가 짧은 시간 반복
- snapshot/update 로그와 save 로그가 번갈아 무한 반복
