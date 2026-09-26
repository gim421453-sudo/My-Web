# Batch 10D 포트폴리오 사전 계획

## 현재 코드

운영 메뉴 key `portfolios`와 workspace collection이 존재하며 기존 generic collection/editor와 V137 상세 allowlist가 사용된다. 확인 가능한 필드는 제목, category, date, description, skills, file/image/video/result link, visibility 등이다. `renderCollectionV8`와 `showLearningViewerV137`가 관련 표시 경로다.

## 미확정

대표 이미지 저장 방식, 첨부 파일/Drive, 수정 이력, 공유 링크, PDF/인쇄, 과목·과제·프로젝트·기록부 연결, 역할별 공개 범위와 Rules는 확정되지 않았다. 실제 Drive 저장이나 파일 본문 보관으로 해석하지 않는다.

## 제안 단계

1. 10D-1 canonical portfolio document와 visibility
2. 10D-2 link/metadata-only attachment policy
3. 10D-3 reference snapshot과 내부 ID allowlist
4. 10D-4 상세/검색/필터 read path
5. 10D-5 server-confirmed CRUD와 history
6. 10D-6 print/PDF/share review
7. 10D-7 역할·workspace·회귀 gate

현재 판정은 `HOLD`다. 데이터 migration, Rules/index, Drive OAuth가 선행되지 않으면 배포 기능으로 승격하지 않는다.

## V138 핵심 상태 - 수동 검증 대기

기존 `portfolios` editor는 V138에서 기록부와 같은 서버 확인형 저장 경로를 사용하며 제목을 필수값으로 처리한다. 서버 문서 확인 뒤에만 로컬 상태를 갱신한다. 기존 첨부 메타데이터는 유지하며 Google Drive OAuth, 업로드, Viewer, 미리보기, 생성 링크는 추가하지 않았다. 이력, 공유, 첨부 저장은 Rules와 데이터 계약 검토 전까지 HOLD다.
