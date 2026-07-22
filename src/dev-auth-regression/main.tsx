import React from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";
import {
  runAuthRegressionComparison,
  summarizeAuthRegressionComparison,
} from "./authRegressionReport";

const results = runAuthRegressionComparison();
const summary = summarizeAuthRegressionComparison(results);

function Badge({ label, tone }: { label: string; tone: "ok" | "warn" | "danger" }) {
  return <span className={`badge ${tone}`}>{label}</span>;
}

function App() {
  return (
    <main className="page">
      <section className="hero">
        <p className="eyebrow">development only</p>
        <h1>Auth Legacy/New Regression Preview</h1>
        <p>
          운영 정적 인증과 신규 AuthProvider 해석을 mock fixture로만 비교합니다.
          Firestore write, listener, signOut은 실행하지 않습니다.
        </p>
      </section>

      <section className="summary" aria-label="summary">
        <div><strong>{summary.total}</strong><span>fixtures</span></div>
        <div><strong>{summary.critical}</strong><span>critical</span></div>
        <div><strong>{summary.high}</strong><span>high</span></div>
        <div><strong>{summary.medium}</strong><span>medium</span></div>
        <div><strong>{summary.low}</strong><span>low</span></div>
      </section>

      <section className="grid">
        {results.map((result) => (
          <article className="card" key={result.fixtureName}>
            <header>
              <h2>{result.fixtureName}</h2>
              {result.hasCriticalMismatch ? (
                <Badge label="critical mismatch" tone="danger" />
              ) : result.hasHighMismatch ? (
                <Badge label="high mismatch" tone="warn" />
              ) : (
                <Badge label="safe" tone="ok" />
              )}
            </header>
            <dl>
              <dt>legacy status</dt>
              <dd>{result.legacy.status}</dd>
              <dt>new status</dt>
              <dd>{result.new.status}</dd>
              <dt>legacy global</dt>
              <dd>{result.legacy.globalRole}</dd>
              <dt>new global</dt>
              <dd>{result.new.globalRole}</dd>
              <dt>legacy workspace role</dt>
              <dd>{result.legacy.currentWorkspaceRole ?? "null"}</dd>
              <dt>new workspace role</dt>
              <dd>{result.new.currentWorkspaceRole ?? "null"}</dd>
              <dt>write</dt>
              <dd>{result.legacy.firestoreWrite || result.new.firestoreWrite ? "yes" : "none"}</dd>
              <dt>auto signOut</dt>
              <dd>{result.legacy.automaticSignOut || result.new.automaticSignOut ? "yes" : "none"}</dd>
            </dl>
            {result.mismatches.length > 0 && (
              <ul>
                {result.mismatches.map((mismatch) => (
                  <li key={`${result.fixtureName}-${String(mismatch.field)}`}>
                    <strong>{mismatch.severity}</strong> {String(mismatch.field)}
                  </li>
                ))}
              </ul>
            )}
          </article>
        ))}
      </section>
    </main>
  );
}

const root = document.getElementById("auth-regression-root");
if (!root) {
  throw new Error("auth-regression-root not found");
}

createRoot(root).render(<App />);
