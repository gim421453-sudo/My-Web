# CODEX_HANDOFF

## 1. 프로젝트 목적

이 프로젝트는 Firebase 기반 통합 웹/녹음 웹/공통 채팅 시스템을 하나의 인증과 Firestore 데이터 구조로 묶는 관리 시스템이다.

주요 목표:
- Firebase Auth 기반 Google 로그인
- Firestore `users/workspaces/workspaceMembers` 기준 권한 관리
- system_owner, super_manager, manager, teacher, normal, viewer, print_account 역할 분리
- 관리자 신청서 작성, 승인, 거절 흐름
- 통합 웹과 녹음 웹이 같은 Firebase 프로젝트/사용자/워크스페이스/채팅 데이터를 사용
- 사용자와 관리자 간 문의/채팅
- 오류 로그 저장 후 관리자 문의에 자동 첨부
- 녹음 웹의 Google Drive 연결, 녹음 저장, 업로드 실패 로그를 Firestore에 기록
- 추후 Android 앱에서도 같은 Firestore 구조를 사용할 수 있게 컬렉션명을 웹 전용으로 두지 않음

주의:
- 이 문서에는 실제 API 키, 서비스 계정 JSON, 관리자 이메일, 초기화 키를 적지 않는다.
- 로컬 설정 값은 `.env`, `firebase-config.local.js`, `pm-env.js` 등 Git ignore 대상 파일에만 둔다.

---

## 2. 관련 프로젝트 폴더

현재 작업은 두 웹 프로젝트에 걸쳐 있다.

### 통합 웹

경로:

```text
C:\Users\USER\Documents\My Web
```

주요 파일:
- `index.html`
- `app.js`
- `styles.css`
- `firestore.rules`
- `services/firebaseRuntime.js`
- `services/authService.js`
- `services/chatService.js`
- `services/systemAdminService.js`
- `scripts/generate-firebase-config.mjs`
- `scripts/set-system-owner.mjs`
- `scripts/initialize-firebase-schema.mjs`
- `docs/firebase-production-setup.md`

### 녹음 웹

경로:

```text
C:\Users\USER\Documents\Web Record
```

주요 파일:
- `index.html`
- `config.js`
- `app.js`
- `styles.css`
- `firebase/firestore.rules`
- `shared/admin-chat-link.js`
- `.gitignore`
- `firebase-config.local.js` 로컬 전용 파일

### Android 녹음 앱

경로:

```text
C:\Users\USER\Documents\record
```

현재 이번 Firebase 웹 연동 작업에서는 Android 앱 코드는 직접 수정하지 않았다. 다만 Firestore 컬렉션은 Android 앱도 재사용할 수 있도록 공통 이름으로 설계했다.

---

## 3. 현재 작업 상태 요약

2026-07-07 기준 진행 상태:

- 통합 웹에 Firebase config 로더가 이미 존재한다.
- 통합 웹은 `.env`에서 Firebase Web SDK 설정을 읽어 `firebase-config.local.js`, `pm-env.js`, `pm-firebase-config.js`를 생성한다.
- 통합 웹 Firebase Auth persistence를 `LOCAL`로 변경했다.
- 통합 웹 Firebase 세션 복구 로직을 운영용으로 수정했다.
- 통합 웹에 관리자 문의/채팅 시스템을 추가했다.
- 통합 웹 최신 앱 패치 버전은 `v94.0 - 2026-07-07`이다.
- 시스템관리자 모든 회원 목록에서 UID 직접 노출을 제거하고 `상세정보 조회` 버튼으로만 볼 수 있게 수정했다.
- 녹음 웹도 같은 Firebase config를 로컬 파일에서 읽도록 연결했다.
- 녹음 웹 Firebase Auth persistence를 `LOCAL`로 설정했다.
- 녹음 웹에서 `/chat`, `/chat/new`, `/chat/thread/:threadId` 흐름을 사용하도록 유지/보강했다.
- 녹음 웹 오류 로그와 녹음 작업 상태를 Firestore에 저장하도록 보강했다.
- Firestore Rules는 통합 웹과 녹음 웹 양쪽에 공통 컬렉션 기준으로 작성/보강했다.
- system_owner 초기화는 클라이언트 하드코딩이 아니라 Admin SDK 스크립트 방식으로 처리한다.
- 실제 Firebase CLI 배포, 실제 Google 계정 로그인 테스트, 실제 Rules 배포는 아직 수행하지 않았다.

