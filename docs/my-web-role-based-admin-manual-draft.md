# 역할별 관리자 매뉴얼 초안

## 역할 기준

전역 `system_owner`와 `user`, workspace `super_manager`, `manager`, `teacher`, `normal`, `viewer`, `print_account`를 분리한다. 아래 권한은 코드/기존 정책 기준 요약이며 Rules 최종 승인이 아니다.

| 역할 | 기본 접근 | 관리/쓰기 | 주의 |
|---|---|---|---|
| system_owner | 시스템과 선택된 workspace | 시스템 관리와 owner 전용 기능 | workspace role로 저장/비교하지 않음 |
| super_manager | workspace 관리 기능 | 기존 정책상 멤버/관리 데이터 | Rules와 실제 membership 재확인 |
| manager | 관리 메뉴 일부 | teacher 이하 관리 범위 | super_manager 변경 금지 기준 |
| teacher | 수업·과제·출결·시험 관련 | 허용된 학습관리 쓰기 | 다른 사용자 관리 금지 |
| normal | 개인/허용 데이터 | 제한된 일반 기능 | workspace 격리 확인 |
| viewer | 허용된 조회/출력 | write 금지 기준 | UI hidden만으로 보안 판단 금지 |
| print_account | 출력용 조회 | 일반 데이터 write 금지 기준 | 민감 필드 마스킹 |

## 관리자 절차

사용자·workspace·멤버·초대·시스템 공지는 `services/systemAdminService.js`의 고위험 경로다. 생성/수정/삭제 전 대상 workspace, 역할 서열, 확인 절차, batch 부분 실패를 확인한다. 승인·역할 변경·계정 삭제는 실제 데이터로 자동 검증하지 않는다.

학습관리에서는 교사 과목 중복 선택, 기록부 활동명 필수, 자료 첨부 metadata-only, 시험 종료 분류를 수동 checklist로 검증한다. 수납·결제·카카오·시험 성적은 아직 `HOLD/EXTERNAL`이다.
