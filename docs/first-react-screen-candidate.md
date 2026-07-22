# First React Screen Candidate

## Selected Screen

Workspace notices read-only list.

This is a read-only app-next replica of the operational `notices` screen, not a replacement for the operational static app screen.

## Selection Score

| Criterion | Score | Notes |
|---|---:|---|
| Read-only safety | 20 / 20 | app-next version can omit add/edit/delete/read-status writes |
| Firestore read scope | 18 / 20 | one workspace subcollection; bounded query required |
| Rules change requirement | 20 / 20 | current `firestore.rules` and `firestore.rules.next` already allow workspace member reads |
| Index requirement | 15 / 20 | ordering by one date field likely safe; avoid compound filters in first pass |
| Operational data match | 18 / 20 | operational screen reads the same `store.notices` hydrated from `workspaces/{workspaceId}/notices` |
| User value | 18 / 20 | notices are common and easy to compare |
| React migration difficulty | 18 / 20 | list/detail view only |
| Rollback ease | 20 / 20 | remove/hide app-next tab; operational screen remains |
| Timetable V111 impact | 20 / 20 | none |
| Total | 167 / 180 | Best first candidate |

## Data Structure

Primary collection:

```text
workspaces/{workspaceId}/notices/{noticeId}
```

Expected display fields from operational code:

- `title`
- `source`
- `subject`
- `importance`
- `notice_date`
- `deadline_required`
- `deadline_date`
- `content`
- `memo`
- `visibility`
- `authorUid` or creator fields, if present
- `createdAt` / `updatedAt`, if present

Recommended read query for first implementation:

```text
collection(db, "workspaces", currentWorkspaceId, "notices")
orderBy("notice_date", "desc")
limit(50)
```

Fallback if ordering causes index/rules friction:

```text
collection(db, "workspaces", currentWorkspaceId, "notices")
limit(50)
```

Then sort locally in memory only within the bounded result.

## Access Handling

| Session state | Behavior |
|---|---|
| signed out | show login required, no Firestore read |
| loading | show loading, no redirect |
| pending/rejected/disabled | show account status, no Firestore read |
| active + workspace null | show "현재 선택된 워크스페이스가 없습니다." |
| active + workspace exists | read workspace notices |
| system_owner + workspace null | do not query; ask to select workspace |
| system_owner + workspace exists | read selected workspace notices |

WorkspaceRole is not allowed to be `system_owner`; system owner remains a global role.

## Sensitive Information

The read-only UI should not display:

- full UID
- full email
- full workspace ID
- internal Firestore document path
- raw error stack
- tokens
- invite codes

Display author metadata only if already user-facing in the operational screen. Prefer source/subject/date/content over creator identifiers.

## Firestore Write Zero Basis

The app-next notice screen should:

- use read-only Firestore APIs only
- not import `addDoc`, `setDoc`, `updateDoc`, `deleteDoc`, `writeBatch`
- not call operational `saveStore`
- not use `PMWorkspaceDataService`
- not record last read time
- not mark notices as read
- not write filters to Firestore

Local UI state for tab/filter may remain in React state only. Avoid localStorage/sessionStorage for the first implementation unless explicitly needed.

## Why Other Candidates Were Not Selected

- System notices: simple, but global rather than workspace scoped.
- Materials: link fields may include external document IDs and download UI adds presentation/masking complexity.
- School notices/home letters: import/manual flows are central to the operational screen and can confuse scope.
- Dashboard summary: reads too many collections.
- Workspace updates: current operational screen includes an apply button that mutates status.