빌드/문법 확인:
- 통합 웹 `app.js` 문법 검사 통과
- 통합 웹 `services/firebaseRuntime.js` 문법 검사 통과
- 통합 웹 `services/authService.js` 문법 검사 통과
- 통합 웹 `services/chatService.js` 문법 검사 통과
- 통합 웹 `scripts/initialize-firebase-schema.mjs` 문법 검사 통과
- 녹음 웹 `app.js` 문법 검사 통과
- 녹음 웹 `config.js` 문법 검사 통과
- 통합 웹 `vite build` 통과
- 통합 웹 `scripts/copy-static-assets.mjs dist` 실행 완료

Vite build 경고:
- 일반 `<script>` 파일들이 `type="module"`이 아니라 번들링되지 않는다는 경고가 나온다.
- 이 프로젝트는 의도적으로 정적 스크립트 파일을 `scripts/copy-static-assets.mjs`로 `dist`에 복사하는 구조라 현재는 예상 가능한 경고다.

---

## 4. 역할 구조

현재 표준 역할:

- `system_owner`: 전체 시스템 관리자
- `super_manager`: 워크스페이스 최고관리자
- `manager`: 워크스페이스 관리자
- `teacher`: 수업/과제/출결/시험 관리
- `normal`: 일반 사용자
- `viewer`: 보기 전용
- `print_account`: 출력 전용

권한 원칙:
- `system_owner`는 전체 워크스페이스, 전체 신청서, 전체 문의/채팅, 전체 로그를 볼 수 있다.
- `super_manager`는 자기 워크스페이스의 관리자/사용자/문의/로그를 관리한다.
- `manager`는 자기 워크스페이스의 일반 사용자 문의 확인과 답변이 가능하다.
- `teacher`는 자기 관련 수업/사용자 문의만 볼 수 있도록 설계한다.
- `normal`, `viewer`, `print_account`는 관리자에게 문의를 생성하고 본인 문의만 볼 수 있다.

현재 코드에서 `workspace_admin`이 녹음 웹의 과거 호환 역할로 일부 남아 있다.
새 표준은 `super_manager`/`manager`이며, 녹음 웹 Rules와 관리자 판정에는 `workspace_admin`도 호환용으로 남겨두었다.

---

## 5. Firebase 설정 방식

### 통합 웹

`.env.example`에 필요한 키 이름이 있다.

필수:

```env
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
VITE_APP_TARGET=main
```

Admin SDK 스크립트용:

```env
FIREBASE_PROJECT_ID=
FIREBASE_SERVICE_ACCOUNT_PATH=
FIREBASE_SERVICE_ACCOUNT_JSON=
```

설정 파일 생성:

```powershell
npm run firebase:config
```

내부적으로 실행되는 파일:

```text
scripts/generate-firebase-config.mjs
```

생성되는 로컬 파일:
- `firebase-config.local.js`
- `pm-env.js`
- `pm-firebase-config.js`

위 파일들은 GitHub에 올리면 안 된다.

### 녹음 웹

녹음 웹은 아래 파일을 먼저 로드한다.

```html
<script src="./firebase-config.local.js"></script>
<script src="./config.js"></script>
```

`config.js`는 다음 전역 값 중 하나를 읽는다.

```js
window.PM_FIREBASE_CONFIG
window.WEB_RECORD_FIREBASE_CONFIG
```

녹음 웹의 `firebase-config.local.js`는 로컬 전용이며 `.gitignore`에 추가했다.

---

## 6. Firestore 표준 컬렉션

현재 표준 컬렉션:

- `users`
- `workspaces`
- `workspaceMembers`
- `adminApplications`
- `chatThreads`
- `chatMessages`
- `logs`
- `driveConnections`
- `recordingJobs`

호환용으로 남아 있는 컬렉션:
- `workspace_members`: 기존 통합 웹 코드 호환용
- `workspaces/{workspaceId}/members/{uid}`: 기존 nested member 호환용
- `workspaceApplications`: 녹음 웹 과거 신청서 호환용
- `messages`: 과거 채팅 메시지명. 새 표준은 `chatMessages`
- `supportThreads`, `systemEventLogs`: 이전 채팅 구현 흔적. 새 표준은 `chatThreads`, `logs`

