# My Web 전체 감사 보고서

## 결론

이번 문서는 읽기 전용 정적 감사 결과다. 감사 중 앱 코드, Rules, 데이터, 패키지를 수정하지 않았다. 현재 운영 모드는 `integrated-unconfigured`이며, Owner Preview와 비공개 베타 모두 수동검증과 Rules/권한 최종 확인 전에는 배포 차단이다.

## 기준 상태

- 브랜치: `checkpoint/notice-auth-recovery-20260723`
- HEAD: `2ef7ba7`
- 운영 entry: `index.html` → `app.js?v=143`
- 독립 React entry: `/app-next.html`
- Vite 입력: `index.html`, `app-next.html`
- app-next 외 React entry: 인증 preview, 진단, shadow, guard bridge, VerifyEmail, LoginDevices, Notifications, recovery 등
- 작업 전 변경: `app.js`, `index.html`, `package.json`, `styles.css`, 테스트 스크립트와 Batch 10B 문서 등. `scripts/generate-blog-pdfs.py`, Rules 후보 파일은 제외 상태로 보존

## 아키텍처와 메뉴

운영 앱은 `app.js`의 최종 `navKeys`, `renderPage`, `renderCollectionV7/V8` 경로가 실제 메뉴를 결정한다. 주요 key는 `dashboard`, `personal`, `attendance`, `schedules`, `notices`, `examSchedules`, `meals`, `subjects`, `teachers`, `materials`, `lessons`, `assignments`, `exams`, `records`, `projects`, `portfolios`, `penalties`, `timetable`, `clubs`, `requests`이며 관리자 조건에서 `people`, `friendAwards`, `budget`, `site`, `accounts`, `admin`, `system`, `print`가 추가된다. 방과후/특강/동아리는 설정 label과 별도 프로그램 경로를 사용한다.

대표 활성 경로:

| 영역 | renderer/editor | 데이터 근거 | 판정 |
|---|---|---|---|
| 대시보드 | `renderDashboardV8` | store 요약, 시스템 공지 | 코드 완료·수동 대기 |
| 공지 | `renderCollectionV7`, 공지 server-refresh wrapper | `workspaces/{workspaceId}/notices`, `systemNotices` | 코드 완료·수동 대기 |
| 일정 | `renderSchedulesV10` | workspace `schedules` | 코드 완료·수동 대기 |
| 시간표 | `renderTimetableV6` 및 V111/V124 layer | `timetable`, `timetableSets`, `periodTimes` | V111/V124 유지, 수동 대기 |
| 학습관리 | V137 wrapper, `renderCollectionV7/V8` | subjects, teachers, materials, lessons, assignments, examSchedules, records | 10B-2D 수동 대기 |
| 시스템 관리자 | `renderSystemV11`, `PMSystemAdminService` | users, members, systemNotices, adminApplications 등 | 고위험, 별도 승인 |
| app-next | `src/app-next/*` | 읽기 전용 서비스 | 독립 Pilot |

## 데이터 지도

workspace 범위 collection은 [workspaceDataService.js](<C:\dev\My Web\services\workspaceDataService.js>)의 `COLLECTION_KEYS`가 기준이다. 확인된 핵심은 `schedules`, `notices`, `subjects`, `teachers`, `materials`, `assignments`, `portfolios`, `penalties`, `exams`, `people`, `friendAwards`, `requests`, `timetable`, `timetableSets`, `periodTimes`, `meals`, `attendance`, `examSchedules`, `records`, `lessons`, `projects`, `budget`, `systemReports`, `academic`, `academicSchedules`, `homeLetters`, `schoolNotices`, `mealApplications`, `afterschool*`, `specialLecture*`, `clubs`, `club*`이다.

전역/계정 경로는 `users/{uid}`, `systemOwners/{uid}`, `workspace_members`, `workspaceMembers` 호환 경로, `invitations`, `user_devices`, `notifications`, `systemNotices`, `adminLogs`, `adminApplications`, `workspaceJoinRequests`, `systemIntegrations`, `systemIntegrationLogs` 등이 코드에 나타난다. 실제 Rules 허용은 현재 Rules 파일과 Emulator 검증이 필요하다.

