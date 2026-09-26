# Owner Preview Learning Management Batch 10B-2A.1 Checklist

## Scope

- Owner Preview only, operating mode: `integrated-unconfigured`.
- No Firestore Rules, indexes, production data, Hosting, timetable, notice, schedule, or attendance changes.
- Firestore WebChannel 400 remains HOLD; this batch adds no listener or transport changes.

## A. Teacher Subject Picker

- [ ] Open a new teacher editor: no subject is selected automatically.
- [ ] Confirm the picker label is `담당 과목` and the placeholder is `연결할 과목을 선택하세요`.
- [ ] Select several canonical subject documents; each selection becomes a chip.
- [ ] Remove one chip; only that subject is removed.
- [ ] Re-selecting an already selected subject is blocked.
- [ ] Numeric, non-Korean, and punctuation-containing subject names entered by users display unchanged.
- [ ] Duplicate names remain separately selectable because each option value is the canonical subject document ID.
- [ ] UI shows no UID, document ID, workspace ID, token, or raw object value.
- [ ] Save and reopen the teacher editor; selected subject chips are restored.

## B. Reference Refresh

- [ ] Add or edit a subject and confirm it appears in subject pickers without a full page reload.
- [ ] Add or edit a teacher and confirm it appears in teacher pickers and filters.
- [ ] Existing empty selections remain empty; the first option is never selected automatically.
- [ ] No additional listener is created.

## C. Lesson Record Full Delete

- [ ] Use a disposable Owner Preview workspace record only.
- [ ] Confirm the dialog distinguishes direct and timetable-generated lesson records.
- [ ] Confirm the dialog states that the source timetable remains intact.
- [ ] Complete both confirmations.
- [ ] Confirm direct records, generated records, and local pending records are absent after server confirmation.
- [ ] Refresh the lesson-record page; timetable-derived records do not reappear.
- [ ] Confirm the timetable itself remains visible and unchanged.
- [ ] A partial failure must not show a full-success message.

## D. Public Diagnostics

Run in the browser console:

```js
const d = window.PMWorkspaceDataService?.diagnostics?.() || {};
Object.fromEntries(Object.entries(d).filter(([key]) =>
  /(learningMaterial|lessonRecordBulkDelete|firestoreListen|firestoreListener|subjectReference|teacherReference|referenceFilter)/i.test(key)
));
```

- [ ] Required keys are present even before an action and start at `0` or an ordinary state value.
- [ ] No UID, email, workspace ID, document ID, token, or API key appears.
- [ ] `firestoreListen400Count` and `firestoreListenerErrorCount` are observation only; this batch does not alter listener transport.

## E. Existing Manual PASS Regression

- [ ] Material save remains server-confirmed and appears in the server-refreshed list.
- [ ] A material hidden by the active filter still shows the filtered-result guidance.
- [ ] Subject and teacher reference additions still refresh related lists.

## F. WebChannel 400 HOLD Record

If a 400 recurs, record only the active menu, action immediately before it, occurrence count, list state, save state, and whether automatic recovery occurred. Do not change transport settings during this checklist.