새 코드에서는 가능한 한 표준 컬렉션을 우선 사용한다.

---

## 7. Firebase Authentication 상태

### 통합 웹

수정 파일:

```text
services/firebaseRuntime.js
app.js
```

변경 내용:
- Firebase Auth persistence를 `NONE`에서 `LOCAL`로 변경했다.
- 새로고침 후 로그인 상태가 유지되도록 V93 패치를 추가했다.
- `restoreFirebaseSessionV34`를 운영용으로 재정의했다.
- 이전 탭 단위 명시 로그인 가드가 자동 signOut하지 않도록 `canUseBrowserAuthSessionV80`를 true 반환으로 덮었다.
- V94에서 시스템관리자 회원 목록의 UID 컬럼을 `상세정보` 버튼으로 바꿨다.
- `상세정보 조회` 버튼을 누르면 UID, role, status, workspaceId, member 동기화 상태를 확인할 수 있다.

주의:
- 오래된 localStorage 기반 auth mirror가 아직 코드에 남아 있다.
- Firebase config가 있는 운영 모드에서는 `firebaseEnsureUserStructure()`가 Firestore `users`, `workspaceMembers`, `workspaces/{workspaceId}/members` 기준으로 사용자 상태를 보강한다.
- 다음 작업자는 localStorage 기반 계정 UI/이메일 비밀번호 개발 모드 흔적을 더 걷어내면 좋다.

### 녹음 웹

수정 파일:

```text
Web Record/app.js
Web Record/config.js
Web Record/index.html
```

변경 내용:
- Firebase Auth persistence를 `LOCAL`로 설정했다.
- 이미 Firebase Auth 로그인 상태가 있으면 `onAuthStateChanged`로 세션을 복구한다.
- `/chat...` 경로로 들어온 경우 로그인 후 `activeView = "chat"`으로 복귀한다.
- `firebase-config.local.js`에서 같은 Firebase 프로젝트 설정을 읽는다.

---

## 8. 첫 system_owner 생성 방식

관리자 이메일을 클라이언트 코드에 하드코딩하지 않는다.

방식:
1. 사용자의 Google 계정으로 Firebase Auth에 먼저 로그인해서 Auth user가 생성되게 한다.
2. 로컬 Admin SDK 스크립트로 해당 계정을 `system_owner`로 지정한다.
3. 이후 `systemConfig/bootstrap.ownerCreated = true`와 `autoOwnerCreationLocked = true`를 기록한다.

스크립트:

```text
scripts/set-system-owner.mjs
```

실행 예시:

```powershell
npm run firebase:set-system-owner -- --email your-google-account@example.com --workspace-id owner-main --workspace-name "Owner Workspace"
```

이 스크립트가 쓰는 문서:
- `users/{uid}`
- `systemOwners/{uid}`
- `workspaces/{workspaceId}`
- `workspaceMembers/{workspaceId_uid}`
- `workspace_members/{workspaceId_uid}`
- `workspaces/{workspaceId}/members/{uid}`
- `systemConfig/bootstrap`

보안:
- 서비스 계정 JSON은 `.env`의 `FIREBASE_SERVICE_ACCOUNT_PATH` 또는 `FIREBASE_SERVICE_ACCOUNT_JSON`으로만 지정한다.
- 서비스 계정 JSON은 GitHub에 올리지 않는다.

---

## 9. Firestore schema/bootstrap 초기화

추가 파일:

```text
scripts/initialize-firebase-schema.mjs
```

package script:

```json
"firebase:init-schema": "node scripts/initialize-firebase-schema.mjs"
```

실행:

```powershell
npm run firebase:init-schema
```

역할:
- 표준 컬렉션에 `_schema` marker 문서를 만든다.
- `systemConfig/bootstrap` 문서를 만든다.
- `logs`에 schema init 로그를 남긴다.

주의:
- 실제 Firestore에는 컬렉션이 문서 없이 존재하지 않으므로 marker 문서로 구조를 눈에 보이게 한다.
- `_schema` 문서는 reserved marker로 취급한다.

---

## 10. 관리자 신청 흐름

요구 흐름:
1. 처음 접속
2. Google 로그인
3. 승인 전에는 일반 기능/사이드바 숨김
4. 워크스페이스 관리자 신청서 작성
5. 신청 상태 `pending`
6. `system_owner`가 승인 또는 거절
7. 승인 시 workspace 생성 또는 연결
8. 승인 후 역할에 맞는 메뉴 표시

