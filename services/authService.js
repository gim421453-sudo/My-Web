// Auth state service. This isolates account data from app data for future SSO/API use.
(function () {
  const LEGACY_AUTH_KEY = "pm-auth-v31";
  const AUTH_KEY = "pm:auth:v1";
  const SIGNUP_MODE_KEY = "pm:auth:signup-mode";

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
    const role = options.role || "pending";
    await runFirestoreStep("create base invited user document", `users/${uid}`, () => firestore.setDoc(firestore.doc(runtime.db, "users", uid), {
      uid,
      email: user.email || "",
      displayName: displayName || user.displayName || user.email || "",
      emailVerified: !!user.emailVerified,
      globalRole: "user",
      role,
      currentRole: role,
      status,
      workspaceId: null,
      currentWorkspaceId: null,
      pendingWorkspaceId: null,
      pendingInviteCodeId: null,
      createdAt: firestore.serverTimestamp(),
      lastLoginAt: firestore.serverTimestamp(),
      updatedAt: firestore.serverTimestamp(),
      disabled: false
    }, { merge: true }));
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
    console.info("[PM Firestore]", { step, path });
  }

  function logFirestoreError(error, step, path) {
    const code = error?.code || "";
    const message = error?.message || String(error);
    console.error("[PM Firestore permission check]", { step, path, code, message });
  }

  async function runFirestoreStep(step, path, action) {
    try {
      logFirestoreStep(step, path);
      return await action();
    } catch (error) {
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
    const provider = new auth.GoogleAuthProvider();
    provider.setCustomParameters({ prompt: "select_account" });
    const credential = await auth.signInWithPopup(runtime.auth, provider);
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
      await firebaseCreateBaseUserDocument(user, displayName, { role: defaultRole || "pending", status: "pending" });
      return { workspaceId: "", role: defaultRole || "pending", status: "pending", pendingWorkspaceId: "" };
    }

    const discoveredMembership = await findActiveWorkspaceMembership(runtime, uid);
    const workspaceId = userData.workspaceId || userData.currentWorkspaceId || discoveredMembership?.workspaceId || "";
    const status = userData.disabled === true ? "disabled" : (userData.status || (workspaceId ? "active" : "pending"));
    if (!workspaceId || ["pending", "waiting_approval", "rejected", "disabled"].includes(status)) {
      const pendingRole = isSystemOwnerDoc ? "system_owner" : userData.role || "pending";
      await runFirestoreStep("update pending user login timestamp", `users/${uid}`, () => firestore.setDoc(userRef, {
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
        lastLoginAt: now,
        updatedAt: now,
        disabled: status === "disabled" || userData.disabled === true
      }, { merge: true }));
      return {
        workspaceId,
        role: pendingRole,
        status,
        workspaceRole: discoveredMembership?.role || userData.workspaceRole || "",
        pendingWorkspaceId: userData.pendingWorkspaceId || ""
      };
    }

    const memberId = `${workspaceId}_${uid}`;
    const memberRef = firestore.doc(runtime.db, "workspace_members", memberId);
    const nestedMemberRef = firestore.doc(runtime.db, "workspaces", workspaceId, "members", uid);
    const memberSnap = await runFirestoreStep("get workspace member document", `workspaces/${workspaceId}/members/${uid}`, () => firestore.getDoc(nestedMemberRef));
    const rootMemberSnap = await runFirestoreStep("get legacy workspace member document", `workspace_members/${memberId}`, () => firestore.getDoc(memberRef));
    const workspaceRole = memberSnap.exists()
      ? memberSnap.data().role || "normal"
      : rootMemberSnap.exists()
        ? rootMemberSnap.data().role || "normal"
        : userData.currentRole || userData.role || "normal";
    const isGlobalSystemOwner = isSystemOwnerDoc || userData.role === "system_owner" || userData.currentRole === "system_owner";
    const role = isGlobalSystemOwner ? "system_owner" : workspaceRole;
    const batch = firestore.writeBatch(runtime.db);

    batch.set(userRef, {
      uid,
      email: user.email || "",
      displayName: userData.displayName || displayName || user.displayName || user.email || "???",
      emailVerified: !!user.emailVerified,
      globalRole: "user",
      workspaceId,
      currentWorkspaceId: workspaceId,
      workspace_id: workspaceId,
      role,
      currentRole: role,
      workspaceRole,
      createdAt: userSnap.exists() ? userSnap.data().createdAt || now : now,
      lastLoginAt: now,
      updatedAt: now,
      status: status || "active",
      disabled: userData.disabled === true
    }, { merge: true });

    if (!memberSnap.exists() && !rootMemberSnap.exists()) {
      console.warn("[PM role repair]", { uid, workspaceId, role, message: "active user member document was missing; repairing with users.role" });
    }

    batch.set(memberRef, {
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
      joinedAt: rootMemberSnap.exists() ? rootMemberSnap.data().joinedAt || now : now,
      invitedBy: null
    }, { merge: true });
    batch.set(nestedMemberRef, {
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
      joinedAt: memberSnap.exists() ? memberSnap.data().joinedAt || now : now,
      updatedAt: now,
      invitedBy: memberSnap.exists() ? memberSnap.data().invitedBy || null : null
    }, { merge: true });

    await runFirestoreStep("commit user workspace bootstrap", `users/${uid}, workspaces/${workspaceId}/members/${uid}, workspace_members/${memberId}`, () => batch.commit());
    return { workspaceId, role, workspaceRole, status: status || "active", pendingWorkspaceId: "" };
  }

  async function firebaseRegisterDevice(user) {
    const runtime = await window.PMFirebaseRuntime?.init?.();
    if (!runtime) return null;
    const { firestore } = runtime.sdk;
    const uid = user.uid;
    const workspaceId = user.pmWorkspaceId || user.workspaceId || user.currentWorkspaceId || "";
    if (!workspaceId) return null;
    const deviceId = window.PMDeviceService?.currentDeviceId?.() || `device_${Date.now()}`;
    const ua = navigator.userAgent || "";
    await runFirestoreStep("set login device", `user_devices/${deviceId}`, () => firestore.setDoc(firestore.doc(runtime.db, "user_devices", deviceId), {
      deviceId,
      uid,
      workspaceId,
      deviceName: navigator.platform || "?? ??",
      deviceType: /Mobi|Android/i.test(ua) ? "mobile" : "desktop",
      browser: ua,
      os: navigator.platform || "",
      lastLoginAt: firestore.serverTimestamp(),
      lastActiveAt: firestore.serverTimestamp(),
      pushToken: null,
      isCurrentDevice: true,
      revokedAt: null
    }, { merge: true }));
    return deviceId;
  }

  async function firebaseCreateWelcomeNotification(user) {
    const runtime = await window.PMFirebaseRuntime?.init?.();
    if (!runtime) return null;
    const { firestore } = runtime.sdk;
    const workspaceId = user.pmWorkspaceId || user.workspaceId || user.currentWorkspaceId || "";
    if (!workspaceId) return null;
    const notificationId = `welcome_${user.uid}`;
    await runFirestoreStep("set welcome notification", `notifications/${notificationId}`, () => firestore.setDoc(firestore.doc(runtime.db, "notifications", notificationId), {
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
    firebaseCreateWelcomeNotification
  };
})();
