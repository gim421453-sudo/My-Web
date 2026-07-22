# app-next 로그인 및 Firestore quota 사고 조사

## 한 줄 요약

브라우저 콘솔의 `commit user workspace bootstrap` 로그는 app-next React entry가 직접 만든 로그가 아니라, 운영 정적 앱의 compat `services/authService.js` bootstrap 경로에서 출력되는 로그다. app-next 신규 AuthProvider 쪽은 read-only 세션 로더만 사용하도록 안전장치를 추가했다.

## 관찰 증상

- 확인 주소: `http://127.0.0.1:5173/app-next.html?appNext=on&appNextLogin=on`
- 로그인 후 app-next 계정 상태로 안정적으로 진입하지 못함
- 콘솔에 Firestore `resource-exhausted`와 backoff 메시지 표시
- 콘솔에 `commit user workspace bootstrap` 표시

## bootstrap 로그 위치

파일:

```text
services/authService.js
```

함수:

```text
firebaseEnsureUserStructure(...)
```

로그 단계:

```text
runFirestoreStep("commit user workspace bootstrap", ...)
```

이 함수는 다음 쓰기를 batch로 수행할 수 있다.

```text
users/{uid}
workspaces/{workspaceId}/members/{uid}
workspace_members/{workspaceId}_{uid}
workspaceMembers/{workspaceId}_{uid}
```

쓰기 필드는 사용자 기본 정보, role/currentRole/workspaceRole, workspaceId/currentWorkspaceId, status, updatedAt, membership status/role 등이다.

## app-next 호출 경로

app-next HTML:

```text
app-next.html -> /src/app-next/main.tsx
```

app-next provider:

```text
AuthProvider -> LegacyAuthAdapterProvider -> AppNext
```

app-next 로그인 제출:

```text
AppNextLogin.handleSubmit
-> setPersistence
-> AuthProvider.signInWithEmail
-> signInWithEmailAndPassword
-> Firebase Auth onAuthStateChanged
-> loadSessionReadOnlySafely
-> buildAppSession
```

app-next 세션 로더의 Firestore 동작:

```text
users/{uid} read
systemOwners/{uid} read
workspaces owner query for system_owner fallback
workspaces/{workspaceId} read
workspaces/{workspaceId}/members/{uid} read
legacy membership diagnostics read
```

app-next 세션 로더의 Firestore write:

```text
0회
```

## 왜 app-next 로그인 중 bootstrap 로그가 보일 수 있는가

`app-next.html`은 `services/authService.js`를 로드하지 않는다. 따라서 같은 탭의 app-next 코드가 `commit user workspace bootstrap`을 직접 출력하지 않는다.

가능한 경로는 다음이다.

1. 같은 origin의 운영 정적 앱 탭이 열려 있음
2. app-next 로그인으로 Firebase Auth 세션이 바뀜
3. 운영 정적 앱의 compat auth listener가 같은 세션 변화를 감지
4. 운영 앱의 `firebaseEnsureUserStructure()`가 bootstrap write를 실행

따라서 quota 재검증은 운영 정적 앱 탭을 모두 닫은 상태에서 먼저 진행해야 한다.

## 추가 안전장치

- `loadSessionReadOnlySafely()` 추가
- 동일 uid에 대한 in-flight 세션 로드 재사용
- StrictMode remount 시 cleanup에서 세션 로드 무효화하지 않음
- 실제 uid 변경 또는 로그아웃에서만 세션 로드 무효화
- `resource-exhausted`를 `SESSION_READ_QUOTA_EXCEEDED`로 분류
- quota 발생 후 같은 uid 자동 재시도 차단
- app-next 개발 진단에 read/write/bootstrap 카운터 표시
- app-next Error Boundary 추가

## 남은 확인

Firestore quota가 이미 소진된 상태에서는 원격 성공 여부를 확인할 수 없다. quota 초기화 후 `docs/app-next-login-live-test-checklist.md`의 순서대로 브라우저 재검증이 필요하다.
