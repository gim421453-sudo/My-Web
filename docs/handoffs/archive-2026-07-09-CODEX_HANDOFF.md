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
- 최신 앱 패치 버전: `app.js?v=94`
- 학교/나이스/홈페이지 연동 보조 서비스: `services/schoolIntegrationService.js?v=5`

## 현재 Git 상태
- 2026-07-07 확인 기준, `main` 브랜치는 `origin/main`과 연결되어 있습니다.
- 2026-07-07 확인 기준, `git status --short --branch` 결과는 `## main...origin/main`으로 표시되었습니다.
- 이 파일을 수정한 뒤에는 `CODEX_HANDOFF.md`가 변경 파일로 표시될 수 있으므로 커밋/푸시가 필요합니다.
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
- v92 최근 수정
  - Firestore 기반 관리자 문의/채팅 기능 추가
  - 사용자 문의/지원 티켓, 관리자 간 대화, 오류 로그 첨부 흐름 추가
  - 런타임 오류와 Firebase 연결 오류를 로그로 남기도록 보강
- v93 최근 수정
  - Firebase Auth 세션 유지 정책을 운영용으로 보강
  - 새로고침 후 로그인 상태 복구 흐름 수정
  - 기존 탭 단위 명시 로그인 가드가 자동 로그아웃을 유발하지 않도록 조정
- v94 최근 수정
  - 로그아웃 시 `topActions is not defined` 오류 수정
  - `index.html`의 상단 액션 영역에 `id="topActions"` 추가
  - `syncSupportButtonV92`, `syncSystemOwnerReturnButtonV58`에서 topActions를 직접 참조하지 않고 `document.getElementById("topActions") || document.querySelector(".top-actions")`로 안전 조회
  - 로그인 화면, 로그아웃 전환, 상단바가 없는 상태에서는 관련 버튼을 제거하고 조용히 return 하도록 null guard 추가
  - `app.js?v=94`로 캐시 버전 갱신

## 지금 바로 할 일
1. 다른 PC에서 저장소를 clone 또는 pull 합니다.
2. `.env.example`을 기준으로 `.env`를 직접 생성합니다.
3. Firebase Admin SDK 스크립트를 쓸 PC라면 Admin JSON 또는 `FIREBASE_SERVICE_ACCOUNT_JSON`도 안전하게 옮깁니다.
4. 의존성을 설치합니다.
   ```bash
   npm install
   ```
5. Firebase 브라우저 설정 파일을 생성합니다.
   ```bash
   npm run firebase:config
   ```
6. 통합 웹을 실행합니다.
   ```bash
   npm run dev
   ```
7. 통합 웹 접속 주소는 우선 `http://localhost:5173`을 사용합니다.
8. 관리자 전용을 확인하려면 관리자 빌드 후 `dist-admin` 정적 서버를 띄웁니다.
9. 실제 로그인/로그아웃, 시스템관리자 화면, 회원 목록, 문의/채팅, 학교 연동을 브라우저에서 수동 확인합니다.
10. 이상 없으면 변경 파일을 커밋/푸시합니다.

## 남은 작업 요약
- 실제 Firebase Console 상태 확인
  - Email/Password 제공자 활성 여부
  - Google 제공자 활성 여부
  - Authorized domains에 `localhost`, `127.0.0.1`, 배포 도메인 등록 여부
  - Firestore Rules가 최신 `firestore.rules`와 동일하게 게시되어 있는지 확인
- 실제 로그인/로그아웃 화면 검증
  - Google 로그인
  - 이메일/비밀번호 로그인
  - 로그아웃 시 `topActions is not defined`가 더 이상 뜨지 않는지 확인
  - 로그아웃 후 로그인 화면에서 상단 문의/시스템관리자 버튼이 남지 않는지 확인
  - 새로고침 후 Firebase 세션 복구 정상 여부 확인
