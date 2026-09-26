# Owner Preview Learning Management Final Repair Batch 10B-2C

Base: `checkpoint/notice-auth-recovery-20260723` at `2ef7ba7`.

## A. Teacher subject update

- Open an existing teacher linked to two subjects.
- Remove one subject chip, save, and confirm the same teacher document is updated.
- Confirm the remaining `subjectIds` value is an array containing only the selected IDs.
- Repeat after removing the final subject. An empty selection is allowed.
- Confirm no extra teacher appears and the diagnostics stage reaches `server-confirmed`.

## B. Client validation

- Check empty subject name, teacher name, material title/subject, lesson date/subject/content, assignment title/subject/due date, and exam title/year/date/subject.
- Check a record can save with activity only; subject, teacher, grade, body sections, links, and attachments remain optional.
- For every rejected form, confirm the modal stays open, focus moves to the field, the field message appears, and no success message or Firestore write occurs.

## C. Identifier-safe viewers

- Subject viewer: no `supplementaryMaterials`, JSON, ID, location, or raw array text; supplementary materials display as readable rows.
- Material viewer: no `subjectId`, `teacherId`, attachment key, local path, or raw metadata; references display names.
- Teacher, lesson, assignment, exam schedule, and record viewers: no raw reference IDs, workspace IDs, document IDs, JSON, or object string output.

## D. Subject editor

- Confirm location is absent from create, edit, list filters, and detail view.
- Confirm teacher selection begins with a placeholder and displays names only.
- Confirm textbook and supplementary-material names stay free text. Publisher remains free text unless a canonical publisher source is introduced later.

## E. Exam schedule lifecycle view

- Confirm `예정/진행 시험` and `종료된 시험` tabs are available.
- A past date or past end time appears only in the ended tab without a server write.
- A cancelled exam stays separate from ended exams.
- Report download remains HOLD. Do not generate a PDF from this screen.

## F. Record editor hydration

- Create a record with text areas, links, and attachment metadata, then reopen it.
- Confirm the same document opens in edit mode and all values, line breaks, links, and attachment metadata restore.
- Confirm cancel leaves the original document unchanged.

## Result fields

For each check, record: preparation data, expected result, actual result, PASS/FAIL/HOLD/EXTERNAL, console error, network error, server-confirm result, and notes.
