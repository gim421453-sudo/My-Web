import {
  collection,
  getDocs,
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

export interface LoadAppNextTimetableReadonlyInput {
  workspaceId: string;
  requestedSetId?: string | null;
  now?: Date;
}

export interface LoadAppNextTimetableReadonlyResult {
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
): Promise<{
  rows: Array<Record<string, unknown>>;
  fromCache: boolean;
  hasPendingWrites: boolean;
}> {
  const snapshot = await getDocs(collection(getFirebaseDb(), collections.workspaces, workspaceId, key));
  return {
    rows: snapshot.docs.map((documentSnapshot) => ({
      id: documentSnapshot.id,
      ...documentSnapshot.data(),
    })),
    fromCache: snapshot.metadata.fromCache,
    hasPendingWrites: snapshot.metadata.hasPendingWrites,
  };
}

export async function loadAppNextTimetableReadonly({
  workspaceId,
  requestedSetId,
  now,
}: LoadAppNextTimetableReadonlyInput): Promise<LoadAppNextTimetableReadonlyResult> {
  const [
    timetable,
    timetableSets,
    periodTimes,
  ] = await Promise.all(TIMETABLE_COLLECTION_KEYS.map((key) => readWorkspaceCollection(workspaceId, key)));
  const store: AppNextRawTimetableStore = {
    timetable: timetable.rows,
    timetableSets: timetableSets.rows,
    periodTimes: periodTimes.rows,
  };

  return {
    normalized: normalizeAppNextTimetableStore(store, {
      requestedSetId,
      now,
    }),
    rawReadCount: timetable.rows.length + timetableSets.rows.length + periodTimes.rows.length,
    collectionReadCount: TIMETABLE_COLLECTION_KEYS.length,
    fromCache: timetable.fromCache || timetableSets.fromCache || periodTimes.fromCache,
    hasPendingWrites: timetable.hasPendingWrites || timetableSets.hasPendingWrites || periodTimes.hasPendingWrites,
  };
}

