# AuthProvider Preview Test Checklist

작성일: 2026-07-21

## 자동 테스트

다음 명령을 실행한다.

```powershell
npm.cmd run typecheck
npm.cmd test
npm.cmd run build
```

`npm.cmd test`는 다음 항목을 확인한다.

- 기능 플래그 기본값 false
- query switch가 env보다 우선
- production 차단
- 상태별 문구
- `currentWorkspaceId === null` 정상 authenticated 표시
- system owner 권한 미리보기
- warning이 로그인 실패가 아님
- viewer 쓰기 권한 거부
- print_account 일반 쓰기 거부
- manager 역할 관리 제한
- reload 실패 시 Firebase signOut 미호출
- 중복 reload 클릭 방지
- Firestore write API 미사용
- storage 삭제 미사용
- 신규 Provider context를 실제 상태 공급자로 사용

## 브라우저 확인

개발 서버:

```powershell
npm.cmd run dev
```

브라우저 주소:

```text
http://127.0.0.1:5173/auth-provider-preview.html?preview=on
```

## 화면 확인 항목

- Auth phase가 표시된다.
- 로그인 상태라면 `authenticated`가 표시된다.
- masked uid와 masked email만 표시된다.
- `status`가 표시된다.
- `globalRole`이 표시된다.
- system owner 계정에서 `isSystemOwner=true`가 표시된다.
- system owner 계정에서 `currentWorkspaceRole=super_manager`가 표시된다.
- warning codes가 표시된다.
- 권한 미리보기가 `허용/거부`로 표시된다.
- 역할 관리 미리보기가 `허용/거부`로 표시된다.
- `세션 다시 불러오기` 버튼이 동작한다.
- reload 중 버튼이 비활성화된다.
- reload 실패 시 자동 로그아웃되지 않는다.
- 콘솔에 Firestore write 요청이 없어야 한다.
- Console에 빨간 오류가 없어야 한다.

## 상태별 수동 확인

### signed_out

운영 앱에서 로그아웃한 뒤 preview 화면을 열면:

```text
로그인이 필요합니다
```

### authenticated

운영 앱에서 로그인한 뒤 preview 화면을 열면:

```text
정상 세션 정보 표시
```

### currentWorkspaceId null

워크스페이스가 없는 active 계정이면:

```text
연결된 현재 워크스페이스가 없습니다.
로그인은 정상적으로 유지되고 있습니다.
```

### account_action_required

pending/rejected/disabled 계정이면:

```text
계정 상태 확인 필요
```

### error

네트워크 또는 permission 오류가 발생하면:

```text
오류 표시
```

이 상태에서도 자동 로그아웃되면 안 된다.

## 운영 앱 영향 확인

- `index.html` 운영 앱 접속 경로는 그대로 유지된다.
- `app.js` 운영 로그인 흐름은 변경하지 않았다.
- 루트 `services/*`는 변경하지 않았다.
- Firestore Rules는 변경하지 않았다.
- 실제 Firestore 데이터와 Auth 사용자는 수정하지 않았다.

## 다음 단계 전 조건

- preview 화면에서 신규 AuthProvider 세션이 안정적으로 표시된다.
- system owner warning-only 결과가 로그인 실패로 처리되지 않는다.
- reloadSession 실패 시 자동 로그아웃이 없다.
- 권한 미리보기 결과가 expectations와 맞는다.
- 운영 앱 로그인/로그아웃 동작이 그대로 유지된다.
