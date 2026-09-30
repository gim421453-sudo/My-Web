# 배포 및 운영

## 확인된 배포 대상

- 루트 `firebase.json`에는 Firebase Hosting이 설정되어 있고 정적 공개 디렉터리는 `dist`입니다.
- 같은 설정 파일은 기본 Firestore 데이터베이스의 `firestore.rules`와 `firestore.indexes.json`을 참조합니다.
- Hosting 응답에는 전체 경로에 `X-Robots-Tag: noindex, nofollow` 헤더가 설정되어 있습니다.
- `.firebaserc`의 기본 프로젝트 식별자는 `my-management-app-8a933`입니다.
- 이 설정만으로 현재 서비스 배포 여부나 공개 도메인은 확인할 수 없습니다. 이번 작업에서 배포하지 않았습니다.

## 사전 조건 및 설정

- Node.js와 npm이 필요합니다. 저장소에서 지원 버전 범위는 확인되지 않았습니다.
- 기본 웹 빌드에 필요한 Firebase 설정 변수 이름은 `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_STORAGE_BUCKET`, `VITE_FIREBASE_MESSAGING_SENDER_ID`, `VITE_FIREBASE_APP_ID`입니다.
- 선택 연동·기능 플래그·관리 스크립트 변수 이름은 `.env.example`을 참고하세요. 비밀 값은 저장소나 이 문서에 기록하지 마세요.
- Firebase CLI 설치 및 인증 절차, CI/CD 연결은 현재 구성에서 확인되지 않았습니다. `package.json`에 배포 스크립트도 없습니다.

## 빌드

```sh
npm install
npm run build
```

`npm run build`는 설정 생성과 TypeScript 검사 후 Vite 빌드를 실행하며 Hosting 대상인 `dist`를 만듭니다. 관리자 전용 정적 빌드는 `npm run build:admin`으로 `dist-admin`에 생성되며, 현재 `firebase.json`의 Hosting 공개 경로에는 연결되어 있지 않습니다. 2026-09-27 현재 작업 트리에서 `npm run build`와 `npm run build:admin`이 모두 통과했습니다. 어느 산출물도 production 배포 증거가 아닙니다.

## 배포, 데이터베이스 및 도메인

- Firebase Hosting 및 Firestore 규칙·인덱스 설정은 저장소에 존재하지만, 실제 배포 순서와 실행 권한은 확인되지 않았습니다.
- 운영 도메인, CI/CD, Functions 배포 대상 및 프로덕션 배포 상태는 미검증입니다. `firebase.json`에는 Hosting과 Firestore 설정만 있습니다.
- 프로젝트별 사전 배포 점검 초안은 [`docs/owner-preview-pre-deploy-final-gate-v1.md`](../owner-preview-pre-deploy-final-gate-v1.md), Hosting 미리보기 배포 초안은 [`docs/owner-preview-hosting-preview-deployment-v1.md`](../owner-preview-hosting-preview-deployment-v1.md)에 있습니다. 이 문서들은 실제 배포 완료 증거가 아닙니다.

## 배포 후 확인 및 복구

운영 배포 후 검증 결과나 Hosting 릴리스 복구 절차는 이번 점검에서 확인하지 않았습니다. 복구 초안은 [`docs/my-web-deployment-rollback-manual-draft.md`](../my-web-deployment-rollback-manual-draft.md)에 있으며 운영 절차로 확정된 상태가 아닙니다. 데이터 및 Firestore 규칙 변경은 코드 배포와 별도로 승인·검증해야 합니다.

## 최근 로컬 검증 (2026-09-30)

- `npm test`: PASS; 앱 타깃 격리, role/security, auth, trusted backend adapter, auth modules 및 시간표·공지 안정성 검사를 포함합니다.
- Functions `npm test`: 지원 Node 22.23.2에서 `557/557 PASS`.
- `npm run typecheck`, `npm run build`, `npm run build:admin`: PASS. 빌드 로그에는 기존 sourcemap, `use client`, 대형 chunk 경고가 있으나 두 빌드는 완료됐습니다.
- configured active/candidate Firestore Rules Emulator 및 Browser SDK 회귀: `39/39 PASS`; 기존 Browser SDK 역할 matrix `74/74 PASS`.
- demo Auth/Firestore Emulator 기반 headless Playwright recovery UI: `11/11 PASS`; Functions/Auth/Firestore integration: 지원 Node 22에서 `11/11 PASS`.
- Functions `engines.node`는 `22`입니다. Node 24.16.0에서는 같은 integration 조건에서 registry enrollment suite의 assertion 실패가 재현되어 지원 runtime 비교 결과로 기록했습니다. 운영 Functions 배포나 production 접근은 하지 않았습니다.
- `git diff --check`와 `node --check app.js`: PASS. lint는 루트 `package.json`에 스크립트가 없어 `NOT AVAILABLE`입니다.
