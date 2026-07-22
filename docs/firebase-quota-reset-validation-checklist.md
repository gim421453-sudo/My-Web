# Firebase Quota Reset Validation Checklist

Firestore 일일 쓰기 quota가 초기화된 뒤 수행할 검증 절차입니다. 현재 quota 소진 상태에서는 원격 저장 성공, 다른 기기 동기화, listener snapshot 수신을 완료 조건으로 삼지 않습니다.

## 준비

1. 브라우저는 한 개만 사용합니다.
2. 주소는 `http://127.0.0.1:5173/`만 사용합니다.
3. `localhost`는 사용하지 않습니다.
4. 서버를 재시작합니다.
5. 브라우저 강력 새로고침을 수행합니다.
6. 콘솔을 열고 기존 로그를 지웁니다.
7. Firebase Console 사용량 화면을 열어둡니다.

## 시작 진단

```javascript
window.PMTimetableDiagnostics.firebaseSession()
window.PMWorkspaceDataService?.diagnostics?.()
```

기대:

```text
isFirebaseBacked: true
activeWorkspaceId: 마스킹된 값
listenerCount: 0이 아님
saveScheduledCount: 안정적
saveInFlight: false
quotaBackoffUntil: 과거 또는 0
```

## 가만히 두기 테스트

1. 아무 버튼도 누르지 않고 2분 대기합니다.
2. 아래를 다시 실행합니다.

```javascript
window.PMWorkspaceDataService?.diagnostics?.()
```

통과:

```text
saveScheduledCount가 증가하지 않음
flushedCount가 증가하지 않음
recentSaveReasons가 새로 쌓이지 않음
```

## 시간표 개별 수업 삭제 테스트

테스트 데이터:

```text
A 시간표
- 월요일 1교시 국어
- 월요일 2교시 수학
- 화요일 1교시 영어

B 시간표
- 월요일 1교시 과학
```

절차:

1. A 시간표 월요일 1교시 국어 셀 클릭
2. 기존 수업 수정 dialog가 뜨는지 확인
3. `이 수업 삭제` 클릭
4. 일반 confirm 확인
5. 화면에서 국어만 사라지는지 확인
6. 빠른보기 팝업이 열려 있다면 즉시 갱신되는지 확인
7. 진단 실행

기대:

```text
A 월요일 2교시 수학 유지
A 화요일 1교시 영어 유지
B 월요일 1교시 과학 유지
periodTimes 유지
timetableSets 유지
visiblePeriodCount 유지
Google 재인증 없음
lastFlushKeys에 timetable 중심으로 표시
lastFlushOperationCount가 작음
```

## 이름 변경 테스트

1. 시간표 이름 변경
2. 저장
3. 빠른보기 이름 반영 확인
4. 새로고침 후 유지 확인
5. 진단 확인

기대:

```text
lastFlushKeys가 timetableSets 또는 settings 중심
전체 컬렉션 flush 없음
```

## 다른 기기 동기화 테스트

쓰기 안정성이 확인된 뒤에만 진행합니다.

1. 두 번째 기기 또는 다른 브라우저에서 같은 계정 로그인
2. 같은 workspace 선택
3. 첫 번째 기기에서 시간표 1건 수정
4. 두 번째 기기에서 반영 확인
5. Firebase Console write 증가량 확인

## 중단 기준

아래 중 하나면 즉시 앱 탭과 서버를 닫습니다.

```text
짧은 시간에 writes 수백~수천 증가
saveScheduledCount가 가만히 있어도 증가
listenerCount가 탭 동작마다 배수 증가
resource-exhausted 재발
snapshot/write 순환 로그
같은 save reason 반복
lastFlushOperationCount가 단순 수정에서 수백 이상
```

## 기록할 값

```text
테스트 시작 시각
Firebase Console 시작 writes
Firebase Console 종료 writes
listenerCount
saveScheduledCount
flushedCount
cancelledCount
lastFlushOperationCount
lastFlushKeys
recentSaveReasons 마지막 5개
콘솔 오류
```
