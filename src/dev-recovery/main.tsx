import React from "react";
import { createRoot } from "react-dom/client";
import { AuthProvider } from "../auth/AuthProvider";
import { WorkspaceParentRecoveryApp } from "./WorkspaceParentRecoveryApp";

const root = document.getElementById("root");

if (!root) {
  throw new Error("Workspace parent recovery root element is missing.");
}

createRoot(root).render(
  <React.StrictMode>
    <AuthProvider>
      <WorkspaceParentRecoveryApp />
    </AuthProvider>
  </React.StrictMode>,
);