통합 웹 관련 파일:
- `app.js`
- `services/systemAdminService.js`
- `firestore.rules`

관련 컬렉션:
- `adminApplications`
- 기존 호환: `workspaceJoinRequests`, `workspaceApplications`

현재 상태:
- 통합 웹에는 기존 관리자 신청 UI와 system owner console이 있다.
- 녹음 웹에는 `workspaceApplications` 기반 신청 흐름이 남아 있고, Rules에는 `adminApplications`도 추가했다.
- 다음 작업자는 녹음 웹 신청 저장 컬렉션을 `adminApplications`로 완전히 통일하면 좋다.

---

## 11. 채팅/문의 시스템

표준 라우팅:

```text
/chat
/chat/new
/chat/thread/:threadId
/chat?source=main
/chat?source=recording
```

표준 컬렉션:
- `chatThreads`
- `chatMessages`
- `logs`

thread 주요 필드:
- `threadId`
- `type`
- `workspaceId`
- `title`
- `status`
- `source`: `main` 또는 `recording`
- `createdByUid`
- `createdByRole`
- `createdByName`
- `participantUids`
- `participantRoles`
- `relatedLogId`
- `relatedLogIds`
- `context`
- `lastMessage`
- `lastMessageText`
- `lastMessageAuthorUid`
- `createdAt`
- `updatedAt`

message 주요 필드:
- `messageId`
- `threadId`
- `workspaceId`
- `senderUid`
- `senderRole`
- `senderName`
- `message`
- `source`
- `createdAt`
- `readBy`
- `relatedLogId`
- `attachments`
- 호환 필드: `authorUid`, `authorRole`, `text`

상태값:
- `new`: 새 문의
- `processing`: 처리 중
- `answered`: 답변 완료
- `closed`: 종료
- `hold`: 보류

통합 웹 작업:
- `services/chatService.js` 추가
- Firestore 컬렉션을 `chatThreads`, `chatMessages`, `logs`로 맞춤
- `source=main` 컨텍스트 저장
- 현재 페이지, role, workspaceId, 최근 오류 logId를 context에 넣음
- 상단 빠른 메뉴/채팅 화면 연결

녹음 웹 작업:
- 상단/사이드바에 관리자 문의/채팅 버튼 유지
- `source=recording` 저장
- 녹음 상태, Drive 상태, Firebase 상태, uid, workspaceId, 최근 logId를 context에 넣음
- 오류 발생 시 `logs` 저장 후 관리자 문의 버튼 표시 흐름 유지
- `chatMessages`에 메시지 저장

---

## 12. 녹음 웹 연동 상태

수정 파일:
- `Web Record/index.html`
- `Web Record/config.js`
- `Web Record/app.js`
- `Web Record/firebase/firestore.rules`
- `Web Record/shared/admin-chat-link.js`
- `Web Record/.gitignore`
- `Web Record/firebase-config.local.js` 로컬 전용

반영 사항:
- 같은 Firebase Web config 사용
- Auth persistence `LOCAL`
- `/chat` 경로 로그인 후 자동 복귀
- `logs` 컬렉션에 오류 저장
- `chatThreads`, `chatMessages` 사용
- `recordingJobs` 컬렉션에 녹음 작업 상태 저장
- `driveConnections` 규칙 유지
- Google Drive 연결 실패, 녹음 저장 실패, 업로드 실패 시 문의 가능

주의:
- `Web Record` 폴더에는 `.git` 디렉터리가 있지만, 현재 이 환경에서 `git status` 실행 시 `not a git repository` 오류가 나왔다.
- 다른 기기에서 이어받을 때 `Web Record/.git` 상태를 확인해야 한다.

---

## 13. Firestore 보안 규칙

통합 웹 Rules:

```text
My Web/firestore.rules
```

녹음 웹 Rules:

```text
Web Record/firebase/firestore.rules
```

핵심 원칙:
- 로그인하지 않은 사용자는 데이터 접근 금지
- 일반 사용자는 본인 `users/{uid}`와 본인 문의만 접근 가능
- 같은 `workspaceId` 소속 사용자만 해당 workspace 데이터 접근 가능
- manager 이상만 workspace 문의 목록 확인 가능
- system_owner만 전체 workspace와 전체 신청서 확인 가능
- 다른 workspace 데이터 접근 차단

