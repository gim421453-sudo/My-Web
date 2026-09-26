# Changelog

All notable release-relevant changes to this project should be documented here.

## Unreleased

### 보안 및 인증

- 인증 상태와 권한 판정을 공용 정책으로 통합하고, 역할 처리와 Firestore 보안 규칙을 강화했습니다.
- 에뮬레이터 전용 신뢰 백엔드 기반, 서버에서 검증하는 행위자 인증 미들웨어, 엄격한 권한 판정기를 추가했습니다.
- 개발용 진단 경로가 운영 Functions 내보내기에 포함되지 않도록 정리했습니다.
