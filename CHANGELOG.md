# Changelog

All notable release-relevant changes to this project should be documented here.

## Unreleased

### 보안 및 인증

- 채팅·지원 스레드와 메시지의 참여자 접근을 같은 workspace의 활성 membership으로 제한하고, 일반 참여자의 참여자 목록 변경 및 비활성 플래그 불일치 membership 접근을 Rules에서 차단했습니다.
- 민감 행 UI 필터가 레거시 프로필 역할 대신 canonical 역할을 사용하도록 수정하고, assignment 범위가 검증되지 않은 교사의 민감 학사 데이터 직접 쓰기와 UI 편집을 fail-closed로 제한했습니다.
- 활성 Firestore Rules에서 `viewer`·`print_account`의 직접 workspace 쓰기와 경로와 다른 workspace 식별자를 가진 쓰기 payload를 차단했습니다.
- 두 Rules 계열에서 읽기 전용 역할의 일반 workspace 읽기는 허용하면서, 소유자 예외를 통한 직접 쓰기·삭제는 차단하고 전체 7개 역할의 동적 권한 matrix를 추가했습니다. 활성 Rules의 민감 행 제한과 teacher 직접 쓰기 거부는 유지합니다.
- Rules의 역할 해석에서 중복 document lookup을 줄이고, canonical `systemOwners` 문서의 비활성 flag를 권한 판정에 반영했습니다.
- 활성 Rules에서 inactive canonical user profile이 남은 workspace membership을 통한 접근을 얻지 못하게 하고, `settings` 직접 쓰기를 관리자 역할로 제한했습니다.
- canonical `systemOwners/{uid}` 문서가 없는 사용자의 `users.globalRole` 승격을 거부하고, 접근이 거부된 선택적 레거시 membership 진단이 canonical 인증 세션을 중단시키지 않도록 보정했습니다.

### 버그 수정

- 사용자 실시간 갱신 callback에서 선언되지 않은 이전 역할 참조를 보정해 로그인 직후 발생하던 `ReferenceError`를 막았습니다.
- 인증 상태와 권한 판정을 공용 정책으로 통합하고, 역할 처리와 Firestore 보안 규칙을 강화했습니다.
- 에뮬레이터 전용 신뢰 백엔드 기반, 서버에서 검증하는 행위자 인증 미들웨어, 엄격한 권한 판정기를 추가했습니다.
- 개발용 진단 경로가 운영 Functions 내보내기에 포함되지 않도록 정리했습니다.
