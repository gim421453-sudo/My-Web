# 소개 웹·서비스 콘솔 구조 계획

현재 프로젝트에서 확인되는 것은 운영 정적 앱, app-next, 개발/진단 entry와 공유 Firebase runtime/auth 모듈이다. 공개 소개 웹, 요금제, 결제, 청구, 사용량 콘솔, FAQ/약관 사이트는 이 저장소에서 운영 기능으로 확인되지 않았다.

## 권장 분리

- 소개 웹: 공개 정적 배포 단위
- 인증/계정: Firebase Auth와 제한된 계정 상태 화면
- 서비스 콘솔: workspace session과 역할 guard를 가진 별도 앱
- 시스템 콘솔: system_owner 전용 별도 배포 경계

재사용 후보는 `src/auth/*`, AppSession resolver, fingerprint/diagnostics 규칙이다. 운영 app.js와 app-next를 같은 메뉴/쓰기 상태로 합치지 않는다. 새 repository/subdomain/환경변수는 보안·배포 승인 뒤 결정한다. 결제·Billing·한도·Backup은 새 서버 경계와 Rules가 필요하며 현재 구현하지 않는다.
