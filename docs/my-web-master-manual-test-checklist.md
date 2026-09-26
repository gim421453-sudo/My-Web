# My Web 마스터 수동 테스트 체크리스트

기준 주소: `http://127.0.0.1:5173/`  
원칙: 운영 계정과 실제 데이터로 삭제·일괄 변경을 자동 수행하지 않는다. 모든 항목은 `PASS / FAIL / HOLD / EXTERNAL` 중 하나로 기록한다.

## 공통 준비

## Workspace Display Name V158

- [ ] 학교 운영 대시보드에서 현재 workspace의 실제 표시명이 보이는지 확인한다.
- [ ] 이름이 없는 workspace는 `이름 미설정`만 표시하며 workspace ID나 사용자 식별자를 이름으로 표시하지 않는지 확인한다.
- [ ] `window.PMSchoolUiDiagnostics?.snapshot?.()`에 원문 이름이나 workspace ID 없이 해석 상태와 fingerprint만 있는지 확인한다.

- [ ] 별도 테스트 workspace와 식별 가능한 테스트 제목 사용
- [ ] 브라우저 주소는 `127.0.0.1` 사용
- [ ] Console에 UID, workspaceId, token, 이메일 원문이 없는지 확인
- [ ] Network에서 의도하지 않은 write/listener가 없는지 확인
- [ ] 전후 새로고침과 서버 확인 결과 기록

## 기능별 최소 목록

| ID | 기능 | 확인 |
|---|---|---|
| AUTH-01 | Google/이메일 로그인, 새로고침, 로그아웃 | 상태 복구, 자동 로그아웃 없음 |
| WS-01 | workspace 선택과 null 상태 | 다른 workspace 데이터 없음 |
| ROLE-01 | system_owner와 각 workspace 역할 | role 경계, pending/disabled |
| NOTICE-01 | 공지 조회/생성/수정/개별 삭제 | 서버 확인 후 성공 표시 |
| NOTICE-02 | 공지 선택/전체 삭제 | 권한, 확인 절차, batch 부분 실패 |
| SCHED-01 | 일정 조회/상세/추가/수정/삭제 | canonical workspace, server-confirm |
| TIME-01 | 시간표 진입/교시/셀 CRUD/빠른보기 | V111/V124 회귀, 중복 없음 |
| ATT-01 | 출결 입력/수정/삭제 | false success 없음 |
| SUBJECT-01 | 과목 CRUD와 상세 | 내부 ID 미노출 |
| TEACH-01 | 교사 과목 chip | 중복 선택 차단, 같은 이름 다른 ID 허용 |
| MATERIAL-01 | 자료/첨부 상세 | raw MIME, path, key 미노출 |
| LESSON-01 | 수업 기록 | 자동 생성과 suppression 정책 확인 |
| ASSIGN-01 | 과제와 제출 현황 | 제출/채점은 HOLD 포함 |
| EXAM-01 | 시험 일정 | 종료/취소 분류, 날짜 timezone |
| GRADE-01 | 시험·성적 | 평가계획·수행·합산·석차·통계·5등급을 분리해 Batch 10C 이후 진행 |
| GRADE-02 | 성취도 정책 | 관리자 구간 기반 자동 산정만; 학생별 선택/override 없음; 정책 변경은 미리보기 후 명시적 재계산 |
| GRADE-03 | 시험 lifecycle | 종료 시험 자동 탭 이동은 HOLD |
| RECORD-01 | 기록부/세특 | 활동명만 필수, 첫 클릭 1회 저장; 이 오류는 Batch 10C보다 먼저 확인 |
| PORT-01 | 포트폴리오 | Batch 10D preflight 이후 진행 |
| PRINT-01 | 보고서/프린트 | Print Center HOLD |
| FILE-01 | 첨부/Drive | 첨부 메타데이터만; 실제 Drive OAuth·업로드·Viewer는 EXTERNAL/HOLD |
| SAFE-01 | 점검 상태와 오류 화면 | normal 기본, retry, 민감정보 없음 |
| ISO-01 | 다른 workspace 격리 | query와 UI 모두 차단 |
| BETA-01 | Owner Preview | release gate, rollback, support 준비 |
| RECORD-02 | 기록부 첫 저장 | 활동명만 입력, 한 번 클릭, 서버 확인 write 1회, 메모 focus 없음, 중복 문서 없음; 수동 검증 대기 |
| GRADE-04 | Batch 10C 핵심 | 계획, 평가, 성적, 수행 유형, 합산, 석차/공동석차, 정책/5등급 미리보기, 문항/답안, CSV; 수동 검증 대기 |
| PORT-02 | Batch 10D 핵심 | 제목만으로 포트폴리오 첫 저장이 서버 확인됨, 첨부 메타데이터만 유지, Drive 동작 없음; 수동 검증 대기 |

## 공통 판정 기록

각 테스트에 기능명, 사전 조건, 입력 제목, 기대 결과, 서버 문서 존재/필드, 새로고침 결과, Console, Network, 실패 코드, 수동 판정, 비고를 남긴다. 실제 데이터 삭제 테스트는 테스트 fixture 또는 Emulator에서만 수행한다.
