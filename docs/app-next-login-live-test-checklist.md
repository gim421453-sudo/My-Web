# app-next 로그인 제한적 실연결 테스트 체크리스트

## 브라우저 주소

```text
http://127.0.0.1:5173/app-next.html?appNext=on&appNextLogin=on
http://127.0.0.1:5173/app-next.html?appNext=on&appNextLogin=off
```

`localhost`가 아니라 `127.0.0.1` 기준으로 확인한다.

## 기능 플래그

- [ ] `appNextLogin=off`에서 로그인 폼이 보이지 않는다.
- [ ] off 상태 문구: “로그인이 필요합니다. 현재 시험 로그인 화면은 비활성화되어 있습니다.”
- [ ] `appNextLogin=on`에서 signed_out이면 로그인 폼이 보인다.
- [ ] production에서는 query override가 적용되지 않는다.

## 로그인 폼

- [ ] Google로 로그인 버튼이 우선 보인다.
- [ ] 로그인 유지 체크박스가 보인다.
- [ ] 이메일/비밀번호 고급 옵션을 열면 이메일 입력칸이 보인다.
- [ ] 이메일/비밀번호 고급 옵션을 열면 비밀번호 입력칸이 보인다.
- [ ] 제출 중 중복 클릭이 막힌다.
- [ ] Google 팝업 취소 시 로그인 화면을 유지한다.
- [ ] Google 팝업 차단 시 사용자용 안내가 보인다.
- [ ] unauthorized-domain 오류 시 사용자용 안내가 보인다.
- [ ] 잘못된 계정 오류가 사용자용 문구로 표시된다.
- [ ] 오류에 Firebase, token, UID, stack trace가 보이지 않는다.

## Persistence

- [ ] 로그인 유지 미체크 시 session persistence로 로그인한다.
- [ ] 로그인 유지 체크 시 local persistence로 로그인한다.

## 성공 흐름

- [ ] 로그인 성공 후 `/` 또는 운영 정적 앱으로 강제 이동하지 않는다.
- [ ] `onAuthStateChanged` 이후 app-next 계정 상태 화면으로 전환된다.
- [ ] 콘솔에 `commit user workspace bootstrap` 로그가 새로 발생하지 않는다.
- [ ] 개발 진단에서 `session write count = 0`이다.
- [ ] 개발 진단에서 `bootstrap attempt count = 0`이다.
- [ ] active 계정이 정상 표시된다.
- [ ] active + workspace null 상태가 로그아웃 없이 표시된다.
- [ ] system_owner가 전역 역할로 표시된다.

## 계정 상태

- [ ] pending은 승인 대기 안내를 표시하고 자동 로그아웃하지 않는다.
- [ ] rejected는 거절 안내를 표시하고 자동 로그아웃하지 않는다.
- [ ] disabled는 비활성 안내를 표시하고 자동 로그아웃하지 않는다.
- [ ] error 상태에서도 자동 로그아웃하지 않는다.
- [ ] quota 초과 상태에서는 “데이터 조회 한도 초과” 안내가 보이고 자동 재시도하지 않는다.

## 금지 동작 확인

- [ ] Firestore write 요청이 발생하지 않는다.
- [ ] `signOut(auth)`가 호출되지 않는다.
- [ ] logout 버튼이 추가되지 않았다.
- [ ] 운영 `index.html + app.js?v=111` 흐름이 바뀌지 않았다.
- [ ] `src/context/AuthContext.tsx`가 mount되지 않았다.

## Quota 사고 재검증 순서

1. 운영 정적 앱 탭을 모두 닫는다.
2. [http://127.0.0.1:5173/app-next.html?appNext=on&appNextLogin=on](http://127.0.0.1:5173/app-next.html?appNext=on&appNextLogin=on)을 연다.
3. Google 계정으로 한 번만 로그인한다.
4. 콘솔과 개발 진단에서 다음을 확인한다.

```text
commit user workspace bootstrap 로그 0회
resource-exhausted 신규 발생 없음
session load count 1회 수준
session write count 0회
bootstrap attempt count 0회
```

5. 새로고침 후 재로그인 반복이 없는지 확인한다.
6. 그다음에만 운영 앱 탭을 열어 세션 공유 영향을 별도로 확인한다.

## 자동 검증 명령

```powershell
npm.cmd run typecheck
npm.cmd test
npm.cmd run build
```
