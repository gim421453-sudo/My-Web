# PC·Cloud 최종 통합 검증 — 2026-11-13

Windows PowerShell, C:\dev\My-Web에서 기존 main 1874119, PC 관리 7f72dda, PC 문서 0e5861b, Cloud 2cb0d88을 확인했다. 원본 이력은 재작성하지 않았다. 최종 worktree에서 PC 문서 브랜치로 fast-forward 후 연결된 Cloud 이력을 일반 병합했다. 문서 한 충돌에서 양쪽 날짜별 기록을 모두 남겼다.

## 실제 변경과 보존

- PC: 수업 row CRUD, 교시 추가·시간 수정, 세트 생성·수정·보관·보관 해제·재활성화, period-delete-blocked, 일반·학교·프로그램 경로.
- Cloud: 의존성 감사 문서, backend 검증 helper/기록, UI·인쇄·60초 offline 회귀 테스트, 임의 ID writer 동시성 characterization, 학교 scope 설계와 두 음성 테스트.
- manifest 수정: index.html과 app-next.html의 release manifest URL v4 일치. 전용 검사는 URL 개수·동일 origin·유효 버전·양쪽 equality를 검증한다.
- Rules, Functions runtime/exports, legacy app.js, package manifests/lockfiles, IAM은 변경하지 않았다. Functions 변경은 테스트 두 개다.
- 기존 main 문서 diff 추가 문장 누락 0, 알려진 secret 패턴 검출 0. 사용자 로컬 파일 두 개의 ignore 규칙 유지. 키·토큰·환경값은 커밋하지 않는다.

## 최종 통합 트리 자동검증

| 검사 | 결과 |
| --- | --- |
| npm test / typecheck | PASS |
| 기본 npm build lifecycle / admin build | PASS / PASS |
| Release gate / manifest | 33/33 / 18/18 |
| 시간표 관리 / row | 6/6 / 10/10 |
| Functions 단위(Node 22.23.5) | 559/559 |
| Functions demo 통합 | 11개 흐름 PASS |
| active Rules | 171/171 |
| configured teacher scope + candidate Auth/workspace | 39/39(9+30) |
| Browser 전체(Node 24.22.1) | 21/21, fail/cancel/skip/todo 0 |
| PDF 텍스트 | 양쪽 canonical 포함, mixed는 App Next만 포함 |
| diff whitespace / 사용자 기록 보존 / secret 패턴 | PASS |

Java 21.0.13과 demo/loopback만 사용했다. Node 22 공식 Windows zip은 공식 SHASUMS256과 대조했다. 기존 동일 lockfile의 PC 의존성을 사용했고 Functions/Rules 의존성은 이 worktree에 junction으로 연결했다. main Firebase 설정은 생성 대상이 아니며 demo 설정은 최종 worktree에만 생성됐다.

원시 로그·각 Emulator 로그 복사본·PDF·스크린샷·감사 JSON은 tmp/pc-final-validation-20261113 및 tmp/followup-*에 보존한다. 로그를 삭제하지 않았다. 기본 Vite classic script/use client 경고와 Emulator의 예상 거부 관련 진단은 테스트 결과와 구분한다.

## 잔여 위험

현재 PC 감사: 루트32(높음14), 운영10(높음5), Functions9(높음1), Rules 도구33(높음14). dependency audit는 수행됐지만 취약점 제거 검사는 아니며 의존성 수정은 없다. Cloud의 과거 55/14/16/49와 다른 시점의 registry 결과다.

임의 ID legacy 수업 생성과 교시 삭제의 전역 직렬화는 미구현이며 교시 삭제를 계속 막는다. 학교 scope는 운영 쓰기 endpoint로 연결되지 않았다. legacy mixed 일정 제목/내보내기 누락, 모바일 sidebar, App Next 인쇄 전용 layout, 물리 프린터·실데이터·장시간 offline은 후속 항목이다.

## 원본 보호와 공개 조건

기존 안전 백업 C:\dev\_git-safety\My-Web-main-merge-prep-20261112-221220-90082648과 새 C:\dev\_git-safety\My-Web-pc-cloud-final-20261113-6af94dbb에 네 사용자 파일·tracked patch를 보존했다. 검증 중 원본 main은 변경하지 않았다.

검증된 최종 브랜치를 먼저 push하고 원격 main이 기존 기준에서 이동하지 않았으며 FF 자손인지 재확인해 refspec으로 main을 갱신한다. 그 뒤에만 원본 SHA·통합 기록·정확히 두 tracked 파일 조건을 재확인해 중복 main 문서 diff를 정리하고 로컬 main을 FF한다. 최종 결과는 Git refs와 로컬 증거 final-state.json에서 확인한다. 강제 push·운영 Firebase·배포·IAM 변경은 수행하지 않는다.
