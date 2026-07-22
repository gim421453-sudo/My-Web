# Auth Shadow Rollout Checklist

## 실행 전 공통 확인

- [ ] `npm run typecheck` 통과
- [ ] `npm test` 통과
- [ ] `npm run build` 통과
- [ ] `app.js`, `index.html`, 루트 `services/*.js` 미수정 확인
- [ ] Firestore Rules 미배포 확인
- [ ] Firestore/Auth 실제 데이터 미수정 확인
- [ ] Shadow 로그가 개발 환경에서만 출력되는지 확인
- [ ] Shadow 로그에 전체 UID/email/token/초대코드가 없는지 확인

## 오너 계정

- [ ] 기존 앱에서 오너 계정 로그인 유지
- [ ] `systemOwners/{uid}` 존재 시 `isSystemOwner == true`
- [ ] `session.globalRole == "system_owner"`
- [ ] `users.globalRole == "user"` 불일치는 warning만 기록
- [ ] `users.role/currentRole/workspaceRole == "system_owner"`는 legacy warning만 기록
- [ ] 삭제된 `currentWorkspaceId`가 있어도 로그인 실패로 처리하지 않음
- [ ] 유효 owner workspace를 선택하거나 fallback으로 계산하면 `currentWorkspaceRole == "super_manager"`
- [ ] Firestore `users.currentWorkspaceId`를 자동 수정하지 않음

## 일반 사용자

- [ ] `active + currentWorkspaceId == null`은 보호 데이터 조회 없이 workspace 없음 상태로 비교
- [ ] `active + 유효 nested membership`은 해당 role 계산
- [ ] `active + 삭제된 workspace 참조`는 workspace warning만 기록
- [ ] `pending`은 account action 상태로 비교
- [ ] `disabled == "false"`는 active로 정규화
- [ ] `disabled == "true"`는 disabled로 정규화
- [ ] `viewer` 권한 차이 감지
- [ ] `print_account` 권한 차이 감지
- [ ] `manager` 권한 차이 감지
- [ ] nested member 없음은 warning으로 기록하고 자동 복구하지 않음

## 상태 전환

- [ ] 로그아웃 중 이전 shadow 요청 결과가 최신 상태를 덮지 않음
- [ ] A 계정 로그아웃 직후 B 계정 로그인 시 이전 comparison이 무시됨
- [ ] 새로고침 후 기존 운영 로그인 상태와 shadow 비교 결과가 모두 안정적임
- [ ] 여러 탭에서 로그인/로그아웃해도 Shadow Mode가 운영 세션을 변경하지 않음

## 실제 연결 전 남은 작업

- [ ] React 전환 앱에 ShadowAuthObserver를 dev-only로 넣을 위치 확정
- [ ] 기존 app.js가 명시적 legacy snapshot을 `window.PM_AUTH_SHADOW_LEGACY_SNAPSHOT`으로 노출할지 결정
- [ ] critical mismatch가 실제 사용자 데이터에서 발생하는지 수동 확인
- [ ] warning 허용 목록과 정규화 대상 목록 분리
- [ ] 신규 AuthProvider/RouteGuard 연결 전에 rollback 계획 작성

## 금지 확인

- [ ] Shadow Mode에서 Firestore write 없음
- [ ] Shadow Mode에서 Auth 사용자 수정 없음
- [ ] Shadow Mode에서 자동 로그아웃 없음
- [ ] Shadow Mode에서 자동 화면 이동 없음
- [ ] Shadow Mode에서 Rules 변경/배포 없음
- [ ] Shadow Mode 결과를 localStorage/sessionStorage/Firestore/파일에 저장하지 않음
