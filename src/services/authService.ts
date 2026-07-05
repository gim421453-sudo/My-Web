import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  type User
} from "firebase/auth";
import { doc, getDoc, serverTimestamp, updateDoc, writeBatch } from "firebase/firestore";
import { getSignupMode } from "../firebase";
import { getFirebaseAuth, getFirebaseDb } from "./firebaseProvider";
import { collections, type UserProfileDoc, type WorkspaceRole } from "./firestoreSchema";

export async function registerWithEmail(email: string, password: string, displayName: string) {
  if (getSignupMode() === "invite_only") throw new Error("현재는 초대 전용 가입 모드입니다.");
  const auth = getFirebaseAuth();
  const credential = await createUserWithEmailAndPassword(auth, email, password);
  await sendEmailVerification(credential.user);
  await ensureUserProfile(credential.user, displayName, "super_manager");
  return credential.user;
}

export async function loginWithEmail(email: string, password: string) {
  const credential = await signInWithEmailAndPassword(getFirebaseAuth(), email, password);
  await ensureUserProfile(credential.user, credential.user.displayName || credential.user.email || "", "normal");
  return credential.user;
}

export async function loginWithGoogle() {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  const credential = await signInWithPopup(getFirebaseAuth(), provider);
  await ensureUserProfile(credential.user, credential.user.displayName || credential.user.email || "", "super_manager");
  return credential.user;
}

export async function logout() {
  await signOut(getFirebaseAuth());
}

export async function resetPassword(email: string) {
  await sendPasswordResetEmail(getFirebaseAuth(), email);
}

export async function ensureEmailVerification(user: User) {
  if (!user.emailVerified) await sendEmailVerification(user);
}

export async function getCurrentUser() {
  return getFirebaseAuth().currentUser;
}

export async function ensureUserProfile(user: User, displayName = "", role: WorkspaceRole = "normal") {
  const db = getFirebaseDb();
  const userRef = doc(db, collections.users, user.uid);
  const workspaceId = `ws_${user.uid}`;
  const memberId = `${workspaceId}_${user.uid}`;
  const memberRef = doc(db, collections.workspaceMembers, memberId);
  const [userSnap, memberSnap] = await Promise.all([getDoc(userRef), getDoc(memberRef)]);
  const currentRole = memberSnap.exists() ? (memberSnap.data().role as WorkspaceRole) : role;
  const profile: UserProfileDoc = {
    uid: user.uid,
    email: user.email,
    displayName: displayName || user.displayName || user.email || "사용자",
    emailVerified: user.emailVerified,
    globalRole: "user",
    currentWorkspaceId: workspaceId,
    currentRole,
    disabled: userSnap.exists() ? !!(userSnap.data() as UserProfileDoc).disabled : false,
    createdAt: userSnap.exists() ? (userSnap.data() as UserProfileDoc).createdAt : serverTimestamp(),
    lastLoginAt: serverTimestamp()
  };
  const batch = writeBatch(db);
  batch.set(userRef, profile, { merge: true });
  batch.set(doc(db, collections.workspaces, workspaceId), {
    workspaceId,
    name: `${profile.displayName} workspace`,
    ownerUid: user.uid,
    plan: "free",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  }, { merge: true });
  batch.set(memberRef, {
    id: memberId,
    workspaceId,
    uid: user.uid,
    role: currentRole,
    status: "active",
    joinedAt: serverTimestamp(),
    invitedBy: null
  }, { merge: true });
  await batch.commit();
  return profile;
}
