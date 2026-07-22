# app-next Workspace Notices Test Checklist

Use `127.0.0.1`, not `localhost`.

```text
http://127.0.0.1:5173/app-next.html
```

## Automated

- `node --check services/authService.js`
- `npm.cmd run typecheck`
- `npm.cmd test`
- `npm.cmd run build`

Expected:

- auth module tests pass
- timetable stability checks pass
- build succeeds
- workspace notice tests confirm read-only imports
- no Firestore write APIs in app-next workspace notice files
- no `signOut(...)` in the workspace notice screen

## Browser Comparison

Compare the same account and same workspace in the operational app and app-next.

Check:

- visible count matches expected workspace notice count
- title/name display matches the canonical title rule
- category labels match legacy card meta as closely as possible
- summary uses the same first available body field
- detail opens and closes
- detail exposes no UID, full email, workspace ID, token, or Firebase path
- date-only `noticeDate` values are shown as dates, not invented times
- Firestore Timestamp values are formatted as Korean date/time
- pinned items appear before unpinned items
- newer dated items appear before older dated items
- same-date/no-date items keep source order
- unknown schemas are visible and counted in diagnostics

## Mixed Schema Fixtures

Verify these document shapes:

- modern workspace notice:
  `authorEmail`, `authorUid`, `title`, `createdFrom`, `scope`, `status`, `pinned`, `authorRole`, `priority`, `content`
- legacy notice:
  `noticeDate`, `title`, `visibility`, `importance`, `deadline`, `memo`, `content`
- school notice
- academy notice
- system notice
- workspace notice
- `공통 · 학교` category label
- Timestamp date document
- string `noticeDate` document
- missing date document
- safe `authorName` document
- `authorUid` only document
- unknown schema document

## Development Diagnostics

Confirm aggregate diagnostics only:

- `rawReadCount`
- `schemaKindCounts`
- `unknownSchemaCount`
- `sourceCounts`
- `filteredCount`
- `displayedCount`
- `sortPolicy`
- `contentMappingBySchema`
- `authorMappingBySchema`
- `dateMappingBySchema`
- `categoryMappingBySchema`
- `listener count = 0`
- `write API imported = false`
- `automatic signOut = none`

## Must Not Happen

- Firestore write
- listener creation
- read receipt update
- notice edit/delete/create
- automatic sign out
- raw UID/email/workspace ID exposure
- operational app redirect
- `index.html` or `app.js` behavior change

## Remaining Manual Comparison

Because the operational general notice tab and the system-owner workspace notice table use different ordering rules, manually decide which legacy surface is the comparison target before final sign-off:

- general notice tab: `store.notices` filtered order
- system-owner workspace notice management: `createdAt` descending

app-next currently follows a stable workspace-notice read-only order:

```text
pinned desc -> published/created/notice date desc -> legacy snapshot order -> document id asc
```
