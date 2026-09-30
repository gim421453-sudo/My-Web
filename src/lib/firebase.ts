import { getApps, initializeApp, type FirebaseApp } from "firebase/app";
import {
  connectAuthEmulator,
  getAuth,
  type Auth,
} from "firebase/auth";
import {
  connectFirestoreEmulator,
  getFirestore,
  type Firestore,
} from "firebase/firestore";
import {
  recordAppNextAuthInstanceCreated,
  recordAppNextFirebaseInit,
} from "../app-next/appNextDiagnostics";
import { recordOperationalSafetyState } from "../release/operationalSafetyAdapter";

const requiredEnv = {
  VITE_FIREBASE_API_KEY: import.meta.env.VITE_FIREBASE_API_KEY,
  VITE_FIREBASE_AUTH_DOMAIN: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  VITE_FIREBASE_PROJECT_ID: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  VITE_FIREBASE_STORAGE_BUCKET: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  VITE_FIREBASE_MESSAGING_SENDER_ID: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  VITE_FIREBASE_APP_ID: import.meta.env.VITE_FIREBASE_APP_ID,
};

function assertFirebaseConfig() {
  const missing = Object.entries(requiredEnv)
    .filter(([, value]) => !value)
    .map(([key]) => key);

  if (missing.length) {
    throw new Error(`Firebase 환경변수가 비어 있습니다: ${missing.join(", ")}`);
  }
}

recordOperationalSafetyState("firebaseInitState", "starting");
try {
  assertFirebaseConfig();
} catch (error) {
  recordOperationalSafetyState("firebaseInitState", "failed");
  throw error;
}

const firebaseConfig = {
  apiKey: requiredEnv.VITE_FIREBASE_API_KEY,
  authDomain: requiredEnv.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: requiredEnv.VITE_FIREBASE_PROJECT_ID,
  storageBucket: requiredEnv.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: requiredEnv.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: requiredEnv.VITE_FIREBASE_APP_ID,
};

export const app: FirebaseApp = getApps().length
  ? getApps()[0]
  : initializeApp(firebaseConfig);

recordOperationalSafetyState("firebaseInitState", "ready");

recordAppNextFirebaseInit({
  appName: app.name,
  appCount: getApps().length,
  projectId: firebaseConfig.projectId,
  authDomain: firebaseConfig.authDomain,
});

export const auth: Auth = getAuth(app);
recordAppNextAuthInstanceCreated();
export const firestore: Firestore = getFirestore(app);
export const db = firestore;

function connectLocalFirebaseEmulators(): void {
  const authHost = import.meta.env.VITE_FIREBASE_AUTH_EMULATOR_HOST;
  const firestoreHost = import.meta.env.VITE_FIREBASE_FIRESTORE_EMULATOR_HOST;
  if (!authHost && !firestoreHost) return;
  if (!import.meta.env.DEV) return;

  const validLoopbackHost = (value: string | undefined): boolean =>
    /^(127\.0\.0\.1|localhost):([1-9][0-9]{0,4})$/.test(String(value || ""))
    && Number(String(value).split(":").pop()) <= 65535;

  if (!authHost || !firestoreHost
    || !validLoopbackHost(authHost) || !validLoopbackHost(firestoreHost)) {
    throw new Error("Firebase Emulator endpoints must both be loopback hosts in development mode.");
  }

  const [firestoreEmulatorHost, firestoreEmulatorPort] = firestoreHost.split(":");
  connectAuthEmulator(auth, `http://${authHost}`, { disableWarnings: true });
  connectFirestoreEmulator(
    firestore,
    firestoreEmulatorHost,
    Number(firestoreEmulatorPort),
  );
}

connectLocalFirebaseEmulators();
