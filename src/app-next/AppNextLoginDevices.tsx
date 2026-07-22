import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  useAuth,
} from "../auth/useAuth";
import {
  getAppNextCurrentDeviceIdReadonly,
  loadAppNextCurrentUserDevicesReadonly,
} from "./appNextLoginDevicesService";
import {
  appNextDeviceReadPolicy,
  isAppNextDevicePermissionDenied,
  type AppNextDeviceRecord,
  type AppNextDeviceSource,
} from "./appNextLoginDevicesUtils";

function sourceLabel(source: AppNextDeviceSource): string {
  if (source === "firestore") return "Firestore user_devices";
  if (source === "local-fallback") return "브라우저 로컬 fallback";
  if (source === "permission-denied") return "권한으로 조회 불가";
  if (source === "error") return "조회 오류";
  return "데이터 없음";
}

function policyMessage(reason: ReturnType<typeof appNextDeviceReadPolicy>["reason"]): string {
  if (reason === "loading") return "계정 상태를 확인하는 중입니다.";
  if (reason === "signed-out") return "로그인 후 기기 목록을 확인할 수 있습니다.";
  if (reason === "account-action-required") return "승인 대기, 거절, 비활성 계정에서는 기기 조회를 실행하지 않습니다.";
  if (reason === "error") return "계정 상태 오류가 있어 기기 조회를 실행하지 않습니다. 자동 로그아웃은 하지 않습니다.";
  return "";
}

function DeviceCard({
  device,
}: {
  device: AppNextDeviceRecord;
}) {
  return (
    <article className="app-next-device-card">
      <div className="app-next-device-head">
        <h3>{device.deviceName}</h3>
        <span>{device.statusLabel}</span>
      </div>
      <dl>
        <dt>기기 ID</dt>
        <dd>{device.maskedId}</dd>
        <dt>기기 종류</dt>
        <dd>{device.deviceType}</dd>
        <dt>브라우저</dt>
        <dd>{device.browser}</dd>
        <dt>운영체제</dt>
        <dd>{device.os}</dd>
        <dt>최근 접속</dt>
        <dd>{device.lastActiveAt}</dd>
        <dt>첫 로그인</dt>
        <dd>{device.lastLoginAt}</dd>
        <dt>IP</dt>
        <dd>{device.ipAddress}</dd>
        <dt>현재 기기</dt>
        <dd>{device.isCurrentDevice ? "예" : "아니오"}</dd>
        {import.meta.env.DEV ? (
          <>
            <dt>current match reason</dt>
            <dd>{device.currentMatchReason}</dd>
          </>
        ) : null}
      </dl>
    </article>
  );
}

export function AppNextLoginDevices() {
  const {
    phase,
    session,
  } = useAuth();
  const [devices, setDevices] = useState<AppNextDeviceRecord[]>([]);
  const [source, setSource] = useState<AppNextDeviceSource>("none");
  const [readCount, setReadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const readPolicy = useMemo(
    () => appNextDeviceReadPolicy({
      phase,
      session,
    }),
    [
      phase,
      session,
    ],
  );

  const loadDevices = useCallback(async () => {
    if (!readPolicy.canRead || !session?.uid) {
      setDevices([]);
      setSource("none");
      setReadCount(0);
      setMessage(policyMessage(readPolicy.reason));
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const currentDeviceId = getAppNextCurrentDeviceIdReadonly();
      const result = await loadAppNextCurrentUserDevicesReadonly({
        uid: session.uid,
        currentDeviceId,
      });

      setDevices(result.devices);
      setSource(result.source);
      setReadCount(result.readCount);
      if (!result.devices.length) {
        setMessage("등록된 로그인 기기 정보가 없습니다. 현재 시스템에는 표시할 기기 세션 기록이 없습니다.");
      } else if (!currentDeviceId || !result.devices.some((device) => device.isCurrentDevice)) {
        setMessage("현재 기기를 정확히 식별할 수 없습니다.");
      } else {
        setMessage("");
      }
    } catch (error) {
      if (isAppNextDevicePermissionDenied(error)) {
        setSource("permission-denied");
        setMessage("현재 Firestore 권한으로 로그인 기기 목록을 조회할 수 없습니다.");
      } else {
        setSource("error");
        setMessage("로그인 기기 목록을 불러오지 못했습니다. 로그인 세션은 유지됩니다.");
      }
      setDevices([]);
      setReadCount(0);
    } finally {
      setLoading(false);
    }
  }, [
    readPolicy.canRead,
    readPolicy.reason,
    session?.uid,
  ]);

  useEffect(() => {
    void loadDevices();
  }, [loadDevices]);

  return (
    <section className="app-next-panel">
      <div className="app-next-section-head">
        <div>
          <h2>로그인 기기</h2>
          <p>현재 로그인한 사용자 본인의 `user_devices` 문서만 1회 조회합니다.</p>
        </div>
        <button
          type="button"
          onClick={() => void loadDevices()}
          disabled={loading || !readPolicy.canRead}
        >
          {loading ? "불러오는 중" : "기기 목록 새로고침"}
        </button>
      </div>

      <dl className="app-next-device-summary">
        <dt>데이터 source</dt>
        <dd>{sourceLabel(source)}</dd>
        <dt>읽은 문서 수</dt>
        <dd>{String(readCount)}</dd>
        <dt>workspace 필요 여부</dt>
        <dd>필수 아님</dd>
      </dl>

      {message ? <p className="app-next-message">{message}</p> : null}

      {devices.length > 0 ? (
        <div className="app-next-device-list">
          {devices.map((device) => (
            <DeviceCard
              key={device.maskedId}
              device={device}
            />
          ))}
        </div>
      ) : null}

      {import.meta.env.DEV ? (
        <section className="app-next-diagnostics app-next-device-diagnostics">
          <h3>개발 전용 진단</h3>
          <dl>
            <dt>entry</dt>
            <dd>app-next</dd>
            <dt>screen</dt>
            <dd>login-devices</dd>
            <dt>provider</dt>
            <dd>new</dd>
            <dt>legacy AuthContext mounted</dt>
            <dd>false</dd>
            <dt>device data source</dt>
            <dd>{sourceLabel(source)}</dd>
            <dt>read count</dt>
            <dd>{String(readCount)}</dd>
            <dt>write API imported</dt>
            <dd>false</dd>
            <dt>automatic signOut</dt>
            <dd>none</dd>
          </dl>
        </section>
      ) : null}
    </section>
  );
}
