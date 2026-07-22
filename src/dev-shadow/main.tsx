import React from "react";
import { createRoot } from "react-dom/client";
import { AuthProvider } from "../auth/AuthProvider";
import { FirstReactScreenAuthPanel } from "./FirstReactScreenAuthPanel";
import { ShadowAuthTestApp } from "./ShadowAuthTestApp";
import { resolveFirstReactScreenAuthFlag } from "./firstReactScreenAuthUtils";
import { isShadowPageAllowed } from "./shadowPageUtils";
import "./shadowTestStyles.css";

const root = document.getElementById("root");

if (!root) {
  throw new Error("Shadow auth test root element is missing.");
}

if (!isShadowPageAllowed(import.meta.env.DEV)) {
  root.textContent = "Shadow auth test page is development-only.";
  throw new Error("Shadow auth test page is development-only.");
}

const useNewAuthProvider = resolveFirstReactScreenAuthFlag({
  search: window.location.search,
  envValue: import.meta.env.VITE_ENABLE_NEW_AUTH_FOR_FIRST_REACT_SCREEN,
  isDev: import.meta.env.DEV,
});

createRoot(root).render(
  <React.StrictMode>
    {useNewAuthProvider ? (
      <AuthProvider>
        <FirstReactScreenAuthPanel />
      </AuthProvider>
    ) : (
      <ShadowAuthTestApp />
    )}
  </React.StrictMode>,
);
