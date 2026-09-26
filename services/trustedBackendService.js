// Transport-independent trusted authority client. Production transport is
// intentionally absent until the separately approved cutover phase.
(function (root) {
  "use strict";

  const FLAG_NAME = "TRUSTED_BACKEND_AUTHORITY_ENABLED";
  const DEFAULT_TIMEOUT_MS = 10000;
  const SAFE_ERROR_CODES = new Set([
    "UNAUTHENTICATED",
    "FORBIDDEN",
    "INVALID_ARGUMENT",
    "NOT_FOUND",
    "CONFLICT",
    "IDEMPOTENCY_CONFLICT",
    "FAILED_PRECONDITION",
    "INTERNAL"
  ]);
  const SAFE_MESSAGES = Object.freeze({
    UNAUTHENTICATED: "로그인이 필요합니다.",
    FORBIDDEN: "이 작업을 수행할 권한이 없습니다.",
    INVALID_ARGUMENT: "입력값을 확인해 주세요.",
    NOT_FOUND: "요청한 대상을 찾을 수 없습니다.",
    CONFLICT: "이미 처리되었거나 현재 상태와 충돌합니다.",
    IDEMPOTENCY_CONFLICT: "같은 요청의 처리 정보가 일치하지 않습니다.",
    FAILED_PRECONDITION: "현재 상태에서는 이 작업을 수행할 수 없습니다.",
    INTERNAL: "안전한 서버 처리를 완료하지 못했습니다. 잠시 후 다시 시도해 주세요."
  });
  const ROLE_SET = new Set(["super_manager", "manager", "teacher", "normal", "viewer", "print_account"]);
  const SELF_SERVICE_ROLE_SET = new Set(["teacher", "normal", "viewer", "print_account"]);
  const OPERATION_DEFINITIONS = Object.freeze({
    createAdminApplication: Object.freeze({ operation: "admin_application.create", targetKind: "workspace" }),
    createWorkspaceBootstrapApplication: Object.freeze({ operation: "workspace.bootstrap.application.create", targetKind: "workspace_bootstrap" }),
    createUserProfile: Object.freeze({ operation: "user_profile.create", targetKind: "user_profile" }),
    submitWorkspaceJoinRequest: Object.freeze({ operation: "workspace_join.create", targetKind: "workspace_join" }),
    approveWorkspaceJoinRequest: Object.freeze({ operation: "workspace_join.approve", targetKind: "workspace_join_request" }),
    rejectWorkspaceJoinRequest: Object.freeze({ operation: "workspace_join.reject", targetKind: "workspace_join_request" }),
    approveAdminApplication: Object.freeze({ operation: "admin_application.approve", targetKind: "admin_application" }),
    rejectAdminApplication: Object.freeze({ operation: "admin_application.reject", targetKind: "admin_application" }),
    createInvitation: Object.freeze({ operation: "invitation.create", targetKind: "workspace" }),
    revokeInvitation: Object.freeze({ operation: "invitation.revoke", targetKind: "invitation" }),
    redeemInvitation: Object.freeze({ operation: "invitation.redeem", targetKind: "invitation_code" }),
    updateWorkspaceMemberRole: Object.freeze({ operation: "workspace_member.role.update", targetKind: "workspace_member" }),
    setWorkspaceMemberStatus: Object.freeze({ operation: "workspace_member.status.set", targetKind: "workspace_member" }),
    removeWorkspaceMember: Object.freeze({ operation: "workspace_member.remove", targetKind: "workspace_member" })
    , disableUserAccount: Object.freeze({ operation: "user_account.disable", targetKind: "user_account" })
    , enableUserAccount: Object.freeze({ operation: "user_account.enable", targetKind: "user_account" })
    , approveWorkspaceBootstrap: Object.freeze({ operation: "workspace.bootstrap.approve", targetKind: "admin_application" })
    , setWorkspaceLifecycle: Object.freeze({ operation: "workspace.lifecycle.set", targetKind: "workspace" })
    , setWorkspaceOperationMode: Object.freeze({ operation: "workspace.operation_mode.set", targetKind: "workspace" })
  });
  const READ_DEFINITIONS = Object.freeze({
    listAdminApplications: Object.freeze({ operation: "management.admin_applications.list", targetKind: "admin_applications" }),
    listWorkspaceJoinRequests: Object.freeze({ operation: "management.workspace_join_requests.list", targetKind: "workspace_join_requests" }),
    listWorkspaceMembers: Object.freeze({ operation: "management.workspace_members.list", targetKind: "workspace_members" }),
    listInvitations: Object.freeze({ operation: "management.invitations.list", targetKind: "invitations" }),
    listOwnerWorkspaces: Object.freeze({ operation: "management.owner_workspaces.list", targetKind: "owner_workspaces" }),
    listManagementUsers: Object.freeze({ operation: "management.users.list", targetKind: "management_users" })
  });

  class TrustedBackendClientError extends Error {
    constructor(code, requestId) {
      const safeCode = SAFE_ERROR_CODES.has(code) ? code : "INTERNAL";
      super(SAFE_MESSAGES[safeCode]);
      this.name = "TrustedBackendClientError";
      this.code = safeCode;
      this.requestId = typeof requestId === "string" ? requestId : "";
    }
  }

  function isPlainRecord(value) {
    if (!value || typeof value !== "object" || Array.isArray(value)) return false;
    const prototype = Object.getPrototypeOf(value);
    return prototype === null
      || prototype === Object.prototype
      || (Object.prototype.toString.call(value) === "[object Object]"
        && prototype?.constructor?.name === "Object");
  }

  function ownBoolean(config, key) {
    return isPlainRecord(config)
      && Object.prototype.hasOwnProperty.call(config, key)
      && config[key] === true;
  }

  function resolveAuthorityEnabled(config) {
    return ownBoolean(config, FLAG_NAME);
  }

  function runtimeConfig() {
    return isPlainRecord(root.PMTrustedBackendAuthorityConfig)
      ? root.PMTrustedBackendAuthorityConfig
      : Object.freeze({});
  }

  function isAuthorityEnabled() {
    return resolveAuthorityEnabled(runtimeConfig());
  }

  function secureBytes(cryptoProvider, length) {
    if (!cryptoProvider || typeof cryptoProvider.getRandomValues !== "function") {
      throw new TrustedBackendClientError("INTERNAL", "");
    }
    const bytes = new Uint8Array(length);
    cryptoProvider.getRandomValues(bytes);
    return bytes;
  }

  function secureIdentifier(prefix, cryptoProvider) {
    const hex = Array.from(secureBytes(cryptoProvider, 20), (value) => value.toString(16).padStart(2, "0")).join("");
    return `${prefix}_${hex}`;
  }

  function validIdentifier(value) {
    return typeof value === "string"
      && value.trim() === value
      && value.length > 0
      && value.length <= 256
      && value !== "."
      && value !== ".."
      && !value.includes("/");
  }

  function requiredIdentifier(value) {
    const normalized = typeof value === "string" ? value.trim() : "";
    if (!validIdentifier(normalized)) throw new TrustedBackendClientError("INVALID_ARGUMENT", "");
    return normalized;
  }

  function optionalReason(value) {
    if (value === undefined || value === null || value === "") return null;
    if (typeof value !== "string") throw new TrustedBackendClientError("INVALID_ARGUMENT", "");
    const normalized = value.trim();
    if (!normalized || normalized.length > 500) throw new TrustedBackendClientError("INVALID_ARGUMENT", "");
    return normalized;
  }

  function optionalDisplayName(value) {
    if (value === undefined || value === null || value === "") return null;
    if (typeof value !== "string") throw new TrustedBackendClientError("INVALID_ARGUMENT", "");
    const normalized = value.trim();
    if (!normalized || normalized.length > 120) throw new TrustedBackendClientError("INVALID_ARGUMENT", "");
    return normalized;
  }

  function requiredWorkspaceName(value) {
    if (typeof value !== "string") throw new TrustedBackendClientError("INVALID_ARGUMENT", "");
    const normalized = value.trim();
    if (!normalized || normalized.length > 120) throw new TrustedBackendClientError("INVALID_ARGUMENT", "");
    return normalized;
  }

  function requiredRole(value, allowedRoles = ROLE_SET) {
    const normalized = String(value || "").trim();
    if (!allowedRoles.has(normalized)) throw new TrustedBackendClientError("INVALID_ARGUMENT", "");
    return normalized;
  }

  function boundedInteger(value, minimum, maximum) {
    const normalized = Number(value);
    if (!Number.isInteger(normalized) || normalized < minimum || normalized > maximum) {
      throw new TrustedBackendClientError("INVALID_ARGUMENT", "");
    }
    return normalized;
  }

  function readPage(input) {
    const limit = input?.limit === undefined ? 25 : boundedInteger(input.limit, 1, 100);
    const cursor = input?.cursor;
    if (cursor !== undefined && cursor !== null && cursor !== ""
      && (typeof cursor !== "string" || cursor.length > 64 || !/^[A-Za-z0-9_-]+$/.test(cursor))) {
      throw new TrustedBackendClientError("INVALID_ARGUMENT", "");
    }
    return Object.freeze({ limit, ...(cursor ? { cursor } : {}) });
  }

  function createLogicalMutationContext(operationName, cryptoProvider = root.crypto) {
    const definition = OPERATION_DEFINITIONS[operationName];
    if (!definition) throw new TrustedBackendClientError("INVALID_ARGUMENT", "");
    return Object.freeze({
      operationName,
      idempotencyKey: secureIdentifier("tbk", cryptoProvider)
    });
  }

  function mutationIdempotencyKey(operationName, context, cryptoProvider) {
    const mutation = context?.mutationContext;
    if (mutation !== undefined) {
      if (!isPlainRecord(mutation)
        || mutation.operationName !== operationName
        || typeof mutation.idempotencyKey !== "string"
        || mutation.idempotencyKey.length < 16
        || mutation.idempotencyKey.length > 128
        || !/^[A-Za-z0-9._~-]+$/.test(mutation.idempotencyKey)) {
        throw new TrustedBackendClientError("INVALID_ARGUMENT", "");
      }
      return mutation.idempotencyKey;
    }
    return createLogicalMutationContext(operationName, cryptoProvider).idempotencyKey;
  }

  function completedResult(data, requestId) {
    if (!isPlainRecord(data) || !isPlainRecord(data.result) || data.result.status !== "completed") {
      throw new TrustedBackendClientError("INTERNAL", requestId);
    }
    return data;
  }

  function validateResponse(operationName, data, requestId) {
    const completed = completedResult(data, requestId);
    const result = completed.result;
    if (operationName === "createAdminApplication" && result.applicationStatus !== "pending") {
      throw new TrustedBackendClientError("INTERNAL", requestId);
    }
    if (operationName === "createWorkspaceBootstrapApplication"
      && (result.applicationStatus !== "pending" || result.role !== "super_manager" || result.created !== true)) {
      throw new TrustedBackendClientError("INTERNAL", requestId);
    }
    if (operationName === "createUserProfile"
      && (result.exists !== true || typeof result.created !== "boolean")) {
      throw new TrustedBackendClientError("INTERNAL", requestId);
    }
    if (operationName === "submitWorkspaceJoinRequest"
      && (result.applicationStatus !== "pending" || result.created !== true
        || !ROLE_SET.has(result.role) || !validIdentifier(result.workspaceId)
        || !validIdentifier(result.invitationId) || !validIdentifier(result.joinRequestId))) {
      throw new TrustedBackendClientError("INTERNAL", requestId);
    }
    if (operationName === "approveWorkspaceJoinRequest"
      && (result.memberPresent !== true || result.membershipStatus !== "active"
        || !ROLE_SET.has(result.role) || !validIdentifier(result.workspaceId))) {
      throw new TrustedBackendClientError("INTERNAL", requestId);
    }
    if (operationName === "rejectWorkspaceJoinRequest"
      && (result.applicationStatus !== "rejected" || result.updated !== true)) {
      throw new TrustedBackendClientError("INTERNAL", requestId);
    }
    if (operationName === "approveAdminApplication"
      && (result.applicationStatus !== "approved" || result.memberPresent !== true || !ROLE_SET.has(result.role))) {
      throw new TrustedBackendClientError("INTERNAL", requestId);
    }
    if (operationName === "rejectAdminApplication" && result.applicationStatus !== "rejected") {
      throw new TrustedBackendClientError("INTERNAL", requestId);
    }
    if (operationName === "createInvitation") {
      if (result.invitationStatus !== "active"
        || !validIdentifier(data.invitationId)
        || typeof data.invitationCode !== "string"
        || data.invitationCode.length < 16) {
        throw new TrustedBackendClientError("INTERNAL", requestId);
      }
    }
    if (operationName === "revokeInvitation" && result.invitationStatus !== "revoked") {
      throw new TrustedBackendClientError("INTERNAL", requestId);
    }
    if (operationName === "redeemInvitation"
      && (result.memberPresent !== true || !ROLE_SET.has(result.role) || !validIdentifier(result.workspaceId))) {
      throw new TrustedBackendClientError("INTERNAL", requestId);
    }
    if (operationName === "updateWorkspaceMemberRole"
      && (result.memberPresent !== true || !ROLE_SET.has(result.role)
        || result.membershipStatus !== "active" || !validIdentifier(result.workspaceId)
        || result.sessionRefreshRequired !== true)) {
      throw new TrustedBackendClientError("INTERNAL", requestId);
    }
    if (operationName === "setWorkspaceMemberStatus"
      && (result.memberPresent !== true || !ROLE_SET.has(result.role)
        || !["active", "disabled"].includes(result.membershipStatus)
        || !validIdentifier(result.workspaceId) || result.sessionRefreshRequired !== true)) {
      throw new TrustedBackendClientError("INTERNAL", requestId);
    }
    if (operationName === "removeWorkspaceMember"
      && (result.memberPresent !== true || result.removed !== true || !ROLE_SET.has(result.role)
        || result.membershipStatus !== "inactive" || !validIdentifier(result.workspaceId)
        || result.sessionRefreshRequired !== true)) {
      throw new TrustedBackendClientError("INTERNAL", requestId);
    }
    if ((operationName === "disableUserAccount" || operationName === "enableUserAccount")
      && (typeof result.accountDisabled !== "boolean"
        || !["active", "disabled"].includes(result.accountLifecycleStatus)
        || typeof result.sessionInvalidated !== "boolean"
        || typeof result.signOutRequired !== "boolean"
        || result.userProfileUpdated !== true
        || result.accountDisabled !== (operationName === "disableUserAccount")
        || result.signOutRequired !== result.accountDisabled)) {
      throw new TrustedBackendClientError("INTERNAL", requestId);
    }
    if (operationName === "approveWorkspaceBootstrap"
      && (result.applicationStatus !== "approved" || result.workspacePresent !== true
        || result.memberPresent !== true || result.role !== "super_manager"
        || !validIdentifier(result.workspaceId) || result.sessionRefreshRequired !== true)) {
      throw new TrustedBackendClientError("INTERNAL", requestId);
    }
    if (operationName === "setWorkspaceLifecycle"
      && (result.workspacePresent !== true || !validIdentifier(result.workspaceId)
        || !["active", "disabled", "archived"].includes(result.workspaceLifecycleStatus))) {
      throw new TrustedBackendClientError("INTERNAL", requestId);
    }
    if (operationName === "setWorkspaceOperationMode"
      && (!validIdentifier(result.workspaceId)
        || !["integrated_unconfigured", "personal", "school", "academy"].includes(result.previousMode)
        || !["integrated_unconfigured", "personal", "school", "academy"].includes(result.nextMode)
        || !Number.isSafeInteger(result.operationModeVersion)
        || result.dataPreserved !== true)) {
      throw new TrustedBackendClientError("INTERNAL", requestId);
    }
    return Object.freeze({ ...completed, result: Object.freeze({ ...result }) });
  }

  function validateReadResponse(data, requestId) {
    if (!isPlainRecord(data) || !Array.isArray(data.items)
      || data.items.length > 100
      || !(data.nextCursor === null || (typeof data.nextCursor === "string"
        && data.nextCursor.length <= 64 && /^[A-Za-z0-9_-]+$/.test(data.nextCursor)))) {
      throw new TrustedBackendClientError("INTERNAL", requestId);
    }
    const forbidden = new Set([
      "code", "codeHash", "invitationCode", "inviteCode", "token", "refreshToken",
      "secretVersion", "idempotencyKey", "firestorePath", "stack"
    ]);
    const items = data.items.map((item) => {
      if (!isPlainRecord(item) || Object.keys(item).some((key) => forbidden.has(key))) {
        throw new TrustedBackendClientError("INTERNAL", requestId);
      }
      return Object.freeze({ ...item });
    });
    return Object.freeze({ items: Object.freeze(items), nextCursor: data.nextCursor });
  }

  function safeFailure(error, requestId) {
    if (error instanceof TrustedBackendClientError) return error;
    const code = SAFE_ERROR_CODES.has(error?.code) ? error.code : "INTERNAL";
    return new TrustedBackendClientError(code, requestId);
  }

  function createTrustedBackendClient(options = {}) {
    const enabled = options.enabled === true;
    const transport = options.transport || null;
    const cryptoProvider = options.cryptoProvider || root.crypto;
    const defaultTimeoutMs = boundedInteger(options.timeoutMs || DEFAULT_TIMEOUT_MS, 1, 60000);

    async function invokeTrustedOperation(operationName, payload, context = {}) {
      const definition = OPERATION_DEFINITIONS[operationName];
      if (!definition) throw new TrustedBackendClientError("INVALID_ARGUMENT", "");
      if (!enabled) throw new TrustedBackendClientError("FAILED_PRECONDITION", "");
      if (!transport || typeof transport.invokeTrustedOperation !== "function") {
        throw new TrustedBackendClientError("INTERNAL", "");
      }

      const requestId = secureIdentifier("tbr", cryptoProvider);
      const idempotencyKey = mutationIdempotencyKey(operationName, context, cryptoProvider);
      const timeoutMs = boundedInteger(context.timeoutMs || defaultTimeoutMs, 1, 60000);
      const envelope = Object.freeze({
        idempotencyKey,
        operation: definition.operation,
        target: Object.freeze({ ...payload.target }),
        payload: Object.freeze({ ...payload.payload })
      });
      const controller = typeof AbortController === "function" ? new AbortController() : null;
      let timer = null;
      try {
        const timeout = new Promise((_, reject) => {
          timer = setTimeout(() => {
            controller?.abort();
            reject(new TrustedBackendClientError("INTERNAL", requestId));
          }, timeoutMs);
        });
        const response = await Promise.race([
          Promise.resolve(transport.invokeTrustedOperation(definition.operation, envelope, Object.freeze({
            requestId,
            timeoutMs,
            signal: controller?.signal || null
          }))),
          timeout
        ]);
        if (!isPlainRecord(response) || response.requestId !== requestId) {
          throw new TrustedBackendClientError("INTERNAL", requestId);
        }
        if (response.ok === false) throw new TrustedBackendClientError(response.code, requestId);
        if (response.ok !== true) throw new TrustedBackendClientError("INTERNAL", requestId);
        return validateResponse(operationName, response.data, requestId);
      } catch (error) {
        throw safeFailure(error, requestId);
      } finally {
        if (timer !== null) clearTimeout(timer);
      }
    }

    async function invokeTrustedRead(operationName, payload, context = {}) {
      const definition = READ_DEFINITIONS[operationName];
      if (!definition) throw new TrustedBackendClientError("INVALID_ARGUMENT", "");
      if (!enabled) throw new TrustedBackendClientError("FAILED_PRECONDITION", "");
      if (!transport || typeof transport.invokeTrustedRead !== "function") {
        throw new TrustedBackendClientError("INTERNAL", "");
      }
      const requestId = secureIdentifier("tbr", cryptoProvider);
      const timeoutMs = boundedInteger(context.timeoutMs || defaultTimeoutMs, 1, 60000);
      const envelope = Object.freeze({
        operation: definition.operation,
        target: Object.freeze({ ...payload.target }),
        payload: Object.freeze({ ...payload.payload })
      });
      const controller = typeof AbortController === "function" ? new AbortController() : null;
      let timer = null;
      try {
        const timeout = new Promise((_, reject) => {
          timer = setTimeout(() => {
            controller?.abort();
            reject(new TrustedBackendClientError("INTERNAL", requestId));
          }, timeoutMs);
        });
        const response = await Promise.race([
          Promise.resolve(transport.invokeTrustedRead(definition.operation, envelope, Object.freeze({
            requestId,
            timeoutMs,
            signal: controller?.signal || null
          }))),
          timeout
        ]);
        if (!isPlainRecord(response) || response.requestId !== requestId) {
          throw new TrustedBackendClientError("INTERNAL", requestId);
        }
        if (response.ok === false) throw new TrustedBackendClientError(response.code, requestId);
        if (response.ok !== true) throw new TrustedBackendClientError("INTERNAL", requestId);
        return validateReadResponse(response.data, requestId);
      } catch (error) {
        throw safeFailure(error, requestId);
      } finally {
        if (timer !== null) clearTimeout(timer);
      }
    }

    return Object.freeze({
      createLogicalMutationContext: (operationName) => createLogicalMutationContext(operationName, cryptoProvider),
      invokeTrustedOperation,
      invokeTrustedRead,
      createAdminApplication(input, context) {
        const workspaceId = requiredIdentifier(input?.workspaceId);
        const reason = optionalReason(input?.reason);
        return invokeTrustedOperation("createAdminApplication", {
          target: { kind: "workspace", id: workspaceId, workspaceId: null },
          payload: {
            requestedRole: requiredRole(input?.requestedRole, SELF_SERVICE_ROLE_SET),
            ...(reason ? { reason } : {})
          }
        }, context);
      },
      createWorkspaceBootstrapApplication(input, context) {
        const reason = optionalReason(input?.reason);
        return invokeTrustedOperation("createWorkspaceBootstrapApplication", {
          target: { kind: "workspace_bootstrap", id: "self", workspaceId: null },
          payload: {
            requestedWorkspaceName: requiredWorkspaceName(input?.requestedWorkspaceName),
            ...(reason ? { reason } : {})
          }
        }, context);
      },
      createUserProfile(input, context) {
        const displayName = optionalDisplayName(input?.displayName);
        return invokeTrustedOperation("createUserProfile", {
          target: { kind: "user_profile", id: "self", workspaceId: null },
          payload: { ...(displayName ? { displayName } : {}) }
        }, context);
      },
      submitWorkspaceJoinRequest(input, context) {
        if (typeof input?.code !== "string" || input.code.trim().length < 16) {
          throw new TrustedBackendClientError("INVALID_ARGUMENT", "");
        }
        return invokeTrustedOperation("submitWorkspaceJoinRequest", {
          target: { kind: "workspace_join", id: "submit", workspaceId: null },
          payload: { code: input.code.trim() }
        }, context);
      },
      approveWorkspaceJoinRequest(input, context) {
        return invokeTrustedOperation("approveWorkspaceJoinRequest", {
          target: { kind: "workspace_join_request", id: requiredIdentifier(input?.requestId), workspaceId: null },
          payload: {}
        }, context);
      },
      rejectWorkspaceJoinRequest(input, context) {
        return invokeTrustedOperation("rejectWorkspaceJoinRequest", {
          target: { kind: "workspace_join_request", id: requiredIdentifier(input?.requestId), workspaceId: null },
          payload: {}
        }, context);
      },
      approveAdminApplication(input, context) {
        return invokeTrustedOperation("approveAdminApplication", {
          target: { kind: "admin_application", id: requiredIdentifier(input?.applicationId), workspaceId: null },
          payload: {}
        }, context);
      },
      rejectAdminApplication(input, context) {
        return invokeTrustedOperation("rejectAdminApplication", {
          target: { kind: "admin_application", id: requiredIdentifier(input?.applicationId), workspaceId: null },
          payload: {}
        }, context);
      },
      createInvitation(input, context) {
        return invokeTrustedOperation("createInvitation", {
          target: { kind: "workspace", id: requiredIdentifier(input?.workspaceId), workspaceId: null },
          payload: {
            targetRole: requiredRole(input?.targetRole),
            expiresInSeconds: boundedInteger(input?.expiresInSeconds, 3600, 2592000),
            maxUses: boundedInteger(input?.maxUses, 1, 1000)
          }
        }, context);
      },
      revokeInvitation(input, context) {
        return invokeTrustedOperation("revokeInvitation", {
          target: { kind: "invitation", id: requiredIdentifier(input?.invitationId), workspaceId: null },
          payload: {}
        }, context);
      },
      redeemInvitation(input, context) {
        if (typeof input?.code !== "string" || input.code.trim().length < 16) {
          throw new TrustedBackendClientError("INVALID_ARGUMENT", "");
        }
        return invokeTrustedOperation("redeemInvitation", {
          target: { kind: "invitation_code", id: "redeem", workspaceId: null },
          payload: { code: input.code.trim() }
        }, context);
      },
      updateWorkspaceMemberRole(input, context) {
        const workspaceId = requiredIdentifier(input?.workspaceId);
        return invokeTrustedOperation("updateWorkspaceMemberRole", {
          target: {
            kind: "workspace_member",
            id: requiredIdentifier(input?.targetUid),
            workspaceId
          },
          payload: { newRole: requiredRole(input?.newRole) }
        }, context);
      },
      setWorkspaceMemberStatus(input, context) {
        const workspaceId = requiredIdentifier(input?.workspaceId);
        const status = String(input?.status || "").trim();
        if (status !== "active" && status !== "disabled") {
          throw new TrustedBackendClientError("INVALID_ARGUMENT", "");
        }
        return invokeTrustedOperation("setWorkspaceMemberStatus", {
          target: {
            kind: "workspace_member",
            id: requiredIdentifier(input?.targetUid),
            workspaceId
          },
          payload: { status }
        }, context);
      },
      removeWorkspaceMember(input, context) {
        const workspaceId = requiredIdentifier(input?.workspaceId);
        return invokeTrustedOperation("removeWorkspaceMember", {
          target: {
            kind: "workspace_member",
            id: requiredIdentifier(input?.targetUid),
            workspaceId
          },
          payload: {}
        }, context);
      },
      disableUserAccount(input, context) {
        return invokeTrustedOperation("disableUserAccount", {
          target: { kind: "user_account", id: requiredIdentifier(input?.targetUid), workspaceId: null },
          payload: { reasonCode: requiredIdentifier(input?.reasonCode || "security_admin_action") }
        }, context);
      },
      enableUserAccount(input, context) {
        return invokeTrustedOperation("enableUserAccount", {
          target: { kind: "user_account", id: requiredIdentifier(input?.targetUid), workspaceId: null },
          payload: { reasonCode: requiredIdentifier(input?.reasonCode || "security_admin_action") }
        }, context);
      },
      approveWorkspaceBootstrap(input, context) {
        return invokeTrustedOperation("approveWorkspaceBootstrap", {
          target: { kind: "admin_application", id: requiredIdentifier(input?.applicationId), workspaceId: null },
          payload: {}
        }, context);
      },
      setWorkspaceLifecycle(input, context) {
        const status = String(input?.status || "").trim();
        if (!["active", "disabled", "archived"].includes(status)) {
          throw new TrustedBackendClientError("INVALID_ARGUMENT", "");
        }
        return invokeTrustedOperation("setWorkspaceLifecycle", {
          target: { kind: "workspace", id: requiredIdentifier(input?.workspaceId), workspaceId: null },
          payload: { status }
        }, context);
      },
      setWorkspaceOperationMode(input, context) {
        const modes = new Set(["integrated_unconfigured", "personal", "school", "academy"]);
        const expectedMode = String(input?.expectedMode || "").trim();
        const newMode = String(input?.newMode || "").trim();
        if (!modes.has(expectedMode) || !modes.has(newMode)) {
          throw new TrustedBackendClientError("INVALID_ARGUMENT", "");
        }
        return invokeTrustedOperation("setWorkspaceOperationMode", {
          target: { kind: "workspace", id: requiredIdentifier(input?.workspaceId), workspaceId: null },
          payload: {
            expectedMode,
            newMode,
            reason: optionalReason(input?.reason) || (() => { throw new TrustedBackendClientError("INVALID_ARGUMENT", ""); })()
          }
        }, context);
      },
      listAdminApplications(input, context) {
        return invokeTrustedRead("listAdminApplications", {
          target: { kind: "admin_applications", id: "all", workspaceId: null },
          payload: readPage(input)
        }, context);
      },
      listWorkspaceJoinRequests(input, context) {
        const workspaceId = input?.workspaceId ? requiredIdentifier(input.workspaceId) : null;
        return invokeTrustedRead("listWorkspaceJoinRequests", {
          target: { kind: "workspace_join_requests", id: workspaceId || "all", workspaceId },
          payload: readPage(input)
        }, context);
      },
      listWorkspaceMembers(input, context) {
        const workspaceId = requiredIdentifier(input?.workspaceId);
        return invokeTrustedRead("listWorkspaceMembers", {
          target: { kind: "workspace_members", id: workspaceId, workspaceId },
          payload: readPage(input)
        }, context);
      },
      listInvitations(input, context) {
        const workspaceId = requiredIdentifier(input?.workspaceId);
        return invokeTrustedRead("listInvitations", {
          target: { kind: "invitations", id: workspaceId, workspaceId },
          payload: readPage(input)
        }, context);
      },
      listOwnerWorkspaces(input, context) {
        return invokeTrustedRead("listOwnerWorkspaces", {
          target: { kind: "owner_workspaces", id: "all", workspaceId: null },
          payload: readPage(input)
        }, context);
      },
      listManagementUsers(input, context) {
        return invokeTrustedRead("listManagementUsers", {
          target: { kind: "management_users", id: "all", workspaceId: null },
          payload: readPage(input)
        }, context);
      }
    });
  }

  function runtimeClient() {
    return createTrustedBackendClient({
      enabled: isAuthorityEnabled(),
      transport: root.PMTrustedBackendTransport || null,
      cryptoProvider: root.crypto,
      timeoutMs: DEFAULT_TIMEOUT_MS
    });
  }

  const api = {
    FLAG_NAME,
    isAuthorityEnabled,
    resolveAuthorityEnabled,
    createLogicalMutationContext: (operationName) => createLogicalMutationContext(operationName, root.crypto),
    createClient: createTrustedBackendClient,
    invokeTrustedOperation: (operationName, payload, context) => runtimeClient().invokeTrustedOperation(operationName, payload, context),
    invokeTrustedRead: (operationName, payload, context) => runtimeClient().invokeTrustedRead(operationName, payload, context)
  };
  for (const operationName of Object.keys(OPERATION_DEFINITIONS)) {
    api[operationName] = (input, context) => runtimeClient()[operationName](input, context);
  }
  for (const operationName of Object.keys(READ_DEFINITIONS)) {
    api[operationName] = (input, context) => runtimeClient()[operationName](input, context);
  }

  root.PMTrustedBackendService = Object.freeze(api);
})(typeof window !== "undefined" ? window : globalThis);
