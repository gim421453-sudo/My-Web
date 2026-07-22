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
  resolveLegacyAuthAdapterPreviewFlag,
} from "../auth/legacy/legacyAuthAdapterUtils";
import {
  LegacyAuthAdapterPreviewApp,
} from "./LegacyAuthAdapterPreviewApp";
import "./legacyAuthAdapterPreviewStyles.css";

const root = document.getElementById("root");

if (!root) {
  throw new Error("Legacy auth adapter preview root element is missing.");
}

function BlockedPreview({
  title,
  body,
}: {
  title: string;
  body: string;
}) {
  return (
    <main className="legacy-adapter-shell">
      <section className="legacy-adapter-panel legacy-adapter-warning">
        <p className="legacy-adapter-eyebrow">LegacyAuthAdapter Preview</p>
        <h1>{title}</h1>
        <p>{body}</p>
      </section>
    </main>
  );
}

const enabled = resolveLegacyAuthAdapterPreviewFlag({
  search: window.location.search,
  envValue: import.meta.env.VITE_ENABLE_LEGACY_AUTH_ADAPTER_PREVIEW,
  isDev: import.meta.env.DEV,
});

createRoot(root).render(
  <React.StrictMode>
    {!import.meta.env.DEV ? (
      <BlockedPreview
        title="운영 빌드에서는 접근할 수 없습니다"
        body="이 화면은 개발 환경에서만 LegacyAuthAdapter 호환성을 점검하기 위한 화면입니다."
      />
    ) : !enabled ? (
      <BlockedPreview
        title="미리보기 기능이 꺼져 있습니다"
        body="주소에 adapter=on을 붙이거나 VITE_ENABLE_LEGACY_AUTH_ADAPTER_PREVIEW=true를 설정하면 개발 환경에서만 활성화됩니다."
      />
    ) : (
      <AuthProvider>
        <LegacyAuthAdapterProvider>
          <LegacyAuthAdapterPreviewApp />
        </LegacyAuthAdapterProvider>
      </AuthProvider>
    )}
  </React.StrictMode>,
);
