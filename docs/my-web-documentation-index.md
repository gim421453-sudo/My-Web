# My Web 문서 인덱스

## 현재 기준 문서

`my-web-overnight-full-audit-report.md`, `my-web-master-manual-test-checklist.md`, `owner-preview-operational-safety-v1.md`, `owner-preview-pre-deploy-final-gate-v1.md`, `release-gate-role-workspace-v1.md`를 현재 운영 판단의 기준으로 사용한다.

## 감사·전환 문서

`auth-*`, `react-*`, `legacy-auth-*`, `dangling-current-workspace-*`, `workspace-notice-*`, `firestore-*`는 각각 인증, React 전환, workspace/공지/Rules 감사 기록이다. 과거 단계 문서는 현재 구현과 다를 수 있으므로 최신 코드와 cache version을 재확인한다.

## Pilot·후속 배치

`app-next-*`는 독립 읽기 전용/guard Pilot 문서다. `owner-preview-learning-management-*`는 Batch 10B 수동검증 기록이다. `owner-preview-exam-grade-management-batch10c-*`와 `owner-preview-portfolio-batch10d-*`는 계획/HOLD 문서다. Batch 10C의 최종 정책은 성취도 구간 기반 자동 산정, 학생별 성취도 override 미지원, Google Drive 실제 연동 EXTERNAL/HOLD, 종료 시험 자동 탭 이동 HOLD다.

## 매뉴얼·배포

`my-web-user-manual-draft.md`, `my-web-role-based-admin-manual-draft.md`, `my-web-operations-incident-response-manual-draft.md`, `my-web-backup-restore-manual-draft.md`, `my-web-deployment-rollback-manual-draft.md`는 초안이다. 실제 운영 적용 전 담당자·보존·승인 정책을 채운다.

## 갱신 규칙

운영 entry, app cache version, Rules, 데이터 schema, 역할 정책, 배포 상태가 바뀔 때 기준 문서와 audit report를 함께 갱신한다. 민감정보와 실제 UID/email/workspaceId는 문서에 저장하지 않는다.
