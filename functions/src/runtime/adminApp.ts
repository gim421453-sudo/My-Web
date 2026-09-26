import { getApps, initializeApp, type App } from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import {
  assertTrustedBackendEmulatorOnly,
  type TrustedBackendGuardOptions,
  type TrustedBackendRuntimeContext,
} from "./emulatorGuard.js";

export interface AdminAppDependencies {
  getApps(): App[];
  initializeApp(options: { projectId: string }): App;
}

export interface TrustedAdminApp {
  app: App;
  context: TrustedBackendRuntimeContext;
}

export function createTrustedAdminAppInitializer(dependencies: AdminAppDependencies) {
  return (options: TrustedBackendGuardOptions = {}): TrustedAdminApp => {
    const context = assertTrustedBackendEmulatorOnly(options);
    const existing = dependencies.getApps()[0];
    const app = existing || dependencies.initializeApp({ projectId: context.projectId });
    return Object.freeze({ app, context });
  };
}

const initializeTrustedAdminApp = createTrustedAdminAppInitializer({
  getApps,
  initializeApp,
});

export function ensureTrustedAdminApp(options: TrustedBackendGuardOptions = {}): TrustedAdminApp {
  return initializeTrustedAdminApp(options);
}

export interface TrustedAdminServices extends TrustedAdminApp {
  auth: Auth;
  firestore: Firestore;
}

export function getTrustedAdminServices(options: TrustedBackendGuardOptions = {}): TrustedAdminServices {
  const initialized = ensureTrustedAdminApp(options);
  return Object.freeze({
    ...initialized,
    auth: getAuth(initialized.app),
    firestore: getFirestore(initialized.app),
  });
}
