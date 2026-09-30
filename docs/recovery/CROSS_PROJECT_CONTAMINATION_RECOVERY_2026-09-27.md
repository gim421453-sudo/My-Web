# MY WEB 교차 프로젝트 오염 및 복구 감사

검사 시작: 2026-09-27 23:53 KST
마무리: 2026-09-28 00:01 KST
결론: `RECOVERY_PASS_WITH_AMBIGUOUS_ITEMS`

## 1. 기준 상태

- repository root: `C:/Users/USER/Documents/My Web`
- branch: `checkpoint/notice-auth-recovery-20260723`
- baseline HEAD: `392a72110009d0f9ad3dbeff585416adbd542133`
- HEAD message: `chore: add cross-device handoff and documentation automation`
- upstream 표시: ahead 0 / behind 0. 원격 조회 명령은 실행하지 않아 remote freshness는 `NOT VERIFIED`.
- 감사 시작 시 작업 트리: tracked 13개 modified, tracked 1개 deleted, untracked 3개. 검사 도중 문서 일관성 정리로 `HANDOFF.md`가 추가 변경되었고, 확인된 Emulator 로그를 제거했다.
- stage 상태: 없음.

## 2. 감사 파일 전체 인벤토리

감사 시작 때 변경된 17개와 문서 참조를 따라가며 확인해 수정한 `HANDOFF.md` 1개를 포함해 총 18개 경로를 대조했다.

| 경로 | 시작 상태 | 판정 |
|---|---|---|
| `AGENTS.md` | modified | `SAFE_VALID_CHANGE` |
| `CHANGELOG.md` | modified | `SAFE_VALID_CHANGE` |
| `CHATGPT_PROJECT_INSTRUCTIONS.md` | modified | `SAFE_VALID_CHANGE` |
| `README.md` | modified | `SAFE_VALID_CHANGE` |
| `app.js` | modified | `SAFE_VALID_CHANGE` |
| `docs/deployment/DEPLOYMENT.md` | modified | `MIXED_FILE` |
| `docs/handoff/CURRENT_HANDOFF.md` | modified | `MIXED_FILE` |
| `docs/handoffs/archive-2026-07-09-CODEX_HANDOFF_now_backup.md` | deleted | `CROSS_PROJECT_CONTAMINATION` 제거 |
| `firestore.rules` | modified | `SAFE_VALID_CHANGE` |
| `firestore.rules.next` | modified | `MIXED_FILE` |
| `package-lock.json` | modified | `SAFE_VALID_CHANGE` |
| `package.json` | modified | `SAFE_VALID_CHANGE` |
| `scripts/test-school-security-role-lockdown.mjs` | modified | `SAFE_VALID_CHANGE` |
| `tests/firestore/workspace.rules.test.mjs` | modified | `SAFE_VALID_CHANGE` |
| `docs/testing/SUBACCOUNT_PERMISSION_TEST_CHECKLIST.md` | untracked | `MIXED_FILE` |
| `firestore-debug.log` | untracked | `OBSOLETE_GENERATED_FILE` 제거 |
| `tests/firestore/configured-rules.teacher-scope.test.mjs` | untracked | `SAFE_VALID_CHANGE` |
| `HANDOFF.md` | 감사 중 modified | `MIXED_FILE` |

요약: `SAFE_VALID_CHANGE` 11, `CROSS_PROJECT_CONTAMINATION` 1, `BROKEN_CHANGE` 0, `MIXED_FILE` 5, `OBSOLETE_GENERATED_FILE` 1, `AMBIGUOUS` 파일 0.

감사 시작 시 파일 목록, 전체 tracked diff, untracked 내용을 확인했다. `functions/`, `services/`, `src/`에는 이번 diff 기준 수정 파일이 없었다. 이들은 영향 연결 대상 및 테스트로 확인했다.

이 보고서와 `docs/recovery/CURRENT_HANDOFF_PRE_AUDIT_2026-09-27.md`는 감사 산출물이며 위의 baseline inventory/classification 합계에는 포함하지 않는다.

## 3. 정상 변경

