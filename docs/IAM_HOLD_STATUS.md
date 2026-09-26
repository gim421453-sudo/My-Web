# MY WEB IAM 개발 중단 및 인수인계 상태

## 1. 현재 상태

상태:

`IAM_STATUS = HOLD`

`IAM_FINAL_PASS = false`

개발 중단 이유:

IAM 자체의 Google Cloud 권한 문제라기보다, 현재 production 코드에는 clean generation, mutation packet, source-lock, pre-read, `setIamPolicy`, post-read를 하나의 실제 live executor에서 안전하게 결속하여 실행하는 production mutation 경로가 아직 없다.

단순히 `setIamPolicy` 제한을 해제하는 방식은 금지한다.

## 2. 현재까지 완료된 것

- 이전 전체 authority qualification 결과는 `PASS`, 당시 기록된 current regression은 `0`이다. 이번 확인에서는 전체 qualification runner를 다시 실행하지 않았다.
- canonical authority store 경로를 runtime 경로 계산 함수로 확인했다.
- stale active candidate를 기존 `canonical-ineligible` lifecycle transition으로 정리했다. 현재 active candidate와 active intent는 모두 `0`이다.
- 기존 test/evidence에서 UNSET Policy read 및 mutation request 준비 지원을 확인했다.
- installed Cloud SDK Apitools Policy 계약 검증 test가 존재한다. 단, 이번 로컬 재실행에서 해당 static-contract test 하나가 실패했다. 실패는 Python helper의 현재 소스 표현과 test의 과거 정규식 기대값 불일치이며, 이번 작업에서는 변경하거나 재분류하지 않았다.
- raw ETag를 fresh pre-read에서 받아 mutation 경로로 전달하는 기존 구조와 local fixture test를 확인했다.
- local fake-provider pre-read → set → post-read E2E test는 통과했다.
- 해당 E2E는 target `ABSENT`에서 `PRESENT_AS_EXPECTED`로 전이하고, 재시도 없이 set 1회를 사용한다.
- unrelated bindings 보존 및 조건부 policy 처리에 관한 local fixture/test가 존재한다.
- baseline-capable CAS read evidence를 확인했다. operation `ab9841ca-e096-4042-ab53-b47368e22b5b`의 결과는 HTTP 200, `CAS=RESOLVED`, target `ABSENT`, `baselineCapable=true`이다. 이는 immutable historical read evidence이며, 현재 source/generation 실행 권한으로 재사용하지 않는다.
- 이번 확인에서 `g2bCleanGenerationCasEvidenceCapture.test.mjs` 및 `g2bCleanGenerationBootstrap.test.mjs`는 통과했다. IAM 실제 `setIamPolicy`는 실행되지 않았다.

## 3. Canonical authority store

현재 canonical authority store:

`C:\Users\USER\AppData\Local\MY-WEB\authority-audit\clean-generations-v1`

읽기 전용 재확인 결과:

- active candidate count: `0`
- active intent count: `0`
- manifest chain: 유효, `11`개
- latest manifest: version `11`, digest `babd5c6c1f223829796f148684b8b4c587c3be7db32efd99f2759495fde32c25`
- latest manifest generation: `9599b7b5-5d49-4c3e-87fd-96435588bf47`
- latest generation source fingerprint: `117c47390ae507f28028fcbda1202fd6dc5714d28f51340d1d8647f98de97560`
- latest generation lifecycle: terminal `canonical-ineligible`

Store, manifest chain 및 기존 evidence는 변경하지 않았다.

## 4. Source 상태

canonical source fingerprint 도구로 현재 source를 다시 계산했다.

- source file count: `54 / 54`
- full fingerprint: `8811e4f5c7f40ff6bbaf2243eb15c5bac543617a4b8e70eafffac00bf0d91c0c`
- missing: `0`
- mismatch: `0` (현재 canonical source 목록에서 재계산한 각 파일과 일치)
- unexpected: `0`

주의: 기존 latest manifest가 고정한 지문은 `117c4739...`로 현재 지문과 다르다. 따라서 그 manifest/generation의 source binding은 현재 source와 일치하지 않으며 재사용하면 안 된다. 현재 source 지문은 이번에 새 source-lock으로 저장하지 않았다.

## 5. 현재 마지막 blocker

현재 clean-generation CAS 실행 경로는 read-only 중심이다. 실행 의도/packet validation은 `setIamPolicyMax = 0`을 강제하며, clean-generation CAS executor도 읽기 전용 packet을 요구한다.

