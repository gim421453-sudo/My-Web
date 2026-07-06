# CODEX_HANDOFF.md

## 현재 작업
- 개인용 통합 관리 웹앱을 Firebase Auth + Firestore 기반으로 전환한 상태입니다.
- GitHub 저장소와 연결됨: `https://github.com/gim421453-sudo/My-Web.git`
- 현재 브랜치: `main`
- 현재 앱 주요 진입점은 기존 정적 구조입니다.
  - `index.html`
  - `app.js`
  - `services/*.js`
  - `shared/*.js`
- 최신 앱 패치 버전: `app.js?v=91`
- 학교/나이스/홈페이지 연동 보조 서비스: `services/schoolIntegrationService.js?v=5`

## 현재 Git 상태
- 2026-07-07 확인 기준, 기존 작업트리는 원격과 동기화되어 있었습니다.
- `CODEX_HANDOFF.md` 파일은 새로 작성된 인수인계 파일이므로 커밋/푸시가 필요합니다.
- 이 PC에서는 `git` 명령이 PATH에 바로 잡히지 않을 수 있습니다.
  - 이 경우 아래처럼 실행합니다.
  - `& 'C:\Program Files\Git\cmd\git.exe' status --short --branch`

## 최근 변경
- Firebase Authentication 연결
  - Email/Password 로그인
  - Google 로그인
  - 비활성 계정 차단
  - 사용자 역할 기반 메뉴 표시
- Firestore 구조 준비 및 일부 연동
  - `users`
  - `workspaces`
  - `workspaces/{workspaceId}/members`
  - workspaceId 기준 데이터 분리
- 초대코드 기반 워크스페이스 연결 기능 추가
  - 초대코드 등록 시 `users/{uid}`와 `workspaces/{workspaceId}/members/{uid}`를 함께 갱신
  - 관리자 사용자 목록은 workspace members 기준으로 보는 방향으로 정리
- 시스템 오너/관리자 전용 기능 추가
  - 시스템 오너 지정 스크립트
  - 관리자 전용 빌드/서버 분리
  - 권한 점검/복구 화면
- 메인/관리자 사이트 분리
  - 통합 사이트: `main`
  - 관리자 전용: `admin-standalone`
- 학교 연동 프록시 추가
  - 허용 호스트: `school.busanedu.net`, `open.neis.go.kr`
  - 로컬 서버의 `/api/school-proxy` 사용
- UI/기능 안정화 일부 진행
  - 홈페이지 관리 저장 버튼
  - 시스템 공지 표시
  - 시간표/급식 빠른보기
  - 프린트 모드 일부
  - 방과후/동아리/특강 일부 UI
  - 시험/성적관리 UI 일부
- v91 최근 수정
  - 날짜 기본값이 `2026-06-16`으로 고정되던 문제 수정
  - 새 항목 날짜 기본값을 브라우저 기준 당일로 계산하도록 변경
  - 홈페이지 관리 저장 시 Google 계정은 Google 재인증으로 승인되도록 수정
  - 이메일/비밀번호 계정은 현재 비밀번호로 재확인
  - 친구 상벌점은 관계가 `친구`인 사람만 선택/표시되도록 수정

## 실행 주소
- 통합 사이트 개발 서버
  - 명령어: `npm run dev`
  - 주소: `http://localhost:5173`
  - 주의: 이 PC에서는 `5173`이 `::1`로 열릴 수 있어 `127.0.0.1:5173`보다 `localhost:5173` 사용 권장
- 관리자 전용 정적 서버
  - 먼저 관리자 빌드 필요
  - 주소: `http://127.0.0.1:5181`
  - PowerShell 예시:
    ```powershell
    $env:VITE_APP_TARGET='admin-standalone'
    node scripts/generate-firebase-config.mjs
    node node_modules/vite/bin/vite.js build --outDir dist-admin
    node scripts/copy-static-assets.mjs dist-admin

    $env:PM_STATIC_PREVIEW_PORT='5181'
    $env:PM_STATIC_PREVIEW_ROOT='dist-admin'
    node scripts/static-preview.cjs
    ```

## 다른 PC에서 이어서 할 때
1. 저장소 클론
   ```bash
   git clone https://github.com/gim421453-sudo/My-Web.git
   cd "My Web"
   ```
2. 의존성 설치
   ```bash
   npm install
   ```
3. `.env.example`을 참고해서 `.env` 생성
   - `.env`는 GitHub에 올리면 안 됩니다.
   - 필요한 값:
     - `VITE_FIREBASE_API_KEY`
     - `VITE_FIREBASE_AUTH_DOMAIN`
     - `VITE_FIREBASE_PROJECT_ID`
     - `VITE_FIREBASE_STORAGE_BUCKET`
     - `VITE_FIREBASE_MESSAGING_SENDER_ID`
     - `VITE_FIREBASE_APP_ID`
     - `VITE_APP_TARGET=main`
     - 필요 시 `VITE_NEIS_API_KEY`
4. Firebase Admin 스크립트가 필요하면 서비스 계정 JSON 준비
   - 예: `my-management-app-8a933-firebase-adminsdk-fbsvc-4a3447a87a.json`
   - 이 파일은 `.gitignore`에 들어가 있어야 하며 GitHub에 올리면 안 됩니다.
   - `.env`에 `FIREBASE_SERVICE_ACCOUNT_PATH` 또는 `FIREBASE_SERVICE_ACCOUNT_JSON` 설정
