# Owner Preview Learning Management Audit Only - Batch 10A

## 1. 조사 기준

- 기준 브랜치: `checkpoint/notice-auth-recovery-20260723`
- 조사 시점 HEAD: `07a8ba7`
- 운영 확인 주소: `http://127.0.0.1:5173/`
- 운영 모드: `integrated-unconfigured`
- 방식: 정적 코드 읽기 전용 조사. 버튼 클릭, Firebase/Auth/Firestore 호출, 데이터 생성·수정·삭제는 수행하지 않았다.
- 범위: 운영 정적 앱의 학습관리 메뉴와 직접 연결된 page key, store, workspace collection, 공통 편집/조회/출력 경로.

## 2. 실제 메뉴 구조

`navGroupsV28()`의 `study` 그룹은 다음 키를 포함한다: `subjects`, `teachers`, `materials`, `lessons`, `assignments`, `examSchedules`, `exams`, `records`, `portfolios`. `projects`와 프로그램성 기능(`afterschool`, `specialLectures`, `clubs`)은 별도 활동/프로젝트 그룹이다.

| # | 사용자 메뉴 | page/store/Firestore key | 화면·조회 구조 | 확인된 기능 | 수동 검증 |
|---|---|---|---|---|---|
| 1 | 과목 관리 | `subjects` | 공통 collection renderer | 과목, 담당교사, 교과서, 출판사, 장소, 범위 | 미검증 |
| 2 | 선생님 관리 | `teachers` | 공통 collection renderer | 이름, 과목, 유형, 출제유형, 연락처, 이메일 | 미검증 |
| 3 | 수업 자료 | `materials` | 공통 collection renderer | 자료명, 과목, 자료유형, URL 링크, 태그, 공개범위 | 미검증 |
| 4 | 수업 기록 | `lessons` | `renderLessonsV10` + table/filter | 시간표 연동 읽기, 수업 기록, 과제/출결 메모, 보고서 | 미검증 |
| 5 | 과제 관리 | `assignments` | 공통 collection renderer | 과제, 과목, 교사, 마감일, 확인상태, 파일 링크 | 미검증 |
| 6 | 시험 일정 | `examSchedules` | 공통 collection renderer | 시험 기간, 과목, 교사, 범위, 장소 | 미검증 |
| 7 | 시험/성적 관리 | `exams` | 전용 `renderExamsV*` 계열 | 시험 등록, 점수/정답/OMR 보조 UI, 성적 표시 | 미검증 |
| 8 | 세특 관리 | `records` | 공통 collection renderer | 활동, 역량, 근거, 초안, 상태 | 미검증 |
| 9 | 포트폴리오 | `portfolios` | 공통 collection renderer | 설명, 역량, 파일·이미지·영상·결과물 링크, 공개범위 | 미검증 |
| 10 | 프로젝트 관리 | `projects` | 전용 `renderProjectsV12` 계열 | 프로젝트 일정, 담당·팀원, 진행률, 링크 | 미검증 |

### 독립 메뉴가 아닌 확인 항목

- OMR/정답 관리: `exams` 화면의 시험 등록·정답·OMR 보조 UI 안에 존재한다. 별도 page key/collection은 확인하지 못했다.
- 보고서/프린트: `print` 센터가 `lessons`, `materials`, `assignments`, `examSchedules`, `exams`, `records`, `projects`, `portfolios`를 선택 출력 대상으로 가진다.
- 방과후/특강/동아리: 활동 그룹의 별도 page key이며 학습관리와 시간표·학생·출결의 연결 가능성은 있으나, 본 배치에서는 직접 기능 검증을 하지 않았다.

## 3. 코드·데이터 경로

| 기능군 | menu/page key | 최종 또는 공통 렌더 경로 | store key | workspace 하위 collection | 필터·정렬 |
|---|---|---|---|---|---|
| 공통 학습 컬렉션 | `subjects`, `teachers`, `materials`, `assignments`, `examSchedules`, `records`, `portfolios` | 공통 table/collection renderer, `filterBarV7` 계열 | 동일 | 동일 | 전역 검색 + 화면별 필터 필드; 정렬 UI는 코드상 명확한 공통 계약 확인 필요 |
| 수업 기록 | `lessons` | `renderLessonsV10` | `lessons` | `lessons` | `day`, `period`, `subject`, `teacher`, `late`, `status` 필터 |
| 시험/성적 | `exams` | `renderExamsV*` 계열 | `exams` | `exams` | 전용 시험 UI; 세부 필터/정렬은 수동 확인 필요 |
| 프로젝트 | `projects` | `renderProjectsV12` 계열 | `projects` | `projects` | `title`, `category`, `area`, `owner`, `priority`, `progress` 필터 |
| 출력 | `print` | `renderPrintV95` / print catalog | 각 목록 | 읽기 데이터 사용 | 선택형 미리보기·다운로드·브라우저 인쇄 |

