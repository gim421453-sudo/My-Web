import React from "react";
import {
  createRoot,
} from "react-dom/client";
import {
  BrowserRouter,
} from "react-router-dom";

import {
  AuthProvider as LegacyOperationalAuthProvider,
} from "../context/AuthContext";
import {
  protectedRouteModeForFlag,
  resolveNewAuthProtectedRouteFlag,
} from "../auth/legacy/guards/protectedRouteBridgeUtils";
import {
  ProtectedRouteBridgePreviewApp,
} from "./ProtectedRouteBridgePreviewApp";
import "../dev-require-auth-bridge/requireAuthBridgePreviewStyles.css";

const root = document.getElementById("root");

if (!root) {
  throw new Error("ProtectedRoute bridge preview root element is missing.");
}

const enabled = resolveNewAuthProtectedRouteFlag({
  search: new URL(document.URL).search,
  envValue: import.meta.env.VITE_ENABLE_NEW_AUTH_PROTECTED_ROUTE,
  isDev: import.meta.env.DEV,
});
const mode = protectedRouteModeForFlag(enabled);

function AppTree() {
  const app = (
    <BrowserRouter>
      <ProtectedRouteBridgePreviewApp
        mode={mode}
        flagEnabled={enabled}
      />
    </BrowserRouter>
  );

  if (mode === "legacy") {
    return (
      <LegacyOperationalAuthProvider>
        {app}
      </LegacyOperationalAuthProvider>
    );
  }

  return app;
}

createRoot(root).render(
  <React.StrictMode>
    <AppTree />
  </React.StrictMode>,
);
