# app-next 읽기 전용 테스트 체크리스트

기준 origin은 항상 `http://127.0.0.1:5173`입니다. `localhost` 결과는 세션 origin이 달라질 수 있으므로 사용하지 않습니다.

## 실행

```powershell
npm.cmd run dev
```

확인 주소:

```text
http://127.0.0.1:5173/app-next.html?appNext=on
```

## Feature Flag

- [ ] `http://127.0.0.1:5173/app-next.html` → 비활성 안내
- [ ] `http://127.0.0.1:5173/app-next.html?appNext=off` → 비활성 안내
- [ ] 개발 환경 `?appNext=on` → App Next 화면 표시
- [ ] production build에서는 query override가 기본적으로 활성화되지 않음

## 상태 표시

- [ ] loading 또는 initializing → 대기 화면
- [ ] signed_out → 로그인 필요 안내
- [ ] active → 계정 상태 표시
- [ ] active + currentWorkspaceId null → 정상 계정 상태와 workspace 없음 안내
- [ ] pending → 승인 대기 안내
- [ ] rejected → 승인 거절 안내
- [ ] disabled → 비활성 안내
- [ ] error → 안전한 오류 안내, 자동 로그아웃 없음
- [ ] system_owner → `globalRole = system_owner`, workspace role로 변환하지 않음

## 이메일 인증

- [ ] emailVerified true → `인증 완료`
- [ ] emailVerified false → `인증 필요`
- [ ] 버튼 클릭 전 인증 메일 발송 없음
- [ ] 인증 메일 발송 버튼 클릭 → 메일 발송 시도
- [ ] 발송 중 중복 클릭 방지
- [ ] 인증 상태 다시 확인 버튼 → `firebaseUser.reload()` 후 `reloadSession()`
- [ ] 오류 메시지에 Firebase 내부 용어, credential, provider 노출 없음

## 보안 및 분리

- [ ] 전체 UID 표시 없음
- [ ] 전체 workspaceId 표시 없음
- [ ] 이메일 마스킹 표시
- [ ] Firestore write 요청 없음
- [ ] `signOut(auth)` 호출 없음
- [ ] legacy `src/context/AuthContext.tsx` mount 없음
- [ ] 운영 `index.html` 자동 이동 없음
- [ ] 운영 `app.js?v=111` 동작 변화 없음

## 개발 진단

- [ ] entry: `app-next`
- [ ] provider: `new`
- [ ] legacy AuthContext mounted: `false`
- [ ] Firestore write: `none`
- [ ] automatic signOut: `none`
- [ ] operational static app: `unchanged`

## 자동 검증

```powershell
npm.cmd run typecheck
npm.cmd test
npm.cmd run build
```

## 통과 기준

- [ ] 자동 테스트 통과
- [ ] build 통과
- [ ] app-next 화면에서 자동 로그아웃 없음
- [ ] app-next 화면에서 Firestore write 없음
- [ ] 운영 정적 앱 파일 미변경
