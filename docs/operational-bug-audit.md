# 운영 앱 주요 기능 버그 진단

작성일: 2026-07-21

범위: 현재 운영 진입점인 `index.html` + `app.js` + 루트 `services/*.js` 정적 앱. React/TypeScript 신규 인증 모듈과 Shadow Mode는 유지하되, 이번 감사에서는 교체 대상으로 보지 않았다.

주의: 이번 단계에서는 실제 Firebase 데이터, Auth 계정, Firestore Rules를 수정하지 않았다. 재현 상태는 사용자 제보와 정적 코드 흐름 감사를 기준으로 기록했다.

## 실행 구조

| 항목 | 확인 내용 |
|---|---|
| 실제 운영 진입점 | `index.html` |
| 앱 본문 | `app.js?v=98` |
| Firebase 방식 | compat CDN + `services/firebaseRuntime.js` |
| 데이터 동기화 | `services/workspaceDataService.js`가 `workspaces/{workspaceId}/{collection}` 실시간 구독 및 저장 |
| 주요 저장 함수 | `saveStore()` -> `PMDataService.saveStore()` + `PMWorkspaceDataService.scheduleSave()` |
| 현재 위험 | `app.js`가 누적 패치 방식이라 `renderPage`, `renderCollectionV7`, `inputNodeV4`, `tableV10`, `saveStore` 등이 여러 번 재정의됨 |

## 공통 근본 원인 후보

1. 같은 기능이 여러 버전 함수로 누적되어 최신 함수와 오래된 이벤트/저장 로직이 섞인다.
2. `workspaceId` 출처가 `currentUser.workspace_id`, `workspaceId`, `currentWorkspaceId`, `PMDataService.currentWorkspaceId()`, `store.workspace_id`로 분산되어 있다.
3. 삭제/수정 보안 확인이 Firebase 재인증 API가 아니라 로컬 비밀번호 해시 또는 재로그인 함수에 의존한다.
4. Firestore 동기화는 전체 store를 batch 저장하므로, UI에서 빈 목록 생성/삭제 후 기본값 자동 생성 로직이 다시 원격에 올라갈 수 있다.
5. 일부 최신 UI는 클래스 기반 버튼을 쓰지만 안정적인 DOM id가 없어 테스트와 이벤트 추적이 어렵다.

## 1. 정보 삭제 전 재인증

| 항목 | 내용 |
|---|---|
| 재현 단계 | 정보/회원/행 삭제 버튼 클릭 -> 비밀번호 재확인 모달 -> 임의 문자열 입력 |
| 예상 동작 | Google 계정은 Google 재인증, 이메일 계정은 EmailAuthProvider 재인증 성공 후 최종 삭제 확인 |
| 실제 동작 | 사용자 제보상 임의 입력 후 Google 로그인/재인증 창으로 이동했음. 현재 코드에는 이를 막는 V88 패치가 들어왔지만 Firebase 정식 재인증 구조는 아님 |
| 관련 파일 | `app.js`, `services/authService.js`, `services/systemAdminService.js` |
| 관련 함수 | `requirePasswordV78`, `confirmPasswordV78`, `verifyCurrentPasswordStrictV88`, `sitePasswordOkV70`, `deleteRow`, `deleteUserFirestoreProfile` |
| 관련 DOM ID | `passwordDialog`, `passwordForm`, `confirmPasswordInput`, `passwordError`, `sitePasswordInput` |
| 관련 Firestore 컬렉션 | 일반 행: `workspaces/{workspaceId}/{key}`. 회원 삭제: `users`, `workspace_members`, `workspaces/{workspaceId}/members` |
| workspaceId 출처 | `store.workspace_id`, `currentUser.workspace_id`, `userWorkspaceIdV54`, `PMDataService.currentWorkspaceId()` |
| 권한 판정 출처 | `can("del", key)`, `isAdmin()`, `PMSystemAdminService.assertMutableUser()` 내부 |
| 콘솔 오류 | 실제 런타임 콘솔 미확인. 코드에는 `[password strict firebase check failed]`, `[password approval action failed]` 로그 존재 |
| 근본 원인 후보 | `firebaseSignInWithEmailOnly()`로 현재 사용자를 재로그인 확인하는 방식이며, `reauthenticateWithCredential`/`reauthenticateWithPopup` 중심 흐름이 아님. `deleteRow()`는 재인증 후 최종 확인 없이 즉시 삭제 표시 |
| 위험도 | P0. 삭제 전 인증 실패/취소/중복 클릭/부분 삭제 실패 처리 정책이 보안 요구와 불일치 |

