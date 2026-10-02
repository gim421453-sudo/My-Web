# CLAUDE.md — My Web (이름 변경 예정)

이 파일은 Claude Code 가 세션마다 읽는 프로젝트 지침이다. 사용자는 한국어로 대화한다. 답변과 문서는 한국어로 쓴다.

@AGENTS.md

## 프로젝트

- **목적**: 학원·학교·개인을 통합 관리하는 웹. 한 서비스 안에서 모두 쓸 수 있고, 요금제에 따라 화면과 권한이 달라진다. Web Record 가 이 앱의 시간표/수업을 읽어 사용한다. **추가 필요**: 서비스 이름 변경, 요금제별 화면·권한 구조.
- **스택**: Firebase Auth/Firestore/Functions (Functions 는 Node 22), Vite 앱, `AppNext`(읽기 전용 owner-preview 파일럿). **브랜치 `checkpoint/notice-auth-recovery-20260723` (main 아님)**

## 작업 시작 전 (매 세션)

1. `AGENTS.md` 가 있으면 먼저 읽고 따른다 (위 import 로 이미 불러와진다). 없으면 만들지 않는다.
2. `docs/handoff/CURRENT_HANDOFF.md` 는 **맨 위(최신) 섹션만** 읽는다. 파일이 길고 아래는 과거 기록일 수 있다.
3. `git status -sb` 와 `git log -5 --oneline` 으로 **실제 상태**를 확인한다. 핸드오프와 다르면 실제 상태를 기준으로 하고 사용자에게 알린다.
4. 다른 프로젝트와의 관계나 전체 맥락이 필요하면 `../PROJECTS.md` 에서 이 프로젝트 섹션만 읽는다. 전체를 읽지 않는다.

## 검증 명령 (핸드오프에서 확인된 것)

- `npm test`
- `npm --prefix functions run test:integration` — Node 22, Emulator 11/11
- `npm run test:recovery:browser` — headless Browser E2E 11/11
- `npm run typecheck`
- `npm run build  /  npm run build:admin`
- (lint 스크립트는 없음)

실제로 실행해서 결과를 확인하기 전에는 통과라고 보고하지 않는다. 명령이 바뀌었으면 위 목록과 `AGENTS.md` 를 함께 고친다.

## 이 프로젝트 주의사항

- Node 는 **22** 를 쓴다. Node 24 는 지원 runtime 이 아니며 integration 일부가 실패한다.
- Functions Emulator 에는 `MYWEB_TRUSTED_BACKEND_MODE` 가 worker 로 자동 전달되지 않는다. 필요하면 비밀이 아닌 emulator mode 한 줄만 든 ignored `functions/.env.local` 을 임시로 쓴다.
- `IAM_STATUS = HOLD` 이다. IAM 문서나 원격 권한을 변경하지 않는다.
- 활성 Rules 는 `firebase.json` 이 지정한 `firestore.rules` 뿐이다. `firestore.rules.next` 등은 배포 대상이 아니다.
- teacher 의 assignment-scope 서버 경로는 연결 전까지 **fail-closed** 를 유지한다.
- AppNext 의 non-owner preview 는 `owner-preview-only` 정책으로 막혀 있다. 정책을 바꾸지 않는다.
- `npm audit fix --force` 를 하지 않는다.
- 루트 `HANDOFF.md` 는 역사 메모다. 현재 구현의 근거로 쓰지 않는다.
- 문서 6개가 unstaged 일 수 있다. 되돌리지 않는다.
- 요금제 기능은 chat-service, 출결과 공통 모델이 될 수 있다. 구현 전에 설계를 사용자와 합의한다. 이름 변경은 코드/문서/배포 설정 전반에 영향이 크므로 영향 범위를 먼저 조사해 보고한다.

## 공통 규칙

- 작업은 **이 저장소 폴더 안에서만** 한다. 다른 프로젝트 폴더는 읽지도 수정하지도 않는다.
- `git add` / `commit` / `push` / `pull` / `reset` / `clean` / `stash` 는 **사용자가 명시적으로 요청할 때만** 한다.
- `docs/recovery/` 는 사용자 자료이므로 건드리지 않는다.
- Windows 보안 설정(Smart App Control, Defender, WDAC)은 변경하거나 우회하지 않는다.
- 운영(production) 서비스·데이터에 쓰기·배포하지 않는다. 검증은 `demo-*` 프로젝트와 Emulator로 한다.
- 비밀값(키, 토큰, `.env`)은 읽어도 문서·로그·채팅에 출력하지 않는다.
- 검증하지 않은 것은 통과라고 쓰지 않고 `NOT VERIFIED` / `NOT RUN` 으로 남긴다. 테스트를 약화시켜서 통과시키지 않는다.
- 의존성 설치·삭제, `npm audit fix --force` 같은 큰 변경은 먼저 사용자에게 묻는다.
- 큰 수정은 먼저 계획을 보여주고 승인받은 뒤 진행한다.

## 문서 갱신 규칙

- 의미 있는 작업을 끝내면 `docs/handoff/CURRENT_HANDOFF.md` 를 **기존 형식 그대로** 갱신한다. 새 내용은 맨 위 최신 섹션에 쓰고, 해결된 과거 내용은 정리한다.
- **AGENTS.md 동기화 (사용자가 중단 지시하기 전까지 유지)**: 명령어, 폴더 구조, 규칙, 주의사항 같은 프로젝트 사실이 바뀌면 같은 변경을 `AGENTS.md` 에도 반영한다. 기존 내용과 형식은 보존하고 필요한 부분만 최소 수정한다. Codex 전용 문구는 임의로 지우지 않는다. `AGENTS.md` 가 없으면 만들지 말고 사용자에게 묻는다.
- `CHANGELOG.md` 가 있으면 사용자에게 보이는 변경만 기록한다. `DEVLOG_AUTO_UPDATE=false` 이면 개발일지를 만들지 않는다.
