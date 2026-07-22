import React from "react";
import {
  createRoot,
} from "react-dom/client";
import {
  AuthProvider,
} from "../../auth/AuthProvider";
import {
  Notifications,
} from "./Notifications";
import {
  resolveNotificationsNewAuthFlag,
} from "./notificationsUtils";
import "./notificationsStyles.css";

const root = document.getElementById("root");

if (!root) {
  throw new Error("Notifications root element is missing.");
}

const enabled = resolveNotificationsNewAuthFlag({
  search: window.location.search,
  envValue: import.meta.env.VITE_ENABLE_NEW_AUTH_NOTIFICATIONS,
  isDev: import.meta.env.DEV,
});

createRoot(root).render(
  <React.StrictMode>
    {enabled ? (
      <AuthProvider>
        <Notifications mode="new-auth" />
      </AuthProvider>
    ) : (
      <Notifications />
    )}
  </React.StrictMode>,
);
