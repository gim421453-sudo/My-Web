# PC 포맷 후 MY WEB 작업 복구 안내

기준일: 2026-10-19 (Asia/Seoul). OWNER: Codex.

이 문서는 코드 복구와 개발 재개 안내이며 production 배포 또는 IAM 변경 승인이 아니다. 최신 최종 커밋/검증 상태는 같은 폴더의 CURRENT_HANDOFF.md 상단을 우선한다. 아래 과거 작업의 미커밋 설명은 당시 기록이다.

## 1. 포맷 전 반드시 별도로 보존할 것

- 코드 원격: `https://github.com/gim421453-sudo/My-Web.git`. 로그인 변경 `4856347`, 시간표 변경 `6cb8546`은 각 작업 브랜치에 push했다. 최종 통합은 main 및 `codex/docs-format-recovery`에서 확인한다.
- 루트 `.env`가 존재한다. Git에서 제외된 파일이며 **내용을 GitHub/채팅/문서에 올리지 않는다**. 암호화된 외장 저장소나 승인된 비밀 관리 도구에 별도 백업해야 한다. 이 작업에서는 외부 복사하지 않았고 사용자 백업 여부도 미확인이다.
- 별도로 보유한 Firebase 관리자 키/인증서/CLI 인증/SSH 키/Git 자격증명은 필요 시 안전하게 보존하거나 새 PC에서 재인증한다. 파일 존재를 추정하지 말고 사용자 보관 위치를 확인한다. 새 서비스 계정 생성이나 IAM 변경으로 대체하지 않는다.
- 브라우저 localStorage/sessionStorage/IndexedDB와 로그인 세션은 Git에 없다. 로컬 전용 데이터·저장한 보고서·다운로드 파일은 사용자 승인된 내보내기 방식으로 별도 보존한다. 클라우드 동기화가 모든 로컬 데이터를 포함한다고 가정하지 않는다. 이 작업에서 브라우저 개인정보를 추출하지 않았다.
- Codex 앱의 대화 기록·사용자 전역 skills·개인 설정·연결 계정은 이 저장소의 Git push로 보존되지 않는다. 새 PC에서는 이 문서를 작업 맥락으로 사용한다. 필요한 개인 설정은 앱의 지원되는 백업/복구 방식으로 따로 보존하고 인증 토큰·개인정보가 섞인 사용자 폴더 전체를 GitHub에 올리지 않는다. 저장소의 `.agents/skills`와 `.claude/settings.json`은 추적되어 clone에 포함된다.
- `tmp/`, `backups/`, `output/`, zip, 기존 개발 캡처 등은 Git 제외 항목이다. 필요한 개인 자료만 검토해 외부 보존한다. `node_modules`, dist, Java/Node 임시 런타임은 보통 재설치/재생성이 가능하다.
- 이 문서가 GitHub에 보이는지와 CURRENT_HANDOFF에 기록된 최종 main SHA를 직접 확인한 뒤 포맷한다. `.env` 등 별도 백업 미완료 시 소스 원격 보존만으로 전체 백업 완료로 판단하지 않는다.

## 2. 저장소와 작업 이력

| 항목 | 값 |
| --- | --- |
| 기존 루트 | `C:\dev\My-Web` |
| 이전 대화의 옛 경로 | `C:\Users\alswn\OneDrive\문서\My Web` (이 PC에서 유효하지 않았음) |
| 일정 CRUD 기준 | `cf55bedbfb6657ead3e3286fe9e231768a77a29c` |
| 로그인 문구 변경 | `4856347f72f90849b0989bb4f91bc06d930d9cda`, `codex/fix-login-copy` |
| 시간표 row CRUD | `6cb8546`, `codex/feat-app-next-timetable-row-crud` |
| 시간표 기존 worktree | `C:\dev\My-Web\tmp\codex-branches\feat-app-next-timetable-row-crud` |
| 통합·복구 문서 브랜치 | `codex/docs-format-recovery` |

포맷 후 기존 worktree의 `.git` 파일을 복사해 재사용하지 않는다. 새 clone에서 필요할 때 worktree를 다시 만든다. 원격 작업 브랜치는 복구 지점으로 남기며 자동 삭제하지 않는다.

## 3. 새 Windows 설치 준비

