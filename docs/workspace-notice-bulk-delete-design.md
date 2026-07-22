# Workspace Notice Bulk Delete Design

작성일: 2026-07-22

## 상태

이번 단계에서는 일괄 삭제를 구현하지 않는다. 실제 데이터 삭제도 하지 않는다.

## 대상 권한

허용 후보:

- `system_owner`
- 현재 workspace의 `super_manager`

선택적으로 허용 검토:

- 현재 workspace의 `manager`

금지:

- teacher
- normal
- viewer
- print_account
- signed_out
- pending/rejected/disabled 계정

## 기능 범위

허용:

- 현재 workspace 공지 개별 선택
- 현재 workspace 공지 전체 선택
- 선택 삭제
- 현재 workspace 공지 전체 삭제
- 삭제 대상 개수 표시
- 삭제 전 서버 강제 재조회
- 삭제 후 서버 강제 재조회

금지:

- 모든 workspace 공지 일괄 삭제
- URL 파라미터만으로 삭제
- 확인 없이 즉시 삭제
- UI 배열에서만 제거
- 실패를 성공으로 표시

## 확인 절차

1단계 확인:

```text
현재 workspace 공지 N개를 삭제 대상으로 선택했습니다.
삭제 후 복구할 수 없습니다.
```

2단계 확인:

```text
workspace 표시명을 다시 입력하세요.
```

또는:

```text
DELETE NOTICES 입력
```

## 삭제 방식

Firestore batch는 안전하게 450개 단위로 나눈다.

```text
targets = selected notice ids in current workspace only
chunks = targets sliced by 450
for each chunk:
  batch.delete(workspaces/{workspaceId}/notices/{noticeId})
  batch.commit()
```

## 성공/실패 표시

성공:

```text
공지 삭제 완료: 성공 N개
```

부분 실패:

```text
공지 삭제 일부 실패: 성공 N개, 실패 M개
```

실패:

```text
공지 삭제에 실패했습니다. 권한 또는 네트워크 상태를 확인하세요.
```

permission-denied는 성공으로 표시하지 않는다.

## 감사 로그 정책 제안

삭제 시 별도 감사 로그를 남긴다.

```text
adminLogs/{id}
{
  action: "bulk_delete_workspace_notices",
  workspaceId,
  targetCount,
  successCount,
  failureCount,
  actorUid,
  actorRole,
  createdAt
}
```

감사 로그에는 공지 전체 내용, 이메일, 토큰, 전체 UID 목록을 남기지 않는다.

## 삭제 후 검증

1. `getDocsFromServer(workspaces/{workspaceId}/notices)`로 서버 count 확인
2. 운영 화면 재조회
3. app-next 공지 탭 서버 강제 조회
4. 새로고침 후 count 유지 확인
5. workspace sync diagnostics에서 bootstrap save 발생 여부 확인

## 구현 전 차단 조건

- Firestore quota exhausted
- 현재 role이 불명확함
- workspaceId가 불명확함
- Firebase Console에서 삭제 대상 workspace를 확인하지 않음
- bootstrap 복원 경로 차단 또는 확인 미완료