기존 explicit mutation executor는 provider 주입형 local 실행 경로다. clean-generation, mutation packet, source-lock binding과 실제 live provider 실행을 하나로 검증·결속하는 production 경로가 아니다.

따라서 남은 핵심 작업은 다음과 같다.

> 검증된 clean-generation mutation packet과 generation/source binding을 확인한 뒤, 실제 provider에서 pre-read → `setIamPolicy` 최대 1회 → post-read를 실행하는 production mutation executor 완성.

`setIamPolicyMax` 제한만 단독으로 해제해서는 안 된다.

## 6. 다음 재개 시 첫 작업

`NEXT_STAGE = PRODUCTION_CLEAN_GENERATION_MUTATION_EXECUTOR`

재개 시 처음부터 다시 하지 않는다. 먼저 현재 source/store 상태와 아래 완료 근거를 확인하고, production mutation executor라는 남은 항목부터 시작한다.

- authority qualification 및 historical/obsolete 분류
- UNSET read contract와 Apitools Policy parsing
- baseline evidence 및 baseline-capable read contract
- raw ETag pre-read 방식
- local UNSET mutation preparation 및 fake-provider pre-read/set/post-read E2E
- canonical authority store discovery

이번에 실패한 SDK static-contract test는 재개 시 현재 구현과 security invariant 기준으로 판정해야 한다. 과거 artifact나 기대값을 임의 수정하지 않는다.

## 7. 최종 IAM 목표

1. 새 clean generation 생성
2. mutation packet, source, generation binding 검증
3. pre-read `getIamPolicy` 최대 1회
4. current policy/CAS/raw ETag 확인
5. exact target binding만 추가
6. `setIamPolicy` 최대 1회
7. post-read `getIamPolicy` 최대 1회
8. target `PRESENT_AS_EXPECTED` 확인
9. unrelated bindings 및 conditions 보존 확인
10. `IAM_FINAL_PASS`

자동 재시도는 하지 않는다.

## 8. Target 정보

기존 verified read evidence와 대조하여 확인했다.

- Resource: `myweb-class-mig-writer-g2@my-management-app-8a933.iam.gserviceaccount.com`
- Role: `roles/iam.serviceAccountTokenCreator`
- Member: `user:gim421453@gmail.com`

근거: `docs/evidence/g2b-clean-cas-read-ab9841ca-e096-4042-ab53-b47368e22b5b-result.json`. 이 문서는 기존 read 결과이며 이번에 수정하지 않았다.

## 9. 실행 금지 상태

IAM HOLD 중에는 다음을 수행하지 않는다.

- 새 generation 또는 새 IAM operation 생성
- credential refresh
- `getIamPolicy` 또는 `setIamPolicy`
- production IAM mutation
- authority store/evidence 임의 수정 또는 historical evidence rewrite
- Git stage, commit, push 또는 deploy

## 10. 개발 재개 정책

`IAM_STATUS = HOLD`는 MY WEB 전체 개발을 막지 않는다. 애플리케이션 기능 개발, UI 개선, 버그 수정, 로컬 테스트 및 Firebase Emulator 기반 개발은 IAM production 변경과 별도로 계속할 수 있다.

실제 production IAM이 필요한 배포 단계 전에 이 문서를 기준으로 IAM 작업을 재개한다.

## 11. 작성 근거

- 작성 시각: `2026-09-27 01:56:18 KST`
- Git branch: `checkpoint/notice-auth-recovery-20260723`
- Git HEAD: `84b2c1645e8df47e5a3069292816890759a7c941`
- working tree dirty: `yes` (기존 변경이 다수 있으며 이번 작업에서는 보존)
- canonical source: `54`개, `8811e4f5c7f40ff6bbaf2243eb15c5bac543617a4b8e70eafffac00bf0d91c0c`
- canonical authority store: `C:\Users\USER\AppData\Local\MY-WEB\authority-audit\clean-generations-v1`
- 이번 작업의 IAM remote mutation count: `0`
- 마지막 blocker: packet/generation/source-lock binding과 실제 provider 실행을 결속한 production clean-generation mutation executor 부재
- 이번 작업의 targeted test 재확인: mutation local E2E PASS, clean CAS PASS, bootstrap PASS, SDK static-contract test FAIL (미분류; 재개 시 검토 필요)
