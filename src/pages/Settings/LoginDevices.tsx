import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  useAuth,
} from "../../auth/useAuth";
import {
  getCurrentDeviceIdReadonly,
  loadCurrentUserDevicesReadonly,
  loadLocalFallbackDevicesReadonly,
} from "./loginDevicesReadonlyService";
import {
  currentDeviceWarning,
  isPermissionDeniedError,
  loginDevicesAccountStatusMessage,
  loginDevicesPhaseMessage,
  maskEmailForLoginDevices,
  permissionDeniedMessage,
  workspaceMissingMessage,
  type LoginDevicesMessage,
  type SafeLoginDeviceRecord,
} from "./loginDevicesUtils";

interface LoginDevicesProps {
  mode?: "legacy-placeholder" | "new-auth";
}

type DeviceSource =
  | "firestore"
  | "local-fallback"
  | "none";

function MessageCard({
  title,
  body,
  tone,
}: LoginDevicesMessage) {
  return (
    <article className={`login-devices-card login-devices-${tone}`}>
      <h2>{title}</h2>
      {body.split("\n").map((line) => (
        <p key={line}>{line}</p>
      ))}
    </article>
  );
}

function DeviceCard({
  device,
}: {
  device: SafeLoginDeviceRecord;
}) {
  const badgeTone = device.revokedAt
    ? "error"
    : device.isCurrentDevice
      ? ""
      : "warning";

  return (
    <article className="login-devices-device">
      <div className="login-devices-device-header">
        <h3>{device.deviceName}</h3>
        <span className={`login-devices-badge ${badgeTone}`}>
          {device.statusLabel}
        </span>
      </div>
      <dl>
        <dt>현재 기기 여부</dt>
        <dd>{device.isCurrentDevice ? "현재 기기" : "다른 기기"}</dd>
        <dt>기기 종류</dt>
        <dd>{device.deviceType}</dd>
        <dt>브라우저</dt>
        <dd>{device.browser}</dd>
        <dt>운영체제</dt>
        <dd>{device.os}</dd>
        <dt>첫 로그인 시간</dt>
        <dd>{device.lastLoginAt}</dd>
        <dt>마지막 활동 시간</dt>
        <dd>{device.lastActiveAt}</dd>
        <dt>상태</dt>
        <dd>{device.statusLabel}</dd>
      </dl>
    </article>
  );
}