### 보안 평가

- V88 이후 Google 계정에서 아무 값 입력 후 팝업으로 넘어가는 동작은 줄었을 가능성이 있다.
- 하지만 이메일 계정도 `signInWithEmailAndPassword`로 세션 자체를 갱신하는 방식이라, Firebase의 최근 로그인 요구 처리와 삭제 대상 작업이 명확히 묶이지 않는다.
- 계정 Firestore 프로필 삭제는 `deleteUserFirestoreProfile()`에서 Auth 계정은 삭제하지 않고 Firestore 문서만 삭제한다.
- 실제 Auth 계정 삭제가 필요한 경우 Admin SDK 스크립트 또는 Cloud Functions 같은 서버 권한 흐름이 필요하다.

## 2. 방과후 탭

| 항목 | 내용 |
|---|---|
| 재현 단계 | 방과후 탭 진입, 강좌 추가/삭제, 상세의 출결/안내/시간표 버튼 클릭 |
| 예상 동작 | 메인 목록 진입, 강좌 CRUD, 상세 버튼 생성, 출결 저장, 시간표 연동, 프린트 출력 |
| 실제 동작 | 사용자 제보: 메인 탭/추가/삭제/버튼/관리자 설정/Firestore/프린트 이상 |
| 관련 파일 | `app.js`, `services/workspaceDataService.js` |
| 관련 함수 | `programConfigV26("afterschool")`, `renderProgramListV26`, `programCardV26`, `addProgramV26`, `renderProgramPageV26`, `programAttendanceV26`, `programNoticeV26`, `programScheduleV26`, `addProgramScheduleSlotV26` |
| 관련 DOM/class | `.program-delete-link`, `.program-action-grid`, `.program-v85-save-attendance`, `programAttendDateV26`, `programStudentsV26`, `programScheduleDayV26`, `programSchedulePeriodV26` |
| 관련 Firestore 컬렉션 | `afterschoolPrograms`, `afterschoolAttendance`, `afterschoolSchedules`, `timetable`, `timetableSets` |
| workspaceId 출처 | `startWorkspaceDataSyncV45(workspaceId)`에서 받은 workspaceId |
| 권한 판정 출처 | V26 UI 버튼에는 추가/삭제 전 세밀한 `can()` 검사가 부족함. 탭 노출은 `navKeys()`/`can("view")` 기반 |
| 콘솔 오류 | `[object HTMLButtonElement]` 문구 제거용 V85/V88 패치 존재 |
| 근본 원인 후보 | `ensureAppV26()`이 컬렉션이 비어 있으면 기본 강좌를 자동 생성한다. 삭제 후 빈 상태가 되면 다시 생성될 수 있다. 버튼 생성 오류는 DOM 노드를 문자열로 넣은 과거 코드 잔재를 사후 제거하는 방식 |
| 위험도 | P0. CRUD와 상세 저장이 사용자의 핵심 운영 흐름 |

## 3. 동아리 탭

