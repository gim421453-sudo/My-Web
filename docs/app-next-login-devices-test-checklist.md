# app-next 로그인 기기 조회 테스트 체크리스트

## 접속

기준 주소는 `127.0.0.1`만 사용한다.

```text
http://127.0.0.1:5173/app-next.html?appNext=on
```

## 기본 화면

- [ ] `appNext=on`에서 app-next 화면이 열린다.
- [ ] 첫 탭은 `계정 상태`다.
- [ ] `로그인 기기` 탭을 클릭해도 URL 라우팅이 바뀌지 않는다.
- [ ] 기존 운영 앱 `index.html + app.js?v=111`로 자동 이동하지 않는다.
- [ ] legacy `src/context/AuthContext.tsx` 관련 자동 로그아웃이 발생하지 않는다.

## 인증 상태

- [ ] 로그인 상태에서 본인 기기 목록 조회를 시도한다.
- [ ] 로그아웃 상태에서는 로그인 필요 안내만 표시한다.
- [ ] `active + currentWorkspaceId null` 상태에서도 본인 기기 조회가 차단되지 않는다.
- [ ] `system_owner`는 전역 역할로 표시되고 정상 조회된다.
- [ ] `pending/rejected/disabled` 상태에서는 계정 상태 안내가 표시되고 기기 조회를 실행하지 않는다.
- [ ] 오류 상태에서도 자동 로그아웃되지 않는다.

## 데이터 표시

- [ ] 기기 데이터가 없으면 “등록된 로그인 기기 정보가 없습니다.”가 표시된다.
- [ ] 기기 1개가 있으면 카드 1개가 표시된다.
- [ ] 기기 여러 개가 있으면 최근 활동 시각 기준으로 정렬된다.
- [ ] 현재 기기 여부가 표시된다.
- [ ] 브라우저와 운영체제가 요약 표시된다.
- [ ] 최근 접속 시각이 사람이 읽을 수 있는 형식으로 표시된다.
- [ ] 전체 UID가 표시되지 않는다.
- [ ] 전체 workspaceId가 표시되지 않는다.
- [ ] 전체 userAgent 원문이 표시되지 않는다.
- [ ] 전체 IP가 표시되지 않는다.
- [ ] deviceId/sessionId는 끝 4자리 정도만 표시된다.
- [ ] push token, access token, refresh token은 표시되지 않는다.

## 읽기량과 네트워크

- [ ] 로그인 기기 탭 진입 시 `user_devices` 조회가 1회만 실행된다.
- [ ] 탭 전환 반복으로 Firestore listener가 누적되지 않는다.
- [ ] `onSnapshot` 기반 실시간 listener가 생성되지 않는다.
- [ ] Firestore write 요청이 발생하지 않는다.
- [ ] 기기 로그아웃 또는 세션 삭제 요청이 발생하지 않는다.
- [ ] permission-denied가 발생하면 권한 오류 안내가 표시되고 우회하지 않는다.

## 개발 진단

- [ ] 개발 진단에 `entry: app-next`가 표시된다.
- [ ] 개발 진단에 `screen: login-devices`가 표시된다.
- [ ] 개발 진단에 `provider: new`가 표시된다.
- [ ] 개발 진단에 `legacy AuthContext mounted: false`가 표시된다.
- [ ] 개발 진단에 `write API imported: false`가 표시된다.
- [ ] 개발 진단에 `automatic signOut: none`이 표시된다.

## 회귀 확인

- [ ] `http://127.0.0.1:5173/` 운영 정적 앱이 기존처럼 열린다.
- [ ] 운영 로그인 흐름이 변경되지 않았다.
- [ ] 시간표 V111 화면이 변경되지 않았다.
- [ ] Firestore Rules 또는 실제 데이터가 변경되지 않았다.

