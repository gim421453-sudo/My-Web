import { Timestamp, type Firestore, type Transaction } from "firebase-admin/firestore";
import type { AuthorityDocumentSnapshot } from "../authz/authorizationTypes.js";
import { isValidDocumentId } from "../authz/resolverUtils.js";
import { getTrustedAdminFirestore } from "../runtime/adminFirestore.js";
import type { TrustedBackendGuardOptions } from "../runtime/emulatorGuard.js";
import { OperationError } from "../operations/operationErrors.js";

export interface TrustedTransaction {
  readonly now: unknown;
  get(pathSegments: readonly string[]): Promise<AuthorityDocumentSnapshot>;
  queryEqual(
    pathSegments: readonly string[],
    field: string,
    value: string | number | boolean,
  ): Promise<readonly AuthorityDocumentSnapshot[]>;
  create(pathSegments: readonly string[], data: Readonly<Record<string, unknown>>): void;
  set(pathSegments: readonly string[], data: Readonly<Record<string, unknown>>): void;
  update(pathSegments: readonly string[], data: Readonly<Record<string, unknown>>): void;
  delete(pathSegments: readonly string[]): void;
}

export interface TrustedTransactionRunner {
  run<T>(callback: (transaction: TrustedTransaction) => Promise<T>): Promise<T>;
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

function adminTransactionAdapter(firestore: Firestore, transaction: Transaction): TrustedTransaction {
  return Object.freeze({
    now: Timestamp.now(),
    async get(pathSegments: readonly string[]) {
      const snapshot = await transaction.get(firestore.doc(documentPath(pathSegments)));
      return Object.freeze({
        exists: snapshot.exists,
        data: snapshot.exists ? snapshot.data() : undefined,
      });
    },
    async queryEqual(
      pathSegments: readonly string[],
      field: string,
      value: string | number | boolean,
    ) {
      const snapshot = await transaction.get(
        firestore.collection(collectionPath(pathSegments)).where(queryField(field), "==", value),
      );
      return Object.freeze(snapshot.docs.map((document) => Object.freeze({
        exists: true,
        data: document.data(),
      })));
    },
    create(pathSegments: readonly string[], data: Readonly<Record<string, unknown>>) {
      transaction.create(firestore.doc(documentPath(pathSegments)), data);
    },
    set(pathSegments: readonly string[], data: Readonly<Record<string, unknown>>) {
      transaction.set(firestore.doc(documentPath(pathSegments)), data);
    },
    update(pathSegments: readonly string[], data: Readonly<Record<string, unknown>>) {
      transaction.update(firestore.doc(documentPath(pathSegments)), data);
    },
    delete(pathSegments: readonly string[]) {
      transaction.delete(firestore.doc(documentPath(pathSegments)));
    },
  });
}

export function createAdminTransactionRunner(firestore: Firestore): TrustedTransactionRunner {
  return Object.freeze({
    run: <T>(callback: (transaction: TrustedTransaction) => Promise<T>) => firestore.runTransaction(
      (transaction) => callback(adminTransactionAdapter(firestore, transaction)),
    ),
  });
}

export function getEmulatorTransactionRunner(
  options: TrustedBackendGuardOptions = {},
): TrustedTransactionRunner {
  const boundary = getTrustedAdminFirestore(options);
  return createAdminTransactionRunner(boundary.firestore);
}