1. Git for Windows, Node.js와 npm, Temurin Java 21 JRE 또는 JDK를 설치한다. 기존 실제 실행 환경은 Node 24.18.0 / npm 11.16.0 / Java 21이다. 과거 Functions 검사는 별도 Node 22.23.2에서 수행했다. Functions의 Node 계약은 functions/package.json을 먼저 확인한다.
2. GitHub 접근을 재인증한다. Git user.name/user.email은 본인 값으로 설정하고 이 문서의 예시로 덮어쓰지 않는다.
3. 다음 PowerShell 명령으로 새 clone을 만든다. 대상 폴더가 이미 존재하면 삭제하거나 덮어쓰지 말고 상태를 먼저 조사한다.

```powershell
New-Item -ItemType Directory -Path C:\dev -Force
git clone https://github.com/gim421453-sudo/My-Web.git C:\dev\My-Web
Set-Location C:\dev\My-Web
git switch main
git pull --ff-only origin main
git status --short --branch
git log -5 --oneline
Get-Content AGENTS.md
Get-Content docs/handoff/CURRENT_HANDOFF.md
npm ci
npx playwright install chromium
node --version
npm --version
java -version
```

`npm ci`는 기존 lockfile을 사용한다. 취약점 경고가 나와도 `npm audit fix --force`, 무분별한 override/major downgrade를 하지 않는다. 버전 불일치나 설치 오류는 원문과 런타임 버전을 인계에 남긴다.

별도 Functions/Rules 검사를 재개할 때만 해당 하위 폴더에서 기존 lockfile로 `npm ci --prefix functions`, `npm ci --prefix tools/firestore-rules-tests`를 실행한다. root 설치만으로 모든 하위 도구가 설치됐다고 가정하지 않는다. 운영자 스크립트는 이름만 보고 실행하지 말고 데이터 변경 여부와 승인 조건을 먼저 확인한다.

## 4. 안전한 demo 개발 환경

운영 `.env`를 복원하기 전에 demo 검증부터 한다. 아래는 PowerShell 현재 세션에만 설정하는 테스트 값이다. 비밀값이나 운영 프로젝트 ID를 넣지 않는다.

```powershell
Set-Location C:\dev\My-Web
$env:VITE_FIREBASE_API_KEY='demo-api-key'
$env:VITE_FIREBASE_AUTH_DOMAIN='demo-myweb-app-next.firebaseapp.com'
$env:VITE_FIREBASE_PROJECT_ID='demo-myweb-app-next'
$env:VITE_FIREBASE_STORAGE_BUCKET='demo-myweb-app-next.appspot.com'
$env:VITE_FIREBASE_MESSAGING_SENDER_ID='123456789000'
$env:VITE_FIREBASE_APP_ID='1:123456789000:web:demoappnext'
node scripts/test-login-copy.mjs
node scripts/test-app-next-timetable-row-crud.mjs
npm test
npm run typecheck
npm run build
npm run build:admin
node scripts/test-role-workspace-release-gate.mjs
npm run test:recovery:browser
git diff --check
git status --short
```

각 명령의 종료 코드를 확인하고 실패 시 다음 단계의 성공을 추정하지 않는다. Browser suite는 `demo-myweb-recovery-e2e`와 loopback Auth/Firestore Emulator만 사용하며 현재 기대값은 18 tests / 18 pass / 0 fail이다. 과거 테스트 계정은 하네스가 생성·정리하는 demo fixture이며 운영 로그인용 계정이 아니다. 삭제된 admin@example.com/admin1234 계정을 재생성하지 않는다.

- JAVA_HOME은 새 PC의 실제 Java 21 경로로 지정하고 bin을 PATH에 넣는다. 예전 `tmp/codex-runtime` 절대 경로는 새 PC에 없을 수 있다.
- Emulator 포트: Hub 4400, Firestore 8080, Auth 9099, websocket 9150, logging 4500. Browser 하네스의 Vite 포트는 5179다. 일반 개발 Vite 기본 포트는 5173이다.
- 포트 점유 시 PID와 CommandLine을 확인한다. 확실한 stale demo Emulator만 종료하며 모든 node/java 프로세스를 일괄 종료하지 않는다. temp hub locator는 PID가 없을 때만 제거한다.
- `firestore-debug.log`는 Emulator 종료와 파일 잠금 해제 후 이번 생성 파일만 제거한다. 로그/임시 runtime/스크린샷을 의도 없이 커밋하지 않는다.
- 기존 Vite non-module script 및 React Router use client 경고는 비차단일 수 있다. 실제 exit code와 테스트 합계를 기준으로 판정한다.