5. 개발 서버 실행
   ```bash
   npm run dev
   ```
6. Firebase 설정 파일 생성만 따로 필요하면
   ```bash
   npm run firebase:config
   ```

## 주요 명령어
- Git 상태 확인
  ```bash
  git status --short --branch
  ```
- 이 PC에서 Git PATH가 안 잡힐 때
  ```powershell
  & 'C:\Program Files\Git\cmd\git.exe' status --short --branch
  ```
- 메인 개발 서버
  ```bash
  npm run dev
  ```
- 타입/빌드 확인
  ```bash
  npm run build
  ```
- 관리자 빌드
  ```bash
  npm run build:admin
  ```
- Firebase 설정 생성
  ```bash
  npm run firebase:config
  ```
- 시스템 오너 지정
  ```bash
  node scripts/set-system-owner.mjs --email 본인이메일@example.com
  ```
- 테스트 데이터 초기화
  ```bash
  npm run firebase:reset-test-data
  ```
- 오너 외 계정 삭제
  ```bash
  npm run firebase:delete-non-owner-accounts
  ```

## 보안/민감 파일 상태
- Git 추적 금지 파일
  - `.env`
  - `.env.local`
  - `pm-env.js`
  - `firebase-config.local.js`
  - `pm-firebase-config.js`
  - Firebase Admin SDK JSON
  - `node_modules`
  - `dist`
  - `dist-admin`
- 2026-07-05 점검 기준, 위 파일들은 `.gitignore`로 무시되고 있었습니다.
- GitHub에 올릴 때 특히 Admin SDK JSON과 `.env`가 포함되지 않았는지 반드시 확인하세요.

## Firebase/Firestore 주의점
- Firebase Console에서 Email/Password, Google 로그인 제공자가 켜져 있어야 합니다.
- Google 로그인은 Firebase Authorized domains에 현재 접속 도메인이 등록되어 있어야 합니다.
  - 로컬 테스트: `localhost`, `127.0.0.1`
- `firestore.rules` 파일이 있습니다.
  - 규칙을 수정했다면 Firebase Console 또는 Firebase CLI로 다시 게시해야 실제 적용됩니다.
- 현재 앱은 workspaceId 기준으로 데이터 분리를 목표로 합니다.
  - 새 계정은 자기 workspace의 `super_manager`
  - 초대코드 계정은 초대자의 workspace에 `normal` 등 지정 역할로 연결

## 정상 확인된 항목
- GitHub 원격 연결 정상
- `main` 브랜치와 `origin/main` 연결 정상
- 푸시 dry-run 결과 정상: `Everything up-to-date`
- JS 문법 검사 통과
- TypeScript 검사 통과
- Vite 메인 빌드 성공
- 관리자 전용 빌드 성공
- Firebase config 생성 정상
- `5173` main 타깃 확인
- `5181` admin-standalone 타깃 확인
- 학교 홈페이지 프록시 HTTP 200 응답 확인

## 알려진 주의점
- Vite 빌드 시 일반 `<script>`는 번들링하지 않는다는 경고가 나옵니다.
  - 현재 프로젝트가 정적 스크립트 복사 구조라서 예상 가능한 경고입니다.
  - `scripts/copy-static-assets.mjs`로 `app.js`, `services`, `shared`를 `dist`/`dist-admin`에 복사해야 합니다.
- `5173`은 `localhost` 접속을 권장합니다.
- `5181`은 정적 서버를 따로 켜야 합니다.
- 다른 PC에서는 `.env`와 Firebase Admin JSON이 없으면 Firebase 로그인/관리 스크립트가 정상 작동하지 않을 수 있습니다.

## 다음에 할 일
1. `CODEX_HANDOFF.md` 커밋/푸시
2. 다른 PC에서 `.env`와 Firebase Admin JSON을 안전하게 옮긴 뒤 실행 테스트
3. 로그인/로그아웃/자동 로그인 정책 재확인
4. Google 계정에서 홈페이지 관리 저장 시 Google 재인증 팝업 정상 여부 확인
5. 이메일/비밀번호 계정에서 홈페이지 관리 저장 시 현재 비밀번호 확인 정상 여부 확인
6. 친구 상벌점에서 친구 관계만 표시되는지 확인
7. 새 항목 추가 시 날짜가 실제 당일로 들어가는지 확인
8. 초대코드 등록 후 역할이 임의로 `super_manager`로 되돌아가지 않는지 확인
9. 시스템 공지와 워크스페이스 공지 분리 표시 확인
10. 관리자 전용 `5181`과 통합 `5173`의 회원/권한 동기화 확인
11. 학교공지/가정통신문/학사일정/급식 연동을 실제 화면에서 다시 확인
12. 시간표, 방과후, 동아리, 특강, 시험/성적관리, 프린트 UI 잔여 버그 수동 점검

## 인수인계 메모
- 이 파일은 다른 PC에서 Codex가 바로 상황을 이해하도록 만든 작업 메모입니다.
- 실제 운영 판단은 Firebase Console, Firestore Rules 게시 상태, GitHub 원격 상태를 함께 확인해야 합니다.
