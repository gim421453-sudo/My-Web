# 운영 앱 주요 기능 수정 계획

작성일: 2026-07-21

원칙: 이번 문서는 수정 순서와 범위를 정한다. 기존 `app.js` 로그인 구조, 신규 AuthContext, Firestore Rules, 실제 Firebase 데이터는 이 단계에서 교체/수정하지 않는다.

## 우선순위 요약

| 우선순위 | 작업 | 이유 |
|---|---|---|
| P0 | 삭제 전 재인증 보안 흐름 분리 | 잘못된 비밀번호/취소 후 삭제 차단이 명확해야 함 |
| P0 | 방과후/동아리/특강 공통 CRUD 안정화 | 사용자가 직접 반복 확인한 핵심 기능 오류 |
| P1 | 시간표 세트/교시 모델 정리 | 프로그램 시간표와 학교 시간표가 같은 데이터에 영향을 줌 |
| P1 | 홈페이지 관리 저장 흐름 단일화 | 빠른등록/과목/교과서/출판사/대시보드 설정이 여러 기능에 영향 |
| P1 | 시험/성적관리 UI 재배치 | 핵심 학습관리 화면의 사용성 문제 |
| P2 | 프린트 V63/V95 출력 로직 통합 | 보고서/표/PDF 형식과 출력 중 UI 숨김 문제 |
| P2 | NEIS/학교 게시판 연동 UI와 파서 보강 | 외부 사이트 구조/CORS 영향이 있어 안정화 필요 |
| P3 | 월별 급식/빠른 급식 날짜 상태 마무리 | 최신 패치가 있으나 sessionStorage 잔존값 검증 필요 |

## P0-1. 삭제 전 재인증

### 목표

- Google 계정: 비밀번호 입력 없이 Google 재인증 팝업으로 직접 이동.
- 이메일/비밀번호 계정: 현재 비밀번호로 `reauthenticateWithCredential` 실행.
- Firebase 재인증 성공 뒤 최종 삭제 확인을 한 번 더 표시.
- 실패/취소/중복 클릭 시 삭제 실행 금지.

### 최소 수정 방향

1. `app.js`에 `getFirebaseProviderKind()` 같은 작은 헬퍼를 추가한다.
2. `verifyCurrentPasswordStrictV88()`을 삭제 전 전용으로 쓰지 말고, `reauthenticateForSensitiveAction()`을 별도 작성한다.
3. `requirePassword()`는 “수정 저장”용과 “삭제”용을 분리한다.
4. `deleteRow()` 직접 호출 전에 최종 확인을 추가한다.
5. `services/systemAdminService.deleteUserFirestoreProfile()` 호출 버튼도 같은 재인증 게이트를 사용하게 한다.

### 금지

- Google 계정에 “아무 값 입력 후 확인” 문구 재도입 금지.
- Firebase Auth 계정 실제 삭제를 클라이언트에서 바로 처리하지 말 것.
- 전체 로그인 구조 교체 금지.

## P0-2. 방과후/동아리/특강 공통 프로그램 안정화

### 목표

- 탭 진입 가능.
- 추가/삭제/출결/안내/시간표 저장 가능.
- 삭제 후 기본 강좌가 자동 재생성되지 않음.
- 상세 하위 버튼에 `[object HTMLButtonElement]`/`[object HTMLLabelElement]`가 다시 나오지 않음.
- 시간표 등록 후 현재 상세의 `schedule` 화면에 그대로 머묾.

### 최소 수정 방향

1. `ensureAppV26()`의 기본 강좌 자동 생성 조건에 “사용자가 비운 상태” 플래그를 추가한다.
   - 예: `store.settings.programsInitializedV26[type]`
   - 첫 진입 때만 기본값을 넣고, 삭제 후 빈 배열은 유지한다.
2. `programCardV26()` 버튼에 `can("create"/"del", type)` 또는 별도 프로그램 권한 체크를 적용한다.
3. `programAttendanceV26/V85/V88` 중 최종 함수 체인을 정리해 저장 버튼을 하나만 렌더한다.
4. `programNoticeV26`도 저장 버튼 중복 여부를 확인하고 하나만 남긴다.
5. `addProgramScheduleSlotV26()` 실행 후 `renderProgramPageV26(type, id, "schedule")`가 유지되도록 원격 업데이트 렌더링에서 상세 모드를 보존한다.
6. 프로그램 삭제 시 `markWorkspaceDeletedRows`와 `store` 삭제 후 `saveStore()` 순서를 유지하되, 원격 snapshot이 빈 목록을 덮어쓸 때 기본 강좌가 부활하지 않도록 한다.

### 공통 함수 후보

- `programConfigV26`
- `renderProgramListV26`
- `renderProgramPageV26`
- `programAttendanceV26`
- `programNoticeV26`
- `programScheduleV26`
- `addProgramScheduleSlotV26`

## P1-1. 시간표

### 목표

- 교시 추가/수정/삭제가 중복 생성 없이 동작.
- 전체 교시 삭제와 선택 시간표 삭제가 구분됨.
- 프로그램 시간표와 일반 시간표가 세트별로 격리됨.

### 최소 수정 방향

1. 교시 데이터 기준을 하나로 정한다.
   - 권장 기준: `store.periodTimes` 배열.
   - `store.settings.timetablePeriods`는 표시 개수 캐시로만 사용.
2. `periodEditorV29()`에서 추가 시 이미 존재하는 `period`는 중복 추가하지 않는다.
3. `clearOverGeneratedPeriodsV85()`는 자동 정리 로그만 남기고, 사용자 확인 없는 대량 삭제는 하지 않는다.
4. `periodTimes` 삭제 버튼과 전체 삭제 버튼을 명확히 분리한다.
5. 프로그램 시간표 `setId = "${type}-${program.id}"`는 유지하되, 삭제 시 해당 set만 정리한다.

