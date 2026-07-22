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
  requireAuthModeForFlag,
  resolveNewAuthRequireAuthFlag,
} from "../auth/legacy/guards/requireAuthBridgeUtils";
import {
  RequireAuthBridgePreviewApp,
} from "./RequireAuthBridgePreviewApp";
import "./requireAuthBridgePreviewStyles.css";

const root = document.getElementById("root");

if (!root) {
  throw new Error("RequireAuth bridge preview root element is missing.");
}

const enabled = resolveNewAuthRequireAuthFlag({
  search: new URL(document.URL).search,
  envValue: import.meta.env.VITE_ENABLE_NEW_AUTH_REQUIRE_AUTH,
  isDev: import.meta.env.DEV,
});
const mode = requireAuthModeForFlag(enabled);

function AppTree() {
  const app = (
    <BrowserRouter>
      <RequireAuthBridgePreviewApp
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
