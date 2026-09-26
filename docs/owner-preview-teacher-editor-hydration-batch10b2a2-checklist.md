# Owner Preview Teacher Editor Hydration Batch 10B-2A.2 Checklist

## Scope

- Owner Preview only; current operating mode remains `integrated-unconfigured`.
- This batch changes only the teacher edit-open and value-hydration path.
- No Rules, indexes, Firebase data, listeners, transport settings, Hosting, timetable, notice, schedule, or app-next changes are included.
- Firestore WebChannel 400 remains HOLD.

## A. Edit Target

- [ ] Open the teacher-management list and choose Edit on a known teacher.
- [ ] Confirm the teacher editor title is the edit title, not the create title.
- [ ] Confirm the editor displays the selected teacher, not the first teacher or a prior selection.
- [ ] If the local row is absent, confirm the editor opens only after a one-time server source read.
- [ ] If the source cannot be read, confirm a safe message is shown and an empty create editor does not open.

## B. Existing Values

- [ ] Name is restored from `name` or the compatible `teacherName` field.
- [ ] Type is restored from `type` or the compatible `teacherType` field.
- [ ] Memo is restored from `memo` or the compatible `notes` field.
- [ ] A normal email restores its local part and listed domain.
- [ ] An unlisted email domain selects direct entry and restores the domain text.
- [ ] An empty email remains empty and is not inferred from another field.

## C. Subject Chips

- [ ] Canonical `subjectIds` restore as chips.
- [ ] Duplicate IDs appear only once.
- [ ] Selected subjects cannot be selected again from the picker.
- [ ] Removing one chip only removes that selection.
- [ ] A legacy name-only snapshot is displayed as guidance when no canonical subject document matches it.
- [ ] Name-only legacy data never causes an arbitrary subject ID to be created or selected.

## D. Save And Cancel

- [ ] Save updates the same teacher document and does not increase the teacher count.
- [ ] The list refreshes after server confirmation and shows the saved values.
- [ ] Reopening Edit restores the newly saved values.
- [ ] Cancel or close makes no change and does not leak the previous edit values into a new editor.

## E. Regression

- [ ] Multi-subject create, no automatic first-subject selection, and chip removal still work.
- [ ] Subject and teacher reference refresh still work.
- [ ] Learning material server-list refresh and filter guidance still work.
- [ ] Lesson-record deletion remains unchanged in this batch.
- [ ] No new listener appears; WebChannel 400 handling remains HOLD.
