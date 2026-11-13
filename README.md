# My Web

개인 일정과 학습·업무 자료를 한곳에서 관리하는 웹 애플리케이션입니다. 현재 기본 화면은 일정, 공지, 과목, 시험·성적, 포트폴리오 등을 다루며, 별도 React 화면에는 인증·워크스페이스 기반 조회 기능과 개발 미리보기 화면이 있습니다.

App Next 공지와 일정 화면은 기존 workspace 데이터에 권한 Guard와 서버 확인을 적용한 CRUD를 제공합니다. 일정의 교사·일반 역할은 생성·수정만 가능하며 삭제는 관리자 역할로 제한됩니다. 일정 경로는 기존 `app-next.html#/schedules-readonly`를 유지합니다. 세부 계약과 검증 범위는 [일정 문서](docs/app-next-schedules-read-only-pilot.md)를 참고하세요.

App Next 시간표는 기존 set을 선택해 수업 한 개를 추가·수정·삭제할 수 있고, 관리자 화면에서 시간표 set과 활성 교시를 관리할 수 있습니다. manager는 personal/academy 모드에서만 set·교시를 관리하며 school 모드 변경은 차단됩니다. set 보관·보관 해제·재활성화는 수업 데이터를 지우지 않습니다. 교시는 추가와 시간 수정을 지원하며, 삭제는 기존 legacy 저장 경로와 Rules가 동시 쓰기를 막지 못해 fail-closed로 비활성화했습니다. 모든 허용된 변경은 Firestore 문서와 목록의 서버 확인 후 완료됩니다. 역할 제한과 legacy 호환 범위는 [시간표 문서](docs/app-next-timetable-read-only-pilot.md)를 참고하세요.

## 기술 구성

- 기존 브라우저 앱: HTML, CSS, JavaScript (`index.html`, `app.js`)
- React 화면과 인증·권한 모듈: React 19, TypeScript 5, Vite 7
- 인증·데이터: Firebase Authentication 및 Cloud Firestore
- 테스트: Node.js 스크립트 기반 회귀·보안 검사

## 저장소 구조

- `index.html`, `app.js`, `styles.css`: 기본 개인 관리 화면
- `app-next.html`, `src/`: React/TypeScript 화면, 인증·권한·워크스페이스 기능 및 개발 미리보기
- `services/`, `shared/`: 기본 앱 서비스와 공용 권한·보안 유틸리티
- `functions/`: Firebase Functions 코드
- `firestore.rules`, `firestore.indexes.json`, `firebase.json`: Firestore 규칙·인덱스와 Firebase Hosting 설정
- `scripts/`, `tests/`: 설정 생성, 테스트 및 운영 점검 스크립트
- `docs/`: 설계·검증·운영 문서

## 개발 및 검증

```sh
npm install
npm run dev
npm run typecheck
npm test
npm run test:recovery:browser
npm run build
```

`npm run test:recovery:browser`는 demo Firebase Auth/Firestore Emulator와 loopback Vite만 사용하는 격리된 복구 UI 검사입니다. `npm run dev`와 `npm run build`는 먼저 Firebase 설정 생성 작업을 실행합니다. 관리자 정적 빌드는 `npm run build:admin`으로 생성합니다. 현재 `package.json`에는 `lint` 스크립트가 없습니다.

## 환경 설정

기본 웹 클라이언트의 필수 Firebase 설정 변수 이름은 다음과 같습니다. 실제 값은 로컬 환경 파일이나 배포 환경에서 제공하고 저장소 문서에는 기록하지 마세요.

- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`

선택적 학교 연동 변수와 인증 미리보기 플래그, 관리 스크립트 설정은 `.env.example`에서 변수 이름만 확인할 수 있습니다.

## 현재 상태와 추가 문서

PC 포맷 후 재설치와 작업 재개 절차는 [포맷 복구 안내](docs/handoff/FORMAT_RECOVERY.md)를 따릅니다. `.env`와 브라우저 로컬 데이터는 Git에 포함되지 않으므로 포맷 전에 별도로 안전하게 보존해야 합니다.

React 기반 인증·워크스페이스 화면은 점진적으로 통합 중이며 일부 화면은 조회 전용 또는 개발 미리보기입니다. 현재 작업 및 검증 상태는 [크로스 디바이스 인계 문서](docs/handoff/CURRENT_HANDOFF.md), Firebase 설정과 배포 확인 상태는 [배포 문서](docs/deployment/DEPLOYMENT.md)에 기록합니다. 최근 릴리스 변경은 [CHANGELOG.md](CHANGELOG.md)를 참고하세요.

현재 권한 복구 점검에서는 민감 행 UI 필터가 canonical 역할을 사용하도록 하고, 교사의 민감 학사 데이터 직접 쓰기를 assignment 범위 검증 서버 경로가 연결될 때까지 제한했습니다. 활성 Firestore Rules는 읽기 전용 `viewer`와 `print_account`의 직접 workspace 쓰기 및 경로와 다른 workspace 식별자 payload를 거부합니다. 역할별 수동·Emulator 검증 현황은 [서브계정 권한 점검 체크리스트](docs/testing/SUBACCOUNT_PERMISSION_TEST_CHECKLIST.md)를 참고하세요.

## App Next 조회·인쇄 및 재연결

공지·일정·시간표의 `현재 목록 인쇄`는 이미 조회 권한이 확인된 현재 목록을 표 형식으로 출력합니다. 일정은 현재 필터를 적용하며 편집기·진단 패널은 인쇄하지 않습니다. 일정 화면은 네트워크 재연결 시 서버 목록을 다시 조회합니다. 실제 프린터·장시간 오프라인 검증과 전체 mixed schema 편집 parity는 후속 작업입니다. Cloud→PC 작업 상태는 `docs/app-next-parity-hardening-handoff.md`를 확인하세요.
