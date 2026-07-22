# 첫 React 화면 신규 AuthProvider 테스트 체크리스트

## 접속 URL

기존 방식:

```text
http://127.0.0.1:5173/shadow-auth-test.html?newAuthScreen=off
```

신규 Provider 방식:

```text
http://127.0.0.1:5173/shadow-auth-test.html?newAuthScreen=on
```

## 자동 테스트

- [ ] `npm.cmd run typecheck`
- [ ] `npm.cmd test`
- [ ] `npm.cmd run build`

## 브라우저 확인

- [ ] `?newAuthScreen=off`에서 기존 `ShadowAuthTestApp` 화면이 표시된다.
- [ ] `?newAuthScreen=on`에서 신규 Provider 제한 적용 화면이 표시된다.
- [ ] 로그인된 오너 계정에서 `isSystemOwner = true`가 표시된다.
- [ ] `globalRole = system_owner`가 표시된다.
- [ ] `currentWorkspaceRole`에 workspace role만 표시되고 `system_owner`가 workspace role로 표시되지 않는다.
- [ ] `workspace.read` Guard가 허용/거부 상태를 표시한다.
- [ ] `currentWorkspaceId`가 없으면 `현재 선택된 워크스페이스가 없습니다.`가 표시되고 로그아웃되지 않는다.
- [ ] `세션 다시 불러오기` 버튼이 동작한다.
- [ ] reload 실패 상황에서도 자동 로그아웃되지 않는다.
- [ ] pending/rejected/disabled 계정은 계정 상태 안내만 표시하고 보호된 데이터 접근을 하지 않는다.
- [ ] signed out 상태는 로그인 필요 안내만 표시하고 운영 로그인 화면으로 자동 이동하지 않는다.
- [ ] 콘솔에 Firestore write 요청 오류가 없다.
- [ ] Network에서 Firestore Commit/Write/BatchWrite 요청이 없다.
- [ ] `?newAuthScreen=off`로 즉시 기존 방식으로 돌아갈 수 있다.

## 회귀 확인

- [ ] 운영 `index.html` 로그인 흐름이 바뀌지 않았다.
- [ ] 운영 `app.js` 화면 진입이 바뀌지 않았다.
- [ ] 루트 `services/*` 호출 흐름이 바뀌지 않았다.
- [ ] Firestore Rules를 배포하지 않았다.
- [ ] Firestore/Auth 실제 데이터를 수정하지 않았다.
