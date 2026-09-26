# Exam/Grade Guided Mode and Student Checklist

## P0 deletion regression

- Confirm single, selected, and current-workspace portfolio deletion still use existing account confirmation.
- Cancelled confirmation leaves `writeCount: 0`; a successful deletion reaches `completed` in `PMPortfolioDeleteDiagnostics`.

## Portfolio detail and attachments

- Open a portfolio detail. It shows only user-facing title, category, date, description, skills, links, attachments, reflection, and visibility.
- Attachment cards show filename, friendly file type, size, "파일 정보만 저장됨", and reselection guidance.
- Empty links, attachments, and skills use friendly empty messages. Raw JSON, internal field names, IDs, MIME values, byte values, and status enums are not displayed.

## Guided exam workflow

- Open **시험·성적 관리** and confirm the **처음 사용 안내** is visible.
- Follow: 평가 계획 → 고사·수행평가 → 성적 입력 → 과목별 종합 → 성취도 정책 → 석차·등급/분석 → CSV.
- Each guide action opens its matching tab. **시험일정** remains a separate screen.

## Mode and student source

- Personal mode has no student selector and uses the signed-in person only.
- School/academy mode shows a student selector only when existing `students` or an explicitly student-shaped `people` record is available.
- When no canonical candidate exists, the screen says that no students are registered. It must not invent a list or expose identifiers.
- `integrated-unconfigured` remains read-only guidance; this batch does not write a workspace mode.

## Achievement and CSV

- A policy includes academic year, grade, term, subject, class/group, policy name, score basis, scope, and A–D thresholds.
- School/academy mode requires academic year, grade, term, and subject before saving. The first subject is never selected automatically.
- Confirm scope and score basis have Korean user-facing labels, descending thresholds validate, and the preview does not change existing results.
- CSV copy describes Excel/Google Sheets compatibility. With no results, the download button is absent. XLSX is not advertised.

## Regression checks

- Record first save, exam schedules, notices, schedules, attendance, timetable, Google authentication, operational safety, release manifest, and role/workspace gate remain unchanged.