- `AGENTS.md`, `CHATGPT_PROJECT_INSTRUCTIONS.md`: 현재 repository 루트 경계를 명시하고, 실제 존재하지 않는 lint script 표기 및 금지 Git 동작을 바로잡았다.
- `app.js`: 민감 행의 privilege/teacher 판정을 legacy `user.role` 대신 `effectiveMenuRoleV59`로 수행한다. teacher의 assignment 검증 없는 민감 업무 변경 action을 숨기는 guard를 추가했다.
- `firestore.rules`: 일반 workspace write 역할을 `super_manager`, `manager`, `teacher`, `normal`로 제한하고, payload의 `workspaceId`/`workspace_id`와 문서 경로가 충돌하면 거부한다. teacher 본인 소유 문서라는 표시만으로 민감 collection에 쓸 수 없게 한다.
- `scripts/test-school-security-role-lockdown.mjs`: 위 canonical 역할 판정, 민감 teacher action gate, 읽기 전용 역할 및 workspace 경계의 정적 회귀를 추가했다. `npm test`에서 보안 검사 86개가 통과했다.
- `tests/firestore/workspace.rules.test.mjs`: emulator project ID를 `demo-myweb-workspace-rules`로 제한하고, candidate suite의 teacher 민감 write 거부 계약을 반영했다.
- `tests/firestore/configured-rules.teacher-scope.test.mjs`: `firebase.json`이 지정한 active `firestore.rules`를 직접 테스트한다. teacher sensitive create/update는 거부하고 manager write는 허용한다.
- `package.json`, `package-lock.json`: 두 Rules Emulator test가 직접 가져오는 `@firebase/rules-unit-testing` 5.0.2 개발 의존성이다. 현재 root Firebase SDK 12.x와 peer 범위가 맞는다.
- `CHANGELOG.md`, `README.md`: 확인된 보안 동작과 테스트 문서를 요약한다.

## 4. 오염 또는 손상 발견

### 제거된 cross-project 보관 문서

- 파일: `docs/handoffs/archive-2026-07-09-CODEX_HANDOFF_now_backup.md`
- 문제 유형: `CROSS_PROJECT_CONTAMINATION`.
- 확인 근거: 원문에 MY WEB 외 `C:/Users/USER/Documents/Web Record`, `C:/Users/USER/Documents/record` 경로, 녹음 앱의 Drive 업로드·채팅·Firestore collection·별도 Rules/실행 테스트 정보가 반복 기재되어 있었다.
- 영향: 보관 인계 파일이 MY WEB 저장소 안에서 타 프로젝트 구현 지침과 데이터를 섞고, 다음 세션을 잘못된 프로젝트로 유도할 수 있다.
- 조치 판단: working tree에서 해당 파일이 이미 삭제된 상태였고, 제거 내용 전체가 다른 프로젝트임을 확인해 삭제를 유지했다. 기존 source/기능 변경은 되돌리지 않았다.

### stale 문서 상태 및 설명

- `docs/deployment/DEPLOYMENT.md`, `docs/testing/SUBACCOUNT_PERMISSION_TEST_CHECKLIST.md`: Java 부재로 Emulator를 실행하지 못했다는 과거 상태가, 실제 이후 Emulator 통과와 모순됐다. scoped test 결과로 갱신하고 전체 role CRUD/browser matrix는 미검증으로 분리했다.
- `docs/handoff/CURRENT_HANDOFF.md`: 과거 Emulator 차단을 이후 통과 상태로 바꾸고, 이번 재실행은 Emulator가 종료되어 연결되지 않은 사실을 별도 기록했다.
- `HANDOFF.md`: 삭제된 backup archive 참조와 현재 인계 파일 위치가 틀렸다. 문서 상단에 역사적 작업 메모임을 표시하고, canonical handoff 경로와 삭제 사실을 바로잡았다. 오래된 세부 schema/현재 상태 본문은 역사 자료로 남기고 현재 구현 근거에서 제외했다.
- `firestore.rules.next`: 주석이 `users/{uid}.globalRole`을 global system owner 근거로 설명했지만 실제 canonical authority는 `systemOwners/{uid}`다. 주석만 구현과 일치하도록 수정했다.

### Emulator 로그

- `firestore-debug.log`는 repository root 안의 local Emulator 실행 로그였다. root `.gitignore`에서 무시되지 않아 untracked로 표시됐다.
- 확인 후 생성 산출물만 제거했다. user data, source, fixture, build output은 제거하지 않았다.

## 5. 복구 내용

- `firestore.rules.next`의 기능 변경은 앞선 Emulator 실패 복구 작업에서 들어온 변경으로 확인했다. optional `disabled`는 map 키 존재를 확인한 뒤에만 읽는다. 멤버 update는 현재 역할·요청 역할의 delegation 범위를 한 권한 함수에서 판정하고 actor role 중복 해석을 줄인다. `system_owner`는 `systemOwners/{uid}`만 근거로 사용한다. manager가 manager/super_manager를 관리할 수 없는 제한과 super_manager/manager delegation 목록은 유지된다.
- candidate Rules의 교사 민감 학사 direct write 거부 변경은 기존 teacher scope 보안 목표 및 테스트와 일치하므로 유지했다.
- `firestore.rules`의 viewer/print_account write 차단, workspace payload 경로 일치, teacher sensitive write 제한은 테스트·문서 계약과 일치하므로 유지했다.
- `@firebase/rules-unit-testing`을 실제 import하는 Rules test 두 개에서 사용하므로 manifest/lockfile 추가를 유지했다.
- 기존 테스트와 미커밋 소스/문서는 HEAD로 되돌리거나 삭제하지 않았다.

