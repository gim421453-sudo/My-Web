import {
  isWorkspaceRole,
  type WorkspaceRole,
} from "../permissions/roles";
import type { SessionWarning } from "../auth/authTypes";
import { createSessionWarning } from "../auth/authNormalization";
import type { WorkspaceMembership } from "./workspaceTypes";

export function isUsableMembershipStatus(status: unknown): boolean {
  return status === "active" || status === "accepted";
}

export function normalizeWorkspaceMembership(
  membership: WorkspaceMembership | null,
): {
  role: WorkspaceRole | null;
  isUsable: boolean;
  warnings: SessionWarning[];
} {
  if (!membership) {
    return {
      role: null,
      isUsable: false,
      warnings: [
        createSessionWarning(
          "MEMBERSHIP_NOT_FOUND",
          "Nested workspace membership was not found.",
        ),
      ],
    };
  }

  const warnings: SessionWarning[] = [];

  if (!isUsableMembershipStatus(membership.status)) {
    return {
      role: null,
      isUsable: false,
      warnings: [
        createSessionWarning(
          "MEMBERSHIP_NOT_FOUND",
          "Nested workspace membership is not active or accepted.",
          { status: membership.status },
        ),
      ],
    };
  }

  if (!isWorkspaceRole(membership.role)) {
    warnings.push(createSessionWarning(
      "INVALID_WORKSPACE_ROLE",
      "Nested workspace membership has an invalid role.",
      { role: membership.role },
    ));

    return {
      role: null,
      isUsable: false,
      warnings,
    };
  }

  return {
    role: membership.role,
    isUsable: true,
    warnings,
  };
}

