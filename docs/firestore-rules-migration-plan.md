# Firestore Rules Migration Plan

작성일: 2026-07-21

## 현재 기준

이번 계획은 실제 Firestore/Auth 읽기 전용 감사 결과와 세 Rules 버전 비교를 반영합니다.

- 현재 콘솔 배포본: `firestore.rules.console-current`
- 저장소 배포 대상: `firestore.rules`
- 강화 후보: `firestore.rules.next`
- 실제 배포: 하지 않음
- 실제 데이터 수정: 하지 않음

## 실제 데이터 상태 반영

읽기 전용 감사 결과:

- `users`: 3개
- Firebase Auth 사용자: 3개
- `status`: 모두 `active`
- `disabled`: Boolean `false` 1개, 문자열 `"false"` 2개
- `currentWorkspaceId == null` active 사용자: 2개
- `systemOwners` 문서와 `users.globalRole` 불일치: 1개
- `workspaces` 문서: 2개
- 감사 기준상 유효해 보이는 워크스페이스: 2개
- `workspace_members`: 4개
- `workspaceMembers`: 2개
- nested `workspaces/{workspaceId}/members/{uid}`: 1개
- orphan membership: 3개
- legacy-only membership: 3개

중요 해석:

- 삭제된 워크스페이스를 복구하지 않습니다.
- 삭제된 워크스페이스 멤버십을 자동 재연결하지 않습니다.
- 현재 감사에서 워크스페이스가 2개로 보이므로 “오너 워크스페이스만 유효” 전제는 수동 확인이 필요합니다.
- orphan membership은 `manual review / cleanup candidate`이며 복구 후보가 아닙니다.
- active 사용자이면서 `currentWorkspaceId == null`인 경우 로그인 실패로 처리하지 않습니다.

## 최종 목표 구조

### users/{uid}

최종 기준:

```json
{
  "uid": "USER_UID",
  "email": "user@example.com",
  "displayName": "사용자",
  "emailVerified": true,
  "status": "active",
  "globalRole": "user",
  "currentWorkspaceId": null,
  "createdAt": "timestamp",
  "updatedAt": "timestamp"
}
```

최종 제거 후보:

- `active`
- `disabled`
- `workspaceIds`
- `role`
- `currentRole`
- `workspaceRole`
- `workspaceId`
- `workspace_id`
- `pmRole`
- `pmWorkspaceRole`
- `pmWorkspaceId`

단, 현재 `app.js`와 `services/*.js`가 이 필드들을 여전히 사용하므로 즉시 삭제하지 않습니다.

### membership

최종 권위 기준:

```text
workspaces/{workspaceId}/members/{uid}
```

레거시 컬렉션:

- `workspace_members`
- `workspaceMembers`

처리 원칙:

- 신규 권한 근거로 사용하지 않습니다.
- 읽기 호환 또는 감사 용도로만 일시 유지합니다.
- 삭제된 워크스페이스 레거시 문서는 복구하지 않습니다.
- 실제 삭제는 백업, dry-run, 별도 승인 후 수행합니다.

## 상태 정규화 후보

`disabled`는 문자열이 실제로 존재하므로 단순 Boolean 변환을 금지합니다.

```js
function normalizeLegacyDisabled(value) {
  if (value === true || value === "true") return true;
  if (value === false || value === "false") return false;
  return null;
}
```

권장 해석 우선순위 후보:

1. `status`가 `pending | active | rejected | disabled` 중 하나면 `status` 사용
2. `status`가 유효하지 않으면 `disabled`를 명시적으로 정규화
3. `disabled`도 판정 불가하면 `active` 사용
4. 모두 없거나 판정 불가하면 `pending`

위 우선순위는 아직 코드나 데이터에 적용하지 않습니다. 현재 `services/authService.js`는 `userData.disabled === true`만 disabled로 처리하므로 문자열 `"true"`가 생기면 차단하지 못할 수 있습니다.

## 현재 앱에서 위험한 사용처

확인된 주요 사용처:

- [authService.js](<C:\Users\USER\Documents\My Web\services\authService.js>)는 로그인 중 `users/{uid}`를 생성/보정합니다.
- [authService.js](<C:\Users\USER\Documents\My Web\services\authService.js>)는 `workspace_members`를 active membership 발견에 사용합니다.
- [authService.js](<C:\Users\USER\Documents\My Web\services\authService.js>)는 `workspace_members`, `workspaceMembers`, nested members를 batch로 보정할 수 있습니다.
- [authService.js](<C:\Users\USER\Documents\My Web\services\authService.js>)는 `role/currentRole/workspaceRole`을 로그인 세션에 계속 반영합니다.
- [app.js](<C:\Users\USER\Documents\My Web\app.js>)는 `workspace_id`, `workspaceId`, `currentWorkspaceId`를 혼합합니다.
- [chatService.js](<C:\Users\USER\Documents\My Web\services\chatService.js>)는 `role/currentRole/workspaceRole`을 권한 판단에 씁니다.