`services/workspaceDataService.js`의 `COLLECTION_KEYS`에 위 workspace collection이 등록돼 있다. 운영 동기화의 기본 읽기 경로는 `workspaces/{workspaceId}/{collection}`이며 각 collection은 현재 구조상 listener 기반 구독 대상이다. 실제 리스너 수·재진입 동작은 수동 검증이 필요하다.

## 4. 생성·수정·삭제 경로

공통 컬렉션의 정적 경로는 `openEditorV7`/`openEditorV10` → editor submit handler → `saveStore`/workspace sync이다. 삭제는 공통 `deleteRow` 계열을 통과한다. 최종 Firestore flush는 workspace data service의 batch write/delete 경로다.

| 기능 | 시작점 | 정적 확인된 경로 | 서버 확인 | 위험/확인 필요 |
|---|---|---|---|---|
| 공통 생성·수정 | 새 항목/수정 버튼 | `openEditorV7` 또는 `openEditorV10` → submit → `saveStore` | 공지·일정 외 일반 학습 컬렉션의 개별 server-confirm 일관성은 확인 필요 | P0 가능성: false success 여부 |
| 공통 삭제 | 삭제 버튼 | `deleteRow` 계열 → pending delete/workspace sync | collection별 원격 삭제 확인 필요 | P0 가능성: 로컬 선반영과 원격 실패 불일치 |
| 수업 기록 | 새 수업 | `renderLessonsV10` → `openEditorV10` | 확인 필요 | 시간표 동기화/중복 행은 수동 확인 필요 |
| 시험 | 시험 화면 버튼 | `renderExamsV*` 내부 전용 handlers | 확인 필요 | OMR/첨부는 실제 업로드 여부 별도 확인 |
| 보고서 | 보고서 다운로드/프린트 | `downloadReportV8`, print center export | 로컬 파일 생성/브라우저 인쇄 | 민감 열 제외가 모든 경로에 적용되는지 확인 필요 |

Operational Safety write gate 및 canonical workspace/readiness 검사는 공지·일정·출결에 명시적 보강 근거가 있다. 일반 학습 컬렉션에도 동일한 보장이 있는지는 이번 정적 조사만으로 확정하지 못했으므로 `확인 필요`로 분류한다.

## 5. 권한 구조

- 메뉴 접근의 기준은 `authMenuKeysV31()`과 `defaultRoleMenusV31()`/`shared/permissions.js`다.
- `can(action, key)`는 메뉴 접근, action permission, `extraPermissions`를 함께 본다.
- `system_owner`는 전역 역할이고 workspace role로 변환하지 않는다. workspace가 없는 system owner는 운영 앱에서 `systemOwner` 화면만 허용하는 분기가 있다.
- `viewer`와 `print_account`의 실제 create/edit/delete 차단은 기능별 수동 검증이 필요하다.

| 역할 | 학습 메뉴 코드상 접근 | 쓰기 판단 |
|---|---|---|
| system_owner | workspace가 있으면 학습 메뉴 후보 접근 | 전역 예외와 workspace 상태를 함께 확인 필요 |
| super_manager / manager | 학습관리 메뉴 포함 | action permission 및 실제 Rules 확인 필요 |
| teacher | 교사·수업·과제·시험·기록 등 메뉴 포함 | `workspaceDataService`는 특정 민감 collection에 teacher write 예외를 둠 |
| normal | 일부 학습 메뉴 포함 | collection별 액션은 확인 필요 |
| viewer | 읽기 중심 메뉴 포함 | 쓰기 차단 수동 검증 필요 |
| print_account | `print`, `accounts`, `examSchedules` 중심 | 학습 일반 편집 비허용으로 보이나 수동 확인 필요 |

## 6. 빠른 등록·빠른 보기·상세 보기

- 대시보드 quick button 기본 후보에는 `assignments`, `exams`, `portfolios`가 존재한다.
- `openQuickCreateV70`은 일반적으로 `openEditorV7`을 재사용한다. 시간표는 별도 예외다.
- 공통 목록의 보기 버튼은 `showViewerV5` 계열이며, 수정은 editor, 권한이 없으면 수정 요청 경로로 이동한다.
- 개별/일괄 보고서 버튼은 공통 table 및 수업 기록 화면에 존재한다.
- 실제 빠른 버튼 노출은 사용자 메뉴/설정/역할에 따라 달라질 수 있으므로 미검증이다.

