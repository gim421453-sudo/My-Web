import { FieldPath, type Firestore, type Query } from "firebase-admin/firestore";
import type { AuthorityDocumentSnapshot } from "../authz/authorizationTypes.js";
import { isValidDocumentId } from "../authz/resolverUtils.js";
import { OperationError } from "../operations/operationErrors.js";
import { getTrustedAdminFirestore } from "../runtime/adminFirestore.js";
import type { TrustedBackendGuardOptions } from "../runtime/emulatorGuard.js";

export interface ManagementReadDocument {
  readonly id: string;
  readonly data: Readonly<Record<string, unknown>>;
}

export interface ManagementReadFilter {
  readonly field: string;
  readonly value: string | number | boolean;
}

export interface ManagementReadPageRequest {
  readonly offset: number;
  readonly limit: number;
  readonly filters?: readonly ManagementReadFilter[];
}

export interface ManagementReadStore {
  getDocument(pathSegments: readonly string[]): Promise<AuthorityDocumentSnapshot>;
  listCollection(
    pathSegments: readonly string[],
    request: ManagementReadPageRequest,
  ): Promise<readonly ManagementReadDocument[]>;
}

function documentPath(pathSegments: readonly string[]): string {
  if (pathSegments.length < 2 || pathSegments.length % 2 !== 0
    || pathSegments.some((segment) => !isValidDocumentId(segment))) {
    throw new OperationError("INVALID_ARGUMENT", "invalid-path");
  }
  return pathSegments.join("/");
}

function collectionPath(pathSegments: readonly string[]): string {
  if (pathSegments.length < 1 || pathSegments.length % 2 === 0
    || pathSegments.some((segment) => !isValidDocumentId(segment))) {
    throw new OperationError("INVALID_ARGUMENT", "invalid-path");
  }
  return pathSegments.join("/");
}

function queryField(value: string): string {
  if (!/^[A-Za-z][A-Za-z0-9_]{0,79}$/.test(value)) {
    throw new OperationError("INVALID_ARGUMENT", "invalid-query-field");
  }
  return value;
}

export function createAdminManagementReadStore(firestore: Firestore): ManagementReadStore {
  return Object.freeze({
    async getDocument(pathSegments: readonly string[]) {
      const snapshot = await firestore.doc(documentPath(pathSegments)).get();
      return Object.freeze({
        exists: snapshot.exists,
        data: snapshot.exists ? snapshot.data() : undefined,
      });
    },
    async listCollection(pathSegments: readonly string[], request: ManagementReadPageRequest) {
      let query: Query = firestore.collection(collectionPath(pathSegments));
      for (const filter of request.filters || []) {
        query = query.where(queryField(filter.field), "==", filter.value);
      }
      query = query.orderBy(FieldPath.documentId()).offset(request.offset).limit(request.limit);
      const snapshot = await query.get();
      return Object.freeze(snapshot.docs.map((document) => Object.freeze({
        id: document.id,
        data: Object.freeze({ ...(document.data() || {}) }),
      })));
    },
  });
}

export function getEmulatorManagementReadStore(
  options: TrustedBackendGuardOptions = {},
): ManagementReadStore {
  return createAdminManagementReadStore(getTrustedAdminFirestore(options).firestore);
}