추가/보강한 match:
- `logs`
- `chatThreads`
- `chatMessages`
- `recordingJobs`
- `driveConnections`
- `workspaceMembers`
- `systemConfig`
- `adminApplications`

주의:
- Rules 파일을 수정해도 Firebase Console/CLI에 배포하지 않으면 실제 적용되지 않는다.
- 다음 작업자는 Firebase CLI로 Rules 배포를 해야 한다.

---

## 14. GitHub에 올리면 안 되는 항목

통합 웹 `.gitignore` 보강:
- `.env`
- `.env.local`
- `.env.*.local`
- `.env.js`
- `pm-env.js`
- `firebase-config.local.js`
- `pm-firebase-config.local.js`
- `pm-firebase-config.js`
- Firebase Admin SDK JSON
- `serviceAccountKey.json`
- `firebase-adminsdk*.json`
- `firebase-init.local.json`
- `admin-init-key*`
- `dist`
- `dist-admin`
- `node_modules`
- `tmp`
- `backups`
- `*.backup`
- `*.bak`
- `*.local.log`
- `*.tmp`

녹음 웹 `.gitignore` 추가:
- `firebase-config.local.js`
- `.env`
- `.env.local`
- `.env.*.local`
- 서비스 계정 JSON
- 로그/임시/백업 파일
- `dist`
- `node_modules`

중요:
- 현재 로컬에는 실제 Firebase Web config가 들어간 `firebase-config.local.js` 파일이 존재한다.
- 이 파일은 ignore 대상이지만, 커밋 전에 반드시 `git status`로 추적 여부를 확인한다.

---

## 15. 기존 localStorage 기반 데이터 상태

통합 웹:
- 오래된 localStorage 기반 계정/권한 코드가 일부 남아 있다.
- Firebase config가 있는 경우 Auth/Firestore 기준으로 로그인과 권한을 맞추는 흐름이 추가되어 있다.
- 단, 코드 전체에서 과거 `accounts`, `pm-auth-v31`, `pm:auth:v1`, `pm-accounts-v5` 흔적이 남아 있다.
- 다음 작업자는 운영 모드에서 local 계정 생성/샘플 계정 UI가 절대 보이지 않도록 더 정리하는 것이 좋다.

녹음 웹:
- `seedState.users`, `applications`, `classes` 등은 빈 배열 중심으로 정리되어 있다.
- 시간표 provider가 설정되지 않으면 demo 데이터 대신 연결 실패를 던지는 방향으로 되어 있다.
- 사용자 정보는 Firebase `users` 문서를 기준으로 복구한다.

운영 원칙:
- Firebase 로그인 정보가 없으면 기존 localStorage 데이터가 보여서는 안 된다.
- 사용자 권한은 Firestore `users`와 `workspaceMembers` 기준으로 본다.

---

## 16. 실행 방법

통합 웹 개발 서버:

```powershell
cd "C:\Users\USER\Documents\My Web"
npm install
npm run dev
```

통합 웹 빌드:

```powershell
npm run build
node scripts/copy-static-assets.mjs dist
```

Firebase config 생성:

```powershell
npm run firebase:config
```

Firestore schema marker 생성:

```powershell
npm run firebase:init-schema
```

system_owner 지정:

```powershell
npm run firebase:set-system-owner -- --email your-google-account@example.com --workspace-id owner-main --workspace-name "Owner Workspace"
```

녹음 웹 로컬 실행:

```powershell
cd "C:\Users\USER\Documents\Web Record"
node server.js
```

또는 정적 파일 서버 방식으로 실행한다.

---

## 17. 검증 완료한 항목

명령 실행 기준:

```powershell
node --check app.js
node --check services/firebaseRuntime.js
node --check services/authService.js
node --check services/chatService.js
node --check scripts/initialize-firebase-schema.mjs
node --check "C:\Users\USER\Documents\Web Record\app.js"
node --check "C:\Users\USER\Documents\Web Record\config.js"
```

결과:
- 모두 통과

통합 웹 빌드:

```powershell
node node_modules/vite/bin/vite.js build
node scripts/copy-static-assets.mjs dist
```

결과:
- 빌드 통과
- 정적 파일 복사 완료

---

