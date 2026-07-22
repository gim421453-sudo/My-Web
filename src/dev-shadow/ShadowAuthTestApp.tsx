import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  onAuthStateChanged,
  type User,
} from "firebase/auth";
import { auth } from "../lib/firebase";
import {
  maskEmail,
  maskUid,
  maskWorkspaceId,
  readLegacySessionSnapshot,
  runShadowSessionComparison,
  ShadowAuthObserver,
  type LegacySessionSnapshot,
  type ShadowSessionDiagnostic,
} from "../auth/shadow";
import { createShadowReadRepository } from "../auth/shadow/shadowReadRepository";
import {
  assertSafeSummaryHasNoSensitiveIdentifiers,
  createSafeShadowSummary,
  getShadowResultLevel,
  phaseForShadowSession,
} from "./shadowPageUtils";

function yesNo(value: boolean | null | undefined): string {
  if (value === null || value === undefined) return "-";
  return value ? "true" : "false";
}

function valueOrDash(value: string | null | undefined): string {
  return value && value.trim() !== "" ? value : "-";
}

function codes(items: readonly { code: string }[] | undefined): string {
  if (!items || items.length === 0) return "-";
  return items.map((item) => item.code).join(", ");
}

function resultClass(diagnostic: ShadowSessionDiagnostic | null): string {
  return getShadowResultLevel(diagnostic?.comparison ?? null).toLowerCase();
}

