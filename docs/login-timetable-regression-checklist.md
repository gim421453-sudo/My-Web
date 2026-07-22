# 로그인·시간표 회귀 체크리스트

기준 origin: `http://127.0.0.1:5173`  
주의: `localhost`와 `127.0.0.1`은 브라우저에서 다른 origin입니다. Firebase Auth 세션, `localStorage`, `sessionStorage`가 달라질 수 있으므로 브라우저 확인은 모두 `127.0.0.1`로 통일합니다.

## 1. 실행 전 확인

```powershell
git status --short
node --check app.js
node --check services\workspaceDataService.js
npm.cmd run typecheck
npm.cmd test
npm.cmd run build
```

`npm.cmd run build`가 로컬 권한 문제로 `spawn EPERM`을 내면, 같은 코드 기준으로 Vite 직접 빌드를 1회 확인합니다.

```powershell
$OutputEncoding = [System.Text.UTF8Encoding]::new()
[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new()
& 'C:\Users\USER\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' 'node_modules\vite\bin\vite.js' build
```

## 2. 서버 실행

```powershell
npm.cmd run dev -- --host 127.0.0.1 --port 5173
```

브라우저 주소:

```text
http://127.0.0.1:5173/
```

## 3. 로그인·세션

| 항목 | 기대 결과 | 결과 |
| --- | --- | --- |
| 로그인 화면 진입 | 내부 화면이 보이지 않고 로그인 화면만 표시 | 미확인 |
| 이메일/비밀번호 로그인 | 로그인 성공 후 권한에 맞는 화면 표시 | 미확인 |
| Google 로그인 | 로그인 성공 또는 사용자 취소 문구 정상 표시 | 미확인 |
| 로그인 유지 미체크 | 브라우저 재시작 후 의도치 않은 자동 진입 없음 | 미확인 |
| 로그인 유지 체크 | 같은 origin에서 세션 복원 | 미확인 |
| 로그아웃 후 새로고침 | 로그인 화면 유지 | 미확인 |
| 시스템 오너 | Shadow 진단에서 `hasCriticalMismatch == false` | 미확인 |
| 일반 계정 | 자기 권한 범위 화면만 표시, permission-denied 없음 | 미확인 |

## 4. 시간표 기본 진입

| 항목 | 기대 결과 | 결과 |
| --- | --- | --- |
| 시간표 탭 첫 진입 | 선택된 시간표와 교시 시간이 표시 | 미확인 |
| 시간표 탭 새로고침 | 같은 시간표와 교시 시간 복원 | 미확인 |
| 다른 탭 이동 후 복귀 | 시간표 누락 없음 | 미확인 |
| 반복 진입 5회 | 데이터가 사라지거나 중복 생성되지 않음 | 미확인 |
| 빈 workspace 또는 빈 시간표 | 자동 기본 시간표 생성 없이 빈 상태 안내 | 미확인 |

## 5. 시간표별 교시 시간

테스트는 임시 시간표 또는 삭제 가능한 테스트 데이터로만 진행합니다.

| 항목 | 기대 결과 | 결과 |
| --- | --- | --- |
| A 시간표 1교시 `09:00~09:50` 저장 | 저장 메시지 후 화면 유지 | 미확인 |
| B 시간표 1교시 `13:00~13:50` 저장 | A와 다른 시간 유지 | 미확인 |
| A/B 전환 | 각 시간표별 시간이 즉시 변경 | 미확인 |
| 새로고침 후 A/B 전환 | 저장된 시간 유지 | 미확인 |
| 일부 교시만 시간 설정 | 설정된 교시는 set별 시간, 나머지는 공통 fallback 또는 시간 없음 | 미확인 |
| 교시 시간 저장 반복 | 중복 교시 row 생성 없음 | 미확인 |

개발 콘솔 확인:

```javascript
window.PMTimetableDiagnostics?.periodTimes?.()
window.PMTimetableDiagnostics?.resolvePeriodTime?.("1교시")
```

## 6. 빠른보기

| 항목 | 기대 결과 | 결과 |
| --- | --- | --- |
| 빠른보기 열기 | 일반 시간표와 같은 선택 시간표 표시 | 미확인 |
| 과목/요일/교시 | 일반 시간표와 동일 | 미확인 |
| 교시 시간 | 현재 선택 시간표 기준으로 표시 | 미확인 |
| 시간표 이름 변경 후 | 빠른보기 제목 또는 선택 UI 즉시 반영 | 미확인 |
| 수업 추가/수정/삭제 후 | 빠른보기 즉시 반영 | 미확인 |
| 삭제된 시간표 선택값 | 다른 시간표 자동 표시 없이 안내 표시 | 미확인 |
| orphan row | 빠른보기에 표시되지 않음 | 미확인 |

## 7. 방과후·동아리·특강 상세

각 수업 유형별로 같은 항목을 반복 확인합니다.

