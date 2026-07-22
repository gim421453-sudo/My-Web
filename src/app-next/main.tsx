import React from "react";
import {
  createRoot,
} from "react-dom/client";
import {
  BrowserRouter,
} from "react-router-dom";
import {
  AuthProvider,
} from "../auth/AuthProvider";
import {
  LegacyAuthAdapterProvider,
} from "../auth/legacy/LegacyAuthAdapter";
import {
  AppNext,
} from "./AppNext";
import {
  AppNextErrorBoundary,
} from "./AppNextErrorBoundary";
import {
  appNextModeForFlag,
  resolveAppNextAuthFlag,
} from "./appNextUtils";
import "./styles.css";

function AppNextDisabled() {
  return (
    <main className="app-next-shell">
      <section className="app-next-card app-next-muted">
        <p>App Next 읽기 전용</p>
        <h1>이 시험 화면은 비활성화되어 있습니다.</h1>
        <p>개발 환경 rollback: <code>?appNextAuth=off</code></p>
      </section>
    </main>
  );
}

const root = document.getElementById("root");

if (!root) {
  throw new Error("App Next root element is missing.");
}

const resolvedAuthFlag = resolveAppNextAuthFlag({
  search: window.location.search,
  envValue: import.meta.env.VITE_ENABLE_APP_NEXT_AUTH,
  isDev: import.meta.env.DEV,
});
const mode = appNextModeForFlag(resolvedAuthFlag.enabled);

createRoot(root).render(
  <React.StrictMode>
    {mode === "enabled" ? (
      <BrowserRouter>
        <AuthProvider>
          <LegacyAuthAdapterProvider>
            <AppNextErrorBoundary>
              <AppNext featureSource={resolvedAuthFlag.source} />
            </AppNextErrorBoundary>
          </LegacyAuthAdapterProvider>
        </AuthProvider>
      </BrowserRouter>
    ) : (
      <AppNextDisabled />
    )}
  </React.StrictMode>,
);
