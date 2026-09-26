# Owner Preview Learning Management Batch 10B-2B Checklist

## Scope

- Operating mode: `integrated-unconfigured`.
- This batch covers teacher display, required-field validation, subject textbook metadata, material metadata attachments, exam schedules, and the minimum record editor.
- It does not add Rules, indexes, listeners, Drive OAuth, local-path storage, file-content storage, or exam/grade implementation.

## A. Teacher List And Detail

- [ ] Teacher list displays name, subject, type, and email; a missing email displays `미등록`.
- [ ] Teacher selectors display names only.
- [ ] Teacher detail contains only user-facing fields and never shows `subjectIds`, document IDs, workspace IDs, JSON, raw arrays, or contact numbers.
- [ ] Multiple subject references display their canonical subject names.

## B. Required Fields

- [ ] Empty subject name, teacher name, material title/subject, lesson date/subject/content, assignment title/subject/due date, exam name/year/date/subject, and record activity/subject/final body are blocked before a write.
- [ ] The first invalid field receives focus and its message clears on input.
- [ ] Placeholder selections are not accepted as a subject choice.
- [ ] Editing older documents remains possible; only a new save requires currently required fields.

## C. Subject Textbooks

- [ ] Subject editor provides textbook, publisher, and repeatable supplementary materials.
- [ ] Each supplementary material can contain name, publisher, and memo.
- [ ] Empty supplementary rows are omitted on save; existing rows restore on edit.
- [ ] Duplicate subject names remain distinct through their canonical document IDs.
- [ ] Subject labels add concise textbook or supplementary context only when names collide.

## D. Material Attachments

- [ ] A material editor accepts multiple selected files and shows metadata only.
- [ ] Removing one or all pending attachments works.
- [ ] Duplicate file metadata is not added twice.
- [ ] Drive is shown as not connected, with no false upload success.
- [ ] Local paths, `file:` URLs, base64, and file bodies are not stored or sent to Firestore.

## E. Exam Schedules And Records

- [ ] Exam schedule year, date, grade, subject, teacher, type, time, place, scope, visibility, and status render correctly.
- [ ] A date outside its selected year is cleared and save is blocked until corrected.
- [ ] Grade, subject, teacher, exam type, and status filters do not auto-select their first option.
- [ ] The record editor keeps activity facts, observations, competency, drafts, feedback, final body, links, attachments, visibility, and status in separate fields.

## F. Manual Result Log

For each test, record preparation data, expected result, actual result, PASS/FAIL/HOLD/EXTERNAL, console and network errors, server-confirm result, refresh result, identifier exposure, and notes.

## G. Hold

- Firestore WebChannel 400 remains HOLD.
- Google Drive OAuth/upload, local file reopening across devices, viewer/report/print expansion, student submission writes, grading writes, and full exam/grade management remain outside this batch.