| 항목 | 내용 |
|---|---|
| 재현 단계 | 동아리 탭 진입, 동아리 추가/삭제, 상세 버튼 클릭 |
| 예상 동작 | 방과후와 동일한 구조로 동작 |
| 실제 동작 | 사용자 제보상 방과후와 동일 |
| 관련 파일 | `app.js`, `services/workspaceDataService.js` |
| 관련 함수 | `programConfigV26("clubs")` 이하 공통 V26 프로그램 함수 |
| 관련 DOM/class | 방과후와 동일 |
| 관련 Firestore 컬렉션 | `clubPrograms`, `clubAttendance`, `clubSchedules`, `clubs`, `timetable`, `timetableSets` |
| workspaceId 출처 | 방과후와 동일 |
| 권한 판정 출처 | 방과후와 동일 |
| 콘솔 오류 | `[object HTMLButtonElement]`, `[object HTMLLabelElement]` 제거 패치 존재 |
| 근본 원인 후보 | V26 공통 프로그램 렌더러 공유. `clubs` 레거시 컬렉션과 `clubPrograms` 신규 컬렉션이 공존해 데이터 출처 혼선 가능 |
| 위험도 | P0 |

## 4. 특강 탭

| 항목 | 내용 |
|---|---|
| 재현 단계 | 특강 탭 진입, 특강 추가/삭제, 상세 버튼 클릭 |
| 예상 동작 | 방과후/동아리와 동일 |
| 실제 동작 | 사용자 제보상 동일 |
| 관련 파일 | `app.js`, `services/workspaceDataService.js` |
| 관련 함수 | `programConfigV26("specialLectures")` 이하 공통 V26 프로그램 함수 |
| 관련 DOM/class | 방과후와 동일 |
| 관련 Firestore 컬렉션 | `specialLecturePrograms`, `specialLectureAttendance`, `specialLectureSchedules`, `timetable`, `timetableSets` |
| workspaceId 출처 | 방과후와 동일 |
| 권한 판정 출처 | 방과후와 동일 |
| 콘솔 오류 | 사후 텍스트 제거 패치 존재 |
| 근본 원인 후보 | 방과후/동아리와 같은 공통 렌더러 문제. 시간표 저장 후 `renderProgramPageV26(..., "schedule")`라 직접 메인으로 보내지는 않지만 원격 동기화 렌더 재호출이 `currentPage` 기준으로 목록을 다시 그릴 수 있음 |
| 위험도 | P0 |

## 5. 시간표 탭 전체

| 기능 | 확인 내용 |
|---|---|
| 탭 진입 | `renderPage` 최종 체인에서 `key === "timetable"`은 `renderTimetableV6` 또는 이후 패치된 `renderTimetableV29/V85` 계열로 연결됨 |
| 초기 데이터 조회 | `store.timetable`, `store.timetableSets`, `store.periodTimes`, `store.settings.timetablePeriods`, `store.settings.timetableTimes` 사용 |
| 세트 전환 | `sessionStorage["pm-timetable-set"]` 사용 |
| 추가 | 시간표 세트 추가, 교시 추가, 셀 클릭 편집, 프로그램 시간표 연동이 모두 같은 `store.timetable`에 씀 |
| 수정 | 교시 시간 수정은 `periodTimes` 또는 `settings.timetableTimes`와 행의 `time` 값을 함께 다룸 |
| 삭제 | 세트 삭제, 선택 시간표 일괄 삭제, 교시 삭제/초과 생성 정리 패치 존재 |
| 프린트 | `printCatalogV63`에 `timetable` 포함 |
| 근본 원인 후보 | `periodEditorV29()`의 신규 교시 추가는 `timetablePeriodsV29()` 결과를 복사한 뒤 push한다. 자동 정리 `clearOverGeneratedPeriodsV85()`는 16개 초과 등 조건부라 이미 꼬인 중복/빈 행은 완전 복구가 아닐 수 있음 |
| workspaceId 영향 | 프로그램 시간표 연동과 일반 시간표가 같은 workspace store를 공유하므로 잘못된 workspaceId면 다른 계정/워크스페이스 시간표처럼 보일 수 있음 |
| 위험도 | P1 |

## 6. NEIS 연동 UI

