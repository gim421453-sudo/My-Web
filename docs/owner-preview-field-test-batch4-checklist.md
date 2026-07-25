# Owner Preview Field Test Critical Repair Batch 4

## Scope

- Operational mode remains `integrated-unconfigured`.
- Firestore Rules, Indexes, Hosting, and Firebase data are unchanged.
- Existing notice V127, schedule V121, and timetable V111/V120/V124 structures are not redesigned.

## Manual URL

- `http://127.0.0.1:5173/`

## Manual Checks

1. System notices show `시스템 관리자` in the card footer author slot.
2. System notices do not show raw email, UID, or `숨김` as the author.
3. Notice visibility such as `private` remains unchanged where it is a visibility value.
4. Attendance type filter shows all canonical type options from the existing attendance editor: `등교`, `하교`, `지각`, `조퇴`, `결석`.
5. Attendance date, type, and status filters can be combined and reset.
6. Attendance saves one record each for yesterday, today, and tomorrow.
7. Attendance success is shown only after server confirmation.
8. General timetable quick registration saves a set and first row with the typed name.
9. School timetable quick registration saves a set and first row without a linked program.
10. Program timetable quick registration still requires the matching program type.
11. School board import without a configured proxy does not show success.
12. Valid empty school board responses show `새로운 학교 공지가 없습니다.`
13. Browser direct fetch to the school site is not attempted.
14. Identifier diagnostics remain clean:
    - `window.PMUserFacingIdentifierDiagnostics?.snapshot?.().visibleUidLikeCount === 0`
    - `window.PMUserFacingIdentifierDiagnostics?.snapshot?.().visibleInternalLabelCount === 0`
    - `window.PMUserFacingIdentifierDiagnostics?.snapshot?.().sensitiveValueDetected === false`

## HOLD And EXTERNAL

- Firestore Listen 400 remains HOLD because it was not reproduced in this batch.
- School board live integration remains EXTERNAL until `/api/school-proxy` is deployed and configured.
- personal/school/academy modes remain incomplete; private beta is blocked for those modes.
