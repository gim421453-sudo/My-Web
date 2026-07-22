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
import {
  normalizeAppNextWorkspaceNoticeRecords,
  type AppNextWorkspaceNoticeRecord,
  type AppNextWorkspaceNoticeSchemaKind,
  type AppNextWorkspaceNoticeSchemaSequenceItem,
  type AppNextWorkspaceNoticeSource,
} from "./appNextWorkspaceNoticesUtils";

export interface LoadAppNextWorkspaceNoticesInput {
  workspaceId: string;
  maxCount?: number;
  requestMode?: "default" | "server" | "clear-memory-and-server";
}

export interface LoadAppNextWorkspaceNoticesResult {
  notices: AppNextWorkspaceNoticeRecord[];
  source: AppNextWorkspaceNoticeSource;
  readCount: number;
  filteredCount: number;
  excludedCount: number;
  excludedReasons: Record<string, number>;
  sortFieldUsed: "legacy-workspace-notice-order";
  sortPolicy: string;
  pinnedFieldUsed: "legacy-display-only";
  authorFieldUsed: string;
  contentFieldUsed: string;
  schemaKindCounts: Record<AppNextWorkspaceNoticeSchemaKind, number>;
  unknownSchemaCount: number;
  sourceCounts: Record<string, number>;
  contentMappingBySchema: Record<string, string>;
  authorMappingBySchema: Record<string, string>;
  dateMappingBySchema: Record<string, string>;
  categoryMappingBySchema: Record<string, string>;
  schemaSequence: AppNextWorkspaceNoticeSchemaSequenceItem[];
  completedReadMode: "default" | "server";
  fromCache: boolean;
  hasPendingWrites: boolean;
}

export async function loadAppNextWorkspaceNoticesReadonly({
  workspaceId,
  maxCount,
  requestMode = "default",
}: LoadAppNextWorkspaceNoticesInput): Promise<LoadAppNextWorkspaceNoticesResult> {
  const noticesCollection = collection(getFirebaseDb(), collections.workspaces, workspaceId, "notices");
  const useServer = requestMode === "server" || requestMode === "clear-memory-and-server";
  const snapshot = useServer
    ? await getDocsFromServer(noticesCollection)
    : await getDocs(noticesCollection);
  const normalized = normalizeAppNextWorkspaceNoticeRecords(
    snapshot.docs.map((item) => ({
      id: item.id,
      ...item.data(),
    })),
    {
      workspaceId,
      maxCount,
    },
  );

  return {
    notices: normalized.records,
    source: useServer ? "firestore-server" : "firestore",
    readCount: snapshot.docs.length,
    filteredCount: normalized.filteredCount,
    excludedCount: normalized.excludedCount,
    excludedReasons: normalized.excludedReasons,
    sortFieldUsed: normalized.sortFieldUsed,
    sortPolicy: normalized.sortPolicy,
    pinnedFieldUsed: normalized.pinnedFieldUsed,
    authorFieldUsed: normalized.authorFieldUsed,
    contentFieldUsed: normalized.contentFieldUsed,
    schemaKindCounts: normalized.schemaKindCounts,
    unknownSchemaCount: normalized.unknownSchemaCount,
    sourceCounts: normalized.sourceCounts,
    contentMappingBySchema: normalized.contentMappingBySchema,
    authorMappingBySchema: normalized.authorMappingBySchema,
    dateMappingBySchema: normalized.dateMappingBySchema,
    categoryMappingBySchema: normalized.categoryMappingBySchema,
    schemaSequence: normalized.schemaSequence,
    completedReadMode: useServer ? "server" : "default",
    fromCache: snapshot.metadata.fromCache,
    hasPendingWrites: snapshot.metadata.hasPendingWrites,
  };
}
