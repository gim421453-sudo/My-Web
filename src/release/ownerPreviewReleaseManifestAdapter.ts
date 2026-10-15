export type OwnerPreviewReleaseStage =
  | "stable"
  | "beta"
  | "internal"
  | "hidden"
  | "planned"
  | "blocked";

export interface OwnerPreviewFeature {
  featureId: string;
  system: "operational" | "app-next" | "admin" | "connected";
  pageKey: string;
  route: string;
  screenName: string;
  currentStatus: string;
  releaseStage: OwnerPreviewReleaseStage;
  enabled: boolean;
  ownerPreview: boolean;
  requiresAuth: boolean;
  globalRoles: readonly string[];
  workspaceRoles: readonly string[];
  requiredGlobalRoles: readonly string[];
  requiredWorkspaceRoles: readonly string[];
  workspaceRequired: boolean;
  hasRead: boolean;
  hasWrite: boolean;
  serverConfirmed: boolean;
  automaticTestEvidence: string;
  manualTestEvidence: string;
  firstOwnerPreviewIncluded: boolean;
  blockReason: string;
  description: string;
  notes: string;
}

export interface OwnerPreviewReleaseManifest {
  manifestVersion: string;
  releaseChannel: "owner-preview";
  appVersion: string;
  buildDate: string;
  gitCommit: string;
  features: readonly OwnerPreviewFeature[];
}

export interface OwnerPreviewAccessInput {
  featureId?: string;
  system?: OwnerPreviewFeature["system"];
  pageKey?: string | null;
  route?: string | null;
  globalRole?: string | null;
  workspaceRole?: string | null;
  workspacePresent?: boolean;
  isSystemOwner?: boolean;
}

export interface OwnerPreviewAccessDecision {
  allowed: boolean;
  feature: OwnerPreviewFeature | null;
  reasonCategory: string;
}

export interface OwnerPreviewManifestDiagnosticsSnapshot {
  manifestVersion: string;
  releaseChannel: string;
  totalFeatureCount: number;
  stableCount: number;
  betaCount: number;
  internalCount: number;
  hiddenCount: number;
  plannedCount: number;
  blockedCount: number;
  currentFeatureId: string;
  currentFeatureStage: string;
  currentFeatureAllowed: boolean;
  lastBlockedFeatureId: string;
  lastBlockReasonCategory: string;
  sensitiveValueDetected: false;
}

declare global {
  interface Window {
    PM_OWNER_PREVIEW_RELEASE_MANIFEST_V1?: OwnerPreviewReleaseManifest;
    PMReleaseManifestDiagnostics?: {
      snapshot(): OwnerPreviewManifestDiagnosticsSnapshot;
    };
  }
}

const EMPTY_MANIFEST: OwnerPreviewReleaseManifest = {
  manifestVersion: "owner-preview-v1-unavailable",
  releaseChannel: "owner-preview",
  appVersion: "unavailable",
  buildDate: "unavailable",
  gitCommit: "unavailable",
  features: [],
};

let latestFeatureDecision: OwnerPreviewAccessDecision | null = null;
let latestBlockedDecision: OwnerPreviewAccessDecision | null = null;

function manifestFromGlobal(): OwnerPreviewReleaseManifest {
  if (typeof window === "undefined") return EMPTY_MANIFEST;
  return window.PM_OWNER_PREVIEW_RELEASE_MANIFEST_V1 ?? EMPTY_MANIFEST;
}

export function getOwnerPreviewReleaseManifest(): OwnerPreviewReleaseManifest {
  return manifestFromGlobal();
}

export function findOwnerPreviewFeature({
  featureId,
  system,
  pageKey,
  route,
}: Pick<OwnerPreviewAccessInput, "featureId" | "system" | "pageKey" | "route">): OwnerPreviewFeature | null {
  const manifest = getOwnerPreviewReleaseManifest();
  if (featureId) {
    return manifest.features.find((feature) => feature.featureId === featureId) ?? null;
  }

  return manifest.features.find((feature) => {
    if (system && feature.system !== system) return false;
    if (pageKey && feature.pageKey === pageKey) return true;
    if (route && feature.route === route) return true;
    return false;
  }) ?? null;
}

