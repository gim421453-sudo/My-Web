# 운영·장애 대응 매뉴얼 초안

## 공통 원칙

원인 확인 전 데이터 수정, Rules 변경, 자동 재시도, 일괄 삭제를 하지 않는다. UID, workspaceId, token, raw path를 사용자 화면과 일반 로그에 남기지 않는다. `PMOperationalSafetyDiagnostics`와 workspace diagnostics는 마스킹된 값만 사용한다.

| 장애 | 감지/증상 | 즉시 조치 | 금지 | 복구 확인 |
|---|---|---|---|---|
| 로그인 | popup/restore 실패 | provider 상태, Firebase init, cross-tab 확인 | 자동 signOut 반복 | 재진입·세션 유지 |
| Firestore | permission, unavailable, quota | 오류 code와 read/write 범위 분리 | cached 성공 표시, 즉시 재시도 loop | server read와 write count |
| WebChannel 400 | Listen transport 오류 | listener path/count와 visibility lifecycle 확인 | listener 중복 추가 | 200 응답, duplicate path 0 |
| workspace | currentWorkspace dangling/mismatch | fingerprint와 문서/membership read-only 비교 | 자동 연결·복구 | canonical/AppSession 일치 |
| 데이터 동기화 | local과 서버 불일치 | server source 재조회 | local-only 성공 표시 | 문서 수/핵심 필드 |
| 점검 모드 | maintenance/partial/emergency | release channel과 status 확인 | 원격 상태 임의 변경 | role별 화면 |
| 파일/Drive | metadata-only 또는 OAuth 실패 | 파일명/형식/상태만 안내 | token·base64 저장 | 실제 link만 열림 |
| 보안 의심 | 내부 ID/PII 노출 | 화면 캡처와 마스킹 로그 보존 | 원문 공유 | 민감정보 재검색 |
| 오삭제 | 삭제 후 재등장 | 서버 문서와 pending queue 비교 | 일괄 재삭제 | server count 0/대상 제외 |

## 장애 등급

P0는 인증 불가, cross-workspace 노출, 원격 write 오판, 대량 오삭제다. P1은 핵심 메뉴 CRUD 실패, server-confirm 누락, quota 폭증이다. P2는 표시/출력 문제다. 담당자와 승인자는 실제 운영 배포 전에 정한다.

## 복구 완료 조건

원인 코드가 기록되고, 서버 기준 확인이 끝나며, write/listener가 예상 범위로 돌아오고, 역할·workspace 격리와 민감정보 검사를 통과하며, 수동 회귀 checklist가 업데이트되어야 한다.
