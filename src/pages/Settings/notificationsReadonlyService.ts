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
  normalizeNotificationRecords,
  parseLocalFallbackNotifications,
  type SafeNotificationRecord,
} from "./notificationsUtils";

export interface LoadCurrentUserNotificationsReadonlyInput {
  uid: string;
  workspaceId: string;
}

export async function loadCurrentUserNotificationsReadonly({
  uid,
  workspaceId,
}: LoadCurrentUserNotificationsReadonlyInput): Promise<SafeNotificationRecord[]> {
  const snapshot = await getDocs(query(
    collection(getFirebaseDb(), collections.notifications),
    where("uid", "==", uid),
    where("workspaceId", "==", workspaceId),
  ));

  return normalizeNotificationRecords(
    snapshot.docs.map((item) => ({
      id: item.id,
      ...item.data(),
    })),
    {
      uid,
      workspaceId,
    },
  );
}

export function loadLocalFallbackNotificationsReadonly({
  uid,
  workspaceId,
}: LoadCurrentUserNotificationsReadonlyInput): SafeNotificationRecord[] {
  if (typeof window === "undefined") return [];

  return parseLocalFallbackNotifications(
    window.localStorage.getItem("pm:notifications:v1"),
    {
      uid,
      workspaceId,
    },
  );
}
