# 백업·복구 매뉴얼 초안

## 현재 사실

코드에서 복구 도구와 recovery gate는 확인되지만 자동 백업 서비스, 보존 주기, 완전한 Firestore/Storage export는 확인되지 않았다. 따라서 “복구 가능”을 보장하지 않는다.

## 대상과 제외

백업 후보는 Firestore users/workspaces와 하위 collection, Auth 사용자 메타데이터, Storage metadata, Rules/Indexes 승인본, release manifest, 배포 산출물이다. token, 비밀번호, API key, `.env`, `firestore.rules.next`, 로컬 로그와 사용자 원문은 일반 백업 공유 대상에서 제외한다.

## 복구 절차

1. 사고 범위와 기준 시각을 고정한다.
2. 현재 users/workspace/membership/관련 collection을 read-only로 보존한다.
3. 원본과 복구 후보를 fingerprint·문서 수·참조 정합성으로 비교한다.
4. 별도 환경에서 Rules와 역할을 검증한다.
5. 승인된 단일 필드/문서만 명시적으로 복구한다.
6. AppSession, server read, 다른 workspace 격리, 첨부 metadata를 확인한다.
7. 실패하면 운영 복귀를 중지하고 사후 기록을 남긴다.

자동 대량 복구, 임의 workspace 생성, membership 자동 연결, 사용자 역할 변경은 금지한다. 보존 기간과 주기는 법무·운영 승인 후 정한다.