| 항목 | 내용 |
|---|---|
| 재현 단계 | 급식/학사/학교공지/가정통신문에서 가져오기 실행 |
| 예상 동작 | NEIS 또는 학교 홈페이지에서 월/일/게시판 자료를 가져와 목록에 표시 |
| 실제 동작 | 사용자 제보: 일부만 가져옴, 가정통신문 실시간 반영 불안정 |
| 관련 파일 | `app.js`, `services/schoolIntegrationService.js`, `vite.config.*` |
| 관련 함수 | `runSchoolSyncV64`, `fetchMealsForSelectedMonthV66`, `fetchAcademicSchedulesV66`, `refreshSchoolBoardNowV89`, `PMSchoolIntegrationService.fetchMeals`, `fetchAcademicSchedules`, `fetchBoard`, `parseBoardHtml` |
| 관련 DOM ID | `schoolIntegrationSiteBoxV64`, `schoolNoticeUrlV64`, `homeLetterUrlV64`, `academicCalendarUrlV64`, `mealDateInputV66` |
| 관련 컬렉션 | `meals`, `academicSchedules`, `schoolNotices`, `homeLetters` |
| API/환경 | NEIS key는 `PM_PUBLIC_INTEGRATIONS.neisApiKey` 존재 여부만 사용. 값은 감사에 출력하지 않음 |
| 근본 원인 후보 | NEIS 급식은 월 범위 요청 후 부족하면 일별 요청 fallback을 사용한다. 학사일정은 연간 요청 + 일별 fallback. 학교 게시판은 HTML 파서가 `table tr`, `selectNttInfo`, `nttSn`, `bbsId` 등 링크/날짜 패턴에 의존하므로 학교 HTML 구조 변경 또는 CORS/프록시 실패 시 일부 누락 가능 |
| 위험도 | P2 |

## 7. 월별 급식 요약 월 자동 변경

| 항목 | 내용 |
|---|---|
| 재현 단계 | 급식 관리 날짜 이동, 급식 신청 월 이동, 빠른 급식 날짜 이동 |
| 예상 동작 | 현재 연월 기준 시작, 이전/다음 월/일 정상 이동 |
| 실제 동작 | 사용자 제보: 과거에는 날짜 버튼이 어긋남. 현재 V69/V70/V81 패치로 상당 부분 보강됨 |
| 관련 파일 | `app.js`, `services/schoolIntegrationService.js` |
| 관련 함수 | `selectedMealDateV69`, `moveMealDateV69`, `renderMealsV69`, `selectedQuickMealDateV70`, `quickMealViewV70`, `renderMealApplicationsV81` |
| 관련 DOM ID | `mealDateInputV66`, `quickMealDateInputV70`, `mealApplyYearV81`, `mealApplyMonthV81` |
| 근본 원인 후보 | 초기 구현은 전역 `today` 상수와 UTC `toISOString()` 계산을 섞어 일자 밀림이 발생 가능했다. 최신 함수는 로컬 날짜 계산으로 보정했지만, 페이지 로드 중 저장된 `sessionStorage` 값이 남아 있으면 사용자는 여전히 이전 날짜를 볼 수 있음 |
| 위험도 | P3 |

## 8. 홈페이지 관리 저장/마스터 데이터

| 항목 | 내용 |
|---|---|
| 재현 단계 | 홈페이지 관리에서 빠른등록, 과목, 교과서, 출판사, 대시보드 항목 체크 후 비밀번호 저장 |
| 예상 동작 | 체크값 저장 후 대시보드/선택박스에 즉시 반영 |
| 실제 동작 | 사용자 제보: 비밀번호 입력 또는 저장 반응 없음 |
| 관련 함수 | `renderSiteV70`, `saveSiteSettingsV70`, `sitePasswordOkV70`, `verifyCurrentPasswordStrictV88` |
| 관련 DOM ID | `sitePasswordInput`, `quickEnabledBox`, `dashboardCardsBoxV70`, `subjectEnabledBox`, `textbookEnabledBox`, `publisherEnabledBox`, `systemNoticeToggle` |
| 근본 원인 후보 | 저장 함수는 해당 DOM id가 있으면 저장하지만, 실제 렌더 함수가 여러 버전으로 교체되며 id가 없는 박스 또는 복제된 저장 버튼과 연결될 수 있음. 또한 Google 전용 계정은 비밀번호 확인을 통과하지 못하도록 V88에서 엄격해짐 |
| 위험도 | P1 |

