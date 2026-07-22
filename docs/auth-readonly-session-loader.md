# 신규 AuthProvider read-only 세션 로더

## 목적

app-next와 신규 인증 전환 화면은 로그인 직후 사용자/워크스페이스/멤버십 문서를 읽기만 해야 한다. 문서 보정, membership 생성, role/status 보정, device/notification 기록은 수행하지 않는다.

## 기준 함수

```text
src/auth/sessionService.ts
loadSessionReadOnlySafely(firebaseUser, repository)
```

기존 호환 함수:

```text
loadSessionSafely(...)
```

현재는 read-only loader를 호출하는 alias로 유지한다.

## 허용 작업

- Firebase Auth user 읽기
- `users/{uid}` 읽기
- `systemOwners/{uid}` 읽기
- workspace document 읽기
- nested membership 읽기
- legacy membership diagnostics 읽기
- 읽은 값으로 `AppSession` 계산
- warning 기록

## 금지 작업

- `setDoc`
- `updateDoc`
- `addDoc`
- `writeBatch`
- `runTransaction`
- users 문서 생성/수정
- workspace membership 생성/수정
- legacy membership migration
- currentWorkspaceId 보정 저장
- role/status 보정 저장
- user_devices 생성/갱신
- notifications 생성/갱신
- 자동 signOut

## 중복 로드 방지

동일 uid의 세션 로드가 이미 진행 중이면 새 Firestore read를 시작하지 않고 기존 in-flight promise를 재사용한다.

```text
inFlightSessionLoadsByUid
```

로그아웃 또는 실제 uid 변경 시에만 in-flight 캐시를 무효화한다.

## Quota 처리

Firestore `resource-exhausted`는 다음 코드로 변환한다.

```text
SESSION_READ_QUOTA_EXCEEDED
```

동일 uid에 대해서는 1시간 동안 자동 세션 재시도를 차단한다.

화면 안내:

```text
현재 데이터 조회 한도가 초과되어 계정 정보를 불러올 수 없습니다.
잠시 후 다시 시도해 주세요.
```

자동 로그아웃은 하지 않는다.

## 진단

개발 환경에서는 다음 값을 표시할 수 있다.

```text
provider mount count
listener count
session load count
session read count
session write count
bootstrap attempt count
bootstrap blocked count
resource exhausted
```

민감정보인 email, uid, token, 전체 workspaceId는 표시하지 않는다.
