(function attachOperationalSafety(root) {
  const RELEASE_CHANNEL = "owner-preview";
  const VALID_MODES = new Set(["normal", "maintenance", "partial-outage", "emergency"]);
  const INITIAL_STATUS_CONFIG = sanitizeStatusConfig(root.PM_OPERATIONAL_SAFETY_STATUS);
  let devOverrideStatus = null;
  const state = {
    globalErrorCount: 0,
    unhandledRejectionCount: 0,
    firebaseInitState: "not-started",
    authInitState: "not-started",
    workspaceInitState: "not-started",
    manifestLoadState: "pending",
    lastErrorCategory: "",
    lastErrorCode: "",
    lastErrorAt: "",
    recoveryAttemptCount: 0,
    recoverySuccessCount: 0,
    sensitiveValueDetected: false,
  };

  function buildMode() {
    const host = root.location?.hostname || "";
    return host === "127.0.0.1" || host === "localhost" || host === "" ? "development" : "production";
  }

  function isDevelopmentBuild() {
    return buildMode() === "development";
  }

  function safeNow() {
    try {
      return new Date().toISOString();
    } catch {
      return "";
    }
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function hasSensitiveText(value) {
    const text = String(value || "");
    return /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/.test(text)
      || /\bAIza[0-9A-Za-z_-]{10,}\b/.test(text)
      || /\bBearer\s+[A-Za-z0-9._-]{10,}\b/i.test(text)
      || /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/.test(text)
      || /\b(?:idToken|refreshToken|accessToken|sessionCookie|uid|workspaceId|authorUid|token|password|apiKey)\b/i.test(text)
      || /\b[A-Za-z0-9_-]{20,}:[A-Za-z0-9_-]{20,}\b/.test(text);
  }

  function safeCode(error) {
    const code = String(error?.code || error?.name || "").trim();
    if (!code) return "unknown";
    if (hasSensitiveText(code)) {
      state.sensitiveValueDetected = true;
      return "redacted";
    }
    return code.replace(/[^A-Za-z0-9_/-]/g, "-").slice(0, 80) || "unknown";
  }

  function classify(error, fallback = "unknown") {
    const code = safeCode(error);
    const rawMessage = String(error?.message || error || "");
    const message = rawMessage.toLowerCase();
    if (hasSensitiveText(rawMessage)) state.sensitiveValueDetected = true;
    if (code.includes("permission-denied")) return { category: "permission-denied", code };
    if (code.includes("resource-exhausted") || message.includes("quota")) return { category: "resource-exhausted", code };
    if (code.includes("network") || code.includes("unavailable")) return { category: "network", code };
    if (fallback !== "unknown") return { category: fallback, code };
    return { category: code === "unknown" ? "unknown" : "runtime", code };
  }

  function sanitizeStatusConfig(value) {
    const source = value && typeof value === "object" ? value : {};
    const mode = String(source.mode || "").trim();
    return {
      mode: VALID_MODES.has(mode) ? mode : "",
      title: source.title === undefined ? "" : String(source.title || ""),
      description: source.description === undefined ? "" : String(source.description || ""),
      estimatedRecoveryAt: source.estimatedRecoveryAt === undefined ? "" : String(source.estimatedRecoveryAt || ""),
    };
  }

  function modeFlags(mode) {
    return {
      readAllowed: mode === "normal" || mode === "partial-outage",
      writeBlocked: mode === "maintenance" || mode === "partial-outage" || mode === "emergency",
      blocksGeneralUsers: mode === "maintenance" || mode === "emergency",
    };
  }

  function configuredStatus() {
    if (isDevelopmentBuild() && devOverrideStatus?.mode) return devOverrideStatus;
    const liveConfig = isDevelopmentBuild()
      ? sanitizeStatusConfig(root.PM_OPERATIONAL_SAFETY_STATUS)
      : INITIAL_STATUS_CONFIG;
    if (liveConfig.mode) return liveConfig;
    const explicitMode = String(root.PM_OPERATIONAL_SAFETY_MODE || "").trim();
    if (isDevelopmentBuild() && VALID_MODES.has(explicitMode)) return { mode: explicitMode };
    return { mode: "normal" };
  }

  function status() {
    const config = configuredStatus();
    const mode = VALID_MODES.has(config.mode) ? config.mode : "normal";
    const flags = modeFlags(mode);
    return {
      mode,
      title: String(config.title || (
        mode === "normal" ? "Normal operation"
          : mode === "partial-outage" ? "Partial outage"
          : mode === "emergency" ? "Emergency maintenance"
            : "Maintenance"
      )),
      description: String(config.description || (
        mode === "normal" ? "The service is available."
          : mode === "partial-outage" ? "Some write actions may be unavailable while read-only checks continue."
          : "The service is temporarily unavailable. Please try again later."
      )),
      estimatedRecoveryAt: String(config.estimatedRecoveryAt || "unavailable"),
      ...flags,
    };
  }

  function isSystemOwner(user) {
    return user?.isSystemOwner === true || user?.isSystemOwnerResolved === true;
  }

  function manifestState() {
    const manifest = root.PM_OWNER_PREVIEW_RELEASE_MANIFEST_V1;
    state.manifestLoadState = manifest?.releaseChannel ? "loaded" : "missing";
    return state.manifestLoadState;
  }

  function recordError(error, fallbackCategory) {
    const classified = classify(error, fallbackCategory);
    state.lastErrorCategory = classified.category;
    state.lastErrorCode = classified.code;
    state.lastErrorAt = safeNow();
    return classified;
  }

  function recordState(key, value) {
    if (key === "firebaseInitState") state.firebaseInitState = String(value || "unknown");
    if (key === "authInitState") state.authInitState = String(value || "unknown");
    if (key === "workspaceInitState") state.workspaceInitState = String(value || "unknown");
    if (key === "manifestLoadState") state.manifestLoadState = String(value || "unknown");
  }

  function safeReleaseInfo() {
    const manifest = root.PM_OWNER_PREVIEW_RELEASE_MANIFEST_V1 || {};
    const features = Array.isArray(manifest.features) ? manifest.features : [];
    const counts = features.reduce((acc, feature) => {
      const stage = feature?.releaseStage || "";
      if (stage === "stable") acc.stableCount += 1;
      if (stage === "beta") acc.betaCount += 1;
      if (stage === "hidden") acc.hiddenCount += 1;
      if (stage === "planned") acc.plannedCount += 1;
      return acc;
    }, {
      stableCount: 0,
      betaCount: 0,
      hiddenCount: 0,
      plannedCount: 0,
    });
    return {
      releaseChannel: String(manifest.releaseChannel || RELEASE_CHANNEL),
      manifestVersion: String(manifest.manifestVersion || "unavailable"),
      buildDate: String(root.PM_BUILD_DATE || manifest.buildDate || "unavailable"),
      appVersion: String(root.PM_APP_VERSION || manifest.appVersion || "unavailable"),
      gitCommit: String(root.PM_GIT_COMMIT || manifest.gitCommit || "unavailable"),
      ...counts,
    };
  }

  function snapshot() {
    manifestState();
    return {
      releaseChannel: safeReleaseInfo().releaseChannel,
      buildMode: buildMode(),
      globalErrorCount: state.globalErrorCount,
      unhandledRejectionCount: state.unhandledRejectionCount,
      firebaseInitState: state.firebaseInitState,
      authInitState: state.authInitState,
      workspaceInitState: state.workspaceInitState,
      manifestLoadState: state.manifestLoadState,
      lastErrorCategory: state.lastErrorCategory,
      lastErrorCode: state.lastErrorCode,
      lastErrorAt: state.lastErrorAt,
      recoveryAttemptCount: state.recoveryAttemptCount,
      recoverySuccessCount: state.recoverySuccessCount,
      maintenanceMode: status().mode,
      sensitiveValueDetected: state.sensitiveValueDetected,
    };
  }

  function retry() {
    state.recoveryAttemptCount += 1;
    try {
      root.location?.reload?.();
      state.recoverySuccessCount += 1;
    } catch (error) {
      recordError(error, "recovery");
    }
  }

  function renderSafeScreen(target, options = {}) {
    const container = target || root.document?.body;
    if (!container) return;
    const statusInfo = options.statusInfo || status();
    const category = options.category || state.lastErrorCategory || "operational-safety";
    const title = options.title || statusInfo.title || "Service notice";
    const body = options.body || statusInfo.description || "Please retry after a moment.";
    const section = root.document.createElement("main");
    section.className = "pm-operational-safety-screen";
    section.innerHTML = [
      '<section class="card">',
      `<p class="eyebrow">${escapeHtml(RELEASE_CHANNEL)}</p>`,
      `<h1>${escapeHtml(title)}</h1>`,
      `<p class="muted">${escapeHtml(body)}</p>`,
      `<p class="muted">code: ${escapeHtml(category)}</p>`,
      `<p class="muted">estimated recovery: ${escapeHtml(statusInfo.estimatedRecoveryAt || "unavailable")}</p>`,
      '<button type="button" data-pm-operational-safety-retry="1">Retry</button>',
      '</section>',
    ].join("");
    container.replaceChildren(section);
    section.querySelector("button")?.addEventListener("click", retry);
  }

  root.addEventListener?.("error", (event) => {
    state.globalErrorCount += 1;
    recordError(event.error || event.message, "window-error");
    if (!root.document?.body?.children?.length) renderSafeScreen(root.document.body, { category: "window-error" });
  });

  root.addEventListener?.("unhandledrejection", (event) => {
    state.unhandledRejectionCount += 1;
    recordError(event.reason, "unhandledrejection");
    if (!root.document?.body?.children?.length) renderSafeScreen(root.document.body, { category: "unhandledrejection" });
  });

  root.PMOperationalSafety = {
    status,
    snapshot,
    recordError,
    recordState,
    renderSafeScreen,
    retry,
    isSystemOwner,
    releaseInfo: safeReleaseInfo,
    isWriteBlocked: () => status().writeBlocked,
  };
  root.PMOperationalSafetyDiagnostics = {
    snapshot,
  };
  if (isDevelopmentBuild()) {
    root.PMOperationalSafetyTestControls = {
      setMode(mode, options = {}) {
        const nextMode = String(mode || "").trim();
        if (!VALID_MODES.has(nextMode)) return status();
        devOverrideStatus = sanitizeStatusConfig({ ...(options || {}), mode: nextMode });
        return status();
      },
      clearMode() {
        devOverrideStatus = null;
        return status();
      },
      snapshot,
    };
  }
  manifestState();
})(typeof globalThis !== "undefined" ? globalThis : window);