function roleAllowed(allowedRoles: readonly string[], role: string | null | undefined): boolean {
  return allowedRoles.includes("*") || Boolean(role && allowedRoles.includes(role));
}

export function decideOwnerPreviewFeatureAccess(input: OwnerPreviewAccessInput): OwnerPreviewAccessDecision {
  const feature = findOwnerPreviewFeature(input);
  if (!feature) {
    return {
      allowed: false,
      feature: null,
      reasonCategory: "feature-not-found",
    };
  }

  if (!feature.enabled) {
    return {
      allowed: false,
      feature,
      reasonCategory: feature.releaseStage,
    };
  }

  if (!["stable", "beta"].includes(feature.releaseStage)) {
    return {
      allowed: false,
      feature,
      reasonCategory: feature.releaseStage,
    };
  }

  const globalRole = input.isSystemOwner ? "system_owner" : input.globalRole ?? null;

  if (feature.releaseStage === "beta" && feature.ownerPreview && globalRole !== "system_owner") {
    return {
      allowed: false,
      feature,
      reasonCategory: "owner-preview-only",
    };
  }

  if (!roleAllowed(feature.requiredGlobalRoles, globalRole)) {
    return {
      allowed: false,
      feature,
      reasonCategory: "global-role-denied",
    };
  }

  if (feature.workspaceRequired && !input.workspacePresent && globalRole !== "system_owner") {
    return {
      allowed: false,
      feature,
      reasonCategory: "workspace-required",
    };
  }

  if (
    feature.requiredWorkspaceRoles.length > 0 &&
    globalRole !== "system_owner" &&
    !roleAllowed(feature.requiredWorkspaceRoles, input.workspaceRole)
  ) {
    return {
      allowed: false,
      feature,
      reasonCategory: "workspace-role-denied",
    };
  }

  return {
    allowed: true,
    feature,
    reasonCategory: "allowed",
  };
}

export function summarizeOwnerPreviewManifest(manifest = getOwnerPreviewReleaseManifest()) {
  const counts = {
    totalFeatureCount: manifest.features.length,
    stableCount: 0,
    betaCount: 0,
    internalCount: 0,
    hiddenCount: 0,
    plannedCount: 0,
    blockedCount: 0,
  };

  for (const feature of manifest.features) {
    if (feature.releaseStage === "stable") counts.stableCount += 1;
    if (feature.releaseStage === "beta") counts.betaCount += 1;
    if (feature.releaseStage === "internal") counts.internalCount += 1;
    if (feature.releaseStage === "hidden") counts.hiddenCount += 1;
    if (feature.releaseStage === "planned") counts.plannedCount += 1;
    if (feature.releaseStage === "blocked") counts.blockedCount += 1;
  }

  return counts;
}

export function recordOwnerPreviewManifestDecision(
  decision: OwnerPreviewAccessDecision,
): void {
  latestFeatureDecision = decision;
  if (!decision.allowed && decision.feature) {
    latestBlockedDecision = decision;
  }
}

export function getOwnerPreviewManifestDiagnosticsSnapshot(): OwnerPreviewManifestDiagnosticsSnapshot {
  const manifest = getOwnerPreviewReleaseManifest();
  const counts = summarizeOwnerPreviewManifest(manifest);

  return {
    manifestVersion: manifest.manifestVersion,
    releaseChannel: manifest.releaseChannel,
    ...counts,
    currentFeatureId: latestFeatureDecision?.feature?.featureId ?? "",
    currentFeatureStage: latestFeatureDecision?.feature?.releaseStage ?? "",
    currentFeatureAllowed: Boolean(latestFeatureDecision?.allowed),
    lastBlockedFeatureId: latestBlockedDecision?.feature?.featureId ?? "",
    lastBlockReasonCategory: latestBlockedDecision?.reasonCategory ?? "",
    sensitiveValueDetected: false,
  };
}

function installOwnerPreviewReleaseManifestDiagnostics(): void {
  if (typeof window === "undefined") return;
  window.PMReleaseManifestDiagnostics = {
    snapshot: getOwnerPreviewManifestDiagnosticsSnapshot,
  };
}

installOwnerPreviewReleaseManifestDiagnostics();