- 시스템관리자 검증
  - 모든 회원 목록 표시
  - 회원 상태/권한/workspace 변경
  - 권한 점검/복구
  - 시스템 오너 본인 보호 로직
  - 일반 회원 비활성화/활성화
  - Firestore 사용자/멤버 문서 삭제 버튼 동작
- 초대코드/워크스페이스 검증
  - 일반계정 초대코드 등록
  - 초대코드 등록 후 `users/{uid}`와 `workspace_members`, `workspaces/{workspaceId}/members/{uid}`가 동시에 갱신되는지 확인
  - 역할이 저장 후 새로고침/재로그인 시 `super_manager`로 되돌아가지 않는지 확인
  - 관리자 사용자 목록이 같은 workspace 기준으로만 보이는지 확인
- 홈페이지 관리 검증
  - Google 계정에서 홈페이지 설정 저장 시 Google 재인증으로 저장되는지 확인
  - Email/Password 계정에서 현재 비밀번호 재확인 후 저장되는지 확인
  - 빠른등록 활성, 메인대시보드 표시 항목, 과목/교과서/출판사 선택값 저장 여부 확인
- 데이터/동기화 검증
  - 같은 workspace의 다른 계정에서 공지/일정/과제/시험/출결이 실시간 반영되는지 확인
  - 로그아웃/재로그인 없이 onSnapshot 기반 화면 갱신이 되는지 확인
  - localStorage legacy 데이터가 새 계정에 섞이지 않는지 확인
- 학교/나이스 연동 검증
  - 학교공지 가져오기
  - 가정통신문 가져오기
  - 학사일정 월별/달력/리스트 표시
  - 급식 날짜 선택, 전날/오늘/다음날 버튼
  - NEIS API 키가 없는 환경에서 수동 붙여넣기/파일 업로드 흐름 정상 여부
- UI 잔여 점검
  - 시간표 교시 추가/삭제/일괄삭제
  - 방과후/동아리/특강 상세 화면 버튼 생성 오류
  - 방과후/동아리/특강 출결 저장
  - 시험/성적관리 UI 배치
  - 프린트 보고서/엑셀 다운로드 양식
  - 모바일 반응형 화면 깨짐 여부
- 문의/채팅 검증
  - 일반 사용자 문의 생성
  - 관리자 문의 목록 확인
  - 관리자 답변
  - 오류 로그 첨부
  - 읽음/안읽음 상태

## 최근 사용자 제보 기준 우선 처리 목록
아래 항목은 사용자가 실제 화면에서 확인하며 남긴 최신 잔여 버그입니다. 다른 PC에서 이어서 작업할 때는 이 순서로 확인하면 좋습니다.

### 1순위: 인증/권한/관리자 동기화
- `5173` 통합 사이트가 실수로 `admin` 타깃처럼 동작하지 않는지 확인합니다.
  - `pm-env.js` 또는 `firebase-config.local.js`의 `VITE_APP_TARGET`/`PM_APP_TARGET` 값 확인
  - 통합 사이트는 `main`, 관리자 전용은 `admin-standalone`이어야 합니다.
- 브라우저 재시작/뒤로가기/앞으로가기 후 로그인 화면을 우회해 관리자 화면으로 들어가는지 확인합니다.
  - Firebase Auth 세션 유지 자체는 정상일 수 있지만, 관리자 전용 화면은 시스템 오너/관리자 권한 검증 후에만 보여야 합니다.
- `5173` 통합과 `5181` 관리자 전용에서 회원 상태/권한/workspace 변경이 서로 즉시 반영되는지 확인합니다.
- 시스템관리자 `권한 점검/복구`가 한쪽 사이트에서만 복구되고 다른 쪽에는 반영되지 않는 문제가 재발하는지 확인합니다.
- 최고관리자/시스템오너가 선생님 등 다른 역할로 변경됐을 때 로그인 불가 또는 사이드탭 미표시가 생기는지 확인합니다.
- 시스템 오너 전용 화면에는 일반 workspace 사이드탭이 보이지 않아야 합니다.
- 최고관리자 화면에서는 불필요한 workspace 초대코드 등록란을 숨겨야 합니다.