## 6. 제거한 파일

- `docs/handoffs/archive-2026-07-09-CODEX_HANDOFF_now_backup.md`: 다른 프로젝트 구현 경로와 테스트 내용이 포함된 보관 문서.
- `firestore-debug.log`: 이번 프로젝트 내 Emulator 재검증 중 생성된 untracked 로그 산출물.

삭제 전 archive 내용과 로그 목적을 확인했다. 나머지 `docs/handoffs/archive-2026-07-09-CODEX_HANDOFF.md`는 MY WEB의 당시 상태를 기록하며 타 프로젝트 내용은 발견되지 않아 보존했다.

## 7. 판단 보류 및 기존 기준 문서 주의

- 변경 파일 중 `AMBIGUOUS` 판정은 없다.
- 전체 역할 CRUD, browser/direct-route, 다른 workspace 및 assignment boundary는 이번 감사 범위에서 완전 검증하지 않았으므로 결과를 추정하지 않는다.
- `system_owner는 모든 워크스페이스 역할을 관리할 수 있다` 테스트 이름과 달리 현재 fixture는 `super_manager` member create 한 건만 검증한다. Rules source의 owner branch는 `validWorkspaceRole` 전체에 허용을 반환하지만 나머지 다섯 역할의 동적 Emulator 검증은 `NOT VERIFIED`다.
- `docs/IAM_HOLD_STATUS.md`는 `IAM_STATUS = HOLD`를 유지하지만 기록된 HEAD `84b2c164...`는 현재 HEAD가 아닌 과거 근거다. 해당 문서는 IAM 범위 밖으로 수정하지 않았고 IAM 완료/진척을 주장하지 않는다.
- 활성 `firestore.rules`, candidate `firestore.rules.next`, `firestore.rules.console-current`, backup 파일은 내용과 용도가 다르다. `firebase.json`이 배포 Rules로 지정하는 파일은 `firestore.rules`다. 다른 snapshot을 활성 Rules로 간주하거나 병합하지 않는다.
- Emulator 로그에는 실행 중인 로컬 Emulator project ID `my-management-app-8a933`과 테스트의 `demo-*` project ID가 다르다는 single-project-mode 경고가 있었다. 테스트는 `127.0.0.1` 로컬 endpoint를 사용했다. production endpoint나 project에 연결하지 않았다.

## 8. Rules 점검 결과

- active Rules의 역할 권한은 nested workspace member를 사용한다. `system_owner`는 canonical `systemOwners` registry를 검사하며 users profile의 role fallback은 없다.
- active `canWriteWorkspaceData` 변경은 역할 allowlist 및 payload/path 일치를 먼저 확인한다. `viewer`, `print_account`는 일반 직접 write 역할 집합에서 제외되고, teacher는 sensitive collection에서 ownership 필드만으로 write할 수 없다.
- candidate role 목록은 `shared/roleSecurityPolicy.js`의 여섯 workspace roles와 일치한다. system owner delegation은 해당 역할 집합 전체를 허용하고 manager/super_manager는 각각 기존 하위 범위만 허용한다.
- Rules 감사 기준 평가:

```json
{
  "score": 4,
  "summary": "확인한 active/candidate Rules 변경은 canonical authority, workspace 경계, 제한 역할 deny 및 teacher sensitive write deny를 유지한다. scoped Emulator 테스트와 정적 보안 회귀는 통과했지만 전체 역할 CRUD 및 browser matrix는 완료되지 않았다.",
  "findings": [
    {
      "check": "Business Logic vs. Rules",
      "severity": "minor",
      "issue": "전체 role CRUD, 다른 workspace, assignment 관계 및 browser direct-route를 포괄하는 최종 Emulator matrix는 미실행이다.",
      "recommendation": "Emulator 복구 후 정책표의 미검증 role/scope 조합을 실행하고 결과를 기록한다."
    }
  ]
}
```

## 9. Auth/Permission 점검 결과

