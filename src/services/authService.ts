import {
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";

import { auth } from "../lib/firebase";

import { loadAppSession } from "./authAccess";

import type { AppSession } from "../types/auth";

export async function loginWithEmail(
  email: string,
  password: string,
): Promise<AppSession> {
  try {
    const credential =
      await signInWithEmailAndPassword(
        auth,
        email.trim(),
        password,
      );

    const session = await loadAppSession(
      credential.user,
    );

    return session;
  } catch (error) {
    /*
     * Firebase Authentication은 성공했지만
     * Firestore 상태 검사에서 실패한 경우,
     * 인증 상태를 반드시 로그아웃시킵니다.
     */
    if (auth.currentUser) {
      await signOut(auth);
    }

    throw error;
  }
}

export async function logoutUser(): Promise<void> {
  await signOut(auth);
}