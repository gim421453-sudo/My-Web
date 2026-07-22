# VerifyEmail 신규 AuthProvider 테스트 체크리스트

작성일: 2026-07-21

## 자동 테스트

```powershell
npm.cmd run typecheck
npm.cmd test
npm.cmd run build
```

## 브라우저 주소

신규 모드:

```text
http://127.0.0.1:5173/verify-email.html?newAuthVerify=on
```

기존 placeholder:

```text
http://127.0.0.1:5173/verify-email.html?newAuthVerify=off
```

브라우저 확인은 반드시 `127.0.0.1` 기준으로 진행합니다. `localhost`는 사용하지 않습니다.

## 화면 표시 확인

- [ ] 인증 상태가 표시된다.
- [ ] 이메일은 마스킹되어 표시된다.
- [ ] 전체 UID가 표시되지 않는다.
- [ ] token, invitation code, API key가 표시되지 않는다.
- [ ] `emailVerified = true`이면 `이메일 인증이 완료되었습니다.`가 표시된다.
- [ ] `emailVerified = false`이면 `이메일 인증이 필요합니다.`가 표시된다.
- [ ] `active` 상태 문구가 표시된다.
- [ ] `pending` 상태 문구가 표시된다.
- [ ] `rejected` 상태 문구가 표시된다.
- [ ] `disabled` 상태 문구가 표시된다.
- [ ] `globalRole`이 표시된다.
- [ ] system owner 계정에서 `isSystemOwner`가 `예`로 표시된다.
- [ ] system owner 계정에서 `currentWorkspaceRole = super_manager`가 표시된다.
- [ ] warning codes가 표시된다.
- [ ] legacy warning이 있어도 실패 화면이 되지 않는다.

## 상태별 확인

- [ ] `initializing`: `인증 상태를 확인하고 있습니다.`
- [ ] `signed_out`: `로그인이 필요합니다.`
- [ ] `loading_session`: `계정 정보를 불러오고 있습니다.`
- [ ] `authenticated`: `계정 상태 정보를 표시합니다.`
- [ ] `account_action_required`: 계정 상태에 따른 안내
- [ ] `error`: `계정 정보를 불러오지 못했습니다.`

## currentWorkspaceId null

- [ ] `currentWorkspaceId = null`이어도 로그아웃되지 않는다.
- [ ] 오류 상태로 바뀌지 않는다.
- [ ] 다음 문구가 표시된다.

```text
현재 선택된 워크스페이스가 없습니다.
로그인은 정상적으로 유지되고 있습니다.
```

## 다시 확인 버튼

- [ ] `계정 상태 다시 확인` 버튼이 표시된다.
- [ ] 클릭 시 버튼이 중복 클릭되지 않도록 비활성화된다.
- [ ] 성공 시 `계정 상태를 다시 확인했습니다.`가 표시된다.
- [ ] 실패 시 `계정 상태를 다시 불러오지 못했습니다. 로그인은 유지됩니다.`가 표시된다.
- [ ] 실패해도 자동 로그아웃되지 않는다.

## 금지 동작 확인

- [ ] 인증 이메일 재전송 버튼이 없다.
- [ ] 이메일 변경 버튼이 없다.
- [ ] 로그아웃 버튼이 없다.
- [ ] 계정 삭제 버튼이 없다.
- [ ] 워크스페이스 변경 버튼이 없다.
- [ ] 승인 신청 버튼이 없다.
- [ ] Network에서 Firestore write 요청이 없다.
- [ ] Auth 사용자 수정 요청이 없다.
- [ ] localStorage/sessionStorage 삭제가 없다.

## 회귀 확인

- [ ] `?newAuthVerify=off`에서 기존 placeholder 동작이 유지된다.
- [ ] 운영 `index.html` + `app.js` 로그인 흐름이 바뀌지 않았다.
- [ ] 루트 `services/*` 호출 흐름이 바뀌지 않았다.
- [ ] Firestore Rules를 배포하지 않았다.
- [ ] 실제 Firebase 데이터/Auth 사용자/workspace 데이터를 수정하지 않았다.
