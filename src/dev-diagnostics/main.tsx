import React from "react";
import { createRoot } from "react-dom/client";
import { AuthProvider } from "../auth/AuthProvider";
import { isShadowPageAllowed } from "../dev-shadow/shadowPageUtils";
import {
  authModeForNewAuthDiagnosticsFlag,
  resolveNewAuthDiagnosticsFlag,
} from "./newAuthDiagnosticsFlag";
import { OwnerAdminDiagnosticsApp } from "./OwnerAdminDiagnosticsApp";
import "../dev-shadow/shadowTestStyles.css";
import "./ownerAdminDiagnosticsStyles.css";

const root = document.getElementById("root");

if (!root) {
  throw new Error("Owner admin diagnostics root element is missing.");
}

if (!isShadowPageAllowed(import.meta.env.DEV)) {
  root.textContent = "Owner admin diagnostics page is development-only.";
  throw new Error("Owner admin diagnostics page is development-only.");
}

const enableNewAuthProvider = resolveNewAuthDiagnosticsFlag({
  search: window.location.search,
  envValue: import.meta.env.VITE_ENABLE_NEW_AUTH_PROVIDER_DIAGNOSTICS,
});
const authMode = authModeForNewAuthDiagnosticsFlag(enableNewAuthProvider);
const diagnosticsApp = <OwnerAdminDiagnosticsApp authMode={authMode} />;

createRoot(root).render(
  <React.StrictMode>
    {enableNewAuthProvider
      ? <AuthProvider>{diagnosticsApp}</AuthProvider>
      : diagnosticsApp}
  </React.StrictMode>,
);