## P1-2. 홈페이지 관리 저장

### 목표

- 빠른등록, 메인대시보드 카드, 과목, 교과서, 출판사 체크값 저장.
- 저장 전 비밀번호 검증 오류가 명확히 표시.
- Google 전용 계정의 경우 비밀번호 입력 대신 재인증 안내를 명확히 표시.

### 최소 수정 방향

1. `renderSiteV20/V70` 최종 렌더 결과에서 실제 DOM id를 테스트한다.
2. `saveSiteSettingsV70()`이 기대하는 id와 렌더된 id가 다르면 한쪽으로 통일한다.
3. 저장 버튼 교체(`cloneNode`)는 한 번만 실행되도록 dataset guard를 둔다.
4. 저장 성공 후 `applySettings()`, `buildNav()`, `renderSiteV20()` 호출은 유지하되, 실패 시 화면을 다시 그리지 않는다.

## P1-3. 시험/성적관리 UI

### 목표

- PC에서 3열이 화면 안에 들어오고, 좁은 화면에서는 1열로 자연스럽게 내려감.
- 시험년도 필터와 입력은 select 유지.
- 시험 정보/성적 분석이 겹치지 않음.

### 최소 수정 방향

1. `.exam-layout-v95`의 PC grid 폭을 더 완만하게 조정한다.
2. 오른쪽 분석 패널이 화면 밖으로 밀릴 때 `grid-column: 1 / -1`이 적용되도록 중간 breakpoint를 추가한다.
3. `.content[data-page="exams"]`에 `overflow-x: hidden` 대신 내부 테이블만 `overflow:auto`를 적용한다.

## P2-1. 프린트

### 목표

- 사이드탭 항목 전체가 프린트 대상에 포함.
- 보고서 HTML/표 HTML/PDF/CSV 또는 현행 형식이 한 곳에서 일관되게 작동.
- PDF/프린트 실행 중 플로팅 버튼과 버전 정보 숨김.
- 링크/메모 필드는 보고서에서 과도하게 커지지 않음.

### 최소 수정 방향

1. 최종 `renderPrintV95()`에서 V63의 `printCatalogV63`, `printCleanV63()`을 재사용할지 결정한다.
2. `window.print()` 직접 호출 대신 `printCleanV63()`을 사용한다.
3. `printRowsSectionV95/V96` 또는 `printRowsSectionV63` 중 하나로 출력 템플릿을 통합한다.
4. 링크 필드는 `word-break: break-all`, 최대 높이 또는 요약 표시를 적용한다.

## P2-2. NEIS/학교 홈페이지 연동

### 목표

- 급식은 선택 날짜의 월 전체를 불러오고 날짜별로 필터링.
- 학사일정은 월별 리스트/달력 모두 제공.
- 가정통신문/학교공지는 목록 표시와 날짜 필터, 수동 입력/붙여넣기 fallback 유지.

### 최소 수정 방향

1. `fetchBoard()` 실패 시 CORS/파싱/빈 결과를 UI에 분리 표시한다.
2. `parseBoardHtml()`에 학교 홈페이지 게시글 번호/날짜 구조를 추가 패턴으로 보강한다.
3. 자동 동기화는 60초 session guard가 있으므로 수동 “지금 가져오기”는 guard를 우회한다.
4. NEIS API key 존재 여부만 개발 로그에 표시하고 값은 출력하지 않는다.

## P3. 급식 날짜/월 상태

### 목표

- 급식 관리: 이전날/오늘/다음날이 로컬 날짜 기준으로 이동.
- 급식 신청: 이전달/다음달이 연도 경계까지 정상 이동.
- 빠른 급식: 중식/석식 박스가 선택 날짜 기준으로 표시.

### 최소 수정 방향

1. `sessionStorage`의 오래된 날짜 값 초기화 버튼 또는 “오늘로 이동” 동작을 강화한다.
2. `selectedMealDateV69`, `selectedQuickMealDateV70`, `renderMealApplicationsV81` 날짜 계산 함수를 회귀 테스트한다.
3. `today` 전역 상수는 페이지 장시간 실행 시 바뀌지 않으므로, 버튼 동작에는 `localDateStringV70()` 또는 `localDateStringV88()`을 사용한다.

## 작업 순서

1. 재인증 헬퍼와 삭제 전용 게이트 작성.
2. 일반 행 삭제와 회원 Firestore 프로필 삭제 버튼에 재인증 게이트 적용.
3. 프로그램 공통 초기화 자동 생성 플래그 도입.
4. 프로그램 상세 저장 버튼 중복/문자열화 제거.
5. 프로그램 시간표 저장 후 상세 모드 유지.
6. 시간표 교시 모델 중복 방지와 전체 삭제 버튼 정리.
7. 홈페이지 관리 저장 id 점검 및 단일 저장 경로 적용.
8. 시험/성적관리 CSS breakpoint 조정.
9. 프린트 V63/V95 통합.
10. NEIS/게시판 파서 보강과 상태 메시지 분리.
11. 급식 날짜/월 회귀 테스트.

## 롤백 방법

- 각 수정은 `Final Vxx` 스타일의 작은 패치 블록으로 추가하고, 기존 함수는 `const before = oldFn` 형태로 보존한다.
- 문제가 생기면 새 패치 블록만 되돌릴 수 있게 한다.
- Firestore 데이터 구조나 Rules 변경이 없으므로 앱 코드 롤백만으로 원복 가능해야 한다.
