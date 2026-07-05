import { getMessaging, isSupported } from "firebase/messaging";
import { app, auth, firestore } from "../lib/firebase";

export function getFirebaseApp() {
  return app;
}

export function getFirebaseAuth() {
  return auth;
}

export function getFirebaseDb() {
  return firestore;
}

export async function getFirebaseMessagingIfSupported() {
  return (await isSupported()) ? getMessaging(getFirebaseApp()) : null;
}
