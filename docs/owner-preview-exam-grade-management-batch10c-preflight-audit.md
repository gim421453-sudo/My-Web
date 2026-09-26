# Batch 10C 시험·성적 사전 감사

## 판정

Batch 10C는 아직 `HOLD`다. 현재 운영 코드에는 `examSchedules`와 `exams` 경로가 있지만, 일정 문서와 평가계획·학생별 결과·과목 종합성적의 소유권은 분리되어 있지 않다. `examSchedules`는 일정 데이터로만 유지하며 결과나 계산값을 덮어쓰지 않는다. 종료 시험의 자동 탭 이동과 서버 기반 lifecycle도 계속 `HOLD`다.

이번 문서는 설계 기준만 갱신한다. Rules, 인덱스, 데이터, 앱 코드는 변경하지 않는다.

## 목표 메뉴와 범위

`평가 계획`, `고사·수행평가`, `학생별 성적 입력`, `일괄 입력`, `과목별 종합성적`, `고사별 교과목 성적`, `석차·등급`, `성취도`, `문항·정답`, `학생 답안·오답`, `성적 분석`, `성적 공개`, `Excel 내보내기`, `변경 이력`, `접속·활동 로그`로 분리한다.

모든 평가 객체는 `academicYear`, `gradeLevel`, `term`, `classId` 또는 `cohortId`, `subjectId`, `assessmentPlanId`, `assessmentId`로 범위를 가진다. 첫 학년·반·과목을 자동 선택하지 않는다.

## 데이터·계산 계약

- 평가계획: 평가영역, 만점, 반영비율, 포함/필수, 계산·성취도·등급·석차·반올림·결시 정책, 상태와 잠금 상태를 가진다. 확정 계획의 반영비율 합계는 100%여야 하며 자동 보정하지 않는다.
- 수행평가: 보고서·발표·프로젝트·실험·포트폴리오·토론·과제·관찰평가 등 유형과 제출/결시/피드백/첨부 메타데이터를 포함한다. 석차·등급 산출 여부는 평가별 정책이다.
- 학생 결과: `assessmentId + studentId` 중복을 차단하고 기존 결과는 update한다. `rawScore`, `maxScore`, `percentage`, `weight`, `weightedScore`, 응시·제출·재시험 상태, 공개·확정·잠금과 변경 사유를 분리한다.
- 계산: `percentage = rawScore / maxScore * 100`, `weightedScore = percentage * weight / 100`, 학기 종합은 included 평가의 반영점수와 승인된 조정점수 합계다. 저장 원값과 표시 반올림을 분리하고 중간 단계 반복 반올림을 금지한다.
- 석차: 동일 workspace·학년도·학년·학기·반/수강그룹·과목·평가(또는 종합) cohort 안에서만 계산한다. `competition`과 `dense` 동점 정책을 분리하고 0점 응시와 결시/면제/무효를 구분한다.
- 통계: 유효 응시자, 전체 수강자, 평균, 중앙값, 모집단 표준편차, 최고/최저, 분포, 성취도/등급별 수, 결시·미응시·면제·무효 수를 분리한다.

## 성취도: 최종 정책

성취도는 `threshold-conversion`(기존 명명과 맞으면 `score-conversion`)만 지원한다. 관리자가 workspace 기본, 학년, 과목·학기, 평가계획, 개별 평가 순으로 더 구체적인 정책을 설정하고, 시스템이 점수에서 자동 산정한다. 화면은 적용 정책 이름·버전·점수 원천·계산 시각을 표시한다.

