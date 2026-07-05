import { addDoc, collection, doc, getDocs, query, serverTimestamp, updateDoc, where } from "firebase/firestore";
import { getFirebaseDb } from "./firebaseProvider";
import { collections } from "./firestoreSchema";

export type UserDevice = {
  deviceId?: string;
  uid: string;
  workspaceId: string;
  deviceName: string;
  deviceType: string;
  browser: string;
  os: string;
  lastLoginAt?: unknown;
  lastActiveAt?: unknown;
  pushToken?: string | null;
  isCurrentDevice: boolean;
  revokedAt?: unknown;
};

export async function registerLoginDevice(device: UserDevice) {
  return addDoc(collection(getFirebaseDb(), collections.userDevices), {
    ...device,
    lastLoginAt: serverTimestamp(),
    lastActiveAt: serverTimestamp(),
    revokedAt: null
  });
}

export async function touchDevice(deviceId: string) {
  await updateDoc(doc(getFirebaseDb(), collections.userDevices, deviceId), { lastActiveAt: serverTimestamp() });
}

export async function listDevices(uid: string, workspaceId: string) {
  const snap = await getDocs(query(collection(getFirebaseDb(), collections.userDevices), where("uid", "==", uid), where("workspaceId", "==", workspaceId)));
  return snap.docs.map((item) => ({ deviceId: item.id, ...item.data() }));
}

export async function savePushToken(deviceId: string, pushToken: string) {
  await updateDoc(doc(getFirebaseDb(), collections.userDevices, deviceId), { pushToken });
}