따라서 Rules 강화 전에 “로그인 중 자동 복구 쓰기”를 읽기 중심으로 바꾸거나, 최소한 삭제된 워크스페이스는 절대 복구하지 않도록 별도 설계가 필요합니다.

## Emulator 테스트 준비 상태

현재 상태:

- Firebase SDK: `firebase ^12.15.0`
- Firebase Admin SDK: `firebase-admin ^13.6.0`
- Node.js: v24.16.0
- 테스트 러너: Node 내장 `node:test` 후보 사용
- `@firebase/rules-unit-testing`: 미설치
- `firebase-tools`: 로컬 package에는 미설치, `npx firebase-tools`로 사용
- ESM 구성: `.mjs` 테스트 후보 사용 가능
- `lint` 스크립트: 미구성
- `test` 스크립트: 미구성

필요 의존성 후보:

```powershell
npm install -D @firebase/rules-unit-testing firebase-tools
```

사용자 승인 전에는 설치하지 않습니다.

필수 테스트 후보:

1. 미로그인 사용자 거부
2. `currentWorkspaceId == null` active 사용자 본인 문서 읽기 허용
3. `disabled == false` Boolean 사용자 정상 처리
4. `disabled == "false"` 문자열 사용자 마이그레이션 호환 처리
5. `disabled == true` 사용자 차단
6. `disabled == "true"` 문자열 사용자 차단
7. pending 사용자의 status active 변경 거부
8. disabled 사용자의 disabled false 변경 거부
9. 일반 사용자의 globalRole 변경 거부
10. 일반 사용자의 role 변경 거부
11. 일반 사용자의 currentRole 변경 거부
12. 일반 사용자의 workspaceIds 변경 거부
13. 일반 사용자의 임의 워크스페이스 currentWorkspaceId 변경 거부
14. 존재하는 워크스페이스의 활성 nested member만 전환 허용
15. 삭제된 워크스페이스로 전환 거부
16. 일반 사용자의 자기 super_manager 멤버 생성 거부
17. 일반 사용자의 자기 멤버 role 수정 거부
18. manager의 super_manager 수정 거부
19. manager의 super_manager 삭제 거부
20. manager의 teacher 이하 관리 허용
21. viewer 쓰기 거부
22. print_account 일반 데이터 쓰기 거부
23. teacher 허용 컬렉션 쓰기 성공
24. teacher 관리자 전용 컬렉션 쓰기 거부
25. system_owner 정상 접근
26. 비활성 system_owner 접근 거부
27. workspace 없는 사용자 user_devices 생성 정책
28. workspace 없는 사용자 notifications 생성 정책
29. orphan workspace_members가 권한을 부여하지 않음
30. orphan workspaceMembers가 권한을 부여하지 않음
31. nested member만 최종 권위 기준으로 동작
32. invitations workspaceId 변경 공격 거부

## 단계별 계획

