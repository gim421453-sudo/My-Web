import {
  StrictMode,
} from "react";
import {
  createRoot,
} from "react-dom/client";

import {
  loginBridgeModeForFlag,
  resolveNewAuthLoginFlag,
} from "../pages/loginBridgeUtils";
import {
  LoginBridgePreviewApp,
} from "./LoginBridgePreviewApp";

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Login bridge preview root element is missing.");
}

const enabled = resolveNewAuthLoginFlag({
  search: window.location.search,
  envValue: import.meta.env.VITE_ENABLE_NEW_AUTH_LOGIN,
  isDev: import.meta.env.DEV,
});

createRoot(rootElement).render(
  <StrictMode>
    <LoginBridgePreviewApp
      mode={loginBridgeModeForFlag(enabled)}
      flagEnabled={enabled}
    />
  </StrictMode>,
);
