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
import { useAuth } from "../auth/useAuth";
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
  getShadowResultLevel,
  phaseForShadowSession,
} from "../dev-shadow/shadowPageUtils";
import {
  assertAdminBugReportHasNoRawIdentifiers,
  createSafeAdminBugReport,
  emptyAdminBugInput,
  type AdminBugInput,
  type PermissionDeniedState,
  type RefreshPersistenceState,
} from "./adminDiagnosticsUtils";
import type {
  OwnerAdminDiagnosticsAuthMode,
} from "./newAuthDiagnosticsFlag";

function valueOrDash(value: string | null | undefined): string {
  return value && value.trim() !== "" ? value : "-";
}

function yesNo(value: boolean | null | undefined): string {
  if (value === null || value === undefined) return "-";
  return value ? "true" : "false";
}

function codes(items: readonly { code: string }[] | undefined): string {
  if (!items || items.length === 0) return "-";
  return items.map((item) => item.code).join(", ");
}

interface OwnerAdminDiagnosticsAppProps {
  authMode?: OwnerAdminDiagnosticsAuthMode;
}

function NewProviderSessionPanel() {
  const newAuth = useAuth();

  return (
    <article className="panel">
      <h2>신규 AuthProvider 상태</h2>
      <dl>
        <dt>phase</dt>
        <dd>{newAuth.phase}</dd>
        <dt>Firebase uid</dt>
        <dd>{valueOrDash(maskUid(newAuth.firebaseUser?.uid))}</dd>
        <dt>session globalRole</dt>
        <dd>{valueOrDash(newAuth.session?.globalRole)}</dd>
        <dt>session workspaceRole</dt>
        <dd>{valueOrDash(newAuth.session?.currentWorkspaceRole)}</dd>
        <dt>session workspaceId</dt>
        <dd>{valueOrDash(maskWorkspaceId(newAuth.session?.currentWorkspaceId))}</dd>
        <dt>error</dt>
        <dd>{valueOrDash(newAuth.error?.code)}</dd>
        <dt>warnings</dt>
        <dd>{codes(newAuth.session?.warnings)}</dd>
      </dl>
    </article>
  );
}

function LegacyDirectModePanel() {
  return (
    <article className="panel">
      <h2>진단 인증 모드</h2>
      <dl>
        <dt>mode</dt>
        <dd>legacy-direct</dd>
        <dt>new AuthProvider</dt>
        <dd>off</dd>
      </dl>
      <p className="muted">
        신규 AuthProvider를 사용하지 않고 기존 직접 Firebase Auth 읽기 방식으로 동작합니다.
      </p>
    </article>
  );
}

