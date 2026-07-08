# Presentation UI Snapshot Report

- Output PDF: `output/presentation-ui-snapshot.pdf`
- PNG folder: `output/presentation-ui-snapshot/`
- Capture source: local presentation preview at `http://127.0.0.1:5195`
- Auth/data mode: local demo workspace only, Firebase config masked to empty object.
- Data masking: names are sample labels, emails use `***@example.invalid`, phone/address/UID values are masked or synthetic.
- Excluded from PDF: tabs that triggered browser policy blocking or produced blank screenshots.

## Summary

- PNG captures included in PDF: 27
- PDF pages generated: 38
- Policy blocked tabs: 7
- Blank skipped tabs: 4

## Successful Captures

- `01-admin-메인-대시보드-dashboard.png` - 1265x1896 px, PDF pages: 2
- `02-admin-내정보-관리-personal.png` - 1265x964 px, PDF pages: 1
- `03-admin-출결-관리-attendance.png` - 1265x810 px, PDF pages: 1
- `04-admin-수정-요청함-requests.png` - 1265x887 px, PDF pages: 1
- `05-admin-일정-관리-schedules.png` - 1265x906 px, PDF pages: 1
- `06-admin-학사일정-academic.png` - 1265x2024 px, PDF pages: 2
- `07-admin-공지-관리-notices.png` - 1265x769 px, PDF pages: 1
- `08-admin-학교공지-schoolNotices.png` - 1280x720 px, PDF pages: 1
- `10-admin-급식-관리-meals.png` - 1265x7147 px, PDF pages: 6
- `11-admin-급식-신청-mealApplications.png` - 1265x1281 px, PDF pages: 1
- `12-admin-시간표-timetable.png` - 1265x1875 px, PDF pages: 2
- `13-admin-과목-관리-subjects.png` - 1280x720 px, PDF pages: 1
- `14-admin-선생님-관리-teachers.png` - 1280x720 px, PDF pages: 1
- `15-admin-수업-자료-materials.png` - 1280x720 px, PDF pages: 1
- `16-admin-수업-기록-lessons.png` - 1265x947 px, PDF pages: 1
- `17-admin-과제-관리-assignments.png` - 1265x810 px, PDF pages: 1
- `18-admin-시험일정-examSchedules.png` - 1280x720 px, PDF pages: 1
- `19-admin-시험-성적-관리-exams.png` - 1265x1729 px, PDF pages: 2
- `20-admin-세특-관리-records.png` - 1265x801 px, PDF pages: 1
- `21-admin-포트폴리오-portfolios.png` - 1265x798 px, PDF pages: 1
- `22-admin-프로젝트-관리-projects.png` - 1265x732 px, PDF pages: 1
- `24-admin-특강-specialLectures.png` - 1280x720 px, PDF pages: 1
- `26-admin-기준정보-masterData.png` - 1265x2622 px, PDF pages: 3
- `28-admin-친구-인물-관리-people.png` - 1265x843 px, PDF pages: 1
- `29-admin-친구-상벌점-friendAwards.png` - 1265x753 px, PDF pages: 1
- `30-admin-벌점-관리-penalties.png` - 1265x950 px, PDF pages: 1
- `31-admin-예산-관리-budget.png` - 1280x720 px, PDF pages: 1

## Failed Or Skipped Tabs

- super_manager / `chat` / 문의/채팅 관리: 브라우저 보안 정책이 /chat 라우트 접근을 차단했습니다.
- super_manager / `site` / 홈페이지 관리: 브라우저 보안 정책 차단 후 캡처 세션이 중단되었습니다.
- super_manager / `accounts` / 계정 설정: 브라우저 보안 정책 차단 후 캡처 세션이 중단되었습니다.
- super_manager / `admin` / 관리자 설정: 브라우저 보안 정책 차단 후 캡처 세션이 중단되었습니다.
- super_manager / `system` / 백업/복구: 브라우저 보안 정책 차단 후 캡처 세션이 중단되었습니다.
- super_manager / `omrForms` / OMR 양식: 브라우저 보안 정책 차단 후 캡처 세션이 중단되었습니다.
- super_manager / `print` / 프린트: 브라우저 보안 정책 차단 후 캡처 세션이 중단되었습니다.
- super_manager / `homeLetters` / 가정통신문: 캡처 PNG가 빈 화면으로 확인되어 PDF에서 제외했습니다.
- super_manager / `afterschool` / 방과후: 캡처 PNG가 빈 화면으로 확인되어 PDF에서 제외했습니다.
- super_manager / `clubs` / 동아리: 캡처 PNG가 빈 화면으로 확인되어 PDF에서 제외했습니다.
- super_manager / `workspaceUpdates` / 업데이트: 캡처 PNG가 빈 화면으로 확인되어 PDF에서 제외했습니다.

## Blank Capture Notes

- Blank first-pass files are kept under `output/presentation-ui-snapshot/skipped-blank/` for troubleshooting, but are intentionally not included in the PDF.

## Privacy Checks

- `.env`, Firebase service account files, API keys, Firebase config values, Google Drive IDs, and real account screens were not used for capture.
- The preview server masks `/pm-env.js` and `/firebase-config.local.js` responses.
- All visible account/contact values in the seeded demo data are fake or masked.
