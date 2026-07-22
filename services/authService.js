// Auth state service. This isolates account data from app data for future SSO/API use.
(function () {
  const LEGACY_AUTH_KEY = "pm-auth-v31";
  const AUTH_KEY = "pm:auth:v1";
  const SIGNUP_MODE_KEY = "pm:auth:signup-mode";
  const PM_AUTH_DEVICE_ID_KEY = "pm:device:id";
  const AUTH_BOOTSTRAP_BACKOFF_MS = 60 * 60 * 1000;
  const authBootstrapInFlightByUid = new Map();
  let authBootstrapBackoffUntil = 0;
  const authBootstrapDiagnostics = {
    authStateEventCount: 0,
    sessionLoadCount: 0,
    bootstrapCheckCount: 0,
    bootstrapCommitCount: 0,
    bootstrapSkippedNoDiffCount: 0,
    bootstrapBlockedInFlightCount: 0,
    userWriteCount: 0,
    membershipWriteCount: 0,
    deviceWriteCount: 0,
    welcomeNotificationWriteCount: 0,
    resourceExhaustedCount: 0,
    backoffActive: false,
    lastBootstrapReason: "",
    lastChangedFields: []
  };
  const operationalGoogleLoginDiagnostics = {
    googlePopupRequestedCount: 0,
    googlePopupResolvedCount: 0,
    googlePopupRejectedCount: 0,
    googlePopupResult: "idle",
    googlePopupErrorKind: "none",
    coopWarningDisposition: "not-observed",
    authStateReceivedAfterPopup: false,
    authUserPresentAfterPopup: false,
    sessionResolvedAfterPopup: false,
    lastFlowState: "idle"
  };

  function updateBackoffState() {
    authBootstrapDiagnostics.backoffActive = authBootstrapBackoffUntil > Date.now();
    return authBootstrapDiagnostics.backoffActive;
  }

  function noteBootstrap(reason, changedFields = []) {
    authBootstrapDiagnostics.lastBootstrapReason = reason || "";
    authBootstrapDiagnostics.lastChangedFields = Array.from(new Set(changedFields)).sort();
    updateBackoffState();
  }

  function snapshotAuthBootstrapDiagnostics() {
    updateBackoffState();
    return {
      ...authBootstrapDiagnostics,
      lastChangedFields: [...authBootstrapDiagnostics.lastChangedFields]
    };
  }

  function resetAuthBootstrapDiagnostics() {
    Object.assign(authBootstrapDiagnostics, {
      authStateEventCount: 0,
      sessionLoadCount: 0,
      bootstrapCheckCount: 0,
      bootstrapCommitCount: 0,
      bootstrapSkippedNoDiffCount: 0,
      bootstrapBlockedInFlightCount: 0,
      userWriteCount: 0,
      membershipWriteCount: 0,
      deviceWriteCount: 0,
      welcomeNotificationWriteCount: 0,
      resourceExhaustedCount: 0,
      backoffActive: false,
      lastBootstrapReason: "",
      lastChangedFields: []
    });
    authBootstrapBackoffUntil = 0;
    authBootstrapInFlightByUid.clear();
  }

  function classifyGooglePopupError(error) {
    const code = String(error?.code || "");
    if (code.includes("popup-closed-by-user")) return "auth/popup-closed-by-user";
    if (code.includes("popup-blocked")) return "auth/popup-blocked";
    if (code.includes("cancelled-popup-request")) return "auth/cancelled-popup-request";
    if (code.includes("unauthorized-domain")) return "auth/unauthorized-domain";
    if (code.includes("network-request-failed")) return "auth/network-request-failed";
    return code || "unknown";
  }

  function snapshotOperationalGoogleLoginDiagnostics() {
    return { ...operationalGoogleLoginDiagnostics };
  }

  function resetOperationalGoogleLoginDiagnostics() {
    Object.assign(operationalGoogleLoginDiagnostics, {
      googlePopupRequestedCount: 0,
      googlePopupResolvedCount: 0,
      googlePopupRejectedCount: 0,
      googlePopupResult: "idle",
      googlePopupErrorKind: "none",
      coopWarningDisposition: "not-observed",
      authStateReceivedAfterPopup: false,
      authUserPresentAfterPopup: false,
      sessionResolvedAfterPopup: false,
      lastFlowState: "reset"
    });
    return snapshotOperationalGoogleLoginDiagnostics();
  }

  function recordOperationalGoogleAuthState(hasUser) {
    operationalGoogleLoginDiagnostics.authStateReceivedAfterPopup = true;
    operationalGoogleLoginDiagnostics.authUserPresentAfterPopup = Boolean(hasUser);
    operationalGoogleLoginDiagnostics.lastFlowState = hasUser ? "auth-state-user" : "auth-state-empty";
    if (!hasUser && operationalGoogleLoginDiagnostics.googlePopupResolvedCount > 0) {
      operationalGoogleLoginDiagnostics.googlePopupResult = "popup-resolved-but-no-auth-user";
      operationalGoogleLoginDiagnostics.googlePopupErrorKind = "popup-resolved-but-no-auth-user";
      operationalGoogleLoginDiagnostics.coopWarningDisposition = "not-applicable";
    }
  }

  function recordOperationalGoogleSessionResolved(resolved) {
    operationalGoogleLoginDiagnostics.sessionResolvedAfterPopup = Boolean(resolved);
    operationalGoogleLoginDiagnostics.lastFlowState = resolved ? "session-resolved" : "session-missing";
    if (resolved && operationalGoogleLoginDiagnostics.googlePopupResolvedCount > 0) {
      operationalGoogleLoginDiagnostics.googlePopupResult = "success";
      operationalGoogleLoginDiagnostics.googlePopupErrorKind = "none";
      operationalGoogleLoginDiagnostics.coopWarningDisposition = "benign-after-success";
    }
    if (!resolved && operationalGoogleLoginDiagnostics.googlePopupResolvedCount > 0) {
      operationalGoogleLoginDiagnostics.googlePopupResult = "session-failed";
      operationalGoogleLoginDiagnostics.googlePopupErrorKind = "auth-user-present-session-missing";
      operationalGoogleLoginDiagnostics.coopWarningDisposition = "not-applicable";
    }
  }

  function isResourceExhaustedError(error) {
    const code = String(error?.code || "");
    const message = String(error?.message || error || "").toLowerCase();
    return code === "resource-exhausted" || message.includes("resource-exhausted") || message.includes("quota");
  }

  function activateAuthBootstrapBackoff(reason) {
    authBootstrapBackoffUntil = Date.now() + AUTH_BOOTSTRAP_BACKOFF_MS;
    authBootstrapDiagnostics.resourceExhaustedCount += 1;
    noteBootstrap(reason || "resource-exhausted-backoff");
  }

  function maskFirestorePath(path) {
    return String(path || "")
      .replace(/users\/[^,\s/]+/g, "users/{uid}")
      .replace(/systemOwners\/[^,\s/]+/g, "systemOwners/{uid}")
      .replace(/user_devices\/[^,\s/]+/g, "user_devices/{deviceId}")
      .replace(/notifications\/[^,\s/]+/g, "notifications/{notificationId}")
      .replace(/workspaces\/[^,\s/]+\/members\/[^,\s/]+/g, "workspaces/{workspaceId}/members/{uid}")
      .replace(/workspace_members\/[^,\s/]+/g, "workspace_members/{memberId}")
      .replace(/workspaceMembers\/[^,\s/]+/g, "workspaceMembers/{memberId}")
      .replace(/workspace_members where uid=[^,\s]+/g, "workspace_members where uid={uid}");
  }

  function valuesMatch(current, expected) {
    if (expected === undefined) return true;
    if (expected === null) return current === null || current === undefined;
    return current === expected;
  }

  function buildMergePatch(current, expected) {
    const patch = {};
    const changedFields = [];
    Object.entries(expected).forEach(([field, value]) => {
      if (!valuesMatch(current?.[field], value)) {
        patch[field] = value;
        changedFields.push(field);
      }
    });
    return { patch, changedFields };
  }

  function maybeAddBatchSet(batch, ref, current, expected, now, options = {}) {
    const { patch, changedFields } = buildMergePatch(current || {}, expected);
    if (!changedFields.length) return [];
    if (options.updatedAt) patch[options.updatedAt] = now;
    batch.set(ref, patch, { merge: true });
    return changedFields.map((field) => options.prefix ? `${options.prefix}.${field}` : field);
  }

  function authBootstrapBackoffActive() {
    return updateBackoffState();
  }

  function fallbackMembershipFromUser(user) {
    const workspaceId = user?.pmWorkspaceId || user?.workspaceId || user?.currentWorkspaceId || "";
    const role = user?.pmRole || "normal";
    return {
      workspaceId,
      role,
      workspaceRole: user?.pmWorkspaceRole || role,
      status: user?.pmStatus || (workspaceId ? "active" : "pending"),
      pendingWorkspaceId: user?.pmPendingWorkspaceId || "",
      pendingInviteCodeId: user?.pmPendingInviteCodeId || ""
    };
  }

  function stableAuthDeviceId() {
    const serviceId = window.PMDeviceService?.currentDeviceId?.();
    if (serviceId) return serviceId;
    let id = localStorage.getItem(PM_AUTH_DEVICE_ID_KEY);
    if (!id) {
      id = `device_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      localStorage.setItem(PM_AUTH_DEVICE_ID_KEY, id);
    }
    return id;
  }

  if (typeof window !== "undefined") {
    window.PMAuthBootstrapDiagnostics = {
      snapshot: snapshotAuthBootstrapDiagnostics,
      reset: resetAuthBootstrapDiagnostics,
      recordAuthStateEvent() {
        authBootstrapDiagnostics.authStateEventCount += 1;
      }
    };
    window.PMOperationalGoogleLoginDiagnostics = {
      snapshot: snapshotOperationalGoogleLoginDiagnostics,
      reset: resetOperationalGoogleLoginDiagnostics
    };
  }

  function readJson(key) {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  function writeJson(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  function loadAuthState() {
    return readJson(AUTH_KEY) || readJson(LEGACY_AUTH_KEY);
  }

  function saveAuthState(state) {
    const next = {
      ...state,
      schema_version: state?.schema_version || 1,
      auth_provider: state?.auth_provider || "local-invite",
      updated_at: new Date().toISOString()
    };
    writeJson(AUTH_KEY, next);
    // Transitional mirror for existing app code and backups.
    writeJson(LEGACY_AUTH_KEY, next);
    return next;
  }

  function clearSession() {
    sessionStorage.removeItem("pm-current-user");
  }

  function getSignupMode() {
    return localStorage.getItem(SIGNUP_MODE_KEY) || "development";
  }

  function setSignupMode(mode) {
    const next = ["public", "invite_only", "development"].includes(mode) ? mode : "development";
    localStorage.setItem(SIGNUP_MODE_KEY, next);
    return next;
  }

  async function hashPassword(password) {
    const data = new TextEncoder().encode(String(password));
    const digest = await crypto.subtle.digest("SHA-256", data);
    return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
  }

  async function verifyLocalPassword(user, password) {
    if (!user) return false;
    if (user.credentialHash) return user.credentialHash === await hashPassword(password);
    return false;
  }

  async function createLocalEmailUser(state, { email, password, displayName, role, workspaceId, status }) {
    if (getSignupMode() === "invite_only") throw new Error("현재는 초대 전용 가입 모드입니다.");
    const normalizedEmail = String(email || "").trim().toLowerCase();
    if (!normalizedEmail || !password) throw new Error("이메일과 비밀번호를 입력하세요.");
    if (state.users.some((user) => user.email.toLowerCase() === normalizedEmail)) throw new Error("이미 가입된 이메일입니다.");
    const uid = `local_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const nextWorkspaceId = workspaceId || "";
    const nextRole = role || "pending";
    const nextStatus = status || (nextWorkspaceId ? "active" : "pending");
    const user = {
      id: uid,
      uid,
      email: normalizedEmail,
      name: displayName || normalizedEmail,
      displayName: displayName || normalizedEmail,
      role: nextRole,
      globalRole: "user",
      workspace_id: nextWorkspaceId,
      workspaceId: nextWorkspaceId,
      currentWorkspaceId: nextWorkspaceId,
      status: nextStatus,
      active: nextStatus !== "disabled",
      emailVerified: false,
      disabled: false,
      credentialHash: await hashPassword(password),
      createdAt: new Date().toISOString(),
      lastLoginAt: null,
      provider: "local-dev"
    };
    state.users.unshift(user);
    state.workspaces = state.workspaces || [];
    state.workspace_members = state.workspace_members || [];
    if (nextWorkspaceId) {
      state.workspaces.unshift({
        workspaceId: nextWorkspaceId,
        name: `${user.name} workspace`,
        ownerUid: uid,
        plan: "local",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      state.workspace_members.unshift({
        id: `${nextWorkspaceId}_${uid}`,
        workspaceId: nextWorkspaceId,
        uid,
        role: user.role,
        status: "active",
        joinedAt: new Date().toISOString(),
        invitedBy: null
      });
    }
    saveAuthState(state);
    return user;
  }

  async function firebaseRegisterWithEmail(email, password, displayName, options = {}) {
    const runtime = await window.PMFirebaseRuntime?.init?.();
    if (!runtime) throw new Error("Firebase 서버와 연결이 필요합니다.");
    const { auth } = runtime.sdk;
    const credential = await auth.createUserWithEmailAndPassword(runtime.auth, email, password);
    await auth.sendEmailVerification(credential.user);
    await firebaseCreateBaseUserDocument(credential.user, displayName, options);
    const membership = await firebaseEnsureUserStructure(credential.user, displayName, "pending");
    credential.user.pmWorkspaceId = membership.workspaceId;
    credential.user.pmRole = membership.role;
    credential.user.pmWorkspaceRole = membership.workspaceRole || membership.role;
    credential.user.pmStatus = membership.status;
    await firebaseRegisterDevice(credential.user);
    await firebaseCreateWelcomeNotification(credential.user);
    return credential.user;
  }

  async function firebaseCreateBaseUserDocument(user, displayName, options = {}) {
    const runtime = await window.PMFirebaseRuntime?.init?.();
    if (!runtime) throw new Error("Firebase 서버와 연결이 필요합니다.");
    const { firestore } = runtime.sdk;
    const uid = user.uid;
    const status = options.status || "pending";
    const requestedRole = options.role || "normal";
    const role = requestedRole === "pending" ? "normal" : requestedRole;
    await runFirestoreStep("create base invited user document", `users/${uid}`, () => firestore.setDoc(firestore.doc(runtime.db, "users", uid), {
      uid,
      email: user.email || "",
      displayName: displayName || user.displayName || user.email || "",
      emailVerified: !!user.emailVerified,
      globalRole: "user",
      role,
      currentRole: role,
      status,
      workspaceId: options.workspaceId || null,
      currentWorkspaceId: options.workspaceId || null,
      workspace_id: options.workspaceId || null,
      pendingWorkspaceId: options.pendingWorkspaceId || null,
      pendingInviteCodeId: options.pendingInviteCodeId || null,
      createdAt: firestore.serverTimestamp(),
      lastLoginAt: firestore.serverTimestamp(),
      updatedAt: firestore.serverTimestamp(),
      disabled: false
    }, { merge: true }));
    authBootstrapDiagnostics.userWriteCount += 1;
    noteBootstrap("base-user-document-created", ["users.createdAt"]);
  }

  async function firebaseLoginWithEmail(email, password) {
    const runtime = await window.PMFirebaseRuntime?.init?.();
    if (!runtime) throw new Error("Firebase 서버와 연결이 필요합니다.");
    const { auth } = runtime.sdk;
    const credential = await auth.signInWithEmailAndPassword(runtime.auth, email, password);
    const membership = await firebaseEnsureUserStructure(credential.user, credential.user.displayName || credential.user.email, "pending");
    credential.user.pmWorkspaceId = membership.workspaceId;
    credential.user.pmRole = membership.role;
    credential.user.pmWorkspaceRole = membership.workspaceRole || membership.role;
    credential.user.pmStatus = membership.status;
    credential.user.pmPendingWorkspaceId = membership.pendingWorkspaceId;
    await firebaseRegisterDevice(credential.user);
    await firebaseCreateWelcomeNotification(credential.user);
    return credential.user;
  }

  async function firebaseSignInWithEmailOnly(email, password) {
    const runtime = await window.PMFirebaseRuntime?.init?.();
    if (!runtime) throw new Error("Firebase 서버와 연결이 필요합니다.");
    const { auth } = runtime.sdk;
    const credential = await auth.signInWithEmailAndPassword(runtime.auth, email, password);
    return credential.user;
  }

  function logFirestoreStep(step, path) {
    console.info("[PM Firestore]", { step, path: maskFirestorePath(path) });
  }

  function logFirestoreError(error, step, path) {
    const code = error?.code || "";
    const message = error?.message || String(error);
    console.error("[PM Firestore permission check]", { step, path: maskFirestorePath(path), code, message });
  }

  async function runFirestoreStep(step, path, action) {
    try {
      logFirestoreStep(step, path);
      return await action();
    } catch (error) {
      if (isResourceExhaustedError(error)) {
        activateAuthBootstrapBackoff(`${step}:resource-exhausted`);
      }
      logFirestoreError(error, step, path);
      throw error;
    }
  }

  async function findActiveWorkspaceMembership(runtime, uid) {
    try {
      const snapshot = await runFirestoreStep("find active workspace membership", `workspace_members where uid=${uid}`, () => runtime.db
        .collection("workspace_members")
        .where("uid", "==", uid)
        .limit(10)
        .get());
      const doc = snapshot.docs.find((item) => ["active", "accepted"].includes((item.data() || {}).status || "active"));
      if (doc) {
        return { id: doc.id, ...(doc.data() || {}) };
      }
    } catch (error) {
      console.info("[PM membership lookup skipped]", error?.code || "", error?.message || String(error));
    }
    return null;
  }

  async function firebaseLoginWithGoogle() {
    const runtime = await window.PMFirebaseRuntime?.init?.();
    if (!runtime) throw new Error("Firebase 서버와 연결이 필요합니다.");
    const { auth } = runtime.sdk;
    operationalGoogleLoginDiagnostics.googlePopupRequestedCount += 1;
    operationalGoogleLoginDiagnostics.googlePopupResult = "pending";
    operationalGoogleLoginDiagnostics.googlePopupErrorKind = "none";
    operationalGoogleLoginDiagnostics.coopWarningDisposition = "not-observed";
    operationalGoogleLoginDiagnostics.authStateReceivedAfterPopup = false;
    operationalGoogleLoginDiagnostics.authUserPresentAfterPopup = false;
    operationalGoogleLoginDiagnostics.sessionResolvedAfterPopup = false;
    operationalGoogleLoginDiagnostics.lastFlowState = "popup-requested";
    const provider = new auth.GoogleAuthProvider();
    provider.setCustomParameters({ prompt: "select_account" });
    let credential;
    try {
      operationalGoogleLoginDiagnostics.lastFlowState = "popup-opened";
      credential = await auth.signInWithPopup(runtime.auth, provider);
      operationalGoogleLoginDiagnostics.googlePopupResolvedCount += 1;
      operationalGoogleLoginDiagnostics.authUserPresentAfterPopup = Boolean(runtime.auth?.currentUser?.uid);
      operationalGoogleLoginDiagnostics.googlePopupResult = operationalGoogleLoginDiagnostics.authUserPresentAfterPopup
        ? "popup-resolved-auth-user-present"
        : "popup-resolved-but-no-auth-user";
      operationalGoogleLoginDiagnostics.lastFlowState = operationalGoogleLoginDiagnostics.authUserPresentAfterPopup
        ? "popup-resolved-auth-user-present"
        : "popup-resolved-no-auth-user";
      if (!operationalGoogleLoginDiagnostics.authUserPresentAfterPopup) {
        const noUserError = new Error("Google login popup resolved without an active Firebase Auth user.");
        noUserError.code = "popup-resolved-but-no-auth-user";
        operationalGoogleLoginDiagnostics.googlePopupErrorKind = noUserError.code;
        throw noUserError;
      }
    } catch (error) {
      operationalGoogleLoginDiagnostics.googlePopupRejectedCount += 1;
      operationalGoogleLoginDiagnostics.googlePopupResult = "popup-rejected";
      operationalGoogleLoginDiagnostics.googlePopupErrorKind = classifyGooglePopupError(error);
      operationalGoogleLoginDiagnostics.coopWarningDisposition = "not-applicable";
      operationalGoogleLoginDiagnostics.lastFlowState = "popup-rejected";
      throw error;
    }
    const membership = await firebaseEnsureUserStructure(credential.user, credential.user.displayName || credential.user.email, "pending");
    credential.user.pmWorkspaceId = membership.workspaceId;
    credential.user.pmRole = membership.role;
    credential.user.pmWorkspaceRole = membership.workspaceRole || membership.role;
    credential.user.pmStatus = membership.status;
    credential.user.pmPendingWorkspaceId = membership.pendingWorkspaceId;
    await firebaseRegisterDevice(credential.user);
    await firebaseCreateWelcomeNotification(credential.user);
    return credential.user;
  }

  async function firebaseLogout() {
    const runtime = await window.PMFirebaseRuntime?.init?.();
    if (runtime) await runtime.sdk.auth.signOut(runtime.auth);
    clearSession();
  }

  async function firebaseResetPassword(email) {
    const runtime = await window.PMFirebaseRuntime?.init?.();
    if (!runtime) throw new Error("Firebase 서버와 연결이 필요합니다.");
    await runtime.sdk.auth.sendPasswordResetEmail(runtime.auth, email);
  }

  async function firebaseEnsureUserStructure(user, displayName, defaultRole) {
    const uid = user?.uid || "";
    authBootstrapDiagnostics.authStateEventCount += 1;
    authBootstrapDiagnostics.sessionLoadCount += 1;
    authBootstrapDiagnostics.bootstrapCheckCount += 1;
    if (!uid) return fallbackMembershipFromUser(user);
    if (authBootstrapBackoffActive()) {
      authBootstrapDiagnostics.bootstrapBlockedInFlightCount += 1;
      noteBootstrap("bootstrap-skipped-backoff-active");
      return fallbackMembershipFromUser(user);
    }
    const inFlight = authBootstrapInFlightByUid.get(uid);
    if (inFlight) {
      authBootstrapDiagnostics.bootstrapBlockedInFlightCount += 1;
      noteBootstrap("bootstrap-deduped-in-flight");
      return inFlight;
    }
    const promise = firebaseEnsureUserStructureInternal(user, displayName, defaultRole)
      .finally(() => {
        authBootstrapInFlightByUid.delete(uid);
      });
    authBootstrapInFlightByUid.set(uid, promise);
    return promise;
  }

  async function firebaseEnsureUserStructureInternal(user, displayName, defaultRole) {
    const runtime = await window.PMFirebaseRuntime?.init?.();
    if (!runtime) throw new Error("Firebase 서버와 연결이 필요합니다.");
    const { firestore } = runtime.sdk;
    const uid = user.uid;
    const now = firestore.serverTimestamp();
    const userRef = firestore.doc(runtime.db, "users", uid);
    const userSnap = await runFirestoreStep("get current user document", `users/${uid}`, () => firestore.getDoc(userRef));
    const userData = userSnap.exists() ? userSnap.data() : {};
    let isSystemOwnerDoc = false;
    try {
      const ownerRef = firestore.doc(runtime.db, "systemOwners", uid);
      const ownerSnap = await runFirestoreStep("get system owner document", `systemOwners/${uid}`, () => firestore.getDoc(ownerRef));
      isSystemOwnerDoc = ownerSnap.exists() && (ownerSnap.data()?.status || "active") === "active";
    } catch (error) {
      console.info("[PM system owner lookup skipped]", error?.code || "", error?.message || String(error));
    }
    if (!userSnap.exists()) {
      await firebaseCreateBaseUserDocument(user, displayName, { role: "normal", status: "pending" });
      return { workspaceId: "", role: "normal", status: "pending", pendingWorkspaceId: "", pendingInviteCodeId: "" };
    }

    const discoveredMembership = await findActiveWorkspaceMembership(runtime, uid);
    const workspaceId = userData.workspaceId || userData.currentWorkspaceId || discoveredMembership?.workspaceId || "";
    const status = userData.disabled === true ? "disabled" : (userData.status || (workspaceId ? "active" : "pending"));
    if (!workspaceId || ["pending", "waiting_approval", "rejected", "disabled"].includes(status)) {
      const savedRole = userData.role || userData.currentRole || "normal";
      const pendingRole = isSystemOwnerDoc ? "system_owner" : savedRole === "pending" ? "normal" : savedRole;
      const pendingExpected = {
        uid,
        email: user.email || userData.email || "",
        displayName: userData.displayName || displayName || user.displayName || user.email || "",
        emailVerified: !!user.emailVerified,
        role: pendingRole,
        currentRole: pendingRole,
        workspaceRole: discoveredMembership?.role || userData.workspaceRole || (pendingRole === "system_owner" ? "super_manager" : pendingRole),
        status,
        workspaceId: workspaceId || null,
        currentWorkspaceId: workspaceId || null,
        workspace_id: workspaceId || null,
        pendingWorkspaceId: userData.pendingWorkspaceId || null,
        pendingInviteCodeId: userData.pendingInviteCodeId || userData.inviteCodeId || userData.inviteCode || null,
        disabled: status === "disabled" || userData.disabled === true
      };
      const pendingPatchResult = buildMergePatch(userData, pendingExpected);
      if (!userData.createdAt) {
        pendingPatchResult.patch.createdAt = now;
        pendingPatchResult.changedFields.push("createdAt");
      }
      if (pendingPatchResult.changedFields.length && !authBootstrapBackoffActive()) {
        pendingPatchResult.patch.updatedAt = now;
        await runFirestoreStep("update pending user login structure", `users/${uid}`, () => firestore.setDoc(userRef, pendingPatchResult.patch, { merge: true }));
        authBootstrapDiagnostics.bootstrapCommitCount += 1;
        authBootstrapDiagnostics.userWriteCount += 1;
        noteBootstrap("pending-user-structure-updated", pendingPatchResult.changedFields.map((field) => `users.${field}`));
      } else {
        authBootstrapDiagnostics.bootstrapSkippedNoDiffCount += 1;
        noteBootstrap("pending-user-structure-no-diff");
      }
      return {
        workspaceId,
        role: pendingRole,
        status,
        workspaceRole: discoveredMembership?.role || userData.workspaceRole || "",
        pendingWorkspaceId: userData.pendingWorkspaceId || "",
        pendingInviteCodeId: userData.pendingInviteCodeId || userData.inviteCodeId || userData.inviteCode || ""
      };
    }

    const memberId = `${workspaceId}_${uid}`;
    const memberRef = firestore.doc(runtime.db, "workspace_members", memberId);
    const standardMemberRef = firestore.doc(runtime.db, "workspaceMembers", memberId);
    const nestedMemberRef = firestore.doc(runtime.db, "workspaces", workspaceId, "members", uid);
    const memberSnap = await runFirestoreStep("get workspace member document", `workspaces/${workspaceId}/members/${uid}`, () => firestore.getDoc(nestedMemberRef));
    let rootMemberSnap;
    let standardMemberSnap;
    try {
      rootMemberSnap = await runFirestoreStep("get legacy workspace member document", `workspace_members/${memberId}`, () => firestore.getDoc(memberRef));
    } catch (error) {
      console.info("[PM root membership lookup skipped]", {
        path: "workspace_members/{memberId}",
        code: error?.code || "",
        message: error?.message || String(error)
      });
      rootMemberSnap = { exists: () => false, data: () => ({}) };
    }
    try {
      standardMemberSnap = await runFirestoreStep("get standard legacy workspace member document", `workspaceMembers/${memberId}`, () => firestore.getDoc(standardMemberRef));
    } catch (error) {
      console.info("[PM standard membership lookup skipped]", {
        path: "workspaceMembers/{memberId}",
        code: error?.code || "",
        message: error?.message || String(error)
      });
      standardMemberSnap = { exists: () => false, data: () => ({}) };
    }
    const workspaceRole = memberSnap.exists()
      ? memberSnap.data().role || "normal"
      : rootMemberSnap.exists()
        ? rootMemberSnap.data().role || "normal"
        : userData.currentRole || userData.role || "normal";
    const isGlobalSystemOwner = isSystemOwnerDoc || userData.role === "system_owner" || userData.currentRole === "system_owner";
    const role = isGlobalSystemOwner ? "system_owner" : workspaceRole;
    const canRepairRootMembership = isGlobalSystemOwner || ["super_manager", "manager"].includes(workspaceRole);
    const batch = firestore.writeBatch(runtime.db);
    const changedFields = [];
    let userWriteQueued = false;
    let membershipWriteQueued = 0;

    const userExpected = {
      uid,
      email: user.email || "",
      displayName: userData.displayName || displayName || user.displayName || user.email || "???",
      emailVerified: !!user.emailVerified,
      workspaceId,
      currentWorkspaceId: workspaceId,
      workspace_id: workspaceId,
      role,
      currentRole: role,
      workspaceRole,
      status: status || "active",
      disabled: userData.disabled === true,
      pendingWorkspaceId: null,
      pendingInviteCodeId: null
    };
    const userPatchResult = buildMergePatch(userData, userExpected);
    if (!userData.createdAt) {
      userPatchResult.patch.createdAt = now;
      userPatchResult.changedFields.push("createdAt");
    }
    if (userPatchResult.changedFields.length) {
      userPatchResult.patch.updatedAt = now;
      batch.set(userRef, userPatchResult.patch, { merge: true });
      userWriteQueued = true;
      changedFields.push(...userPatchResult.changedFields.map((field) => `users.${field}`));
    }

    if (!memberSnap.exists() && !rootMemberSnap.exists()) {
      console.warn("[PM role repair]", { role, message: "active user member document was missing; repairing with users.role" });
    }

    const memberExpected = {
      id: memberId,
      workspaceId,
      workspace_id: workspaceId,
      rootMemberExists: true,
      nestedMemberExists: true,
      uid,
      email: user.email || userData.email || "",
      displayName: userData.displayName || displayName || user.displayName || user.email || "",
      role: workspaceRole,
      status: "active",
      invitedBy: null
    };
    if (canRepairRootMembership) {
      const rootData = rootMemberSnap.exists() ? rootMemberSnap.data() || {} : {};
      const standardData = standardMemberSnap.exists() ? standardMemberSnap.data() || {} : {};
      const rootChanged = maybeAddBatchSet(batch, memberRef, rootData, {
        ...memberExpected,
        joinedAt: rootData.joinedAt || now
      }, now, { updatedAt: "updatedAt", prefix: "workspace_members" });
      const standardChanged = maybeAddBatchSet(batch, standardMemberRef, standardData, {
        ...memberExpected,
        joinedAt: standardData.joinedAt || rootData.joinedAt || now
      }, now, { updatedAt: "updatedAt", prefix: "workspaceMembers" });
      if (rootChanged.length) membershipWriteQueued += 1;
      if (standardChanged.length) membershipWriteQueued += 1;
      changedFields.push(...rootChanged, ...standardChanged);
    } else {
      console.info("[PM member bootstrap] root membership repair skipped for non-admin login", { workspaceRole });
    }
    const nestedData = memberSnap.exists() ? memberSnap.data() || {} : {};
    const nestedChanged = maybeAddBatchSet(batch, nestedMemberRef, nestedData, {
      ...memberExpected,
      joinedAt: nestedData.joinedAt || now,
      invitedBy: nestedData.invitedBy || null
    }, now, { updatedAt: "updatedAt", prefix: "members" });
    if (nestedChanged.length) membershipWriteQueued += 1;
    changedFields.push(...nestedChanged);

    if (!changedFields.length) {
      authBootstrapDiagnostics.bootstrapSkippedNoDiffCount += 1;
      noteBootstrap("active-user-structure-no-diff");
      return { workspaceId, role, workspaceRole, status: status || "active", pendingWorkspaceId: "", pendingInviteCodeId: "" };
    }
    if (authBootstrapBackoffActive()) {
      authBootstrapDiagnostics.bootstrapBlockedInFlightCount += 1;
      noteBootstrap("bootstrap-write-skipped-backoff", changedFields);
      return { workspaceId, role, workspaceRole, status: status || "active", pendingWorkspaceId: "", pendingInviteCodeId: "" };
    }

    await runFirestoreStep("commit user workspace bootstrap", `users/${uid}, workspaces/${workspaceId}/members/${uid}${canRepairRootMembership ? `, workspace_members/${memberId}` : ""}`, () => batch.commit());
    authBootstrapDiagnostics.bootstrapCommitCount += 1;
    if (userWriteQueued) authBootstrapDiagnostics.userWriteCount += 1;
    authBootstrapDiagnostics.membershipWriteCount += membershipWriteQueued;
    noteBootstrap("active-user-structure-updated", changedFields);
    return { workspaceId, role, workspaceRole, status: status || "active", pendingWorkspaceId: "", pendingInviteCodeId: "" };
  }

  async function firebaseRegisterDevice(user) {
    const runtime = await window.PMFirebaseRuntime?.init?.();
    if (!runtime) return null;
    const { firestore } = runtime.sdk;
    const uid = user.uid;
    const workspaceId = user.pmWorkspaceId || user.workspaceId || user.currentWorkspaceId || "";
    if (!workspaceId) return null;
    if (authBootstrapBackoffActive()) {
      noteBootstrap("device-write-skipped-backoff");
      return null;
    }
    const deviceId = stableAuthDeviceId();
    const ua = navigator.userAgent || "";
    const deviceRef = firestore.doc(runtime.db, "user_devices", deviceId);
    let deviceSnap;
    try {
      deviceSnap = await runFirestoreStep("get login device", `user_devices/${deviceId}`, () => firestore.getDoc(deviceRef));
    } catch (error) {
      console.warn("[PM auth bootstrap] login device read skipped", { code: error?.code || "", message: error?.message || String(error) });
      return null;
    }
    const existing = deviceSnap.exists() ? deviceSnap.data() || {} : {};
    const desired = {
      deviceId,
      uid,
      workspaceId,
      deviceName: navigator.platform || "?? ??",
      deviceType: /Mobi|Android/i.test(ua) ? "mobile" : "desktop",
      browser: ua,
      os: navigator.platform || "",
      pushToken: null,
      isCurrentDevice: true,
      revokedAt: null
    };
    const { patch, changedFields } = buildMergePatch(existing, desired);
    if (!changedFields.length && deviceSnap.exists()) {
      noteBootstrap("login-device-no-diff");
      return deviceId;
    }
    patch.lastLoginAt = firestore.serverTimestamp();
    patch.lastActiveAt = firestore.serverTimestamp();
    await runFirestoreStep("set login device", `user_devices/${deviceId}`, () => firestore.setDoc(deviceRef, patch, { merge: true }));
    authBootstrapDiagnostics.deviceWriteCount += 1;
    noteBootstrap("login-device-updated", changedFields.map((field) => `user_devices.${field}`));
    return deviceId;
  }

  async function firebaseCreateWelcomeNotification(user) {
    const runtime = await window.PMFirebaseRuntime?.init?.();
    if (!runtime) return null;
    const { firestore } = runtime.sdk;
    const workspaceId = user.pmWorkspaceId || user.workspaceId || user.currentWorkspaceId || "";
    if (!workspaceId) return null;
    const notificationId = `welcome_${user.uid}`;
    if (authBootstrapBackoffActive()) {
      noteBootstrap("welcome-notification-skipped-backoff");
      return null;
    }
    const notificationRef = firestore.doc(runtime.db, "notifications", notificationId);
    let notificationSnap;
    try {
      notificationSnap = await runFirestoreStep("get welcome notification", `notifications/${notificationId}`, () => firestore.getDoc(notificationRef));
    } catch (error) {
      console.warn("[PM auth bootstrap] welcome notification read skipped", { code: error?.code || "", message: error?.message || String(error) });
      return null;
    }
    if (notificationSnap.exists()) {
      noteBootstrap("welcome-notification-existing");
      return notificationId;
    }
    await runFirestoreStep("set welcome notification", `notifications/${notificationId}`, () => firestore.setDoc(notificationRef, {
      notificationId,
      workspaceId,
      uid: user.uid,
      type: "system",
      title: "환영 알림",
      message: "Firebase 계정 설정이 완료되었습니다.",
      read: false,
      createdAt: firestore.serverTimestamp(),
      relatedId: null
    }, { merge: true }));
    authBootstrapDiagnostics.welcomeNotificationWriteCount += 1;
    noteBootstrap("welcome-notification-created", ["notifications.createdAt"]);
    return notificationId;
  }

  window.PMAuthService = {
    mode: "local",
    authKey: AUTH_KEY,
    legacyAuthKey: LEGACY_AUTH_KEY,
    loadAuthState,
    saveAuthState,
    clearSession,
    getSignupMode,
    setSignupMode,
    hashPassword,
    verifyLocalPassword,
    createLocalEmailUser,
    firebaseRegisterWithEmail,
    firebaseLoginWithEmail,
    firebaseSignInWithEmailOnly,
    firebaseLoginWithGoogle,
    firebaseLogout,
    firebaseResetPassword,
    firebaseEnsureUserStructure,
    firebaseRegisterDevice,
    firebaseCreateWelcomeNotification,
    getAuthBootstrapDiagnostics: snapshotAuthBootstrapDiagnostics,
    resetAuthBootstrapDiagnostics
    ,
    getOperationalGoogleLoginDiagnostics: snapshotOperationalGoogleLoginDiagnostics,
    resetOperationalGoogleLoginDiagnostics,
    recordOperationalGoogleAuthState,
    recordOperationalGoogleSessionResolved
  };
})();
