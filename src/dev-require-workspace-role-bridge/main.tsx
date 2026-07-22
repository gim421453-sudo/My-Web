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
  requireWorkspaceRoleModeForFlag,
  resolveNewAuthRequireWorkspaceRoleFlag,
} from "../auth/legacy/guards/workspaceRoleBridgeUtils";
import {
  RequireWorkspaceRoleBridgePreviewApp,
} from "./RequireWorkspaceRoleBridgePreviewApp";
import "../dev-require-auth-bridge/requireAuthBridgePreviewStyles.css";

const root = document.getElementById("root");

if (!root) {
  throw new Error("RequireWorkspaceRole bridge preview root element is missing.");
}

const enabled = resolveNewAuthRequireWorkspaceRoleFlag({
  search: new URL(document.URL).search,
  envValue: import.meta.env.VITE_ENABLE_NEW_AUTH_REQUIRE_WORKSPACE_ROLE,
  isDev: import.meta.env.DEV,
});
const mode = requireWorkspaceRoleModeForFlag(enabled);

function AppTree() {
  const app = (
    <BrowserRouter>
      <RequireWorkspaceRoleBridgePreviewApp
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
