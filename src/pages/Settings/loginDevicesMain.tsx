import React from "react";
import {
  createRoot,
} from "react-dom/client";
import {
  AuthProvider,
} from "../../auth/AuthProvider";
import {
  LoginDevices,
} from "./LoginDevices";
import {
  resolveLoginDevicesNewAuthFlag,
} from "./loginDevicesUtils";
import "./loginDevicesStyles.css";

const root = document.getElementById("root");

if (!root) {
  throw new Error("LoginDevices root element is missing.");
}

const enabled = resolveLoginDevicesNewAuthFlag({
  search: window.location.search,
  envValue: import.meta.env.VITE_ENABLE_NEW_AUTH_LOGIN_DEVICES,
  isDev: import.meta.env.DEV,
});

createRoot(root).render(
  <React.StrictMode>
    {enabled ? (
      <AuthProvider>
        <LoginDevices mode="new-auth" />
      </AuthProvider>
    ) : (
      <LoginDevices />
    )}
  </React.StrictMode>,
);