function LoginDevicesNewAuthView() {
  const {
    phase,
    session,
    error,
    reloadSession,
  } = useAuth();
  const [devices, setDevices] = useState<SafeLoginDeviceRecord[]>([]);
  const [deviceSource, setDeviceSource] = useState<DeviceSource>("none");
  const [loadingDevices, setLoadingDevices] = useState(false);
  const [deviceMessage, setDeviceMessage] = useState<LoginDevicesMessage | null>(null);
  const [reloadBusy, setReloadBusy] = useState(false);
  const [reloadMessage, setReloadMessage] = useState("");

  const isSessionLoading =
    phase === "initializing" ||
    phase === "loading_session";

  const canLoadDevices =
    phase === "authenticated" &&
    session?.status === "active" &&
    Boolean(session.uid) &&
    Boolean(session.currentWorkspaceId);

  const loadDevices = useCallback(async () => {
    if (!session?.uid) {
      setDevices([]);
      setDeviceSource("none");
      return;
    }

    if (session.status !== "active") {
      setDevices([]);
      setDeviceSource("none");
      return;
    }

    if (!session.currentWorkspaceId) {
      setDevices([]);
      setDeviceSource("none");
      setDeviceMessage(workspaceMissingMessage());
      return;
    }

    setLoadingDevices(true);
    setDeviceMessage(null);

    const currentDeviceId = getCurrentDeviceIdReadonly();

    try {
      const firestoreDevices = await loadCurrentUserDevicesReadonly({
        uid: session.uid,
        workspaceId: session.currentWorkspaceId,
        currentDeviceId,
      });

      if (firestoreDevices.length > 0) {
        setDevices(firestoreDevices);
        setDeviceSource("firestore");
        return;
      }

      const fallbackDevices = loadLocalFallbackDevicesReadonly({
        uid: session.uid,
        workspaceId: session.currentWorkspaceId,
        currentDeviceId,
      });

      setDevices(fallbackDevices);
      setDeviceSource(fallbackDevices.length > 0 ? "local-fallback" : "none");
    } catch (loadError) {
      if (isPermissionDeniedError(loadError)) {
        setDeviceMessage(permissionDeniedMessage());
      } else {
        setDeviceMessage({
          title: "기기 목록",
          body: "기기 목록을 불러오지 못했습니다.\n로그인은 정상적으로 유지되고 있습니다.",
          tone: "error",
        });
      }

      const fallbackDevices = loadLocalFallbackDevicesReadonly({
        uid: session.uid,
        workspaceId: session.currentWorkspaceId,
        currentDeviceId,
      });

      setDevices(fallbackDevices);
      setDeviceSource(fallbackDevices.length > 0 ? "local-fallback" : "none");
    } finally {
      setLoadingDevices(false);
    }
  }, [
    session?.currentWorkspaceId,
    session?.status,
    session?.uid,
  ]);

  useEffect(() => {
    if (canLoadDevices) {
      void loadDevices();
      return;
    }

    setDevices([]);
    setDeviceSource("none");

    if (
      phase === "authenticated" &&
      session?.status === "active" &&
      !session.currentWorkspaceId
    ) {
      setDeviceMessage(workspaceMissingMessage());
    } else {
      setDeviceMessage(null);
    }
  }, [
    canLoadDevices,
    loadDevices,
    phase,
    session?.currentWorkspaceId,
    session?.status,
  ]);

  const handleDeviceRefresh = useCallback(async () => {
    if (loadingDevices || !canLoadDevices) return;
    await loadDevices();
  }, [
    canLoadDevices,
    loadDevices,
    loadingDevices,
  ]);

  const handleReloadSession = useCallback(async () => {
    if (reloadBusy || isSessionLoading) return;

    setReloadBusy(true);
    setReloadMessage("계정 상태를 다시 확인하고 있습니다.");

    try {
      await reloadSession();
      setReloadMessage("계정 상태를 다시 확인했습니다.");
    } catch {
      setReloadMessage("계정 상태를 다시 불러오지 못했습니다. 로그인은 유지됩니다.");
    } finally {
      setReloadBusy(false);
    }
  }, [
    isSessionLoading,
    reloadBusy,
    reloadSession,
  ]);

  const phaseMessage = loginDevicesPhaseMessage(phase);
  const statusMessage = loginDevicesAccountStatusMessage(session?.status);
  const workspaceMessage = session?.status === "active" && !session.currentWorkspaceId
    ? workspaceMissingMessage()
    : {
      title: "워크스페이스 상태",
      body: session?.currentWorkspaceId
        ? "현재 선택된 워크스페이스 기준으로 본인 기기만 조회합니다."
        : "계정 상태 확인 후 워크스페이스 정보를 표시합니다.",
      tone: session?.currentWorkspaceId ? "success" : "muted",
    } satisfies LoginDevicesMessage;
  const maskedEmail = maskEmailForLoginDevices(session?.email);
  const deviceWarning = useMemo(() => currentDeviceWarning(devices), [devices]);

  return (
    <main className="login-devices-page">
      <header className="login-devices-header">
        <div>
          <p className="login-devices-eyebrow">읽기 전용 로그인 기기</p>
          <h1>로그인 기기 상태</h1>
          <p>
            이 화면은 현재 계정의 로그인 기기 기록을 읽기만 하며, 기기 삭제나 세션 해제는 실행하지 않습니다.
          </p>
        </div>
        <section className="login-devices-actions" aria-label="새로고침">
          <button
            type="button"
            onClick={handleDeviceRefresh}
            disabled={loadingDevices || !canLoadDevices}
          >
            {loadingDevices ? "불러오는 중" : "기기 목록 새로고침"}
          </button>
          <button
            type="button"
            className="secondary"
            onClick={handleReloadSession}
            disabled={reloadBusy || isSessionLoading}
          >
            {reloadBusy ? "확인 중" : "계정 상태 다시 확인"}
          </button>
          {reloadMessage ? <p>{reloadMessage}</p> : null}
        </section>
      </header>

      <section className="login-devices-card-grid">
        <MessageCard {...phaseMessage} />
        <MessageCard {...statusMessage} />
        <MessageCard {...workspaceMessage} />
        <MessageCard
          title="데이터 소스"
          body={
            deviceSource === "firestore"
              ? "Firestore user_devices 기준으로 표시합니다."
              : deviceSource === "local-fallback"
                ? "Firestore 결과 대신 현재 브라우저의 로컬 fallback을 표시합니다."
                : "표시할 기기 데이터가 아직 없습니다."
          }
          tone={deviceSource === "firestore" ? "success" : deviceSource === "local-fallback" ? "warning" : "muted"}
        />
      </section>

      <section className="login-devices-panel">
        <h2>계정 기준</h2>
        <dl>
          <dt>이메일</dt>
          <dd>{maskedEmail}</dd>
          <dt>status</dt>
          <dd>{session?.status ?? "-"}</dd>
          <dt>isSystemOwner</dt>
          <dd>{session?.isSystemOwner ? "예" : "아니오"}</dd>
          <dt>currentWorkspaceId</dt>
          <dd>{session?.currentWorkspaceId ? "있음" : "없음"}</dd>
          <dt>오류</dt>
          <dd>{error?.code ?? "-"}</dd>
        </dl>
      </section>

      {deviceMessage ? <MessageCard {...deviceMessage} /> : null}
      {deviceWarning ? (
        <MessageCard
          title="현재 기기 판정"
          body={deviceWarning}
          tone="warning"
        />
      ) : null}

      <section className="login-devices-panel">
        <div className="login-devices-refresh-row">
          <h2>기기 목록</h2>
          <p>{loadingDevices ? "기기 목록을 불러오고 있습니다." : `${devices.length}개 표시 중`}</p>
        </div>

        {devices.length > 0 ? (
          <div className="login-devices-list">
            {devices.map((device) => (
              <DeviceCard
                key={device.deviceId}
                device={device}
              />
            ))}
          </div>
        ) : (
          <div className="login-devices-empty">
            {loadingDevices ? "불러오는 중입니다." : "표시할 기기 정보가 없습니다."}
          </div>
        )}
      </section>
    </main>
  );
}

export function LoginDevices({
  mode = "legacy-placeholder",
}: LoginDevicesProps = {}) {
  if (mode !== "new-auth") {
    return null;
  }

  return <LoginDevicesNewAuthView />;
}