## 7. 검색·필터·정렬

- 공통 전역 검색은 `globalSearch`와 `filteredRowsV*` 계열을 사용한다.
- 명시적으로 확인된 필터: lessons, projects, examSchedules, records 및 일반 collection의 `filterBarV7` 계열.
- 필터 option은 대개 현재 store 또는 정적 enum/과목·교사 목록에서 온다.
- 정렬 UI·오름/내림차순은 모든 학습 메뉴의 공통 기능으로 확정할 근거가 부족하다. `해당 없음 또는 수동 검증 필요`로 유지한다.
- 필터가 원본 store를 mutate하는지 여부는 V95 privacy wrapper 등을 포함해 메뉴별 수동 검증이 필요하다.

## 8. 보고서·인쇄·파일/링크

- Print center catalog에 학습관리 다수 collection이 포함된다.
- `downloadReportV8`은 HTML 기반 보고서 다운로드 경로다. PDF/Excel/CSV가 모든 학습 메뉴에 동일하게 제공되는지는 확인 필요다.
- 파일 처리: materials와 portfolios는 URL/link 필드 중심이다. exams는 PDF/image file input UI가 있다.
- Firebase Storage 직접 업로드 구현은 이번 정적 조사에서 확인하지 못했다. 파일 input이 곧 원격 Storage 저장을 의미하지는 않는다.
- Google Drive는 링크 값으로 사용 가능한 구조이며 실제 Drive API 연동·권한 확인은 발견하지 못했다.

## 9. 사용자 식별자 노출 위험

V128/V129 display sanitizer는 `uid`, `workspaceId`, `setId`, `programId`, `documentId`, email 등 민감 필드명을 차단/마스킹하도록 되어 있다. 다만 학습관리 전체 UI, select option, 출력물, error message, diagnostics까지 실제 표시를 검증하지 않았으므로 아래는 위험 정보다.

| 등급 | 항목 | 근거/상태 |
|---|---|---|
| P0 위험 | 출력·상세·빠른 보기에서 식별자 원문 노출 | 코드 차단 장치는 있으나 전체 화면 미수동검증 |
| P0 위험 | 다른 workspace 데이터 혼입 | workspace sync 구조에 의존; 학습 메뉴별 수동 검증 필요 |
| P0 위험 | 일반 학습 저장의 server-confirm 부재 | 공지/일정/출결 외 경로는 정적 근거만으로 확정 불가 |
| P1 위험 | 필터 enum/legacy 값 불일치 | lessons/records/projects 등 옵션 원본이 다양함 |
| P1 위험 | 빈 목록과 오류 상태 혼동 | 공통 renderer 사용, 화면별 미검증 |
| P2 위험 | camelCase/raw enum/영문 식별자 노출 | sanitizer 존재, 실제 UI 미검증 |

## 10. HOLD 및 EXTERNAL

- HOLD: 종료 시간표 lifecycle 수동 검증, Firestore Listen 400, 서버 기반 시간표 자동 종료.
- EXTERNAL: 학교 게시판 proxy, NEIS 다중 학교 지원/연속 확인.
- P0 미구현: personal/school/academy 운영 모드. 현재 값은 반드시 `integrated-unconfigured`으로 유지한다.
- 학습관리 전체: 아직 수동 검증 전이며 완료로 판정하지 않는다.

## 11. 수동 검증 순서와 Batch 10B 입력

1. 운영 URL에서 실제 역할별 로그인 후 study 그룹과 활동 그룹의 연동 메뉴를 확인한다.
2. 메뉴별 checklist의 PASS/FAIL/HOLD/EXTERNAL/미검증을 채운다.
3. 콘솔·네트워크 오류와 서버 확인 여부를 기록한다.
4. 실제 재현된 오류만 Batch 10B 후보로 분리한다.
5. Batch 10B는 원인·영향 collection·권한·rollback을 먼저 정한 뒤 최소 수정한다.

## 12. 이번 단계에서 수정하지 않은 이유

이 문서는 `AUDIT ONLY / NO REPAIR / NO DATA WRITE`다. 코드, UI, 테스트 코드, Firebase 데이터, Rules/Indexes, 권한, workspace, deployment를 수정하지 않았다.
