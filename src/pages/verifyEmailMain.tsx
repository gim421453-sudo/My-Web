import React from "react";
import {
  createRoot,
} from "react-dom/client";
import {
  AuthProvider,
} from "../auth/AuthProvider";
import {
  VerifyEmail,
} from "./VerifyEmail";
import {
  resolveVerifyEmailNewAuthFlag,
} from "./verifyEmailUtils";
import "./verifyEmailStyles.css";

const root = document.getElementById("root");

if (!root) {
  throw new Error("VerifyEmail root element is missing.");
}

const enabled = resolveVerifyEmailNewAuthFlag({
  search: window.location.search,
  envValue: import.meta.env.VITE_ENABLE_NEW_AUTH_VERIFY_EMAIL,
  isDev: import.meta.env.DEV,
});

createRoot(root).render(
  <React.StrictMode>
    {enabled ? (
      <AuthProvider>
        <VerifyEmail mode="new-auth" />
      </AuthProvider>
    ) : (
      <VerifyEmail />
    )}
  </React.StrictMode>,
);
