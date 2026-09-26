# 배포·롤백 매뉴얼 초안

## 현재 배포 경계

운영 정적 앱은 `index.html + app.js?v=143`, React는 `app-next.html` 별도 entry다. Firebase Hosting public은 `dist`이며 `postbuild`가 정적 asset을 복사한다. live URL과 Rules는 이번 감사에서 건드리지 않는다.

## 배포 전

1. `git status`, diff, 제외 파일 확인
2. 의도한 파일만 명시적으로 staging
3. typecheck, auth/timetable/owner-preview gate, build, dist 민감정보 검사
4. Release Manifest와 Owner Preview 범위 확인
5. Rules/Indexes 승인과 실제 데이터 migration 여부를 별도 승인
6. 10B-2D 수동검증과 workspace 격리 확인

## 채널

- 로컬: `http://127.0.0.1:5173/`
- Owner Preview: system_owner 전용, release gate와 noindex 유지
- Private beta: 초대·지원·약관·모니터링이 준비되기 전 차단
- 정식 배포: 현재 차단

## 롤백 조건과 절차

P0/P1 회귀, cross-workspace 노출, 원격 write 오판, 민감정보 노출, quota 폭증이면 배포를 중단한다. 이전 안정 커밋을 확인하고, 새 배포를 중단한 뒤 Hosting의 승인된 이전 release로 되돌린다. 코드 복귀는 명시적 파일 확인 후 별도 승인된 Git 작업으로 수행한다. Rules와 데이터 rollback은 코드 rollback과 분리하며 자동 명령으로 실행하지 않는다.

## 배포 후

로그인 유지, workspace fingerprint, 공지/일정/시간표 핵심 read, write-confirm, listener count, Console 민감정보, release marker, noindex를 확인한다. 실패하면 live 데이터 수정 전에 rollback gate를 적용한다.