### 2순위: 홈페이지 관리 저장/승인 흐름
- 홈페이지 관리의 현재 비밀번호 입력칸에 입력이 되지 않거나 저장 버튼이 반응하지 않는 문제를 확인합니다.
- Google 로그인 계정은 일반 비밀번호가 없으므로 비밀번호 재확인이 아니라 Google 재인증 팝업으로 승인되어야 합니다.
- Email/Password 계정은 현재 계정 비밀번호 재확인으로 승인되어야 합니다.
- 빠른등록 활성, 과목 선택, 교과서 선택, 출판사 선택, 메인대시보드 표시 항목 저장이 실제 Firestore/settings에 반영되는지 확인합니다.
- 저장 후 새로고침/재로그인해도 체크박스 상태가 유지되는지 확인합니다.

### 3순위: 대시보드/공지/데이터 표시
- 메인 대시보드 바로보기 팝업에서 workspaceId, url, 내부 id 같은 불필요한 기술 정보가 노출되지 않게 합니다.
- 시스템 공지와 일반 공지가 공지탭에서 명확히 구분되어야 합니다.
- 시스템 공지가 메인 대시보드에 랜덤으로 보이거나 재로그인해야 나타나는 문제를 확인합니다.
- 시스템 공지 수정/삭제가 가능해야 합니다.
- 새 항목 추가 시 날짜가 계속 `2026-06-16`으로 고정되는 문제가 재발하는지 확인합니다.
- 빠른등록에서 항목 등록 후 다른 탭으로 자동 이동하지 않고 현재 화면을 유지해야 합니다.

### 4순위: 학교/NEIS/급식 연동
- 가정통신문이 최신 게시글까지 실시간 또는 버튼 갱신 방식으로 정상 수집되는지 확인합니다.
- 학교공지/가정통신문은 일반 화면에서 URL/붙여넣기 입력 UI를 숨기고, 홈페이지 관리 쪽에서 설정/가져오기 버튼을 관리하는 방향이 현재 요구사항입니다.
- 학사일정은 월별 보기, 달력 보기, 리스트 보기를 선택할 수 있어야 합니다.
- 달력에서 일정을 클릭하면 상세 내용이 보여야 합니다.
- 급식은 날짜 선택, 어제/오늘/다음날 버튼이 정확히 하루씩 이동해야 합니다.
- 급식 빠른보기는 기본적으로 당일 급식만 보여주고, 중식/석식 2박스로 나눠 보여야 합니다.
- 주말/석식 급식 신청은 자동 적용이 아니라 저장 버튼 + 비밀번호/재인증 승인 흐름으로 바꿔야 합니다.

### 5순위: 시간표/방과후/동아리/특강
- 시간표 교시 삭제가 정상 작동해야 합니다.
- 교시 전체 삭제/일괄 삭제 버튼이 필요합니다.
- 시간표 교시 수정 시 같은 교시가 수십 개 생성되는 버그가 재발하는지 확인합니다.
- 같은 역할의 시간표 버튼은 정리해야 합니다.
- 방과후/동아리/특강 강좌 제거 후 자동 재생성되는 문제를 확인합니다.
- 방과후/동아리/특강 시간표 등록 후 해당 메뉴 메인으로 이동하는 버그가 남아 있는지 확인합니다.
- 방과후/동아리/특강 상세의 안내/출결 버튼이 `[object HTMLButtonElement]` 또는 `[object HTMLLabelElement]`로 렌더링되는 문제를 수정해야 합니다.
- 방과후/동아리/특강 출결 저장 버튼과 실제 저장 로직이 필요합니다.
- 방과후/동아리/특강 출결 학생 이름을 사용자가 수정할 수 있게 해야 합니다.

