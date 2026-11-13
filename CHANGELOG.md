# Changelog

All notable release-relevant changes to this project should be documented here.

## Unreleased

### 기능

- App Next 시간표에 기존 set·활성 교시 기반 수업 단일 row CRUD를 추가했습니다. 역할·학교 scope Guard, 기존 문서 필드 보존, transaction 중복 방지와 문서·목록 서버 확인을 적용했습니다. set/period/program과 운영 legacy 코드는 변경하지 않았습니다.
- App Next 시간표 관리자는 set 생성·메타데이터 수정·보관·보관 해제·재활성화와 set 전용 교시 추가·시간 수정을 지원합니다. 교시 삭제는 legacy 저장 경로의 경쟁 상태를 Rules가 차단하지 못해 안전성 검토 후 fail-closed 처리했습니다. 배정 수업과 기존 period를 보존하며 Firestore Rules, Functions, 패키지 설정, 운영 legacy 코드는 변경하지 않았습니다.
- App Next 일정 화면에 기존 workspace 일정 schema 기반 등록·수정·삭제를 추가했습니다. 활성 역할 Guard, 입력 검증, 중복 제출 방지 및 문서·목록 서버 확인을 적용했습니다.
- 일정 생성·수정은 기존 Rules의 관리자·교사·일반 역할, 삭제는 전역 system owner와 workspace 관리자 역할에 한정합니다. 기존 canonical 일정의 작성자·추가 필드는 보존하고 mixed schema 조회를 유지합니다.

### 보안

- membership 역할 변경 시 기존·요청 역할의 관리자 권한을 단일 경로에서 검증해 Firestore Rules 평가식 사용량을 줄였습니다. 전체 보조 Rules Emulator suite 171/171 통과.
- Firebase Admin과 Firestore Rules 테스트 도구 의존성을 호환 범위에서 갱신해 npm 감사 경고를 줄였습니다. 일부 전이 의존성 advisory는 별도 조사 브랜치에서 후속 검토 중입니다.

### 보안 및 인증

- 채팅·지원 스레드와 메시지의 참여자 접근을 같은 workspace의 활성 membership으로 제한하고, 일반 참여자의 참여자 목록 변경 및 비활성 플래그 불일치 membership 접근을 Rules에서 차단했습니다.
- 민감 행 UI 필터가 레거시 프로필 역할 대신 canonical 역할을 사용하도록 수정하고, assignment 범위가 검증되지 않은 교사의 민감 학사 데이터 직접 쓰기와 UI 편집을 fail-closed로 제한했습니다.
- 활성 Firestore Rules에서 `viewer`·`print_account`의 직접 workspace 쓰기와 경로와 다른 workspace 식별자를 가진 쓰기 payload를 차단했습니다.
- 두 Rules 계열에서 읽기 전용 역할의 일반 workspace 읽기는 허용하면서, 소유자 예외를 통한 직접 쓰기·삭제는 차단하고 전체 7개 역할의 동적 권한 matrix를 추가했습니다. 활성 Rules의 민감 행 제한과 teacher 직접 쓰기 거부는 유지합니다.
- Rules의 역할 해석에서 중복 document lookup을 줄이고, canonical `systemOwners` 문서의 비활성 flag를 권한 판정에 반영했습니다.
- 활성 Rules에서 inactive canonical user profile이 남은 workspace membership을 통한 접근을 얻지 못하게 하고, `settings` 직접 쓰기를 관리자 역할로 제한했습니다.
- canonical `systemOwners/{uid}` 문서가 없는 사용자의 `users.globalRole` 승격을 거부하고, 접근이 거부된 선택적 레거시 membership 진단이 canonical 인증 세션을 중단시키지 않도록 보정했습니다.

### 버그 수정

- 기본 앱과 App Next의 release manifest 캐시 버전을 일치시켜 서로 다른 정책 파일이 캐시에 남을 가능성을 줄였습니다. 회귀 검사는 두 진입점이 동일한 manifest 경로와 버전을 사용하는지 확인합니다.
- 사용자 실시간 갱신 callback에서 선언되지 않은 이전 역할 참조를 보정해 로그인 직후 발생하던 `ReferenceError`를 막았습니다.
- 인증 상태와 권한 판정을 공용 정책으로 통합하고, 역할 처리와 Firestore 보안 규칙을 강화했습니다.
- 에뮬레이터 전용 신뢰 백엔드 기반, 서버에서 검증하는 행위자 인증 미들웨어, 엄격한 권한 판정기를 추가했습니다.
- 개발용 진단 경로가 운영 Functions 내보내기에 포함되지 않도록 정리했습니다.
