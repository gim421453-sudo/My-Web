# 개인·학교·학원 모드 배치 계획

현재 운영 모드는 `integrated-unconfigured`다. 아래는 구현 계획이며 현재 코드가 지원한다고 의미하지 않는다.

| 영역 | 공통 | 개인 | 학교 | 학원 |
|---|---|---|---|---|
| 인증/세션 | AuthProvider, canonical workspace, status | 공통 | 공통 | 공통 |
| 기본 데이터 | 공지, 일정, 자료, 진단, 안전 | 개인 일정·과목·기록·과제·시험·포트폴리오 | 학생·교사·과목·시간표·출결·과제·시험 | 학생·반·수업·출결·과제·시험 |
| 관리자 | 공통 release/backup console | 최소 | 사용자·workspace·승인 | 사용자·반·수납 |
| 외부 | 공통 gate | 없음 | NEIS 후보 | 카카오 후보 |

수납·미납·할인·영수증·카카오 알림톡·상담톡·통계는 새 collection, Rules, 외부 연동과 개인정보 정책이 필요하며 현재 `EXTERNAL/HOLD`다. mode resolver는 인증 후 canonical workspace 설정에서 읽기 전용으로 시작하고, mode 전환이 role/workspace를 자동 변경하지 않도록 한다.

권장 삽입 위치는 app.js의 공통 `pageMeta`/`navKeys`/`renderPage` 전에 mode policy를 읽는 별도 resolver와, 이후 각 기능 renderer의 명시적 allowlist다. 실제 연결은 설계 승인 후 진행한다.