### 6순위: 시험/성적/프린트/UI
- 시험/성적관리 UI가 우측 패널에서 잘리거나 쪼개지는 문제를 재배치해야 합니다.
- 시험년도는 입력칸이 아니라 선택박스로 바꿔야 합니다.
- 시험관리 필터에 년도, 시험명, 선생님 등 상세 필터가 필요합니다.
- 빠른등록의 시험/성적관리 버튼은 빈 팝업이 아니라 실제 등록 양식을 열어야 합니다.
- 프린트 엑셀 다운로드 파일명에 날짜/항목명이 구분되도록 개선해야 합니다.
- 프린트 보고서에서 링크 칸이 너무 큰 문제를 재조정해야 합니다.
- 프린트 모드에서는 우측 하단 플로팅 버튼과 버전정보가 보이지 않아야 합니다.

### 7순위: 인물/프로젝트/일정/공지 입력 UI
- 인물관리 관계 선택지에서 선생님을 제외해야 합니다.
- 친구 상벌점에는 관계가 `친구`인 사람만 보여야 합니다.
- 프로젝트 관리의 진행상태, 우선순위, 영역, 카테고리는 선택박스로 바꿔야 합니다.
- 일정관리의 날짜, 유형, 상태는 선택박스로 정리해야 합니다.
- 공지관리의 과목, 공지일, 마감일 입력 UI를 선택박스/날짜 선택 UI로 정리해야 합니다.

## 다음 PC에서 첫 점검 순서
1. `git status --short --branch`로 변경 상태를 확인합니다.
2. `.env`와 Firebase 설정 파일이 있는지 확인합니다.
3. `npm install` 후 `npm run firebase:config`를 실행합니다.
4. `npm run dev`로 `http://localhost:5173`을 엽니다.
5. 통합 사이트가 `main`으로 동작하는지 콘솔/`pm-env.js`에서 확인합니다.
6. 로그인 화면에서 Firebase 설정 오류가 없는지 확인합니다.
7. Google 로그인과 Email/Password 로그인을 각각 확인합니다.
8. 로그아웃 시 `topActions is not defined`가 재발하지 않는지 확인합니다.
9. 관리자 전용 `5181`을 따로 띄워 `admin-standalone`으로 동작하는지 확인합니다.
10. `5173`과 `5181`을 동시에 열고 회원 권한/상태 변경이 양쪽에 반영되는지 확인합니다.
11. 최근 사용자 제보 기준 우선 처리 목록을 1순위부터 처리합니다.
12. 수정 후 `npm run build`, 관리자 빌드, 브라우저 수동 테스트를 반복합니다.

## 작업 시 주의사항
- `.env`, Firebase Admin SDK JSON, `firebase-config.local.js`, `pm-env.js`는 GitHub에 올리면 안 됩니다.
- 테스트 계정 삭제/초기화 스크립트는 실제 Firebase Auth와 Firestore를 삭제할 수 있으므로 반드시 대상 목록 확인 후 실행합니다.
- localStorage legacy 데이터는 자동 마이그레이션하지 않는 정책입니다. 사용자가 명시적으로 가져오기 버튼을 누를 때만 처리해야 합니다.
- `users/{uid}.role`과 `workspaces/{workspaceId}/members/{uid}.role`이 서로 다르면 메뉴/권한이 흔들릴 수 있습니다. 기준은 workspace member 문서로 보는 방향입니다.
- 시스템 오너 기능은 전체 서비스 관리 기능이고, 일반 workspace 기능과 UI가 섞이지 않도록 분리해야 합니다.
- 학교 홈페이지/NEIS 연동은 CORS, API 키, 학교 사이트 HTML 변경에 따라 실패할 수 있으므로 수동 붙여넣기/파일 업로드 대체 경로를 유지해야 합니다.
- UI 수정 시 PC 화면은 기존 관리자형 레이아웃을 유지하고, 모바일에서만 사이드바 접힘/터치 크기 개선을 적용합니다.

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
