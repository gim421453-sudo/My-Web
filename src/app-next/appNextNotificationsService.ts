import {
  collection,
  getDocs,
  limit,
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
  normalizeAppNextNotificationRecords,
  parseAppNextLocalFallbackNotifications,
  type AppNextNotificationRecord,
  type AppNextNotificationSource,
} from "./appNextNotificationsUtils";

export interface LoadAppNextNotificationsInput {
  uid: string;
  currentWorkspaceId?: string | null;
  maxCount?: number;
}

export interface LoadAppNextNotificationsResult {
  notifications: AppNextNotificationRecord[];
  source: AppNextNotificationSource;
  readCount: number;
}

const LOCAL_NOTIFICATIONS_KEY = "pm:notifications:v1";

export async function loadAppNextCurrentUserNotificationsReadonly({
  uid,
  currentWorkspaceId = null,
  maxCount = 50,
}: LoadAppNextNotificationsInput): Promise<LoadAppNextNotificationsResult> {
  const snapshot = await getDocs(query(
    collection(getFirebaseDb(), collections.notifications),
    where("uid", "==", uid),
    limit(maxCount),
  ));

  const firestoreNotifications = normalizeAppNextNotificationRecords(
    snapshot.docs.map((item) => ({
      id: item.id,
      ...item.data(),
    })),
    {
      uid,
      currentWorkspaceId,
      maxCount,
    },
  );

  if (firestoreNotifications.length > 0) {
    return {
      notifications: firestoreNotifications,
      source: "firestore",
      readCount: snapshot.docs.length,
    };
  }

  return loadAppNextLocalFallbackNotificationsReadonly({
    uid,
    currentWorkspaceId,
    maxCount,
  });
}

export function loadAppNextLocalFallbackNotificationsReadonly({
  uid,
  currentWorkspaceId = null,
  maxCount = 50,
}: LoadAppNextNotificationsInput): LoadAppNextNotificationsResult {
  if (typeof window === "undefined") {
    return {
      notifications: [],
      source: "none",
      readCount: 0,
    };
  }

  const notifications = parseAppNextLocalFallbackNotifications(
    window.localStorage.getItem(LOCAL_NOTIFICATIONS_KEY),
    {
      uid,
      currentWorkspaceId,
      maxCount,
    },
  );

  return {
    notifications,
    source: notifications.length > 0 ? "local-fallback" : "none",
    readCount: notifications.length,
  };
}

