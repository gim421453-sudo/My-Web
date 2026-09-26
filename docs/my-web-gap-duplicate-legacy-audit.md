# 누락·중복·레거시 후보 감사

읽기 전용 정적 감사 결과다. 아래 항목은 삭제 대상이 아니라 후속 조사 후보다.

| 영역 | 근거 | 위험 | 후속 배치 |
|---|---|---|---|
| 운영 renderer wrapper | `app.js`에 V6~V137 `renderPage`, `renderCollection`, `openEditor` 재할당 | 활성 경로 착각, handler 중첩 | 별도 renderer 정리 감사 |
| workspace membership | `users`, nested `members`, `workspace_members`, `workspaceMembers` 참조 | 역할/범위 불일치 | Rules와 canonical migration 설계 |
| notice/schedule write | V113~V121 server-confirm과 이전 generic save 공존 | local-only 성공·중복 저장 | 운영 write gate 재점검 |
| timetable | V111, V123, V124와 이전 helper 공존 | 교시 lifecycle 회귀 | 시간표 전용 회귀 유지 |
| app-next vs 운영 | app-next는 읽기 전용, 운영은 CRUD | 표시와 저장 결과 차이 | 비교 checklist |
| system admin | `services/systemAdminService.js`에 사용자/member/workspace batch write 다수 | 고위험 대량 변경 | Owner-only Rules 감사 |
| chat | `services/chatService.js`에 listener와 thread/message write | 범위·비용·개인정보 | 별도 채팅 배치 |
| notification service | React service에 add/update/read 기능 존재 | Notifications read-only 화면과 계약 불일치 | write consumer 조사 |
| device service | 현재 local facade, Firestore 경로는 주석/타입 기준 | 실제 기기 이력 오해 | 서버 세션 모델 별도 |
| Drive | V137은 metadata-only, OAuth/upload 구현 없음 | 기능이 연결된 것처럼 보일 위험 | EXTERNAL |
| backup/recovery | recovery 도구는 gated, 자동 백업은 확인되지 않음 | 복구 가능성 과대평가 | backup preflight |
| 상세 allowlist | V129/V137 일부 적용, 과거 generic viewer 잔존 | 내부 ID/raw row 노출 | entity별 allowlist 확대 |

## 문서/코드 불일치 후보

- 과거 문서의 app cache version은 최신 `v143`과 다를 수 있으므로 현재 `index.html`을 기준으로 갱신한다.
- 계획 문서의 수납, 카카오, NEIS, Drive는 코드 확인 전 사용 가능으로 쓰지 않는다.
- React guard와 Login consumer는 app-next/preview와 운영 정적 앱을 구분한다.

## 중요 누락

Rules Emulator 기반 전체 역할 matrix, 실제 backup/restore 검증, private beta 개인정보/약관/support 준비, 성적 데이터 모델, 포트폴리오 파일 정책은 아직 배포 기준으로 확정되지 않았다.
