import {
  collection,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import {
  getFirebaseDb,
} from "../../services/firebaseProvider";
import {
  collections,
} from "../../services/firestoreSchema";
import {
  normalizeDeviceRecords,
  parseLocalFallbackDevices,
  type SafeLoginDeviceRecord,
} from "./loginDevicesUtils";

export interface LoadCurrentUserDevicesReadonlyInput {
  uid: string;
  workspaceId: string;
  currentDeviceId?: string | null;
}

export async function loadCurrentUserDevicesReadonly({
  uid,
  workspaceId,
  currentDeviceId = null,
}: LoadCurrentUserDevicesReadonlyInput): Promise<SafeLoginDeviceRecord[]> {
  const snapshot = await getDocs(query(
    collection(getFirebaseDb(), collections.userDevices),
    where("uid", "==", uid),
    where("workspaceId", "==", workspaceId),
  ));

  return normalizeDeviceRecords(
    snapshot.docs.map((item) => ({
      id: item.id,
      ...item.data(),
    })),
    {
      uid,
      workspaceId,
      currentDeviceId,
    },
  );
}

export function loadLocalFallbackDevicesReadonly({
  uid,
  workspaceId,
  currentDeviceId = null,
}: LoadCurrentUserDevicesReadonlyInput): SafeLoginDeviceRecord[] {
  if (typeof window === "undefined") return [];

  return parseLocalFallbackDevices(
    window.localStorage.getItem("pm:user_devices:v1"),
    {
      uid,
      workspaceId,
      currentDeviceId,
    },
  );
}

export function getCurrentDeviceIdReadonly(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem("pm:device:id");
}
