import type { TrustedTransaction } from "../repositories/trustedTransaction.js";
import { isCanonicalEntityId, type RegistryParseResult } from "./entityRegistryContract.js";
import { parseClassRegistryDocument, type CanonicalClassRegistry } from "./classRegistryContract.js";
import { parseStudentRegistryDocument, type CanonicalStudentRegistry } from "./studentRegistryContract.js";
import { parseSubjectRegistryDocument, type CanonicalSubjectRegistry } from "./subjectRegistryContract.js";

export type RegistryLookup<T> = RegistryParseResult<T> | Readonly<{ state: "MISSING" }>;

export interface EntityRegistryRepository {
  getStudent(workspaceId: string, studentId: string): Promise<RegistryLookup<CanonicalStudentRegistry>>;
  getClass(workspaceId: string, classId: string): Promise<RegistryLookup<CanonicalClassRegistry>>;
  getSubject(workspaceId: string, subjectId: string): Promise<RegistryLookup<CanonicalSubjectRegistry>>;
}

async function getRegistry<T>(
  transaction: TrustedTransaction,
  workspaceId: string,
  entityId: string,
  collection: "studentRegistry" | "classRegistry" | "subjectRegistry",
  parser: (value: unknown, binding: Readonly<{ workspaceId: string; entityId: string }>) => RegistryParseResult<T>,
): Promise<RegistryLookup<T>> {
  if (!isCanonicalEntityId(workspaceId) || !isCanonicalEntityId(entityId)) {
    return Object.freeze({ state: "MALFORMED" });
  }
  const snapshot = await transaction.get(["workspaces", workspaceId, collection, entityId]);
  if (!snapshot.exists) return Object.freeze({ state: "MISSING" });
  return parser(snapshot.data, Object.freeze({ workspaceId, entityId }));
}

export function createEntityRegistryRepository(transaction: TrustedTransaction): EntityRegistryRepository {
  return Object.freeze({
    getStudent: (workspaceId: string, studentId: string) => getRegistry(transaction, workspaceId, studentId, "studentRegistry", parseStudentRegistryDocument),
    getClass: (workspaceId: string, classId: string) => getRegistry(transaction, workspaceId, classId, "classRegistry", parseClassRegistryDocument),
    getSubject: (workspaceId: string, subjectId: string) => getRegistry(transaction, workspaceId, subjectId, "subjectRegistry", parseSubjectRegistryDocument),
  });
}
