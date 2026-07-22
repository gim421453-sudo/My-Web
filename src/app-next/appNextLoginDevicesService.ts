import {
  collection,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import {
  getFirebaseDb,
} from "../services/firebaseProvider";
import {
  collections,
} from "../services/firestoreSchema";
import {
  normalizeAppNextDeviceRecords,
  parseAppNextLocalFallbackDevices,
  type AppNextDeviceRecord,
} from "./appNextLoginDevicesUtils";

export interface LoadAppNextDevicesInput {
  uid: string;
  currentDeviceId?: string | null;
}

export interface AppNextDeviceLoadResult {
  devices: AppNextDeviceRecord[];
  source: "firestore" | "local-fallback" | "none";
  readCount: number;
}

export async function loadAppNextCurrentUserDevicesReadonly({
  uid,
  currentDeviceId = null,
}: LoadAppNextDevicesInput): Promise<AppNextDeviceLoadResult> {
  const snapshot = await getDocs(query(
    collection(getFirebaseDb(), collections.userDevices),
    where("uid", "==", uid),
  ));

  const firestoreDevices = normalizeAppNextDeviceRecords(
    snapshot.docs.map((item) => ({
      id: item.id,
      ...item.data(),
    })),
    {
      uid,
      currentDeviceId,
    },
  );

  if (firestoreDevices.length > 0) {
    return {
      devices: firestoreDevices,
      source: "firestore",
      readCount: snapshot.size,
    };
  }

  const fallbackDevices = loadAppNextLocalFallbackDevicesReadonly({
    uid,
    currentDeviceId,
  });

  return {
    devices: fallbackDevices,
    source: fallbackDevices.length > 0 ? "local-fallback" : "none",
    readCount: snapshot.size,
  };
}

export function loadAppNextLocalFallbackDevicesReadonly({
  uid,
  currentDeviceId = null,
}: LoadAppNextDevicesInput): AppNextDeviceRecord[] {
  if (typeof window === "undefined") return [];

  return parseAppNextLocalFallbackDevices(
    window.localStorage.getItem("pm:user_devices:v1"),
    {
      uid,
      currentDeviceId,
    },
  );
}

export function getAppNextCurrentDeviceIdReadonly(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem("pm:device:id");
}
