import { getApps, initializeApp, type App } from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import type { AuthorityDocumentReader } from "../authz/authorizationTypes.js";
import {
  assertFirestoreEmulatorOnly,
} from "./firestoreEmulatorGuard.js";
import type {
  TrustedBackendGuardOptions,
  TrustedBackendRuntimeContext,
} from "./emulatorGuard.js";

export type AdminFirestoreBoundaryCode = "FIRESTORE_ADMIN_APP_PROJECT_MISMATCH";

export class AdminFirestoreBoundaryError extends Error {
  readonly code: AdminFirestoreBoundaryCode;

  constructor(code: AdminFirestoreBoundaryCode) {
    super(code);
    this.name = "AdminFirestoreBoundaryError";
    this.code = code;
  }
}

export interface TrustedAdminFirestore {
  app: App;
  context: TrustedBackendRuntimeContext;
  firestore: Firestore;
}

export interface AdminFirestoreDependencies {
  assertGuard(options?: TrustedBackendGuardOptions): TrustedBackendRuntimeContext;
  getApps(): App[];
  initializeApp(options: { projectId: string }): App;
  getFirestore(app: App): Firestore;
}

export function createTrustedAdminFirestoreGetter(dependencies: AdminFirestoreDependencies) {
  return (options: TrustedBackendGuardOptions = {}): TrustedAdminFirestore => {
    const context = dependencies.assertGuard(options);
    const apps = dependencies.getApps();
    const matching = apps.find((app) => app.options.projectId === context.projectId);
    if (!matching && apps.length > 0) {
      throw new AdminFirestoreBoundaryError("FIRESTORE_ADMIN_APP_PROJECT_MISMATCH");
    }
    const app = matching || dependencies.initializeApp({ projectId: context.projectId });
    return Object.freeze({
      app,
      context,
      firestore: dependencies.getFirestore(app),
    });
  };
}

const resolveTrustedAdminFirestore = createTrustedAdminFirestoreGetter({
  assertGuard: assertFirestoreEmulatorOnly,
  getApps,
  initializeApp,
  getFirestore,
});

export function getTrustedAdminFirestore(
  options: TrustedBackendGuardOptions = {},
): TrustedAdminFirestore {
  return resolveTrustedAdminFirestore(options);
}

export function createAdminAuthorityDocumentReader(firestore: Firestore): AuthorityDocumentReader {
  return Object.freeze({
    async getDocument(pathSegments: readonly string[]) {
      const snapshot = await firestore.doc(pathSegments.join("/")).get();
      return Object.freeze({
        exists: snapshot.exists,
        data: snapshot.exists ? snapshot.data() : undefined,
      });
    },
  });
}
