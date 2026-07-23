# Owner Preview Deployment Baseline V1

## 1. 기준 커밋

- Branch: `checkpoint/notice-auth-recovery-20260723`
- Current baseline observed: `21bffdb test: add role workspace release gate`
- Previous stable baseline: `4cd0422 feat: stabilize schedules sync and add app-next read-only pilot`
- Release channel: `owner-preview`
- Manifest version: `owner-preview-v1`

이번 단계는 신규 기능 구현이 아니라, 첫 `system_owner` 전용 preview 배포에 포함할 수 있는 기능과 차단할 기능을 명시하는 단계다.

## 2. Release Manifest 구조

단일 런타임 원본:

- `shared/ownerPreviewReleaseManifest.js`

운영 정적 앱과 app-next가 같은 파일을 읽는다.

- 운영 앱: `index.html`에서 classic script로 로드
- app-next: `app-next.html`에서 같은 classic script로 로드 후 React adapter가 `window.PM_OWNER_PREVIEW_RELEASE_MANIFEST_V1`을 읽음

주요 필드:

| 필드 | 의미 |
| --- | --- |
| `featureId` | 고유 기능 ID |
| `system` | `operational`, `app-next`, `admin`, `connected` |
| `pageKey` / `route` | 운영 page key 또는 app-next hash route |
| `currentStatus` | 실제 구현/검증 상태 |
| `releaseStage` | `stable`, `beta`, `internal`, `hidden`, `planned`, `blocked` |
| `requiresAuth` | 인증 필요 여부 |
| `requiredGlobalRoles` | 허용 전역 역할 |
| `requiredWorkspaceRoles` | 허용 워크스페이스 역할 |
| `workspaceRequired` | current workspace 필요 여부 |
| `hasRead` / `hasWrite` | 읽기/쓰기 특성 |
| `serverConfirmed` | 서버 반영 확인 흐름 존재 여부 |
| `firstOwnerPreviewIncluded` | 첫 Owner Preview 포함 여부 |
| `blockReason` | 숨김/계획/차단 사유 |

## 3. 전체 기능 인벤토리

Manifest 기준:

- 전체 기능: 53
- 운영 page key: 35
- app-next route: 17
- 계획 항목: 1

## 4. stable 기능

stable은 manifest상 일반 역할에도 노출 가능한 후보다. 실제 권한은 기존 역할/워크스페이스 정책을 추가로 따른다.

| featureId | system | key/route | 근거 |
| --- | --- | --- | --- |
| `operational.systemOwner` | operational | `systemOwner` | system_owner 콘솔, release gate test |
| `operational.dashboard` | operational | `dashboard` | 기존 운영 메인, auth test |
| `operational.personal` | operational | `personal` | 기존 운영 화면 |
| `operational.schedules` | operational | `schedules` | 서버 confirm 저장 흐름, auth test |
| `operational.notices` | operational | `notices` | 서버 confirm 공지 흐름, auth test |
| `operational.timetable` | operational | `timetable` | V111/V120 안정화 테스트 |
| `operational.print` | operational | `print` | role/workspace release gate |
| `app-next.login` | app-next | `#/login` | app-next 기본 진입 |
| `app-next.pending` | app-next | `#/pending` | 계정 상태 패널 |
| `app-next.rejected` | app-next | `#/rejected` | 계정 상태 패널 |
| `app-next.disabled` | app-next | `#/disabled` | 계정 상태 패널 |
| `app-next.error` | app-next | `#/error` | 안전 오류 패널 |

## 5. beta 기능

beta는 구현되어 있으나 첫 preview에서는 `system_owner`에게만 노출한다.

운영 beta:

- `attendance`, `requests`, `academic`, `schoolNotices`, `homeLetters`, `meals`, `mealApplications`
- `subjects`, `teachers`, `materials`, `lessons`, `assignments`, `examSchedules`, `exams`
- `records`, `portfolios`, `projects`, `afterschool`, `specialLectures`, `clubs`
- `people`, `friendAwards`, `penalties`, `budget`, `site`, `accounts`, `admin`, `system`

app-next beta:

- `#/dashboard`
- `#/account`
- `#/settings-readonly`
- `#/timetable-readonly`
- `#/schedules-readonly`
- `#/devices`
- `#/notifications`
- `#/notices`
- `#/admin-preview`
- `#/workspace-preview`

## 6. internal 기능

현재 manifest에는 별도 internal feature를 포함하지 않았다. 개발 진단 기능은 기존 개발 환경 guard와 diagnostics API로 유지한다.

## 7. hidden / planned / blocked 기능

| featureId | stage | 이유 |
| --- | --- | --- |
| `app-next.workspace-required` | hidden | 상태 패널 전용, 직접 launch 대상 아님 |
| `app-next.access-denied` | hidden | 상태 패널 전용, 직접 launch 대상 아님 |
| `planned.workspace-invitation-links` | planned | 다음 단계 범위, 이번 preview에는 UI/버튼 노출 금지 |

