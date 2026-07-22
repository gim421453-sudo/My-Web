# 로그인·시간표 안정화 기준점

작성일: 2026-07-22  
범위: 로그인·세션 안정화 및 시간표 안정화 작업의 현재 기준점 기록  
원칙: 이 문서는 기록용입니다. 코드, Firestore Rules, Firebase 데이터, 실제 계정은 변경하지 않았습니다.

## 한 줄 요약

현재 운영 정적 앱은 `app.js?v=111` 기준이며, 인증 모듈 테스트 290개와 시간표 안정화 테스트 109개가 통과한 상태입니다. 브라우저 실데이터 수동 검증은 별도 체크리스트에 따라 아직 추가 확인이 필요합니다.

## 기준 버전

- `index.html`: `app.js?v=111`
- `app.js`: `v111.0 - 2026-07-22`
- 시간표 안정화 테스트: `109 timetable stability checks passed.`
- 인증 모듈 테스트: `290 auth module tests passed.`
- 전체 `npm test`: 인증 모듈 290개 + 시간표 안정화 109개 통과

## git diff 요약

기준점 기록 직전 주요 변경 파일 통계:

```text
app.js                           | 5138 +++++++++++++++++++++++++++++++++++++-
index.html                       |    5 +-
services/workspaceDataService.js |  329 ++-
3 files changed, 5423 insertions(+), 49 deletions(-)
```

현재 추적 상태에서 확인된 주요 변경:

```text
M  app.js
M  index.html
M  services/workspaceDataService.js
?? scripts/test-timetable-quick-view.mjs
```

이 문서 작성으로 추가되는 파일:

```text
docs/login-timetable-stable-checkpoint.md
docs/login-timetable-regression-checklist.md
```

## 변경 파일 목록

- `app.js`: 로그인 유지 정책, 시간표 선택·빠른보기·교시 시간 저장·프로그램 시간표 안정화 패치가 누적되어 있습니다.
- `index.html`: 운영 정적 앱 캐시 버전이 `app.js?v=111`로 지정되어 있습니다.
- `services/workspaceDataService.js`: Firestore 동기화 중 stale snapshot이 pending local row를 덮어쓰지 않도록 보호하는 변경이 포함되어 있습니다.
- `scripts/test-timetable-quick-view.mjs`: 시간표 안정화 회귀 테스트 109개를 검증합니다.

## 현재 안정화 내용

- 로그인/세션:
  - 명시적 탭 승인 또는 로그인 유지 선택 없이 Firebase 세션이 운영 화면으로 자동 진입하지 않도록 방어합니다.
  - 로그인 유지 체크박스가 없는 경우 세션 persistence를 `SESSION` 기준으로 둡니다.
  - 로그아웃 시 로그인 유지 관련 플래그를 정리합니다.
  - Google 계정 삭제·재인증 흐름은 비밀번호 입력창 대신 Google 계정 확인으로 분기합니다.

- 시간표:
  - 빠른보기와 일반 시간표가 같은 active timetable helper를 사용합니다.
  - 삭제된 시간표 set과 orphan row를 빠른보기 후보에서 제외합니다.
  - 유효하지 않은 `pm-timetable-set` 값을 자동으로 다른 시간표로 덮어쓰지 않습니다.
  - 셀 클릭 시 이미 수업이 있으면 수정 화면으로 열고, 저장 시 같은 셀 중복 row를 만들지 않습니다.
  - 수업 row 개별 삭제는 선택한 row 하나만 제거하도록 분리되어 있습니다.
  - 프로그램 수업의 교시 select option 중복을 제거했습니다.
  - 프로그램 수업의 교시 시간 label은 연결된 시간표 set의 교시 시간을 우선 사용하고, 없을 때만 공통 교시 시간을 fallback으로 사용합니다.
  - V111 기준 교시 시간은 `timetableSetId + period` 범위로 저장·복원되며, 기존 공통 `periodTimes`는 fallback으로만 유지됩니다.

- 동기화:
  - 렌더 경로에서 Firestore write를 호출하지 않도록 방어합니다.
  - workspace sync는 listener 준비 전 저장을 막고, 변경된 pending row 중심으로 flush합니다.
  - quota/backoff 진단 필드와 masked diagnostics를 제공합니다.

## 통과한 자동 테스트

```powershell
node scripts\test-timetable-quick-view.mjs
```

