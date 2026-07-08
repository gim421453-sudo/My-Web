# HANDOFF.md

## 한 줄 요약
Firebase Auth + Firestore 기반 개인/워크스페이스 관리 웹앱이며, 현재 최우선 작업은 일반 계정의 권한/워크스페이스 연결 오류와 역할 변경 후 `Missing or insufficient permissions`가 발생하는 문제를 안정화하는 것입니다.

## 목표
- 통합 사이트(`main`)와 관리자 전용 사이트(`admin-standalone`)를 같은 Firebase 프로젝트 안에서 안전하게 분리합니다.
- 모든 사용자 데이터는 `workspaceId` 기준으로 분리하고, 역할별 접근 권한을 Firestore Rules와 프론트 초기 로딩 양쪽에서 일치시킵니다.
- `system_owner`, `super_manager`, `manager`, `teacher`, `normal`, `viewer`, `print_account` 역할이 로그인/새로고침/재로그인 후에도 흔들리지 않게 합니다.
- 초대코드, 승인 대기, 회원 권한 복구, 역할 변경, workspace 멤버 문서 복구 흐름을 실제 Firestore 데이터와 동기화합니다.
- 발표/시연용 자료는 실제 운영 데이터가 아닌 마스킹된 데모 데이터만 사용합니다.

## 현재 상태
- 작업 폴더: `C:\Users\USER\Documents\My Web`
- Git 원격: `https://github.com/gim421453-sudo/My-Web.git`
- 현재 브랜치: `main`
- 주요 진입점은 정적 웹 구조입니다.
  - `index.html`
  - `app.js`
  - `styles.css`
  - `services/*.js`
  - `shared/*.js`
- Firebase 설정은 `.env`에서 생성되는 로컬 파일을 통해 연결됩니다.
  - `firebase-config.local.js`
  - `pm-env.js`
  - `pm-firebase-config.js`
- 위 로컬 설정 파일과 Admin SDK JSON은 GitHub에 올리면 안 됩니다.
- 기존 루트 핸드오프 문서는 원문 보존을 위해 `docs/handoffs/`로 archive 처리했습니다.
  - `docs/handoffs/archive-2026-07-09-CODEX_HANDOFF.md`
  - `docs/handoffs/archive-2026-07-09-CODEX_HANDOFF_now_backup.md`
- 발표용 UI 스냅샷 산출물이 있습니다.
  - `output/presentation-ui-snapshot.pdf`
  - `output/presentation-ui-snapshot/`
  - `output/presentation-ui-snapshot-report.md`
- 현재 작업 트리에는 사용자가 이어서 점검 중인 앱 코드 변경과 발표용 output 파일이 남아 있습니다. 커밋/푸시는 사용자가 명시적으로 요청하기 전까지 하지 않습니다.

## 관련 파일
- 인증/초기 로딩
  - `services/authService.js`
  - `services/firebaseRuntime.js`
  - `app.js`
- 초대코드/워크스페이스 연결
  - `services/invitationService.js`
  - `services/workspaceDataService.js`
  - `services/systemAdminService.js`
- 권한/공통 역할
  - `shared/*.js`
  - `firestore.rules`
- 시스템 오너/관리자 스크립트
  - `scripts/set-system-owner.mjs`
  - `scripts/generate-firebase-config.mjs`
  - `scripts/static-preview.cjs`
- 문서
  - `docs/firebase-production-setup.md`
  - `docs/firebase-firestore-design.md`
  - `docs/integration-ready-architecture.md`
  - `docs/handoffs/`
- 민감 파일
  - `.env`
  - `.env.local`
  - Firebase Admin SDK JSON
  - `firebase-config.local.js`
  - `pm-env.js`
  - `pm-firebase-config.js`

## 요구사항
- 로그인 직후에는 반드시 `users/{auth.uid}` 자기 문서만 먼저 읽습니다.
- `users/{uid}`에는 다음 필드를 보장합니다.
  - `uid`, `email`, `displayName`, `role`, `status`, `workspaceId`, `pendingWorkspaceId`, `pendingInviteCodeId`, `createdAt`, `updatedAt`
