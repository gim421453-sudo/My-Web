import type { VerifiedActor } from "../auth/verifiedActor.js";
import { AuthorizationError } from "./authzErrors.js";
import type {
  AuthorizationContext,
  AuthorityDocumentReader,
  SystemOwnerResolution,
  WorkspaceMembershipResolution,
} from "./authorizationTypes.js";
import { isValidDocumentId } from "./resolverUtils.js";
import { resolveSystemOwner } from "./systemOwnerResolver.js";
import { resolveWorkspaceMembership } from "./workspaceMembershipResolver.js";

const UNRESOLVED = Object.freeze({ state: "UNRESOLVED" } as const);
const CAPABILITY_UNRESOLVED = Object.freeze({ resolution: "unresolved" } as const);
const ASSIGNMENT_UNRESOLVED = Object.freeze({ resolution: "unresolved" } as const);

export interface AuthorizationContextDependencies {
  reader?: AuthorityDocumentReader;
}

function assertOperation(operation: string): void {
  if (!/^[a-z0-9][a-z0-9._:-]{0,63}$/.test(operation)) {
    throw new AuthorizationError("AUTHZ_CONTEXT_MALFORMED");
  }
}

function assertWorkspaceId(workspaceId: string): void {
  if (!workspaceId.trim()) {
    throw new AuthorizationError("AUTHZ_WORKSPACE_REQUIRED");
  }
  if (!isValidDocumentId(workspaceId)) {
    throw new AuthorizationError("AUTHZ_CONTEXT_MALFORMED");
  }
}

function createContext(
  actor: VerifiedActor,
  operation: string,
  systemOwner: AuthorizationContext["global"]["systemOwner"],
  workspaceId: string | null,
  membership: AuthorizationContext["workspace"]["membership"],
): AuthorizationContext {
  return Object.freeze({
    actor,
    operation,
    global: Object.freeze({ systemOwner }),
    workspace: Object.freeze({
      workspaceId,
      membership,
      role: membership.state === "ACTIVE" ? membership.role : null,
    }),
    capability: CAPABILITY_UNRESOLVED,
    assignment: ASSIGNMENT_UNRESOLVED,
    resolution: "complete",
  });
}

export async function buildGlobalAuthorizationContext(
  actor: VerifiedActor,
  operation: string,
  dependencies: AuthorizationContextDependencies = {},
): Promise<AuthorizationContext> {
  assertOperation(operation);
  const owner = await resolveSystemOwner(actor, dependencies);
  return createContext(actor, operation, owner, null, UNRESOLVED);
}

export async function buildWorkspaceAuthorizationContext(
  actor: VerifiedActor,
  operation: string,
  workspaceId: string,
  dependencies: AuthorizationContextDependencies = {},
): Promise<AuthorizationContext> {
  assertOperation(operation);
  assertWorkspaceId(workspaceId);
  const membership = await resolveWorkspaceMembership(actor, workspaceId, dependencies);
  return createContext(actor, operation, UNRESOLVED, workspaceId, membership);
}

export async function buildWorkspaceAuthorizationContextWithOwnerOverride(
  actor: VerifiedActor,
  operation: string,
  workspaceId: string,
  dependencies: AuthorizationContextDependencies = {},
): Promise<AuthorizationContext> {
  assertOperation(operation);
  assertWorkspaceId(workspaceId);
  const [owner, membership]: [SystemOwnerResolution, WorkspaceMembershipResolution] = await Promise.all([
    resolveSystemOwner(actor, dependencies),
    resolveWorkspaceMembership(actor, workspaceId, dependencies),
  ]);
  return createContext(actor, operation, owner, workspaceId, membership);
}