| 단계 | 목표 | 수정 대상 | 실제 데이터 변경 | 위험 요소 | 검증 방법 | 성공 조건 | 중단 조건 | 롤백 방법 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Rules 세 버전 저장 및 해시 기록 | `firestore.rules.console-current`, 문서 | 없음 | 콘솔 Rules와 로컬 Rules 혼동 | SHA-256, line/byte 비교 | 세 파일 식별 완료 | 콘솔 원문 불일치 | 문서만 수정 |
| 2 | 읽기 전용 데이터 감사 | `scripts/audit-user-auth-data.mjs`, `output/*` | 없음 | 민감정보 출력 | 기본 마스킹, `--include-sensitive` 분리 | users/workspaces/members 통계 확보 | 쓰기 코드 필요 판단 | 스크립트 실행 중단 |
| 3 | 레거시 필드 사용처 조사 | `app.js`, `services/*.js` 읽기 | 없음 | 누락된 사용처 | `Select-String`, `rg` | 위험 사용처 목록화 | 자동 수정 필요 | 문서만 되돌림 |
| 4 | 충돌 데이터 수동 검토 | 감사 결과 | 없음 | 오너 workspace 오판 | 마스킹 결과 검토 | orphan/valid/manual review 분류 | workspace 2개 상태 불명 | 자동 연결 금지 |
| 5 | 상태 정규화 결정표 확정 | 문서/후보 코드 | 없음 | `"false"`를 true로 해석 | 샘플 케이스 테스트 | status 우선순위 합의 | 문자열 `"true"` 사례 발견 | 결정표 재검토 |
| 6 | workspace/membership 유효성 결정표 확정 | 문서 | 없음 | 삭제 workspace 복구 | valid workspace 기준 정의 | orphan 복구 금지 명시 | valid workspace 2개 해결 안 됨 | 자동 지정 보류 |
| 7 | Emulator 테스트 환경 구성 | `package.json` 후보 | 없음 | 의존성 추가 | 사용자 승인 후 설치 | rules-unit-testing 동작 | 설치 충돌 | package 변경 되돌림 |
| 8 | `firestore.rules.next` 테스트 | tests/firestore | 없음 | 후보 Rules 과차단 | Emulator 테스트 | 필수 테스트 통과 | 로그인 핵심 플로우 차단 | next 수정 보류 |
| 9 | 신규 인증 모듈 호환성 검증 | `src/auth`, 문서 | 없음 | 정적 앱과 React 괴리 | 세션 흐름 시뮬레이션 | globalRole/nested 기준 일치 | app.js 의존성 미해결 | React 연결 보류 |
| 10 | 마이그레이션 dry-run 스크립트 작성 | scripts 후보 | 없음 | 실제 쓰기 오작동 | dry-run 기본값, confirm 필요 | 변경 후보만 출력 | 쓰기 필요 | 실행 중단 |
| 11 | 전체 Firestore 백업 | 백업 절차 | 백업만 | 백업 누락 | Firebase Export/수동 백업 확인 | 복원 경로 확인 | 백업 실패 | 배포 금지 |
| 12 | 테스트 계정 제한 마이그레이션 | 별도 승인 후 | 있음 | 실제 사용자 영향 | 제한 계정 검증 | 로그인/권한 정상 | permission-denied 증가 | 백업 복원 |
| 13 | 회귀 테스트 | 앱 화면/Emulator | 없음 | 자동로그인/권한 오류 | 역할별 테스트 | 로그인/전환/초대 정상 | 주요 계정 로그인 실패 | Rules/코드 롤백 |
| 14 | 실제 데이터 마이그레이션 | Firestore | 있음 | 데이터 손실 | dry-run 대비 | 충돌 0 또는 승인 목록만 반영 | 예상 외 변경 | 백업 복원 |
| 15 | 신규 Rules 배포 | `firestore.rules` | Rules 변경 | 과차단 | staged deploy, smoke test | 계정별 접근 정상 | Missing permissions 발생 | 콘솔 이전 Rules 재게시 |
| 16 | 운영 모니터링 | 로그/콘솔 | 없음 | 지연 발견 | permission-denied 로그 | 오류 감소 | 오류 급증 | Rules 롤백 |
| 17 | 레거시 제거 검토 | fields/collections | 있음 | 레거시 앱 깨짐 | 사용처 0 확인 | 삭제 후보 승인 | 사용처 발견 | 제거 보류 |

## 실제 배포 전 필수 작업

1. 현재 `systemOwners` 문서와 `users.globalRole` 불일치 1건 수동 검토
2. 유효해 보이는 워크스페이스 2개 중 실제 오너 워크스페이스 판정
3. 삭제된 워크스페이스 참조를 orphan/cleanup candidate로 확정
4. `disabled: "false"` 정규화 정책 확정
5. `currentWorkspaceId == null` active 사용자 화면 흐름 확정
6. 로그인 중 자동 멤버십 복구 쓰기 제거 또는 dry-run화
7. `workspace_members`/`workspaceMembers`를 권한 근거에서 제거하는 클라이언트 변경
8. Emulator 테스트 32개 후보 작성 및 통과
9. 전체 Firestore 백업
10. 이전 콘솔 Rules 백업 유지

## 롤백 계획

- Rules 배포 전: `firestore.rules`와 `firestore.rules.console-current`를 그대로 유지합니다.
- Rules 배포 후 문제 발생 시: Firebase Console에 `firestore.rules.console-current` 내용을 재게시합니다.
- 데이터 마이그레이션 문제 발생 시: 백업에서 복원하고, orphan cleanup은 중단합니다.
- 로그인 오류 발생 시: `currentWorkspaceId == null` 처리와 nested member 조회 흐름부터 되돌립니다.
- 레거시 제거 후 문제 발생 시: 제거 대상 필드/컬렉션을 백업에서 복원하고 레거시 호환 코드를 임시 유지합니다.

## 다음 권장 작업

1. 유효 워크스페이스 2개가 실제로 무엇인지 수동 확인
2. `systemOwners`와 `users.globalRole` 불일치 원인 확인
3. `disabled` 문자열 정규화만 별도 소규모 설계
4. 기존 로그인 자동 복구 로직을 읽기/안내 중심으로 바꾸는 설계안 작성
5. 사용자 승인 후 rules-unit-testing 의존성 추가
