# Owner Admin Diagnostics Guide

## 목적

오너 계정 Shadow 검증은 통과로 봅니다. 다음 단계에서는 기존 `app.js` 관리자 화면에서 발생하는 버그를 안전하게 수집하기 위해 개발 전용 진단 페이지를 사용합니다.

이 페이지는 기존 AuthContext, Guard, `app.js`, `index.html`, 루트 `services`, Firestore Rules를 교체하거나 수정하지 않습니다.

## 진단 페이지

개발 서버에서 아래 기준 origin으로 엽니다.

```text
기존 앱: http://127.0.0.1:5173/
진단 페이지: http://127.0.0.1:5173/owner-admin-diagnostics.html
```

`localhost`는 사용하지 마세요. 브라우저에서 `localhost`와 `127.0.0.1`은 서로 다른 origin으로 처리되어 Firebase Auth 세션, localStorage, sessionStorage가 달라질 수 있습니다.

## 사용 순서

1. 기존 앱에서 오너 계정으로 로그인합니다.
2. 관리자 화면 또는 문제가 있는 탭에서 버그를 재현합니다.
3. 새 탭에서 `/owner-admin-diagnostics.html`을 엽니다.
4. `세션 컨텍스트 다시 읽기`를 누릅니다.
5. 발생 화면/탭, 클릭 버튼, 증상, 콘솔 오류, permission-denied 여부, 재현 순서, 새로고침 후 유지 여부를 입력합니다.
6. `안전한 진단 요약 복사`를 누릅니다.
7. 복사된 JSON에 전체 이메일, UID, workspaceId, token, 초대 코드가 없는지 확인합니다.

## 수집할 항목

- 발생 화면/탭
- 클릭한 버튼
- 화면 증상
- 콘솔 오류
- Firestore permission-denied 여부
- 사용된 workspaceId의 마스킹 값
- 기존 role/currentRole/workspaceRole
- 신규 AppSession 역할
- 재현 순서
- 새로고침 후 유지 여부

## Network 확인

개발자도구 Network에서 다음을 확인합니다.

- Firestore permission-denied 응답 여부
- 예상치 못한 `Commit`, `Write`, `BatchWrite` 요청 여부
- 문서 create/update/delete 요청 여부

진단 페이지에서 write 요청이 보이면 실패로 기록하고 작업을 중단합니다.

## 기록 금지

다음 값은 문서나 채팅에 붙여넣지 않습니다.

- 전체 UID
- 전체 이메일
- 전체 workspaceId
- Firebase token
- 초대 코드
- 전화번호
- 서비스 계정 정보
- Firestore 문서 전체 원문

## 판단 기준

오너 계정은 아래 상태를 정상으로 봅니다.

- 전체 결과: WARNING
- `hasCriticalMismatch: false`
- `authPhase: authenticated`
- `isSystemOwner: true`
- `status: active`
- 신규 `workspaceRole: super_manager`
- 기존 로그인 유지
- 자동 로그아웃 없음
- Network write 없음

`WORKSPACE_ID_MISMATCH`, `WORKSPACE_ROLE_MISMATCH`, `LEGACY_ROLE_PRESENT`, `GLOBAL_ROLE_MISMATCH`, `WORKSPACE_NOT_FOUND`는 기존 레거시 데이터와 신규 정규화 구조 차이로 예상 가능한 warning입니다.
