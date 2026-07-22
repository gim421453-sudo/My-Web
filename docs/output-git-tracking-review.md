# output Git Tracking Review

작성일: 2026-07-21

## 실행한 확인 명령

```powershell
git ls-files output
git status --short output
git grep -n -I "firebase\|apiKey\|gmail\|@\|RAOf\|YMPA\|RVTg\|AIza" -- output
```

## 현재 상태

- `output/`는 `.gitignore`에 추가되어 있습니다.
- 그러나 이미 Git에 추적 중인 `output/` 파일이 35개 있습니다.
- `git status --short output` 결과 현재 `output/` 아래의 신규 변경 파일은 표시되지 않았습니다.
- 새 감사 결과인 `output/auth-data-audit.*`, `output/workspace-integrity-audit.*`, `output/auth-migration-plan.*`는 커밋 대상이 아닙니다.

## 추적 중인 파일 분류

| 분류 | 수 | 설명 | 권장 |
| --- | ---: | --- | --- |
| PDF 산출물 | 3 | 명령어 참고 PDF, 점검 체크리스트 PDF, 발표 UI 스냅샷 PDF | 문서로 유지할 가치가 있으면 `docs/`로 이동 검토, 아니면 untrack 후보 |
| Markdown 보고서 | 1 | `presentation-ui-snapshot-report.md` | 유지 가치가 있으면 `docs/`로 이동 검토, 아니면 untrack 후보 |
| PNG 캡처 | 31 | 발표용 UI 탭별 스냅샷 | 생성 산출물이므로 untrack 후보 |
| 감사 결과 | 0 | 현재 추적 중인 감사 JSON/MD 없음 | 계속 Git 제외 유지 |
| 일반 빌드 산출물 | 0 | `dist/`, `build/`와 별개 | Git 제외 유지 |

## 민감정보 확인 결과

텍스트 기반 검색 결과는 다음 2건만 발견되었습니다.

- `output/presentation-ui-snapshot-report.md`: 데이터가 샘플/마스킹되었다는 설명
- `output/presentation-ui-snapshot-report.md`: preview 서버가 config 응답을 마스킹한다는 설명

현재 텍스트 검색 범위에서는 Firebase API key, 전체 UID, 실제 이메일 원문이 발견되지 않았습니다. 다만 PNG/PDF는 바이너리 또는 이미지라 텍스트 검색만으로 개인정보 노출을 완전히 보장할 수 없습니다. 시각 자료는 별도 수동 확인이 필요합니다.

## 로컬 Git 기록 범위 확인

`git log --all --name-only --pretty=format: -- output` 기준으로, Git 기록에 보이는 `output/` 파일은 발표 UI 스냅샷, 발표 보고서, 명령어/체크리스트 PDF 계열입니다. 현재 로컬 기록 범위에서는 `auth-data-audit.json`, `workspace-integrity-audit.json`, Firebase service account, `.env`가 `output/` 경로에 추적된 흔적은 보이지 않습니다.

## 삭제 또는 untrack 후보

다음 파일들은 로컬 파일을 유지하면서 Git 추적만 제거하는 후보입니다.

- `output/presentation-ui-snapshot/` 전체 PNG
- `output/presentation-ui-snapshot.pdf`
- `output/presentation-ui-snapshot-report.md`
- `output/pdf/cmd-commands-reference.pdf`
- `output/pdf/test-checklist-reference.pdf`

## 후보 명령

아직 실행하지 마세요. 실제 실행 전 사용자의 검토와 승인 필요.

```powershell
git rm -r --cached output
```

이 명령은 로컬 파일을 삭제하지 않고 Git 추적에서만 제거합니다. 실행 후에는 `.gitignore`의 `output/` 규칙 때문에 새 감사 산출물과 발표 산출물이 다시 추적되지 않습니다.

## 다음 판단

1. 발표용 PDF/PNG를 Git에 계속 유지할지 결정
2. 유지한다면 `docs/` 또는 별도 `presentation/` 폴더로 옮길지 결정
3. 생성 산출물로 본다면 `git rm -r --cached output` 실행 승인
4. 원격 저장소에 이미 올라간 이미지/PDF의 민감정보 시각 검토
