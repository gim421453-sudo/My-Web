import React from "react";
import {
  createRoot,
} from "react-dom/client";

import {
  AuthProvider,
} from "../auth/AuthProvider";
import {
  LegacyAuthAdapterProvider,
} from "../auth/legacy/LegacyAuthAdapter";
import {
  resolveLegacyAuthGuardPreviewFlag,
} from "../auth/legacy/guards/legacyGuardDecisionUtils";
import {
  LegacyGuardPreviewApp,
} from "./LegacyGuardPreviewApp";
import "./legacyGuardPreviewStyles.css";

const root = document.getElementById("root");

if (!root) {
  throw new Error("Legacy auth guard preview root element is missing.");
}

function BlockedPreview({
  title,
  body,
}: {
  title: string;
  body: string;
}) {
  return (
    <main className="legacy-guard-shell">
      <section className="legacy-guard-panel legacy-guard-warning">
        <p className="legacy-guard-eyebrow">Legacy Guard Preview</p>
        <h1>{title}</h1>
        <p>{body}</p>
      </section>
    </main>
  );
}

const enabled = resolveLegacyAuthGuardPreviewFlag({
  search: new URL(document.URL).search,
  envValue: import.meta.env.VITE_ENABLE_LEGACY_AUTH_GUARD_PREVIEW,
  isDev: import.meta.env.DEV,
});

createRoot(root).render(
  <React.StrictMode>
    {!import.meta.env.DEV ? (
      <BlockedPreview
        title="운영 빌드에서는 접근할 수 없습니다"
        body="이 화면은 개발 환경에서만 LegacyAuthAdapter 기반 Guard 판단을 점검합니다."
      />
    ) : !enabled ? (
      <BlockedPreview
        title="미리보기 기능이 꺼져 있습니다"
        body="주소에 guard=on을 붙이거나 VITE_ENABLE_LEGACY_AUTH_GUARD_PREVIEW=true를 설정하면 개발 환경에서만 활성화됩니다."
      />
    ) : (
      <AuthProvider>
        <LegacyAuthAdapterProvider>
          <LegacyGuardPreviewApp />
        </LegacyAuthAdapterProvider>
      </AuthProvider>
    )}
  </React.StrictMode>,
);
