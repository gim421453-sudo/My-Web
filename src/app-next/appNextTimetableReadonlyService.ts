import {
  collection,
  getDocs,
  getDocsFromServer,
  doc,
  getDocFromServer,
} from "firebase/firestore";
import {
  getFirebaseDb,
} from "../services/firebaseProvider";
import {
  collections,
} from "../services/firestoreSchema";
import {
  normalizeAppNextTimetableStore,
  type AppNextRawTimetableStore,
  type AppNextTimetableNormalized,
} from "./appNextTimetableReadonlyUtils";
import { timetableOperationMode } from "./appNextTimetableRowCrudUtils";

export interface LoadAppNextTimetableReadonlyInput {
  workspaceId: string;
  requestedSetId?: string | null;
  now?: Date;
  readMode?: "default" | "server";
}

export interface LoadAppNextTimetableReadonlyResult {
  store: AppNextRawTimetableStore;
  operationMode: string;
  normalized: AppNextTimetableNormalized;
  rawReadCount: number;
  collectionReadCount: number;
  fromCache: boolean;
  hasPendingWrites: boolean;
}

const TIMETABLE_COLLECTION_KEYS = [
  "timetable",
  "timetableSets",
  "periodTimes",
] as const;

async function readWorkspaceCollection(
  workspaceId: string,
  key: typeof TIMETABLE_COLLECTION_KEYS[number],
  readMode: "default" | "server",
): Promise<{
  rows: Array<Record<string, unknown>>;
  fromCache: boolean;
  hasPendingWrites: boolean;
}> {
  const ref = collection(getFirebaseDb(), collections.workspaces, workspaceId, key);
  const snapshot = readMode === "server" ? await getDocsFromServer(ref) : await getDocs(ref);
  return {
    rows: snapshot.docs.map((documentSnapshot) => ({
      ...documentSnapshot.data(),
      id: documentSnapshot.id,
    })),
    fromCache: snapshot.metadata.fromCache,
    hasPendingWrites: snapshot.metadata.hasPendingWrites,
  };
}

export async function loadAppNextTimetableReadonly({
  workspaceId,
  requestedSetId,
  now,
  readMode = "default",
}: LoadAppNextTimetableReadonlyInput): Promise<LoadAppNextTimetableReadonlyResult> {
  const [
    timetable,
    timetableSets,
    periodTimes,
  ] = await Promise.all(TIMETABLE_COLLECTION_KEYS.map((key) => readWorkspaceCollection(workspaceId, key, readMode)));
  const [workspace, settings] = await Promise.all([
    getDocFromServer(doc(getFirebaseDb(), "workspaces", workspaceId)),
    getDocFromServer(doc(getFirebaseDb(), "workspaces", workspaceId, "settings", "app")),
  ]);
  const store: AppNextRawTimetableStore = {
    timetable: timetable.rows,
    timetableSets: timetableSets.rows,
    periodTimes: periodTimes.rows,
  };

  return {
    store,
    operationMode: timetableOperationMode(workspace.data() || {}, settings.data() || {}),
    normalized: normalizeAppNextTimetableStore(store, {
      requestedSetId,
      now,
    }),
    rawReadCount: timetable.rows.length + timetableSets.rows.length + periodTimes.rows.length,
    collectionReadCount: TIMETABLE_COLLECTION_KEYS.length + 2,
    fromCache: timetable.fromCache || timetableSets.fromCache || periodTimes.fromCache,
    hasPendingWrites: timetable.hasPendingWrites || timetableSets.hasPendingWrites || periodTimes.hasPendingWrites,
  };
}

