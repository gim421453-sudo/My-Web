import { getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";
import {
  recordAppNextAuthInstanceCreated,
  recordAppNextFirebaseInit,
} from "../app-next/appNextDiagnostics";

const requiredEnv = {
  VITE_FIREBASE_API_KEY: import.meta.env.VITE_FIREBASE_API_KEY,
  VITE_FIREBASE_AUTH_DOMAIN: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  VITE_FIREBASE_PROJECT_ID: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  VITE_FIREBASE_STORAGE_BUCKET: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  VITE_FIREBASE_MESSAGING_SENDER_ID: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  VITE_FIREBASE_APP_ID: import.meta.env.VITE_FIREBASE_APP_ID,
};

if (import.meta.env.DEV) {
  console.info("[PM Firebase env debug]", {
    apiKey: requiredEnv.VITE_FIREBASE_API_KEY ? `${requiredEnv.VITE_FIREBASE_API_KEY.slice(0, 4)}...` : false,
    authDomain: !!requiredEnv.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: !!requiredEnv.VITE_FIREBASE_PROJECT_ID,
    storageBucket: !!requiredEnv.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: !!requiredEnv.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: !!requiredEnv.VITE_FIREBASE_APP_ID,
  });
}

function assertFirebaseConfig() {
  const missing = Object.entries(requiredEnv)
    .filter(([, value]) => !value)
    .map(([key]) => key);

  if (missing.length) {
    throw new Error(`Firebase 환경변수가 비어 있습니다: ${missing.join(", ")}`);
  }
}

assertFirebaseConfig();

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
