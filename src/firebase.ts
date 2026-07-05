export { app, auth, firestore, db } from "./lib/firebase";

export function getSignupMode() {
  return import.meta.env.VITE_SIGNUP_MODE || "development";
}