export function ShadowAuthTestApp() {
  const repository = useMemo(() => createShadowReadRepository(), []);
  const [firebaseUser, setFirebaseUser] = useState<User | null>(auth.currentUser);
  const [authReady, setAuthReady] = useState(false);
  const [legacySnapshot, setLegacySnapshot] = useState<LegacySessionSnapshot | null>(null);
  const [diagnostic, setDiagnostic] = useState<ShadowSessionDiagnostic | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const updateDiagnostic = useCallback((nextDiagnostic: ShadowSessionDiagnostic) => {
    setDiagnostic(nextDiagnostic);
    setLegacySnapshot(nextDiagnostic.legacySession);
  }, []);

  const shadowLogger = useCallback((payload: unknown) => {
    console.info("[Auth Shadow Live Test]", payload);
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (nextUser) => {
      setFirebaseUser(nextUser);
      setAuthReady(true);
    });

    return unsubscribe;
  }, []);

  const readLegacy = useCallback(() => {
    const snapshot = readLegacySessionSnapshot({ firebaseUser });
    setLegacySnapshot(snapshot);
    setMessage(snapshot
      ? "Legacy snapshot을 다시 읽었습니다."
      : "Legacy snapshot을 찾지 못했습니다. 기존 앱과 같은 origin인지 확인하세요.");
    return snapshot;
  }, [firebaseUser]);

  const runComparison = useCallback(async (
    legacy: LegacySessionSnapshot | null = legacySnapshot,
  ) => {
    setBusy(true);
    try {
      const nextDiagnostic = await runShadowSessionComparison({
        firebaseUser,
        repository,
        legacySession: legacy,
        enableLogging: import.meta.env.DEV,
        logger: shadowLogger,
      });
      updateDiagnostic(nextDiagnostic);
      setMessage("Shadow 비교를 다시 실행했습니다.");
    } finally {
      setBusy(false);
    }
  }, [
    firebaseUser,
    legacySnapshot,
    repository,
    shadowLogger,
    updateDiagnostic,
  ]);

  const recomputeNewSession = useCallback(() => {
    void runComparison(legacySnapshot);
  }, [legacySnapshot, runComparison]);

  const rerunFullComparison = useCallback(() => {
    const nextLegacy = readLegacy();
    void runComparison(nextLegacy);
  }, [readLegacy, runComparison]);

  const copySafeSummary = useCallback(async () => {
    if (!diagnostic) {
      setMessage("복사할 Shadow 결과가 아직 없습니다.");
      return;
    }

    const summary = createSafeShadowSummary(diagnostic, Boolean(firebaseUser));
    if (!assertSafeSummaryHasNoSensitiveIdentifiers(summary)) {
      setMessage("안전 요약에 민감 식별자 후보가 있어 복사를 중단했습니다.");
      return;
    }

    await navigator.clipboard.writeText(JSON.stringify(summary, null, 2));
    setMessage("민감정보 없는 요약을 클립보드에 복사했습니다.");
  }, [diagnostic, firebaseUser]);

  const result = getShadowResultLevel(diagnostic?.comparison ?? null);
  const phase = phaseForShadowSession(Boolean(firebaseUser), diagnostic?.shadowSession ?? null);

  return (
    <main className="shadow-page">
      <ShadowAuthObserver
        repository={repository}
        enableLogging={import.meta.env.DEV}
        logger={shadowLogger}
        onDiagnostic={updateDiagnostic}
      />

      <header className="shadow-hero">
        <div>
          <p className="eyebrow">Development only</p>
          <h1>Shadow Auth 실계정 검증</h1>
          <p>
            기존 운영 앱 로그인은 그대로 두고, 같은 origin의 legacy session과 신규 AppSession을 읽기 전용으로 비교합니다.
          </p>
        </div>
        <div className={`result-pill ${resultClass(diagnostic)}`}>
          {result}
        </div>
      </header>

      <section className="notice">
        <strong>같은 origin 확인:</strong>{" "}
        <span>{window.location.origin}</span>
        <p>
          기존 앱과 이 페이지는 모두 `http://127.0.0.1:5173` 기준으로 여세요. `localhost`는 다른 origin이라 검증에 사용하지 않습니다.
        </p>
      </section>

      <section className="actions" aria-label="Shadow test actions">
        <button type="button" onClick={recomputeNewSession} disabled={busy}>
          신규 세션 다시 계산
        </button>
        <button type="button" onClick={readLegacy} disabled={busy}>
          Legacy snapshot 다시 읽기
        </button>
        <button type="button" onClick={rerunFullComparison} disabled={busy}>
          비교 다시 실행
        </button>
        <button type="button" onClick={() => console.clear()}>
          콘솔 출력 지우기
        </button>
        <button type="button" onClick={() => void copySafeSummary()} disabled={!diagnostic}>
          안전한 요약 복사
        </button>
      </section>

      {message ? <p className="message">{message}</p> : null}

      <section className="grid">
        <article className="panel">
          <h2>Firebase Auth 상태</h2>
          <dl>
            <dt>ready</dt>
            <dd>{yesNo(authReady)}</dd>
            <dt>authenticated</dt>
            <dd>{yesNo(Boolean(firebaseUser))}</dd>
            <dt>masked uid</dt>
            <dd>{valueOrDash(maskUid(firebaseUser?.uid))}</dd>
            <dt>masked email</dt>
            <dd>{valueOrDash(maskEmail(firebaseUser?.email))}</dd>
            <dt>emailVerified</dt>
            <dd>{yesNo(firebaseUser?.emailVerified)}</dd>
          </dl>
        </article>

        <article className="panel">
          <h2>Legacy session snapshot</h2>
          <dl>
            <dt>isAuthenticated</dt>
            <dd>{yesNo(legacySnapshot?.isAuthenticated)}</dd>
            <dt>masked uid</dt>
            <dd>{valueOrDash(maskUid(legacySnapshot?.uid))}</dd>
            <dt>status</dt>
            <dd>{valueOrDash(legacySnapshot?.status)}</dd>
            <dt>role</dt>
            <dd>{valueOrDash(legacySnapshot?.role)}</dd>
            <dt>currentRole</dt>
            <dd>{valueOrDash(legacySnapshot?.currentRole)}</dd>
            <dt>globalRole</dt>
            <dd>{valueOrDash(legacySnapshot?.globalRole)}</dd>
            <dt>workspaceRole</dt>
            <dd>{valueOrDash(legacySnapshot?.workspaceRole)}</dd>
            <dt>currentWorkspaceId</dt>
            <dd>{valueOrDash(maskWorkspaceId(legacySnapshot?.currentWorkspaceId))}</dd>
          </dl>
        </article>

        <article className="panel">
          <h2>신규 AppSession</h2>
          <dl>
            <dt>phase</dt>
            <dd>{phase}</dd>
            <dt>isAuthenticated</dt>
            <dd>{yesNo(diagnostic?.shadowSession?.isAuthenticated)}</dd>
            <dt>masked uid</dt>
            <dd>{valueOrDash(maskUid(diagnostic?.shadowSession?.uid))}</dd>
            <dt>status</dt>
            <dd>{valueOrDash(diagnostic?.shadowSession?.status)}</dd>
            <dt>globalRole</dt>
            <dd>{valueOrDash(diagnostic?.shadowSession?.globalRole)}</dd>
            <dt>isSystemOwner</dt>
            <dd>{yesNo(diagnostic?.shadowSession?.isSystemOwner)}</dd>
            <dt>currentWorkspaceId</dt>
            <dd>{valueOrDash(maskWorkspaceId(diagnostic?.shadowSession?.currentWorkspaceId))}</dd>
            <dt>currentWorkspaceRole</dt>
            <dd>{valueOrDash(diagnostic?.shadowSession?.currentWorkspaceRole)}</dd>
            <dt>warning codes</dt>
            <dd>{codes(diagnostic?.comparison.warnings)}</dd>
          </dl>
        </article>

        <article className="panel comparison-panel">
          <h2>비교 결과</h2>
          <dl>
            <dt>전체 결과</dt>
            <dd className={`status-text ${resultClass(diagnostic)}`}>{result}</dd>
            <dt>mismatch</dt>
            <dd>{codes(diagnostic?.comparison.mismatches)}</dd>
          </dl>
          <div className="mismatch-list">
            {diagnostic?.comparison.mismatches.length
              ? diagnostic.comparison.mismatches.map((mismatch) => (
                <div className={`mismatch ${mismatch.severity}`} key={`${mismatch.code}-${mismatch.message}`}>
                  <strong>{mismatch.code}</strong>
                  <span>{mismatch.severity}</span>
                  <p>{mismatch.message}</p>
                </div>
              ))
              : <p className="empty">mismatch 없음</p>}
          </div>
        </article>
      </section>

      <section className="checklist">
        <h2>실계정 검증 체크리스트</h2>
        <ol>
          <li>실제 system owner 계정</li>
          <li>currentWorkspaceId가 null인 active 일반 사용자</li>
          <li>disabled 값이 문자열 false인 사용자</li>
          <li>유효 nested membership이 있는 사용자</li>
          <li>워크스페이스가 없는 사용자</li>
          <li>viewer 또는 print_account 계정이 존재한다면 해당 계정</li>
        </ol>
      </section>

      <section className="network-note">
        <h2>Network 관찰</h2>
        <p>
          개발자도구 Network에서 Firestore `Commit`, `Write`, `BatchWrite`, create/update/delete 요청이 보이면 실패로 기록하세요.
          이 페이지는 읽기 비교만 수행해야 합니다.
        </p>
      </section>
    </main>
  );
}