export function OwnerAdminDiagnosticsApp({
  authMode = "legacy-direct",
}: OwnerAdminDiagnosticsAppProps) {
  const repository = useMemo(() => createShadowReadRepository(), []);
  const [firebaseUser, setFirebaseUser] = useState<User | null>(auth.currentUser);
  const [legacySnapshot, setLegacySnapshot] = useState<LegacySessionSnapshot | null>(null);
  const [diagnostic, setDiagnostic] = useState<ShadowSessionDiagnostic | null>(null);
  const [input, setInput] = useState<AdminBugInput>(() => emptyAdminBugInput());
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const updateDiagnostic = useCallback((nextDiagnostic: ShadowSessionDiagnostic) => {
    setDiagnostic(nextDiagnostic);
    setLegacySnapshot(nextDiagnostic.legacySession);
  }, []);

  const shadowLogger = useCallback((payload: unknown) => {
    console.info("[Owner Admin Diagnostics]", payload);
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (nextUser) => {
      setFirebaseUser(nextUser);
    });

    return unsubscribe;
  }, []);

  const updateField = useCallback(<K extends keyof AdminBugInput>(
    key: K,
    value: AdminBugInput[K],
  ) => {
    setInput((prev) => ({ ...prev, [key]: value }));
  }, []);

  const refreshContext = useCallback(async () => {
    setBusy(true);
    try {
      const nextLegacy = readLegacySessionSnapshot({ firebaseUser });
      const nextDiagnostic = await runShadowSessionComparison({
        firebaseUser,
        repository,
        legacySession: nextLegacy,
        enableLogging: import.meta.env.DEV,
        logger: shadowLogger,
      });
      updateDiagnostic(nextDiagnostic);
      setMessage("진단 컨텍스트를 다시 읽었습니다.");
    } finally {
      setBusy(false);
    }
  }, [
    firebaseUser,
    repository,
    shadowLogger,
    updateDiagnostic,
  ]);

  const copyReport = useCallback(async () => {
    const report = createSafeAdminBugReport({
      input,
      legacySession: legacySnapshot,
      diagnostic,
      firebaseAuthenticated: Boolean(firebaseUser),
      origin: window.location.origin,
    });

    if (!assertAdminBugReportHasNoRawIdentifiers(report)) {
      setMessage("진단 요약에 민감 식별자 후보가 있어 복사를 중단했습니다.");
      return;
    }

    await navigator.clipboard.writeText(JSON.stringify(report, null, 2));
    setMessage("민감정보 없는 관리자 버그 진단 요약을 복사했습니다.");
  }, [
    diagnostic,
    firebaseUser,
    input,
    legacySnapshot,
  ]);

  const result = getShadowResultLevel(diagnostic?.comparison ?? null);
  const phase = phaseForShadowSession(Boolean(firebaseUser), diagnostic?.shadowSession ?? null);
  const legacyWorkspaceId = legacySnapshot?.currentWorkspaceId ?? legacySnapshot?.workspaceId ?? null;

  return (
    <main className="shadow-page diagnostics-page">
      <ShadowAuthObserver
        repository={repository}
        enableLogging={import.meta.env.DEV}
        logger={shadowLogger}
        onDiagnostic={updateDiagnostic}
      />

      <header className="shadow-hero">
        <div>
          <p className="eyebrow">Development only</p>
          <h1>오너 관리자 화면 버그 진단</h1>
          <p>
            기존 관리자 화면을 교체하지 않고, 재현 정보와 읽기 전용 세션 컨텍스트를 함께 정리합니다.
          </p>
        </div>
        <div className={`result-pill ${result.toLowerCase()}`}>
          {result}
        </div>
        <div className={`result-pill ${authMode === "new-provider" ? "match" : "warning"}`}>
          {authMode}
        </div>
      </header>

      <section className="notice">
        <strong>같은 origin:</strong> <span>{window.location.origin}</span>
        <p>
          기존 앱에서 오너로 로그인한 뒤 관리자 화면 버그를 재현하고, 이 페이지에서 진단 정보를 작성하세요.
        </p>
      </section>

      <section className="actions" aria-label="Diagnostics actions">
        <a className="link-button" href="/" target="_blank" rel="noreferrer">
          기존 앱 열기
        </a>
        <button type="button" onClick={() => void refreshContext()} disabled={busy}>
          세션 컨텍스트 다시 읽기
        </button>
        <button type="button" onClick={() => console.clear()}>
          콘솔 출력 지우기
        </button>
        <button type="button" onClick={() => void copyReport()}>
          안전한 진단 요약 복사
        </button>
      </section>

      {message ? <p className="message">{message}</p> : null}

      <section className="grid diagnostics-grid">
        {authMode === "new-provider"
          ? <NewProviderSessionPanel />
          : <LegacyDirectModePanel />}

        <article className="panel">
          <h2>세션 컨텍스트</h2>
          <dl>
            <dt>Firebase authenticated</dt>
            <dd>{yesNo(Boolean(firebaseUser))}</dd>
            <dt>Firebase uid</dt>
            <dd>{valueOrDash(maskUid(firebaseUser?.uid))}</dd>
            <dt>Firebase email</dt>
            <dd>{valueOrDash(maskEmail(firebaseUser?.email))}</dd>
            <dt>Auth phase</dt>
            <dd>{phase}</dd>
            <dt>Shadow globalRole</dt>
            <dd>{valueOrDash(diagnostic?.shadowSession?.globalRole)}</dd>
            <dt>Shadow workspaceRole</dt>
            <dd>{valueOrDash(diagnostic?.shadowSession?.currentWorkspaceRole)}</dd>
            <dt>Shadow workspaceId</dt>
            <dd>{valueOrDash(maskWorkspaceId(diagnostic?.shadowSession?.currentWorkspaceId))}</dd>
            <dt>Warnings</dt>
            <dd>{codes(diagnostic?.comparison.warnings)}</dd>
          </dl>
        </article>

        <article className="panel">
          <h2>Legacy 역할 컨텍스트</h2>
          <dl>
            <dt>isAuthenticated</dt>
            <dd>{yesNo(legacySnapshot?.isAuthenticated)}</dd>
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
            <dt>workspaceId</dt>
            <dd>{valueOrDash(maskWorkspaceId(legacyWorkspaceId))}</dd>
            <dt>Mismatch</dt>
            <dd>{codes(diagnostic?.comparison.mismatches)}</dd>
          </dl>
        </article>
      </section>

      <section className="panel diagnostics-form">
        <h2>버그 재현 기록</h2>
        <div className="form-grid">
          <label>
            발생 화면/탭
            <input
              value={input.screenOrTab}
              onChange={(event) => updateField("screenOrTab", event.target.value)}
              placeholder="예: 시스템 관리자 > 모든 회원"
            />
          </label>
          <label>
            클릭한 버튼
            <input
              value={input.clickedButton}
              onChange={(event) => updateField("clickedButton", event.target.value)}
              placeholder="예: 권한 점검/복구"
            />
          </label>
          <label>
            Firestore permission-denied 여부
            <select
              value={input.firestorePermissionDenied}
              onChange={(event) => updateField(
                "firestorePermissionDenied",
                event.target.value as PermissionDeniedState,
              )}
            >
              <option value="unknown">확인 전</option>
              <option value="yes">있음</option>
              <option value="no">없음</option>
            </select>
          </label>
          <label>
            새로고침 후 유지 여부
            <select
              value={input.persistsAfterRefresh}
              onChange={(event) => updateField(
                "persistsAfterRefresh",
                event.target.value as RefreshPersistenceState,
              )}
            >
              <option value="unknown">확인 전</option>
              <option value="yes">유지됨</option>
              <option value="no">사라짐</option>
              <option value="not_tested">아직 미확인</option>
            </select>
          </label>
        </div>
        <label>
          화면 증상
          <textarea
            value={input.symptom}
            onChange={(event) => updateField("symptom", event.target.value)}
            placeholder="예: 버튼을 눌러도 목록이 갱신되지 않음"
          />
        </label>
        <label>
          콘솔 오류
          <textarea
            value={input.consoleError}
            onChange={(event) => updateField("consoleError", event.target.value)}
            placeholder="Console의 오류 문구를 민감정보 없이 붙여넣기"
          />
        </label>
        <label>
          재현 순서
          <textarea
            value={input.reproductionSteps}
            onChange={(event) => updateField("reproductionSteps", event.target.value)}
            placeholder={"1. 기존 앱에서 오너 로그인\n2. 시스템 관리자 탭 진입\n3. ..."}
          />
        </label>
      </section>

      <section className="checklist">
        <h2>확인 체크리스트</h2>
        <ol>
          <li>발생 화면/탭과 클릭한 버튼을 기록합니다.</li>
          <li>화면 증상을 한 문장으로 먼저 적습니다.</li>
          <li>Console 오류가 있으면 전체 UID/email/token 없이 기록합니다.</li>
          <li>Network에서 Firestore permission-denied와 write 요청 여부를 확인합니다.</li>
          <li>마스킹된 workspaceId, legacy role/currentRole/workspaceRole, 신규 AppSession 역할을 확인합니다.</li>
          <li>같은 순서로 재현되는지 확인합니다.</li>
          <li>새로고침 후에도 유지되는지 확인합니다.</li>
        </ol>
      </section>
    </main>
  );
}
