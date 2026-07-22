# Firestore Write Spike Investigation

현재 문서는 2026-07-22 시간표 5차 안정화 기준의 코드 조사 결과입니다. Firestore 일일 쓰기 quota가 소진된 상태라 원격 성공 검증은 수행하지 않았습니다.

## 관찰 값

브라우저 진단에서 다음 값이 보고되었습니다.

| 항목 | 값 |
| --- | --- |
| workspaceId | 빈 문자열 |
| listenerCount | 0 |
| activeListenerPaths | 빈 배열 |
| saveScheduledCount | 10 |
| saveInFlight | false |
| Firestore 오류 | resource-exhausted |
| 중복 시간표 셀 | 같은 setId + day + period count 2 |

## 직접 scheduleSave 진입점

정적 검색 기준으로 `scheduleSave(` 직접 호출은 다음입니다.

| 파일 | 위치 | 목적 | 정상 여부 |
| --- | --- | --- | --- |
| `services/workspaceDataService.js` | `scheduleBootstrapSave()` | 원격 컬렉션이 정상 empty snapshot이고 로컬 데이터가 있을 때 1회 bootstrap 후보 | 조건부 정상 |
| `services/workspaceDataService.js` | `flush()` finally | flush 중 추가 변경이 들어온 경우 지연 재시도 | 조건부 정상 |
| `app.js` | `saveStoreV106()` | 사용자 저장 동작을 원격 저장 대기열로 전달 | 정상 |

`app.js` 안에는 기존 기능별 `saveStore()` 호출이 많지만, 최종 원격 write 예약은 `saveStoreV106()`에서 한 번 더 판단합니다. V106 이후 렌더 중 호출은 `skipRemote: true`로 강제됩니다.

## saveScheduledCount 증가 원인

이전 구조에서는 `saveStore()`가 호출되면 최종적으로 `PMWorkspaceDataService.scheduleSave()`가 호출될 수 있었습니다. 문제는 다음 조건이 겹친 것입니다.

1. Firebase Auth 사용자가 아직 앱 `currentUser.uid/id`와 연결되기 전이면 local account로 오판했습니다.
2. 이 오판 때문에 workspace listener가 시작되지 않아 `listenerCount`가 0으로 남았습니다.
3. listener가 없는 상태에서도 저장 예약이 누적될 수 있었습니다.
4. 기존 `flush()`는 저장 1회에 `settings`와 42개 workspace 하위 컬렉션 전체 row를 batch set/delete 대상으로 만들었습니다.
5. quota 오류가 발생해도 pending retry가 다시 `scheduleSave()`로 이어질 수 있었습니다.

## 20,000 writes 가능 경로 추정

동기화 대상 컬렉션 수는 42개입니다.

이전 `flush()`는 다음 방식이었습니다.

```text
settings 1회 set
+ 각 컬렉션의 모든 row set
+ privileged context면 pending delete 문서 delete
```

따라서 한 번의 전체 저장 예상 write 수는 다음 식으로 계산됩니다.

```text
1 + schedules + notices + subjects + ... + clubSchedules + deletes
```

예시 추정:

```text
전체 workspace row가 약 1,800건이면
전체 저장 1회 ≒ 1,801 writes
saveScheduledCount 10회가 모두 flush되면 ≒ 18,010 writes
bootstrap 또는 retry 1회가 더 붙으면 ≒ 19,811 writes
```

이 수치는 실제 문서 수를 읽지 않은 코드 기반 추정입니다. Firebase Console의 20,000 writes 급증과 맞아떨어지는 가능한 경로입니다.

## 수정된 방어

| 위험 | 수정 |
| --- | --- |
| listener 0 상태 저장 예약 | `scheduleSave()`에서 active listener가 없으면 차단 |
| workspace sync 미시작 저장 예약 | target workspace와 current workspace 불일치 시 차단 |
| 전체 컬렉션 재저장 | pending 변경 row와 pending delete만 flush |
| 동일 데이터 반복 set | remote snapshot signature와 비교해 변경 없는 row 제외 |
| quota 중 즉시 재시도 | `resource-exhausted` 시 1시간 backoff |
| 렌더 중 원격 저장 | `renderDepthV106 > 0`이면 `skipRemote: true` |
| Firebase Auth 사용자 local 오판 | UID 후보와 email match로 Firebase session 판정 보정 |

## render → save → snapshot 순환

조사 대상 함수:

- `renderTimetableV29` 계열
- `renderPage`
- `refreshOpenQuickTimetableV100`
- `startWorkspaceDataSyncV45`
- `workspaceDataService.subscribeCollection`

V106 이후:

```text
renderPage/renderTimetable 진입
→ renderDepthV106 증가
→ 내부 saveStore 호출이 있더라도 skipRemote 강제
→ 원격 scheduleSave 차단
```

즉, 렌더 함수 내부에 남아 있는 레거시 local `saveStore()` 호출은 원격 write 예약으로 이어지지 않습니다.

## snapshot → save 순환

`workspaceDataService` snapshot callback에서는 `app.js`의 `onRemoteChange`를 호출합니다. `app.js`는 `saveStore({ skipRemote: true })`를 사용하므로 원격 저장 예약으로 다시 이어지지 않습니다.

## bootstrap 반복 여부

이전에는 empty snapshot에서 `scheduleSave()`가 직접 걸릴 수 있었습니다. 현재는 다음 조건이 적용됩니다.

- workspace별 bootstrap은 `bootstrapSaveWorkspaces`로 중복 차단
- quota backoff 중 bootstrap 금지
- sensitive collection은 privileged context에서만 bootstrap 후보
- listener가 실제 active 상태가 아니면 `scheduleSave()`에서 차단

## 남은 확인

원격 quota가 초기화된 뒤 다음을 실제 브라우저에서 확인해야 합니다.

- listenerCount가 0이 아닌지
- saveScheduledCount가 가만히 있어도 증가하지 않는지
- lastFlushOperationCount가 실제 변경 row 수에 가깝게 작게 유지되는지
- resource-exhausted 재발 여부
- 다른 기기 동기화 여부