- UI privilege/teacher 판정은 canonical menu role resolver에서 온다. 변경된 teacher action gate는 assignment-verified 경로가 연결되지 않은 민감 업무 변경을 숨긴다.
- shared policy와 Functions permission policy의 공통 role 식별자(`system_owner`, `super_manager`, `manager`, `teacher`, `normal`, `viewer`, `print_account`)가 일치한다.
- 전체 로그인·승인·route guard를 실제 브라우저에서 실행하지 않았으므로 UI 수동 범위는 `NOT VERIFIED`다.

## 10. Functions/backend 점검 결과

- 이번 working tree diff에는 `functions/src/**`, `functions/test/**`, `functions/package.json` 수정이 없다.
- `npm --prefix functions test`: `PASS`, 557/557. Admin/Auth의 mock 및 contract 검증을 수행했으며 production operation은 호출하지 않았다.
- IAM 관련 실행 및 문서 변경은 없다. `IAM_STATUS = HOLD`다.

## 11. Frontend 점검 결과

- 변경된 프런트 파일은 `app.js`이며 canonical 역할 기반 민감 행 표시와 teacher scoped mutation gate를 사용한다.
- `npm test`의 app target isolation 7/7 및 auth/session 관련 회귀가 통과했다.
- root main 및 admin build가 모두 성공했다. Vite가 비모듈 script, sourcemap 원본 위치, 500 kB 초과 chunk 경고를 출력했지만 빌드는 완료됐다.
- 실 브라우저 route/console/network 확인은 `NOT VERIFIED`다.

## 12. 테스트 결과

| 명령 | 결과 | 내용 |
|---|---|---|
| `npm test` | `PASS` | app target isolation 7/7, security role-lockdown 86, auth security 22/22, trusted backend adapter 128/128, auth module 및 timetable/notice stability 통과 |
| `npm --prefix functions test` | `PASS` | 557/557 |
| `npm run typecheck` | `PASS` | `tsc --noEmit` |
| `npm run build` | `PASS` | main `dist` build |
| `npm run build:admin` | `PASS` | admin `dist-admin` build |
| `node --check app.js` 및 수정된 `.mjs` 파일 | `PASS` | 구문 검사 |
| `git diff --check` | `PASS` | whitespace 검사 |
| `node --test tests/firestore/configured-rules.teacher-scope.test.mjs` | `BLOCKED` 재실행 | 앞선 실행은 3/3 PASS. 이번 재실행 시 Emulator `127.0.0.1:8080`에서 `ECONNREFUSED` |
| `node --test tests/firestore/workspace.rules.test.mjs` | `BLOCKED` 재실행 | 앞선 실행은 13/13 PASS. 이번 재실행 시 Emulator `127.0.0.1:8080`에서 `ECONNREFUSED` |
| `npm run lint` | `NOT AVAILABLE` | root `package.json`에 lint script 없음 |

프로젝트 안에 Firebase CLI 실행 파일이 없어 이번 감사에서는 Emulator를 다시 기동하지 않았다. 현재 실패는 서비스 연결 부재이며 Rules assertion 결과로 해석하지 않는다. 이전 실제 pass 결과와 마지막 재실행 실패를 모두 보존한다.

## 13. 최종 상태

`RECOVERY_PASS_WITH_AMBIGUOUS_ITEMS`

- 교차 프로젝트 내용이 확인된 handoff archive 제거를 유지했다. 바뀐 기능 소스에서 교차 프로젝트 코드/import/API/route/Firebase 설정은 발견하지 않았다.
- 잘못된 권한 완화나 기능 회귀는 발견하지 않았다. 확인된 app/Rules/test 변경은 MY WEB canonical contract와 일치했다.
- 변경 분류: 정상 11, 교차 프로젝트 오염 1, broken 0, mixed 5, obsolete generated 1, ambiguous file 0.
- `RECOVERY_PASS_WITH_AMBIGUOUS_ITEMS`의 판단 유보는 변경 파일 분류상 `AMBIGUOUS` 파일이 있다는 뜻은 아니다(0개). Emulator 재실행 불가와 system_owner role-by-role 시험 누락으로 동적 검증 범위가 완전히 닫히지 않았다는 뜻이다.
- 남은 확인 사항은 Emulator 중단으로 인한 이번 재실행 불가, 전체 CRUD/browser matrix, system_owner의 나머지 다섯 role grant, legacy root `HANDOFF.md`에 남은 역사적 세부내용, IAM status 문서의 오래된 HEAD 메타데이터다.
- production 배포, production Firestore 접근/쓰기, IAM mutation, Git stage/commit/push/pull/fetch/merge/rebase/switch/checkout/reset/clean/stash 및 branch 변경은 수행하지 않았다.
- 마지막 Git 검토는 사용자 검토를 위한 미커밋 상태로 남긴다.
