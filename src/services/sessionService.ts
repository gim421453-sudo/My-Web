import { getAuth, onAuthStateChanged, type User } from "firebase/auth";
import { getFirebaseApp } from "./firebaseProvider";

export function watchSession(callback: (user: User | null) => void) {
  return onAuthStateChanged(getAuth(getFirebaseApp()), callback);
}

export async function logoutCurrentDevice() {
  // Frontend-only logout. Server-side session revocation belongs in Cloud Functions.
  await getAuth(getFirebaseApp()).signOut();
}

export async function requestLogoutDevice(deviceId: string) {
  // TODO: call Cloud Functions + Firebase Admin SDK to revoke a specific device session.
  return { deviceId, status: "todo_server_function_required" };
}

export async function requestLogoutAllDevices(uid: string) {
  // TODO: call Cloud Functions + Firebase Admin SDK to revoke refresh tokens for all devices.
  return { uid, status: "todo_server_function_required" };
}
