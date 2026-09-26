# 비공개 베타 준비 감사

## 판정: 배포 차단

기능 일부와 Owner Preview 안전성 검사는 코드상 준비되어 있지만, 다음 gate가 남아 있다.

- 실제 역할별 Rules/Emulator matrix와 다른 workspace 격리
- Batch 10B-2D 수동검증
- 시험·성적/포트폴리오 데이터 모델과 개인정보 정책
- 실제 백업·복구·보존 정책
- Drive/NEIS/카카오 등 외부 연동의 서버 경계
- 약관, 개인정보 안내, 사용자 지원, 장애 공지 체계
- quota/cost monitoring과 배포 후 rollback 승인

## 통과 기준

인증·workspace·권한, 서버 확인 write, 민감정보 검사, 점검모드, dist 검사, 수동 회귀, 지원 문서, rollback rehearsal가 모두 증거와 함께 PASS여야 한다. 자동 테스트 통과만으로 베타를 열지 않는다.
