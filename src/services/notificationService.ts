import { addDoc, collection, doc, getDocs, query, serverTimestamp, updateDoc, where } from "firebase/firestore";
import { getFirebaseDb } from "./firebaseProvider";
import { collections } from "./firestoreSchema";

export async function createNotification(workspaceId: string, uid: string, type: string, title: string, message: string, relatedId?: string) {
  return addDoc(collection(getFirebaseDb(), collections.notifications), {
    workspaceId,
    uid,
    type,
    title,
    message,
    read: false,
    createdAt: serverTimestamp(),
    relatedId: relatedId || null
  });
}

export async function markNotificationRead(notificationId: string) {
  await updateDoc(doc(getFirebaseDb(), collections.notifications, notificationId), { read: true });
}

export async function listNotifications(workspaceId: string, uid: string) {
  const snap = await getDocs(query(collection(getFirebaseDb(), collections.notifications), where("workspaceId", "==", workspaceId), where("uid", "==", uid)));
  return snap.docs.map((item) => ({ notificationId: item.id, ...item.data() }));
}

export async function requestPushSend() {
  // TODO: push delivery should be performed by Cloud Functions using Firebase Admin SDK.
  return { status: "todo_server_function_required" };
}
