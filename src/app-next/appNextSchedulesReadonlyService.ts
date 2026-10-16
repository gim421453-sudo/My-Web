import {
  collection,
  getDocs,
  getDocsFromServer,
} from "firebase/firestore";
import {
  getFirebaseDb,
} from "../services/firebaseProvider";
import {
  collections,
} from "../services/firestoreSchema";
import { scheduleManagementRecord, type AppNextScheduleManagementRecord } from "./appNextScheduleCrudUtils";
import {
  normalizeAppNextSchedulesStore,
  type AppNextSchedulesNormalized,
} from "./appNextSchedulesReadonlyUtils";

export interface LoadAppNextSchedulesReadonlyInput {
  workspaceId: string;
  now?: Date;
  readMode?: "default" | "server";
}

export interface LoadAppNextSchedulesReadonlyResult {
  managementRecords: AppNextScheduleManagementRecord[];
  normalized: AppNextSchedulesNormalized;
  rawReadCount: number;
  collectionReadCount: number;
  fromCache: boolean;
  hasPendingWrites: boolean;
}

export async function loadAppNextSchedulesReadonly({
  workspaceId,
  now,
  readMode = "default",
}: LoadAppNextSchedulesReadonlyInput): Promise<LoadAppNextSchedulesReadonlyResult> {
  const ref = collection(getFirebaseDb(), collections.workspaces, workspaceId, "schedules");
  const snapshot = readMode === "server"
    ? await getDocsFromServer(ref)
    : await getDocs(ref);
  const schedules = snapshot.docs.map((documentSnapshot) => ({
    ...documentSnapshot.data(),
    id: documentSnapshot.id,
  }));

  return {
    managementRecords: snapshot.docs.flatMap((item) => {
      const record = scheduleManagementRecord(item.id, item.data(), workspaceId);
      return record ? [record] : [];
    }),
    normalized: normalizeAppNextSchedulesStore({
      schedules,
    }, {
      now,
    }),
    rawReadCount: schedules.length,
    collectionReadCount: 1,
    fromCache: snapshot.metadata.fromCache,
    hasPendingWrites: snapshot.metadata.hasPendingWrites,
  };
}
