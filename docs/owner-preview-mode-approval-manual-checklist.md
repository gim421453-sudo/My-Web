# Batch 10E 수동 검증 체크리스트

검증 주소: `http://127.0.0.1:3000/`

## 운영 모드

- 시스템관리자 콘솔에 `워크스페이스 운영 모드` 메뉴가 보인다.
- system_owner가 아닌 계정에서는 메뉴와 변경 버튼이 보이지 않고 직접 탭 접근도 차단된다.
- 현재 모드가 `운영 모드 미설정`으로 안전하게 표시된다.
- 개인/학교/학원 모드를 선택하면 영향 UI와 보존 데이터 안내가 바뀐다.
- 사유 없이 적용할 수 없다.
- 첫 확인 취소 또는 재인증 취소 시 write가 발생하지 않는다.
- 적용 성공 시 서버 확인과 학생·평가계획·평가·성적·포트폴리오·과목·교사 건수 보존 확인이 표시된다.
- 모드 변경 이력에 이전/새 모드, 사유, 데이터 보존 상태가 표시되고 원문 UID는 보이지 않는다.
- 다른 워크스페이스의 데이터가 이동·삭제·변환되지 않는다.

## 시험·성적

- 개인 모드에서는 학생 selector 없이 본인 성적 입력 흐름만 보인다.
- 학교/학원 모드에서는 기존 student adapter 데이터가 있을 때만 학생 selector가 보인다.
- 평가계획 상태는 자유 텍스트가 아닌 한국어 선택지다.
- 평가계획 상세와 결재 요청은 재인증 뒤에만 실행된다.
- 과목을 선택한 뒤 해당 과목의 평가계획과 평가 항목만 선택된다.
- 성취도 정책은 백분율/원점수/반영점수/과목 종합 점수 중 하나를 선택하고, 학생별 override는 없다.
- CSV는 미리보기/내보내기만 제공하며 XLSX 또는 Drive 업로드 성공을 표시하지 않는다.

## HOLD 및 회귀

- WebChannel 400, COOP 경고, 재인증 팝업 지연은 관찰만 하고 listener 구조를 바꾸지 않는다.
- 저장 버튼 없이 평가계획이 생성되는 실제 서버 문서 증가는 P0로 다시 기록한다.
- 포트폴리오 삭제, 기록부 첫 저장, 공지·일정·출결·시간표·인증이 기존 흐름대로 동작한다.
# Batch 10E Mode and Grade Approval Manual Checklist

Base URL: `http://127.0.0.1:3000/`

## System-owner mode

- [ ] Only `system_owner` sees the workspace operation-mode tab.
- [ ] Selecting personal, school, academy, or unconfigured shows Korean labels only.
- [ ] Cancelling account reauthentication makes no mode write and shows no success message.
- [ ] A completed mode change shows server confirmation, preserved-data counts, and history.
- [ ] Another workspace is unchanged after a selected workspace mode change.

## Grade plans and assessments

- [ ] The plan status is a Korean select, not a raw enum text field.
- [ ] Plan detail shows the selected plan; edit hydrates that same plan and does not create another document.
- [ ] A plan under review or finalized cannot be directly edited or deleted.
- [ ] Select a subject, then confirm only its assessment plans appear.
- [ ] Select a plan, create either written or performance assessment, and confirm inherited context is retained.

## Achievement and CSV

- [ ] Score source choices are percentage, raw score, weighted score, and course total.
- [ ] Scope selection shows only its required context fields and clears hidden values before save.
- [ ] Previewing a policy does not recalculate existing student results.
- [ ] CSV analysis accepts only `.csv`; it matches students by an existing identifier, never by name alone.
- [ ] CSV preview does not write data or retain the uploaded file after page refresh.

## Approval and audit

- [ ] Approval request requires reauthentication and server confirmation.
- [ ] If grade approval or audit Rules are missing, the screen shows `RULES-BLOCKED` and no success.
- [ ] Grade create/update/delete requires reauthentication and only completes after both the document and audit record are server-confirmed.

## Holds

- [ ] No automatic evaluation-plan creation occurs after login, navigation, refresh, or server reload.
- [ ] WebChannel 400 observations are recorded separately; this batch does not change listeners or transport.
- [ ] Google Drive upload/OAuth, XLSX import, and final five-grade write remain unavailable.