- `status`가 `pending`, `rejected`, `suspended`이거나 `workspaceId`가 없는 계정은 보호된 workspace 컬렉션을 읽지 않고 안내 화면만 표시합니다.
- 초대코드 가입/등록 시 `pendingInviteCodeId`, `pendingWorkspaceId`, `invitedBy`, workspace member 문서를 함께 저장합니다.
- 승인 또는 권한 복구 시 `users/{uid}`와 `workspaces/{workspaceId}/members/{uid}` 및 호환 멤버 문서의 `role`, `status`, `workspaceId`가 서로 맞아야 합니다.
- 역할 변경 성공 메시지는 `updateDoc` 성공만으로 띄우지 말고, 저장 후 문서를 다시 읽어 `role`, `status`, `workspaceId`가 실제 반영됐는지 확인한 뒤 표시합니다.
- `super_manager` 선택값은 화면 표시명과 저장값이 섞이지 않게 항상 `"super_manager"`로 저장합니다.
- Firestore Rules는 전체 공개 규칙으로 임시 완화하지 않습니다.
- 권한 오류 발생 시 콘솔에 다음 정보를 남깁니다.
  - `uid`, `role`, `status`, `workspaceId`, `pendingWorkspaceId`, 시도한 collection/path, error message
- 공개 범위 화면 문구는 `비공개` / `공개`로 표시하고, 저장값은 `private` / `public`을 유지합니다.
- 기본 공개 범위는 반드시 `private`입니다.
- 시스템 관리의 `회원 권한 복구`는 복구 후 대시보드로 이동하지 않고 현재 시스템 관리 화면에 머물러야 합니다.

## 제약사항
- 루트의 현재 작업용 핸드오프는 이 `HANDOFF.md` 하나만 유지합니다.
- 기존 핸드오프 원문은 삭제하지 않고 `docs/handoffs/`에 보관합니다.
- `.env`, Firebase 설정값, Admin SDK JSON, UID, 이메일, API 키 등 민감정보는 문서/PDF/이미지/로그에 노출하지 않습니다.
- 복사본 폴더가 아니라 반드시 `C:\Users\USER\Documents\My Web`에서만 작업합니다.
- 사용자가 명시적으로 요청하기 전에는 커밋, 푸시, 원격 배포, Firebase 데이터 삭제를 하지 않습니다.
- `firestore.rules`를 수정해도 Firebase Console 또는 Firebase CLI로 배포하기 전까지 실제 서비스에는 반영되지 않습니다.
- 이 프로젝트는 `app.js`가 큰 단일 파일이고, 기존 패치가 누적된 구조입니다. 큰 리팩터링보다 현재 구조에 맞춘 좁은 수정이 안전합니다.

## 완료 기준
- `system_owner`는 전체 시스템 관리 화면에 정상 접근합니다.
- `super_manager`와 `manager`는 자기 workspace 사용자/데이터만 조회합니다.
- `teacher`, `normal`, `viewer`, `print_account`는 자기 권한 범위 안에서만 접근하고 관리자 탭은 보이지 않습니다.
- 일반 계정 로그인 후 `Missing or insufficient permissions`가 발생하지 않습니다.
- 승인 대기 계정은 보호된 데이터를 읽지 않고 승인 대기 화면만 봅니다.
- 권한 변경 후 로그아웃/재로그인/새로고침을 해도 역할이 `super_manager`로 되돌아가거나 `null`이 되지 않습니다.
- 회원 권한 복구 후 사용자 목록이 갱신되고 현재 시스템 관리 화면에 그대로 머뭅니다.
- `users/{uid}`와 workspace member 문서가 서로 동기화됩니다.
- Firestore Rules와 프론트 쿼리 조건이 같은 `workspaceId`/역할 모델을 사용합니다.
- 수정 후 최소 검증을 수행합니다.
  - `npm run build`
  - 통합 사이트 `http://localhost:5173`
  - 관리자 전용 사이트 `http://127.0.0.1:5181`
  - 역할별 로그인 수동 확인

## 남은 리스크
- 실제 Firebase Console에 게시된 Rules가 로컬 `firestore.rules`와 다를 수 있습니다.
- 기존 Firestore 사용자 문서 중 `workspaceId`, `pendingWorkspaceId`, `pendingInviteCodeId`, member 문서가 누락된 계정이 있을 수 있습니다.
- `users/{uid}.role`과 workspace member role이 다른 경우 메뉴와 데이터 접근이 흔들릴 수 있습니다.
- 브라우저 자동 로그인과 `main`/`admin-standalone` 타깃 분리가 다시 꼬일 가능성이 있습니다.
- 학교공지/가정통신문/NEIS 급식 연동은 CORS, 학교 사이트 HTML 변경, API 키 상태에 영향을 받습니다.
- 발표용 PDF 산출물은 데모 데이터 기준이며, 실제 운영 화면의 모든 권한 상태를 보장하지는 않습니다.
