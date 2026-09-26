# P0 Exam/Grade UI Final Closure Checklist

## Browser scope

- Use the Windows development address `http://127.0.0.1:3000/`.
- In Network, confirm one successful `services/examGradeService.js?v=2` load before `app.js?v=148`.
- Open **시험·성적 관리**. The initial tab is **성적 목록**. Confirm tabs for 평가 계획, 수행평가, 성적 입력, 과목 합산, 석차·등급, 성취도 정책, 문항, 학생 답안, 분석, CSV are reachable.
- Open **시험일정** separately. Its existing schedule list and add form must remain separate from 시험·성적 관리.

## Portfolio deletion P0

- Open one portfolio item and delete it. Google accounts use the existing Google account confirmation; cancelling it produces no write.
- Confirm the deletion message appears only after the server absence check and the list refresh.
- Select several items, then use **선택 삭제**. Use **전체 삭제** only after checking it is scoped to the current workspace.
- In the browser console, run `window.PMPortfolioDeleteDiagnostics?.snapshot?.()`. A successful action ends with `phase: "completed"`, a cleared selection, and a nonzero server-confirmed count. No identifiers are shown.
- A linked portfolio must be blocked and its linked parent document must remain.

## Attachment safety

- Create or edit a portfolio with an attachment. The display contains only filename, friendly type, size, and reselection guidance.
- No Drive upload, Drive link, preview, file path, base64 content, or local object URL is shown or saved.

## Hold items

- Personal mode has no fabricated student selector. School or academy student selection remains unavailable until a canonical approved source exists.
- Achievement values are calculated from policy intervals. Individual achievement override is not provided.
- Five-grade output is preview-only. Explicit finalization, remote achievement recalculation, persistent audit logs, and real XLSX export remain HOLD pending Rules and server-side contracts.
- Google popup `window.closed`/`window.close` COOP warnings are not part of this batch.