일반 개발 화면은 같은 demo 세션에서 `npm run dev -- --host 127.0.0.1`로 연다. loopback 127.0.0.1 사용을 우선한다. 운영 환경 복구·실제 데이터 검증은 별도 승인된 절차에서만 한다.

## 5. 현재 구현과 주요 코드

- legacy 진입: `index.html`, `app.js`; App Next: `app-next.html`, `src/app-next/AppNext.tsx`. 인증: src/auth 및 기존 RequireAuth/RequireWorkspaceRole 계약을 유지한다.
- 로그인 기본 표시: 통합 관리프로그램. 이전 기본 이름만 표시 시 치환하고 사용자 지정 이름/저장 데이터는 보존한다. 초대 안내 문구는 제거했지만 회원가입·초대코드·비밀번호 재설정·Google 버튼은 유지한다.
- App Next 경로: `#/notices-readonly`, `#/schedules-readonly`, `#/timetable-readonly`. 이름의 readonly는 호환 경로이며 CRUD 존재 여부는 현행 문서를 기준으로 한다.
- 시간표 신규 코드: AppNextTimetableRowEditor.tsx, appNextTimetableRowCrudService.ts, appNextTimetableRowCrudUtils.ts. 조회 격자와 normalization은 기존 파일을 확장했다.
- 시간표 canonical 경로는 `workspaces/{workspaceId}/timetable/{rowId}`. 기존 set와 활성 교시만 사용한다. create는 deterministic cell ID transaction, update는 동일 문서 patch로 unknown 필드 보존, delete는 단일 row만 제거한다. set/period/program 자동 생성·수정 없음.
- create/update/delete 후 getDocFromServer로 값 또는 부재 확인, 이어서 서버 목록 재조회까지 통과해야 UI 성공 표시한다. 서버 오류를 timeout 증가나 WebChannel route 차단으로 덮지 않는다.
- 시간표 권한: system_owner/super_manager C/U/D; manager personal/academy C/U/D; teacher personal/academy C/U; normal 알려진 모드 C/U; viewer/print 쓰기 금지. 학교 manager/teacher는 assignment scope 미검증으로 fail closed. 실제 Rules 권한과 클라이언트 제한을 구분한다.
- 상세 계약: 시간표/일정 pilot 문서, 공지 integration 및 checklist, shared/ownerPreviewReleaseManifest.js 참조. 후속 변경은 이 계약을 읽은 후 최소 범위로 진행한다.

## 6. 남은 일과 금지 사항

1. 수동 UI/출력: 운영 앱과 App Next의 mixed/legacy 표시·정렬·필터·상세·인쇄 비교, 장시간 offline UX. 자동 테스트 통과를 운영 데이터 검증으로 해석하지 않는다.
2. 중복 생성: App Next끼리는 동일 cell ID transaction으로 차단하지만 임의 ID legacy 클라이언트와의 동시 생성 전체를 서버에서 보장하지 않는다. 전역 유일성 개선은 별도 backend/Rules 설계가 필요하다.
3. npm advisory는 미해결이다. 과거 root 16건(high 12/moderate 4), production-only high 4, Rules 도구 16건, Functions 0이 보고됐으나 최신 audit 재실행 결과가 아니다. 별도 investigation 브랜치에서 재조사한다.
4. IAM HOLD 유지. production Firebase read/write, deploy, 관리자 권한 변경, 데이터 삭제를 이 복구 작업에 포함하지 않는다. Rules/Functions/dependency를 불필요하게 바꾸지 않는다.
5. 모든 의미 있는 개발은 최신 main에서 별도 codex/* branch, 가능하면 worktree를 만든다. main 직접 개발, reset --hard, force push, git add . / git add -A는 기본 금지다. 파일 명시 stage, 검사, 작업 브랜치 push, 검증된 병합 순서를 따른다.

포맷 후 첫 요청 예시: “AGENTS.md와 CURRENT_HANDOFF.md, FORMAT_RECOVERY.md를 읽고 원격 main SHA와 clean 상태를 확인해라. demo 환경으로 설치·회귀를 검증하고 남은 수동 점검 중 다음 작은 작업을 별도 codex/* 브랜치에서 진행해라. production/deploy/IAM은 금지한다.”