## 18. 아직 실제 환경에서 확인해야 할 테스트

Firebase CLI/Auth/Firestore 권한이 필요해서 현재 환경에서는 실제 계정 테스트를 완료하지 못했다.

다음 기기 또는 실제 배포 환경에서 확인할 것:

1. Firebase Console에서 Google 로그인 provider 활성화
2. Firebase Authorized domains에 실제 도메인, `localhost`, `127.0.0.1` 등록
3. `.env`와 서비스 계정 경로 설정
4. `npm run firebase:config`
5. `npm run firebase:init-schema`
6. 본인 Google 계정으로 첫 로그인
7. `npm run firebase:set-system-owner -- --email ...`
8. system_owner 로그인 확인
9. 다른 Google 계정으로 관리자 신청
10. system_owner가 신청 승인
11. 승인 전 일반 기능/사이드바 숨김 확인
12. 승인 후 역할별 메뉴 표시 확인
13. 일반 사용자 로그인
14. 통합 웹에서 `/chat?source=main` 문의 생성
15. 녹음 웹에서 `/chat?source=recording` 문의 생성
16. 녹음 웹 Drive 연결 실패/업로드 실패 로그가 `logs`에 저장되는지 확인
17. 문의 생성 시 최근 `logId`가 자동 첨부되는지 확인
18. 다른 workspace 데이터 접근이 Firestore Rules로 차단되는지 확인
19. 로그아웃 후 재로그인
20. 새로고침 후 로그인 상태 유지

---

## 19. 현재 변경 파일 목록

통합 웹에서 최근 수정/추가된 주요 파일:
- `.gitignore`
- `app.js`
- `firestore.rules`
- `index.html`
- `package.json`
- `styles.css`
- `services/firebaseRuntime.js`
- `services/authService.js`
- `services/chatService.js`
- `scripts/set-system-owner.mjs`
- `scripts/initialize-firebase-schema.mjs`
- `docs/firebase-production-setup.md`
- `CODEX_HANDOFF.md`

녹음 웹에서 최근 수정/추가된 주요 파일:
- `.gitignore`
- `index.html`
- `config.js`
- `app.js`
- `firebase/firestore.rules`
- `shared/admin-chat-link.js`
- `firebase-config.local.js` 로컬 전용
- `CODEX_HANDOFF.md` 이어받기용 문서

주의:
- `firebase-config.local.js`는 로컬 전용 파일이다.
- 커밋 대상에 포함하지 않는다.

---

## 20. 다음 작업 추천 순서

1. 실제 Firebase 프로젝트에서 `.env`와 Admin SDK credential 준비
2. `npm run firebase:config`
3. `npm run firebase:init-schema`
4. 통합 웹 개발 서버 실행 후 Google 로그인
5. `npm run firebase:set-system-owner -- --email 본인계정`
6. Firestore Rules 배포
7. system_owner 로그인과 콘솔 확인
8. 관리자 신청/승인 플로우 실제 테스트
9. 통합 웹과 녹음 웹의 `/chat` 라우팅 테스트
10. 녹음 웹 오류 로그와 문의 자동 첨부 테스트
11. localStorage 기반 과거 계정 UI/개발 모드 잔재 제거
12. `workspaceApplications`를 `adminApplications`로 완전히 통합
13. `workspace_members` 호환 코드를 점진적으로 `workspaceMembers`로 교체
14. Android 앱에서 같은 `chatThreads/chatMessages/logs/recordingJobs` 구조를 읽도록 연동

---

## 21. 알려진 주의점

- 일부 기존 파일에는 오래된 패치가 누적되어 있고, 문자열 인코딩이 깨진 한국어가 남아 있다.
- `app.js`는 매우 큰 단일 파일이며, 기존 구조는 끝에 버전 패치를 계속 덧붙이는 방식이다.
- 큰 리팩터링보다 마지막 패치로 기능을 덮는 방식이 현재 코드베이스와 가장 잘 맞는다.
- Vite build 경고는 현재 정적 스크립트 복사 구조 때문에 발생한다.
- Firestore Rules는 실제 배포 전까지 로컬 파일 변경일 뿐이다.
- Web Record 폴더는 `.git` 폴더가 보이지만 현재 환경에서 `git status`는 repository가 아니라고 나온다. 다른 기기에서 Git 상태를 다시 확인해야 한다.
