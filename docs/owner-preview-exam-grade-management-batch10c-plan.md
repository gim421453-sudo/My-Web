# Owner Preview Exam And Grade Management Batch 10C Plan

## Boundary

Batch 10C will separate exam schedules from exam results. This document is planning only; it adds no data model migration, Rules, index, or runtime code.

## Planned Areas

1. Exam result collection and ownership boundaries.
2. Student-specific scores, raw scores, full marks, averages, rank, percentile, grades, and alternate grading systems.
3. Weighting, rounding, recalculation, partial scores, questions, answers, question weights, OMR, wrong answers, and exam/answer-sheet attachments.
4. Student visibility, teacher/admin entry, cross-student isolation, correction history, audit logs, reports, print, CSV/Excel, bulk input, duplicate prevention, server confirmation, Rules requirements, automated tests, and manual verification.

## Delivery Gates

- P0: score ownership, authorization, server confirmation, and student isolation.
- P1: result entry, calculation, correction history, and import/export design.
- P2: reports, print, advanced OMR workflow, and analytics.
- HOLD: any feature requiring Rules/index changes, external integrations, or unverified production data migration.