## 9. 프린트 출력

| 항목 | 내용 |
|---|---|
| 재현 단계 | 프린트 탭에서 항목 선택, 보고서/표/PDF 출력 |
| 예상 동작 | 사이드탭 항목 전체 선택 가능, 보고서 형식 다운로드, 출력 중 플로팅 버튼/버전정보 숨김 |
| 실제 동작 | 사용자 제보: 보고서 형식 부족, 일부 항목 누락, 링크 칸 과대, 출력 중 UI 잔존 |
| 관련 함수 | `renderPrintV8`, `printCatalogV63`, `printRowsForKeyV63`, `printRowsSectionV63`, `printCleanV63`, `renderPrintV95`, `printRowsSectionV96` |
| 관련 CSS | `.print-mode-active .floating-tools`, `.print-mode-active .version-info`, `.print-lists-v63`, `.print-preview-v63` |
| 근본 원인 후보 | V63에는 깨끗한 출력용 `printCleanV63()`가 있으나, V95에서 프린트 UI가 다시 만들어지며 출력 함수가 `window.print()`를 직접 호출한다. 이 경우 `print-mode-active` 클래스와 V63 카탈로그 기반 항목 선택이 우회됨 |
| 위험도 | P2 |

## 10. 시험/성적관리 UI

| 항목 | 내용 |
|---|---|
| 재현 단계 | 시험/성적관리 탭 진입, 시험 추가/선택/필터/저장 |
| 예상 동작 | 조회/목록/정보/분석이 안정적으로 3열 또는 반응형 1열로 표시 |
| 실제 동작 | 사용자 제보: UI 배치 깨짐 |
| 관련 함수 | `renderExamsV95`, `examGroupedListV95`, `examDetailV95`, `examAnalysisV5` |
| 관련 CSS | `.exam-layout-v95`, `.exam-form-v95`, 기존 `.exam-layout`, V85 인라인 스타일 |
| 근본 원인 후보 | V85는 `.exam-layout-v84`를 대상으로 보정하지만 최종 UI는 `.exam-layout-v95`를 사용한다. CSS는 존재하지만 3열 폭이 좁아지면 오른쪽 패널이 화면 밖으로 밀릴 수 있음 |
| 위험도 | P1 |

## 11. 인증 및 workspaceId 영향

| 항목 | 영향 |
|---|---|
| 오너 레거시 불일치 | Shadow 결과상 기존 `currentWorkspaceId`와 신규 유효 workspace가 다를 수 있다. 운영 앱은 `systemOwners` 또는 legacy role fallback으로 로그인 유지 |
| 기능별 workspaceId | 일반 데이터: `store.workspace_id`. 공지 직접 저장: `currentWorkspaceIdV52`. 개인정보: `currentWorkspaceIdV95`. 동기화: `startWorkspaceDataSyncV45` 인자 |
| 위험 | 한 기능이 `currentUser.workspace_id`를 쓰고 다른 기능이 `store.workspace_id`를 쓰면 같은 화면에서 다른 Firestore 경로를 참조할 수 있음 |
| 권한 | `can()`은 `effectiveMenuRoleV59`, `authMenuKeysV31`, `authStateV31.permissions`에 의존. 프로그램 V26 CRUD는 버튼 레벨 권한 확인이 느슨함 |

## 결론

가장 먼저 고칠 공통 축은 두 가지다.

1. 삭제 전 재인증을 provider-aware Firebase 재인증 흐름으로 분리한다.
2. 방과후/동아리/특강 공통 프로그램 렌더러에서 기본 강좌 자동 생성, 삭제 후 재생성, 상세 저장 후 화면 이동, 시간표 동기화 렌더 재진입을 정리한다.

이후 시간표 교시/세트 모델, 홈페이지 관리 저장 id 일치, 프린트 V63/V95 통합, NEIS/게시판 파서 보강 순으로 진행하는 것이 안전하다.