정규 기준은 `workspaces/{workspaceId}/members/{uid}`와 `users/{uid}.currentWorkspaceId`다. 레거시 membership과 legacy role은 호환 읽기/경고 대상으로 남아 있다.

## CRUD 안정성

일부 최신 운영 경로는 client validation → canonical workspace → readiness → write → `source: "server"` 확인 → 목록 갱신 순서를 갖는다. 대표적으로 공지 V113~V116, 일정 V121, 출결 V132, 학습관리 V137이다. 반면 오래된 wrapper와 관리자 서비스에는 직접 batch/write 경로가 남아 있어 메뉴별 server-confirm 여부를 개별 확인해야 한다. UI에서 성공처럼 보이는 경로를 서버 성공으로 간주하지 않는다.

## 권한과 노출 위험

전역 역할은 `system_owner`, `user`, workspace 역할은 `super_manager`, `manager`, `teacher`, `normal`, `viewer`, `print_account`다. `system_owner`는 workspace role이 아니며, workspace가 없는 상태에서 workspace 데이터 권한을 자동으로 부여하면 안 된다. viewer/print_account의 write, manager의 super_manager 관리, canonical membership 미사용 경로는 후속 Rules 감사 대상이다.

V129/V137 상세보기 allowlist가 subjects, teachers, materials, assignments, records, examSchedules에 적용되지만, 과거 renderer와 관리자 화면에는 raw row/ID 노출 가능성이 남아 있다. 전체 UID, workspaceId, documentId, token, raw JSON, 파일 경로는 화면과 진단에 노출하지 않는 것을 기준으로 한다.

## 구현 상태

- PASS 또는 코드 완료·수동 대기: 인증 전환 preview, 읽기 전용 app-next 계정/기기/알림/공지/일정/시간표 Pilot, 운영 Safety 진단, V137 학습관리 보정
- P0/P1: 10B-2D 네 기능은 수동검증 전까지 완료로 승격하지 않음
- HOLD: 시험·성적 Batch 10C, 포트폴리오 Batch 10D, WebChannel 400, Print Center, 전체 viewer 재설계, 시간표-수업기록 자동 lifecycle
- EXTERNAL: Google Drive OAuth, NEIS, 학교 게시판 proxy 운영 연결, 카카오 비즈메시지
- 미구현/확인 필요: 수납·미납·결제, 실제 백업 자동화, 원격 점검모드 전환, 공개 소개 웹/서비스 콘솔

## 테스트와 배포 판정

기존 정적 테스트, typecheck, build는 이전 Batch 10B-2D 검증 결과를 참고하되 이번 감사는 별도 read-only 재확인으로 기록한다. lint script는 미구성이다. 테스트 통과는 수동검증 PASS가 아니다. Owner Preview는 조건부 가능이 아니라 10B-2D 수동검증, Rules/권한, 민감정보, rollback 확인 전 배포 차단이다. 비공개 베타도 동일하게 차단한다.

상세 체크리스트와 후속 설계는 이 문서에서 반복하지 않고 다음 문서를 기준으로 한다.

- [master manual checklist](<C:\dev\My Web\docs\my-web-master-manual-test-checklist.md>)
- [gap/legacy audit](<C:\dev\My Web\docs\my-web-gap-duplicate-legacy-audit.md>)
- [Batch 10C preflight](<C:\dev\My Web\docs\owner-preview-exam-grade-management-batch10c-preflight-audit.md>)
- [Batch 10D preflight](<C:\dev\My Web\docs\owner-preview-portfolio-batch10d-preflight-plan.md>)
- [document index](<C:\dev\My Web\docs\my-web-documentation-index.md>)

## 다음 순서

1. Batch 10B-2D 수동검증
2. 실패 항목만 좁게 수정
3. 명시적 staging 전 최종 diff와 민감정보 검사
4. 시험·성적 10C preflight 승인
5. 포트폴리오 10D preflight 승인
6. Rules/백업/지원/약관을 포함한 베타 gate 재평가

이 감사에서는 앱 코드를 변경하지 않았다.