- 학생별 직접 성취도 선택, `finalAchievement` 직접 덮어쓰기, `achievementOverride`와 override 사유 UI는 지원하지 않는다.
- 정책은 이름, scope, `scoreSource`, thresholds, 상태, version, 생성/수정 메타데이터를 가진다. 점수 원천은 `rawScore`, `percentage`, `weightedScore`, `subjectTermTotal`, `customCalculatedScore`다.
- threshold는 중복 라벨/기준점, 역전, 복수·누락 fallback, NaN/Infinity, 빈 이름·점수 원천, 동일 scope 활성 충돌을 차단한다. 자동 정렬·자동 수정은 하지 않는다.
- 정책 변경은 영향 인원과 기존/새 결과 미리보기만 제공하고 즉시 학생 결과를 바꾸지 않는다. 관리자가 명시적으로 전체 재계산을 확인한 뒤에만 batch/transaction·부분 실패·server-confirm·재조회·감사 로그를 갖춘 후속 구현을 검토한다.
- 결과에는 `calculatedAchievement`, 정책 ID/버전, 점수 원천·근거 점수·계산 시각/버전을 저장하는 계약을 사용한다. confirmed/locked 성적은 정책 변경만으로 자동 변경하면 안 된다.

## 5등급·문항·로그·내보내기

- 5등급은 공식 10/24/32/24/10 프리셋과 사용자 정책을 지원하되, 공동석차 경계·중간석차·학교 정책 미리보기 후 확정한다. `calculatedGrade`와 `finalGrade`는 등급 정책에만 적용하며 성취도 override와 혼동하지 않는다.
- 문항/정답과 학생 답안·오답은 별도 모델이다. 문항 번호 중복, 정답 공개 시점, 문항 합계와 원점수 불일치 경고가 필요하다.
- `accessLogs`와 `auditLogs`는 분리한다. UID·문서 ID·전체 답안·개인정보를 사용자 UI나 로그 복제본에 과다 노출하지 않는다. Rules/server 강제가 없으면 완료로 주장하지 않는다.
- Excel은 실제 xlsx 라이브러리·권한·민감정보 최소화가 확인된 후에만 구현한다. CSV를 Excel로 표기하지 않는다.

## 첨부와 Google Drive

현재 첨부는 파일명, 사용자용 형식, 크기, 첨부 유형, 재선택 필요 상태, 일반 링크 메타데이터만 유지한다. Google Drive OAuth, 실제 업로드, 폴더 생성, 파일 ID/가짜 링크, Viewer·미리보기·다운로드·권한 동기화는 `EXTERNAL/HOLD`이며 이번 Batch 10C 범위가 아니다. base64·Blob·로컬 경로를 Firestore에 저장하지 않는다.

## P0 선행 조건과 하위 배치

1. 기록부 첫 저장 오류: 첫 클릭이 메모 입력으로 이동하는 root cause를 먼저 고치고 자동·수동 검증한다.
2. 10C-1: schema, canonical workspace, 역할, Rules Emulator와 인덱스 요구사항.
3. 10C-2: 평가계획·수행평가·학생 결과 CRUD와 중복 방지·server-confirm.
4. 10C-3: 순수 계산, 종합·석차·통계·5등급·성취도 정책 fixture.
5. 10C-4: 정책 미리보기·확정/잠금·명시적 재계산·감사 로그.
6. 10C-5: 문항/정답/답안/오답, Excel 및 권한·개인정보 검토.
7. 10C-6: workspace/역할/Rules/실데이터 격리 회귀와 수동 검증.

실제 컬렉션, Rules, 인덱스, migration, 다중 문서 재계산은 위 preflight만으로 승인하지 않는다.

## V138 구현 상태 - 수동 검증 대기

- 구현: 평가계획, 평가, 학생 결과, 성취도 정책 초안, 문항, 학생 답안의 서버 확인형 단건 read/write 경로. 성적은 `assessmentId + studentId`, 문항은 `assessmentId + questionNumber`로 중복을 막는다.
- 구현: 반영점수 합산, 통계, competition/dense 석차, 점수 구간 성취도 미리보기, 공식 5등급제 미리보기의 순수 계산 모듈. 학생별 성취도 override나 최종 등급 write는 하지 않는다.
- 구현: CSV 내보내기만 제공하며 Excel로 표기하지 않는다. xlsx 생성은 검토된 의존성과 데이터 처리 결정 전까지 HOLD다.
- HOLD: 동시 클라이언트 정책 범위 충돌, 전체 재계산, 잠긴 결과 변경, 영구 감사 로그, Rules/인덱스 변경.
- 새 write 경로는 모두 수동 검증 전까지 PASS가 아니다.
