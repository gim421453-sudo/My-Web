# Owner Preview Learning Management Batch 10B-1 Manual Checklist

Test from `http://127.0.0.1:5173/` while signed in with the intended role.
Record PASS, FAIL, HOLD, or EXTERNAL for each row, plus console/network errors
without copying identifiers, email addresses, or document IDs.

| # | Menu | Feature | Preparation / expected result | Status | Notes |
|---|---|---|---|---|---|
| 1 | Subject management | Reference selects | Add/edit duplicate-named subjects; teacher remains blank until chosen and duplicate labels stay distinguishable. | HOLD | |
| 2 | Subject management | Deletion safety | Confirm a linked subject is warned and no related lesson/material/assignment is cascaded. | HOLD | |
| 3 | Teacher management | Multiple subjects | Choose zero, one, and multiple subjects; confirm no phone field and no automatic first subject. | HOLD | |
| 4 | Teacher management | Email | Verify standard and direct domains, invalid local/domain rejection, and legacy email display. | HOLD | |
| 5 | Materials | Link and attachment | Verify http/https links only, `javascript:` rejection, private label, and honest local attachment fallback. | HOLD | |
| 6 | Lesson records | Detail page | Open View, confirm the dedicated detail screen and back navigation. Timetable name linkage remains HOLD. | HOLD | |
| 7 | Assignments | References | Confirm blank teacher default, range/content/consent fields, and no raw identifiers. | HOLD | |
| 8 | Assignments | Submission overview | As allowed manager role, open submission overview. Student-account submission verification is HOLD. | HOLD | |
| 9 | Five menus | Filters | Change controlled filters, verify only matching rows and no first-option auto-selection. | HOLD | |
| 10 | Five menus | Whole delete | Use a disposable workspace only. Verify exact typed phrase, canonical workspace scope, server confirmation, batch status, and no filter-only deletion. | HOLD | |
| 11 | LAN | LAN server | Start `npm.cmd run dev:lan`, use the manually checked private IPv4 address, then stop it. | HOLD | |

## Expected safety checks

- Operations must remain in the canonical current workspace.
- A failed server confirmation must not show a successful save/delete message.
- Delete is blocked by Operational Safety maintenance/emergency state.
- No UID, email, document ID, token, or workspace ID is visible in user-facing
  select labels, detail pages, or diagnostics.
- Google Drive upload/OAuth is EXTERNAL/HOLD; local file selection must never
  claim an upload succeeded or write a local path/base64 payload.