| 항목 | 기대 결과 | 결과 |
| --- | --- | --- |
| 상세 화면 진입 | 메인으로 튕기지 않음 | 미확인 |
| 시간표 추가배정 열기 | 교시 select option 중복 없음 | 미확인 |
| A 시간표 연결 | A 시간표 교시 시간이 option label에 표시 | 미확인 |
| B 시간표 연결 | B 시간표 교시 시간이 option label에 표시 | 미확인 |
| option value | `1교시`, `2교시` 형식 유지 | 미확인 |
| 배정 저장 | 해당 프로그램 화면에 머무름 | 미확인 |
| 전체 시간표 반영 | 같은 source of truth 기준으로 표시 | 미확인 |
| 상세에서 변경 | 전체 시간표와 빠른보기에 반영 | 미확인 |

## 8. 수업 row 개별 삭제

실제 운영 데이터가 아닌 임시 row로만 테스트합니다.

| 항목 | 기대 결과 | 결과 |
| --- | --- | --- |
| 월요일 1교시 삭제 | 월요일 1교시 row만 삭제 | 미확인 |
| 월요일 2교시 유지 | 같은 요일 다른 교시 유지 | 미확인 |
| 화요일 1교시 유지 | 같은 교시 다른 요일 유지 | 미확인 |
| B 시간표 1교시 유지 | 다른 시간표 row 유지 | 미확인 |
| 삭제 취소 | 모든 row 유지 | 미확인 |
| 삭제 후 새로고침 | 삭제한 row만 사라짐 | 미확인 |
| Google 재인증 | 수업 row 개별 삭제에는 뜨지 않음 | 미확인 |

## 9. Firestore 동기화·quota 안정성

Firestore 무료 quota가 초기화된 뒤 한 탭에서 먼저 확인합니다.

```javascript
window.PMWorkspaceDataService?.diagnostics?.()
window.PMTimetableDiagnostics?.workspaceSync?.()
```

확인 기준:

| 항목 | 기대 결과 | 결과 |
| --- | --- | --- |
| active listener 수 | 한 workspace 기준 중복 없이 안정 | 미확인 |
| listener path | 같은 컬렉션 경로가 반복 등록되지 않음 | 미확인 |
| saveScheduledCount | 렌더만으로 계속 증가하지 않음 | 미확인 |
| saveInFlight | 저장 후 false로 안정 | 미확인 |
| lastFlushKeys | 변경한 key만 포함 | 미확인 |
| periodTimes 저장 | `periodTimes`만 flush | 미확인 |
| quota 오류 | 즉시 무한 재시도 없음 | 미확인 |
| 다른 기기 반영 | 같은 workspace 사용자에게 변경 표시 | 미확인 |

## 10. 관리자·권한 회귀

| 항목 | 기대 결과 | 결과 |
| --- | --- | --- |
| 시스템 오너 전용 화면 | 운영 앱과 분리된 진단 화면 정상 | 미확인 |
| 사용자 관리 | 같은 workspace 사용자만 표시 | 미확인 |
| 권한 변경 | users 문서와 nested members 기준 일치 | 미확인 |
| pending 계정 | 보호 데이터 조회 없이 승인 대기 화면 | 미확인 |
| disabled 계정 | 로그인 또는 기능 접근 차단 | 미확인 |
| permission-denied 로그 | 발생 시 경로·role·workspaceId 마스킹 로그 표시 | 미확인 |

## 11. 제외 대상

아래 자료는 체크리스트 결과나 커밋 대상에 포함하지 않습니다.

- `.env`
- `.env.local`
- Firebase API key 또는 service account
- 실제 이메일, 전화번호, UID, workspaceId 원문
- 콘솔 캡처 이미지
- Network 로그 원본
- 진단 출력 원본
- `output/`

## 12. 통과 기준

다음이 모두 만족되면 “로그인·시간표 안정화 기준점”을 수동 통과로 볼 수 있습니다.

- 자동 테스트: 인증 290개, 시간표 109개 통과
- `node --check app.js` 통과
- `node --check services\workspaceDataService.js` 통과
- `npm.cmd run typecheck` 통과
- 빌드 통과 또는 Vite 직접 빌드 통과
- 로그인·로그아웃 회귀 없음
- 시간표별 교시 시간 저장·복원 정상
- 일반 시간표, 빠른보기, 방과후·동아리·특강 상세가 같은 데이터 표시
- Firestore quota 초기화 후 write 폭증 없음
- permission-denied 없음
- 다른 workspace 데이터 노출 없음

## 13. 기록 양식

```text
확인일:
브라우저:
origin: http://127.0.0.1:5173
계정 역할:
workspace:

자동 테스트:
- auth:
- timetable:
- typecheck:
- build:

수동 테스트:
- 로그인:
- 시간표:
- 빠른보기:
- 프로그램 상세:
- Firestore sync:

발견 버그:
- 

조치:
- 
```
