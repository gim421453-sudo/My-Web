# Auth Shadow Live Test Guide

## 목적

개발 전용 Shadow 페이지에서 기존 운영 앱 로그인 세션과 신규 `src/auth` AppSession 계산 결과를 같은 origin 안에서 비교합니다.

이 검증은 읽기 전용입니다. 결과는 화면, 메모리, 개발 콘솔에서만 확인하고 Firestore/Auth/Rules를 수정하지 않습니다.

## 개발 서버 시작

```powershell
npm.cmd run dev
```

브라우저 검증은 아래 기준 origin으로만 진행하세요.

예:

```text
기존 앱: http://127.0.0.1:5173/
Shadow 페이지: http://127.0.0.1:5173/shadow-auth-test.html
```

`localhost`는 사용하지 마세요. 브라우저에서 `localhost`와 `127.0.0.1`은 서로 다른 origin으로 처리되어 Firebase Auth 세션, localStorage, sessionStorage가 달라질 수 있습니다.

## 기존 앱 로그인

1. 기존 앱 주소로 이동합니다.
2. 실제 확인할 계정으로 로그인합니다.
3. 로그인 후 대시보드가 표시되는지 확인합니다.
4. 같은 브라우저 탭 또는 새 탭에서 `/shadow-auth-test.html`을 엽니다.

계정 비밀번호, 초대 코드, Firebase token은 기록하지 않습니다.

## Shadow 페이지 열기

```text
http://127.0.0.1:5173/shadow-auth-test.html
```

페이지 상단의 origin 표시가 기존 앱과 같은지 확인합니다.

## 화면에서 확인할 항목

- Firebase Auth 상태: authenticated, masked uid, masked email, emailVerified
- Legacy session snapshot: isAuthenticated, masked uid, status, role 계열, masked workspaceId
- 신규 AppSession: phase, isAuthenticated, masked uid, status, globalRole, isSystemOwner, masked workspaceId, workspaceRole, warning code
- 비교 결과: MATCH/WARNING/CRITICAL, mismatch code, severity, 설명

## 버튼 사용

- `신규 세션 다시 계산`: 기존 legacy snapshot을 유지하고 새 AppSession만 다시 계산합니다.
- `Legacy snapshot 다시 읽기`: 기존 저장소와 window 후보에서 legacy snapshot만 다시 읽습니다.
- `비교 다시 실행`: legacy snapshot을 다시 읽고 새 AppSession 비교까지 다시 실행합니다.
- `콘솔 출력 지우기`: 개발자도구 콘솔을 비웁니다.
- `안전한 요약 복사`: 개인정보 없는 결과 코드 요약만 클립보드에 복사합니다.

복사 요약에는 UID, 이메일, workspaceId, 문서 원문, token, 초대 코드가 들어가지 않아야 합니다.

## 오너 계정 기대 결과

- legacy isAuthenticated == true
- new isAuthenticated == true
- new isSystemOwner == true
- new globalRole == system_owner
- new status == active
- 로그아웃 없음
- 리다이렉트 없음
- Firestore write 없음

허용 가능한 warning:

- GLOBAL_ROLE_MISMATCH
- LEGACY_ROLE_PRESENT
- INVALID_LEGACY_WORKSPACE_ROLE
- WORKSPACE_NOT_FOUND
- MULTIPLE_WORKSPACE_ID_FIELDS
- LEGACY_INVITE_FIELDS_PRESENT

유지 대상 owner workspace의 nested membership을 사용하는 정책이면 `new currentWorkspaceRole == super_manager`가 기대 결과입니다.

## 일반 사용자 기대 결과

`status == active`, `currentWorkspaceId == null` 사용자는 다음처럼 표시되어야 합니다.

- new isAuthenticated == true
- new status == active
- new currentWorkspaceId == null
- new currentWorkspaceRole == null

워크스페이스가 없다는 이유로 로그아웃, 리다이렉트, `ACCOUNT_DISABLED`, `USER_DOCUMENT_MISSING`이 발생하면 안 됩니다.

## 계정 유형별 체크

1. 실제 system owner 계정
2. currentWorkspaceId가 null인 active 일반 사용자
3. disabled 값이 문자열 false인 사용자
4. 유효 nested membership이 있는 사용자
5. 워크스페이스가 없는 사용자
6. viewer 또는 print_account 계정이 존재한다면 해당 계정

## Network 확인

브라우저 개발자도구 Network 탭에서 다음을 확인합니다.

- Firebase Auth 세션 확인 요청
- Firestore `getDoc/getDocs` 계열 읽기 요청
- 예상치 못한 permission denied 응답
- 중복 세션 읽기 횟수

다음 요청이 보이면 실패로 기록하고 테스트를 중단합니다.

- Commit
- Write
- BatchWrite
- 문서 create/update/delete

## Critical 발생 시 중단 절차

1. 기존 앱에서 로그아웃하지 말고 Shadow 페이지 관찰을 중단합니다.
2. 안전한 요약 복사 결과만 기록합니다.
3. Network에서 write 요청이 있었는지 확인합니다.
4. Console에 token, 전체 email, 전체 uid가 노출되지 않았는지 확인합니다.
5. `docs/auth-shadow-live-result-template.md` 양식에 민감정보 없이 기록합니다.

## 성공 기준

- 기존 앱 로그인/UI가 그대로 유지됩니다.
- Shadow 페이지에서만 comparison이 표시됩니다.
- critical mismatch가 없습니다.
- warning은 허용 목록 안에 있습니다.
- Network에 write 요청이 없습니다.
- 안전 요약에 개인정보가 없습니다.