결과:

```text
109 timetable stability checks passed.
```

```powershell
npm.cmd test
```

결과:

```text
290 auth module tests passed.
109 timetable stability checks passed.
```

## 현재 통과한 수동 테스트

이번 기준점 기록 단계에서 Codex가 새로 수행한 브라우저 수동 테스트는 없습니다. 현재 기준점은 자동 테스트와 정적 코드 검증 결과를 바탕으로 기록합니다.

수동 검증은 `docs/login-timetable-regression-checklist.md`에 따라 127.0.0.1 기준으로 별도 진행해야 합니다.

## 남은 미검증 항목

- `http://127.0.0.1:5173/` 실제 브라우저 로그인·로그아웃 흐름
- 로그인 유지 체크/미체크에 따른 브라우저 재시작 후 동작
- 시간표 탭 첫 진입, 새로고침, 반복 진입 5회
- A/B 시간표별 교시 시간 저장 후 새로고침 복원
- 빠른보기와 일반 시간표의 시간·과목·요일·교시 일치
- 방과후·동아리·특강 상세 시간표의 시간표별 교시 시간 label 반영
- Firestore quota 초기화 후 listener 수와 write 수 안정성
- 다른 브라우저/다른 기기에서 같은 workspace 동기화
- 실제 권한별 permission-denied 여부
- Shadow 진단 `hasCriticalMismatch == false`

## rollback 기준

아래 중 하나가 재현되면 V111 기준점을 롤백 후보로 봅니다.

- 로그인하지 않았는데 운영 화면으로 자동 진입
- 로그아웃 후 새로고침 시 의도치 않은 자동 로그인
- 시간표 탭이 빈 화면 또는 이전 데이터로 불안정하게 표시
- 시간표별 교시 시간이 저장 후 새로고침에서 사라짐
- 빠른보기가 일반 시간표와 다른 set 또는 orphan row를 표시
- 방과후·동아리·특강 교시 select 시간이 현재 시간표와 다르게 표시
- Firestore write가 렌더만으로 반복 발생하거나 quota가 급격히 증가
- `Missing or insufficient permissions`가 로그인 직후 반복 발생
- `node --check app.js` 또는 `npm.cmd test` 실패

## 복구 방법

우선순위는 “작은 범위 수동 복구”입니다.

1. 롤백 전 현재 diff를 패치 파일로 백업합니다.
   - 예: `git diff > docs\manual-backup-login-timetable-v111.patch`
   - 단, 실제 커밋 전에는 패치 안에 민감정보가 없는지 확인합니다.
2. `index.html`의 앱 캐시 버전을 마지막 정상 기준으로 되돌립니다.
   - 현재: `app.js?v=111`
   - 필요 시 이전 정상 기준: `app.js?v=110`
3. `app.js`에서는 V111 교시 시간 저장·복원 보정 블록만 우선 비활성화 또는 되돌립니다.
4. Firestore 동기화 문제가 의심되면 `services/workspaceDataService.js`의 stale snapshot 보호 변경을 별도로 비교합니다.
5. 전체 uncommitted 변경을 한 번에 되돌리는 `git restore`는 이전 안정화 작업까지 함께 사라질 수 있으므로 마지막 수단으로만 사용합니다.

주의:

- `git reset --hard`, `git clean`은 사용하지 않습니다.
- `.env`, `.env.local`, Firebase 설정 파일, 콘솔 로그, 캡처 이미지, `output/` 진단 결과는 커밋 또는 공유 대상에서 제외합니다.
- 실제 Firebase 데이터, Auth 사용자, Firestore Rules는 rollback 과정에서 수정하지 않습니다.

## 커밋 제외 대상

커밋 전 반드시 제외 또는 민감정보 검토:

- `.env`
- `.env.local`
- Firebase 설정값이 들어간 로컬 생성 파일
- 콘솔 캡처 이미지
- 브라우저 Network/Console 로그
- 진단 출력 원본
- `output/`
- 실제 이메일, UID, workspaceId, API key가 포함된 파일

## 권장 commit 메시지

문서 기준점만 커밋할 경우:

```text
docs: record login and timetable stabilization checkpoint
```

코드 안정화 변경까지 별도 커밋할 경우 후보:

```text
fix: stabilize login session and timetable period persistence
```

실제 commit/push는 수행하지 않았습니다.