## 8. 운영 앱 노출 정책

구현 위치:

- Manifest 로드: `index.html`
- 운영 gating wrapper: `app.js` V122 block

차단 지점:

- `authMenuKeysV31()` 결과 필터
- `can(action, key)` 권한 판정 전 feature stage 검사
- `renderPage(key)` 직접 page key 접근 차단
- 이전 localStorage page 복원은 최종적으로 `renderPage()`를 통과하므로 같은 정책 적용

정책:

- `stable`: 기존 역할/워크스페이스 권한과 manifest 역할 조건이 맞으면 표시
- `beta`: `system_owner`에게만 표시
- `internal`, `hidden`, `planned`, `blocked`: 표시 금지
- 차단 시 로그인 화면으로 보내지 않고 허용된 안전 기본 화면으로 이동
- 민감한 UID, email, workspaceId, Firebase projectId는 진단에 표시하지 않음

## 9. app-next 노출 정책

구현 위치:

- Manifest 로드: `app-next.html`
- Adapter: `src/release/ownerPreviewReleaseManifestAdapter.ts`
- Route/menu gate: `src/app-next/AppNext.tsx`

정책:

- 기존 `RequireAuth`, `ProtectedRoute`, `RequireWorkspaceRole` 동작은 유지
- manifest stage gate는 그 앞의 노출 필터로만 작동
- 일반 사용자는 beta app-next pilot route 버튼을 보지 않음
- 직접 hash 접근 시 child component를 렌더하지 않고 `Owner Preview access blocked` 패널 표시
- production query override로 우회하는 기능 없음

## 10. system_owner Preview 범위

첫 Owner Preview 포함 후보:

- 운영: system owner console, dashboard, personal, notices, schedules, timetable, print
- 운영 beta 전체는 system_owner에게만 노출
- app-next: 로그인, 계정 상태, read-only dashboard/account/settings/devices/notifications/notices/timetable/schedules, admin/workspace guard preview

system_owner에게 표시되는 배포 정보:

- app version
- release channel
- build date
- git commit
- manifest version
- stable/beta/internal count

값이 주입되지 않은 항목은 `unavailable`로 표시한다.

## 11. 실제 사용자 beta 전 필수 항목

- 일반 사용자, 교사, 매니저 계정별 메뉴가 예상대로 제한되는지 확인
- beta 기능이 일반 계정에 노출되지 않는지 확인
- beta 기능 직접 page key/hash 접근이 차단되는지 확인
- 차단 시 자동 로그아웃 또는 로그인 화면 오이동이 없는지 확인
- Firestore Rules가 클라이언트 gate와 별도로 cross-workspace 접근을 막는지 확인

## 12. 수동 역할 검증 항목

- `system_owner`: stable/beta 접근 가능, hidden/planned 접근 불가
- `super_manager`: stable + 자기 workspace 권한 범위만
- `manager`: stable + 자기 workspace 권한 범위만
- `teacher`: stable 중 허용 역할만
- `normal`: stable 중 허용 역할만
- `viewer`: stable read-only만
- `print_account`: print 중심 기능만
- `pending/rejected/disabled`: 보호 기능 차단, 자동 로그아웃 없음

## 13. Rules 교차 workspace 검증 항목

이번 단계에서는 Rules를 수정하거나 배포하지 않았다.

배포 전 별도 검증:

- 다른 workspace notice/schedule/timetable 읽기 거부
- manager가 super_manager 변경 불가
- viewer/print_account 쓰기 거부
- system_owner disabled 상태 접근 거부
- workspace 없는 사용자는 workspace 데이터 쿼리 없음

## 14. Preview 배포 차단 조건

다음 중 하나라도 발견되면 Owner Preview 배포를 중단한다.

- `PMReleaseManifestDiagnostics.snapshot()`에 민감정보가 포함됨
- app-next 직접 hash 접근에서 차단된 route child가 렌더됨
- 운영 page key 직접 접근이 hidden/planned/beta 일반 사용자에게 열림
- 메뉴 gate가 Firestore write/listener를 추가함
- 기존 공지/일정/시간표 저장 로직이 변경됨
- 일반 계정이 beta pilot에 접근 가능함
- system_owner가 stable/beta 기능을 열 수 없음

## 15. 다음 단계

1. Owner Preview 브라우저 수동 검증
2. 실계정별 메뉴/route matrix 기록
3. Firestore Rules 교차 workspace 검증
4. 문제가 없을 때 workspace invitation link 설계 단계 진입

이번 단계에서 invitation link UI, 버튼, 컬렉션, Firestore write는 만들지 않았다.
