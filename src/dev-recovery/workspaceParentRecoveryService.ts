import {
  getApps,
} from "firebase/app";
import {
  collection,
  doc,
  getCountFromServer,
  getDocFromServer,
  getDocsFromServer,
  limit,
  query,
  runTransaction,
  serverTimestamp,
  where,
} from "firebase/firestore";
import { app, auth } from "../lib/firebase";
import { getFirebaseDb } from "../services/firebaseProvider";
import {
  ALLOW_REAL_RECOVERY,
  DEFAULT_RECOVERY_WORKSPACE_NAME,
  RECOVERY_CHILD_COLLECTIONS,
  REAL_RECOVERY_CONFIRMATION_PHRASE,
  hasChildData,
  isRealRecoveryExecutionEnabled,
  normalizedRecoveryName,
  recoveryFingerprint,
  safeRole,
  safeStatus,
  type ChildCollectionCount,
  type RecoveryBlockingIssue,
  type RecoveryDryRunResult,
  type RecoveryExecutionReceipt,
  type RecoveryFieldProposal,
  type RecoveryParentPayloadPreview,
  type RecoveryPreflightInput,
  type RecoveryWarning,
} from "./workspaceParentRecoveryUtils";

interface FirestoreRecord {
  id: string;
  data: Record<string, unknown>;
}

interface CreatedAtEvidence {
  value: unknown;
  sourceKind: string;
  includeInParentPayload: boolean;
}

function valueSummary(value: unknown): string {
  if (value === undefined) return "missing";
  if (value === null) return "null";
  if (typeof value === "string") return value ? "string-present" : "empty-string";
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) return `array(${value.length})`;
  if (typeof value === "object") return "object-present";
  return typeof value;
}

function isTimestampLike(value: unknown): value is { toDate: () => Date } {
  return Boolean(value && typeof value === "object" && "toDate" in value && typeof (value as { toDate?: unknown }).toDate === "function");
}

function createdAtPreview(value: unknown): string {
  if (isTimestampLike(value)) {
    return value.toDate().toISOString();
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (typeof value === "string" && value.trim()) {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? "omitted" : date.toISOString();
  }
  return "omitted";
}

function createdAtEvidenceKind(value: unknown): string {
  if (isTimestampLike(value)) return "firestore-timestamp";
  if (value instanceof Date) return "date";
  if (typeof value === "string" && value.trim()) return "string-date";
  return "none";
}

async function safeCount(path: string[]): Promise<number> {
  const db = getFirebaseDb();
  const snapshot = await getCountFromServer(collection(db, path.join("/")));
  return snapshot.data().count;
}

async function readDoc(path: string[]): Promise<FirestoreRecord | null> {
  const snapshot = await getDocFromServer(doc(getFirebaseDb(), path.join("/")));
  if (!snapshot.exists()) return null;
  return {
    id: snapshot.id,
    data: snapshot.data() as Record<string, unknown>,
  };
}

async function readSmallSample(path: string[], max = 10): Promise<FirestoreRecord[]> {
  const snapshot = await getDocsFromServer(query(collection(getFirebaseDb(), path.join("/")), limit(max)));
  return snapshot.docs.map((item) => ({
    id: item.id,
    data: item.data() as Record<string, unknown>,
  }));
}

function firstPresent(records: FirestoreRecord[], fields: string[]): unknown {
  for (const record of records) {
    for (const field of fields) {
      const value = record.data[field];
      if (value !== undefined && value !== null && value !== "") return value;
    }
  }
  return undefined;
}

function timestampValue(value: unknown): unknown {
  return isTimestampLike(value) || value instanceof Date ? value : undefined;
}

function firstTimestampEvidenceCandidate(
  candidates: Array<{
    record: FirestoreRecord | null;
    field: string;
    sourceKind: string;
    includeInParentPayload: boolean;
  }>,
): CreatedAtEvidence {
  for (const candidate of candidates) {
    const value = timestampValue(candidate.record?.data[candidate.field]);
    if (value) {
      return {
        value,
        sourceKind: candidate.sourceKind,
        includeInParentPayload: candidate.includeInParentPayload,
      };
    }
  }

  return {
    value: undefined,
    sourceKind: "none",
    includeInParentPayload: false,
  };
}

function activeLegacyMembership(
  snake: FirestoreRecord | null,
  camel: FirestoreRecord | null,
): FirestoreRecord | null {
  return snake || camel;
}

export interface RecoverySessionGateEvidence {
  authUserPresent: boolean;
  usersCurrentWorkspacePresent: boolean;
  targetWorkspaceFingerprint: string;
}

export async function readRecoverySessionGateEvidence(): Promise<RecoverySessionGateEvidence> {
  const user = auth.currentUser;
  const authUserPresent = Boolean(user);

  if (!user) {
    return {
      authUserPresent,
      usersCurrentWorkspacePresent: false,
      targetWorkspaceFingerprint: "-",
    };
  }

  const usersDoc = await readDoc(["users", user.uid]);
  const currentWorkspaceId = String(usersDoc?.data.currentWorkspaceId || "").trim();

  return {
    authUserPresent,
    usersCurrentWorkspacePresent: Boolean(currentWorkspaceId),
    targetWorkspaceFingerprint: await recoveryFingerprint("workspace", currentWorkspaceId),
  };
}

function parentFieldProposals({
  currentWorkspaceId,
  usersDoc,
  systemOwnerDoc,
  name,
  displayName,
  createdAtEvidence,
  createdAtSourceKind,
  createdAtWillBeIncluded,
}: {
  currentWorkspaceId: string;
  usersDoc: FirestoreRecord;
  systemOwnerDoc: FirestoreRecord | null;
  name: string;
  displayName: string;
  createdAtEvidence: unknown;
  createdAtSourceKind: string;
  createdAtWillBeIncluded: boolean;
}): RecoveryFieldProposal[] {
  return [
    {
      fieldName: "workspaceId",
      proposedValueSummary: "target workspace id from users.currentWorkspaceId",
      evidenceSource: "users.currentWorkspaceId",
      confidence: currentWorkspaceId ? "high" : "none",
      category: currentWorkspaceId ? "required-with-evidence" : "no-evidence",
      includeInRecovery: Boolean(currentWorkspaceId),
    },
    {
      fieldName: "name",
      proposedValueSummary: name || "missing explicit user confirmation",
      evidenceSource: name ? "explicit-user-confirmation" : "none",
      confidence: name ? "high" : "none",
      category: name ? "required-with-evidence" : "no-evidence",
      includeInRecovery: Boolean(name),
    },
    {
      fieldName: "displayName",
      proposedValueSummary: displayName || "missing explicit user confirmation",
      evidenceSource: displayName ? "explicit-user-confirmation" : "none",
      confidence: displayName ? "high" : "none",
      category: displayName ? "required-with-evidence" : "no-evidence",
      includeInRecovery: Boolean(displayName),
    },
    {
      fieldName: "ownerUid",
      proposedValueSummary: "current authenticated system owner",
      evidenceSource: "Firebase Auth uid + systemOwners/{uid}",
      confidence: systemOwnerDoc ? "high" : "none",
      category: systemOwnerDoc ? "required-with-evidence" : "no-evidence",
      includeInRecovery: Boolean(systemOwnerDoc),
    },
    {
      fieldName: "status",
      proposedValueSummary: "active",
      evidenceSource: "legacy membership status + valid owner workspace patterns",
      confidence: "medium",
      category: "required-with-evidence",
      includeInRecovery: true,
    },
    {
      fieldName: "createdAt",
      proposedValueSummary: createdAtWillBeIncluded ? createdAtPreview(createdAtEvidence) : "omitted",
      evidenceSource: createdAtWillBeIncluded ? createdAtSourceKind : "omitted",
      confidence: createdAtWillBeIncluded ? "medium" : "none",
      category: createdAtWillBeIncluded ? "optional-with-evidence" : "no-evidence",
      includeInRecovery: createdAtWillBeIncluded,
    },
    {
      fieldName: "updatedAt",
      proposedValueSummary: "server timestamp at future execution time",
      evidenceSource: "future recovery execution only",
      confidence: "high",
      category: "required-with-evidence",
      includeInRecovery: true,
    },
    {
      fieldName: "createdBy",
      proposedValueSummary: "current authenticated system owner",
      evidenceSource: "Firebase Auth uid + systemOwners/{uid}",
      confidence: systemOwnerDoc ? "medium" : "none",
      category: systemOwnerDoc ? "optional-with-evidence" : "no-evidence",
      includeInRecovery: Boolean(systemOwnerDoc),
    },
  ];
}

function membershipFieldProposals({
  legacyMembership,
  usersDoc,
}: {
  legacyMembership: FirestoreRecord | null;
  usersDoc: FirestoreRecord;
}): RecoveryFieldProposal[] {
  const legacyRole = legacyMembership?.data.role;
  const legacyStatus = legacyMembership?.data.status;
  const safeMembershipRole = legacyRole === "system_owner"
    ? "blocked: legacy system_owner is not a workspace role"
    : safeRole(legacyRole);

  return [
    {
      fieldName: "uid",
      proposedValueSummary: "current authenticated user",
      evidenceSource: "Firebase Auth uid + users/{uid}",
      confidence: "high",
      category: "required-with-evidence",
      includeInRecovery: true,
    },
    {
      fieldName: "workspaceId",
      proposedValueSummary: "target workspace id from users.currentWorkspaceId",
      evidenceSource: "users.currentWorkspaceId",
      confidence: "high",
      category: "required-with-evidence",
      includeInRecovery: true,
    },
    {
      fieldName: "role",
      proposedValueSummary: safeMembershipRole,
      evidenceSource: "legacy membership role",
      confidence: legacyRole && legacyRole !== "system_owner" ? "medium" : "none",
      category: legacyRole && legacyRole !== "system_owner" ? "required-with-evidence" : "no-evidence",
      includeInRecovery: Boolean(legacyRole && legacyRole !== "system_owner"),
    },
    {
      fieldName: "status",
      proposedValueSummary: safeStatus(legacyStatus),
      evidenceSource: "legacy membership status",
      confidence: legacyStatus ? "medium" : "none",
      category: legacyStatus ? "required-with-evidence" : "no-evidence",
      includeInRecovery: Boolean(legacyStatus),
    },
    {
      fieldName: "joinedAt",
      proposedValueSummary: valueSummary(legacyMembership?.data.joinedAt ?? legacyMembership?.data.createdAt),
      evidenceSource: "legacy membership joinedAt/createdAt",
      confidence: legacyMembership?.data.joinedAt || legacyMembership?.data.createdAt ? "medium" : "none",
      category: legacyMembership?.data.joinedAt || legacyMembership?.data.createdAt ? "optional-with-evidence" : "no-evidence",
      includeInRecovery: Boolean(legacyMembership?.data.joinedAt || legacyMembership?.data.createdAt),
    },
    {
      fieldName: "createdAt",
      proposedValueSummary: valueSummary(legacyMembership?.data.createdAt),
      evidenceSource: "legacy membership createdAt",
      confidence: legacyMembership?.data.createdAt ? "medium" : "none",
      category: legacyMembership?.data.createdAt ? "optional-with-evidence" : "no-evidence",
      includeInRecovery: Boolean(legacyMembership?.data.createdAt),
    },
    {
      fieldName: "updatedAt",
      proposedValueSummary: "server timestamp at future execution time",
      evidenceSource: "future recovery execution only",
      confidence: "high",
      category: "required-with-evidence",
      includeInRecovery: true,
    },
    {
      fieldName: "displayName",
      proposedValueSummary: usersDoc.data.displayName ? "users.displayName present" : "omit",
      evidenceSource: usersDoc.data.displayName ? "users/{uid}.displayName" : "none",
      confidence: usersDoc.data.displayName ? "medium" : "none",
      category: usersDoc.data.displayName ? "optional-with-evidence" : "no-evidence",
      includeInRecovery: Boolean(usersDoc.data.displayName),
    },
    {
      fieldName: "email",
      proposedValueSummary: usersDoc.data.email ? "masked in UI; value available from users document" : "omit",
      evidenceSource: usersDoc.data.email ? "users/{uid}.email" : "none",
      confidence: usersDoc.data.email ? "medium" : "none",
      category: usersDoc.data.email ? "optional-with-evidence" : "no-evidence",
      includeInRecovery: Boolean(usersDoc.data.email),
    },
  ];
}

export async function runWorkspaceParentRecoveryDryRun(): Promise<RecoveryDryRunResult> {
  return runWorkspaceParentRecoveryPreflight({
    confirmedWorkspaceName: "",
    confirmedDisplayName: "",
  });
}

export async function runWorkspaceParentRecoveryPreflight({
  confirmedWorkspaceName,
  confirmedDisplayName,
}: RecoveryPreflightInput): Promise<RecoveryDryRunResult> {
  if (!import.meta.env.DEV) {
    throw new Error("Workspace parent recovery dry-run is available only in development.");
  }

  const user = auth.currentUser;
  const db = getFirebaseDb();
  const projectId = String(app.options.projectId || import.meta.env.VITE_FIREBASE_PROJECT_ID || "");
  const projectFingerprint = await recoveryFingerprint("firebase-project", projectId);
  const appNextProjectFingerprint = await recoveryFingerprint("firebase-project", projectId);
  const sameFirebaseProject = projectFingerprint === appNextProjectFingerprint
    && app.name === "[DEFAULT]"
    && projectFingerprint !== "-"
    && projectFingerprint !== "unavailable";
  const authUserFingerprint = await recoveryFingerprint("auth-user", user?.uid);
  const blockingIssues: RecoveryBlockingIssue[] = [];
  const warnings: RecoveryWarning[] = [];
  const safeConfirmedName = normalizedRecoveryName(confirmedWorkspaceName);
  const safeConfirmedDisplayName = normalizedRecoveryName(confirmedDisplayName || confirmedWorkspaceName);

  if (!user) {
    blockingIssues.push({
      code: "auth-user-missing",
      message: "Firebase Auth user is required.",
    });
    return {
      dryRun: true,
      writeExecuted: false,
      authUserPresent: false,
      isSystemOwner: false,
      firebaseProjectFingerprint: projectFingerprint,
      recoveryFirebaseProjectFingerprint: projectFingerprint,
      appNextFirebaseProjectFingerprint: appNextProjectFingerprint,
      sameFirebaseProject,
      firebaseAppName: app.name,
      firebaseAppCount: getApps().length,
      databaseIdKind: "default",
      authUserFingerprint,
      targetWorkspaceFingerprint: "-",
      parentWorkspaceExists: false,
      parentRecoveryRequired: false,
      canonicalMembershipExists: false,
      canonicalMembershipRole: "-",
      canonicalMembershipStatus: "-",
      canonicalMembershipActive: false,
      canonicalMembershipWillChange: false,
      legacyMembershipExists: false,
      legacyMembershipRole: "-",
      legacyMembershipStatus: "-",
      membershipRecoveryRequired: false,
      membershipWillBeModified: false,
      childCollectionCounts: [],
      recoveryEvidenceSources: [],
      proposedParentFields: [],
      proposedMembershipFields: [],
      parentPayloadPreview: null,
      confirmedWorkspaceName: safeConfirmedName,
      confirmedDisplayName: safeConfirmedDisplayName,
      nameSource: "missing",
      createdAtEvidenceFound: false,
      createdAtEvidenceKind: "none",
      createdAtEvidenceSourceKind: "none",
      createdAtWillBeIncluded: false,
      createdAtPreview: "omitted",
      usersCurrentWorkspaceWillChange: false,
      childCollectionsWillMove: false,
      rulesWillChange: false,
      estimatedParentWriteCount: 0,
      estimatedMembershipWriteCount: 0,
      estimatedTotalWriteCount: 0,
      estimatedWriteCount: 0,
      blockingIssues,
      warnings,
      readyForParentRecovery: false,
      readyForRecovery: false,
    };
  }

  const usersDoc = await readDoc(["users", user.uid]);
  const systemOwnerDoc = await readDoc(["systemOwners", user.uid]);
  const isSystemOwner = Boolean(systemOwnerDoc);

  if (!usersDoc) {
    blockingIssues.push({
      code: "users-document-missing",
      message: "users/{uid} document is required.",
    });
  }

  if (!isSystemOwner) {
    blockingIssues.push({
      code: "not-system-owner",
      message: "Only a resolved system_owner can dry-run this recovery.",
    });
  }

  if (!sameFirebaseProject) {
    blockingIssues.push({
      code: "firebase-project-mismatch",
      message: "Recovery and app-next Firebase project fingerprints must match.",
    });
  }

  const currentWorkspaceId = String(usersDoc?.data.currentWorkspaceId || "").trim();
  if (!currentWorkspaceId) {
    blockingIssues.push({
      code: "current-workspace-missing",
      message: "users.currentWorkspaceId is required.",
    });
  }

  const targetWorkspaceFingerprint = await recoveryFingerprint("workspace", currentWorkspaceId);
  const parentWorkspace = currentWorkspaceId
    ? await readDoc(["workspaces", currentWorkspaceId])
    : null;
  const canonicalMembership = currentWorkspaceId
    ? await readDoc(["workspaces", currentWorkspaceId, "members", user.uid])
    : null;
  const legacySnake = currentWorkspaceId
    ? await readDoc(["workspace_members", `${currentWorkspaceId}_${user.uid}`])
    : null;
  const legacyCamel = currentWorkspaceId
    ? await readDoc(["workspaceMembers", `${currentWorkspaceId}_${user.uid}`])
    : null;
  const legacyMembership = activeLegacyMembership(legacySnake, legacyCamel);
  const canonicalMembershipRole = safeRole(canonicalMembership?.data.role);
  const canonicalMembershipStatus = safeStatus(canonicalMembership?.data.status);
  const canonicalMembershipActive = canonicalMembershipStatus === "active";

  if (parentWorkspace) {
    blockingIssues.push({
      code: "parent-workspace-exists",
      message: "Target workspace parent already exists; restore must not run.",
    });
  }

  if (!canonicalMembership) {
    blockingIssues.push({
      code: "canonical-membership-missing",
      message: "Existing canonical membership is required. This tool does not create or modify membership.",
    });
  }

  const childCollectionCounts: ChildCollectionCount[] = [];
  for (const collectionName of RECOVERY_CHILD_COLLECTIONS) {
    const count = currentWorkspaceId
      ? await safeCount(["workspaces", currentWorkspaceId, collectionName])
      : 0;
    childCollectionCounts.push({
      name: collectionName,
      count,
    });
  }

  if (!hasChildData(childCollectionCounts)) {
    blockingIssues.push({
      code: "child-data-missing",
      message: "No child collection traces were found under the target workspace.",
    });
  }

  const ownerWorkspaceSnapshot = await getDocsFromServer(
    query(collection(db, "workspaces"), where("ownerUid", "==", user.uid), limit(10)),
  );
  const ownerWorkspaces = ownerWorkspaceSnapshot.docs.map((item) => ({
    id: item.id,
    data: item.data() as Record<string, unknown>,
  }));
  const childSamples = currentWorkspaceId
    ? (await Promise.all(
      RECOVERY_CHILD_COLLECTIONS.slice(0, 8).map((name) => readSmallSample(["workspaces", currentWorkspaceId, name], 3)),
    )).flat()
    : [];
  const childCreatedAtCandidates = childSamples.map((record) => ({
    record,
    field: "createdAt",
    sourceKind: "child-document-createdAt-reference-only",
    includeInParentPayload: false,
  }));
  const createdAtEvidenceResult = firstTimestampEvidenceCandidate([
    { record: legacyMembership, field: "createdAt", sourceKind: "legacy-membership-createdAt", includeInParentPayload: true },
    { record: legacyMembership, field: "joinedAt", sourceKind: "legacy-membership-joinedAt", includeInParentPayload: true },
    { record: canonicalMembership, field: "createdAt", sourceKind: "canonical-membership-createdAt", includeInParentPayload: true },
    { record: canonicalMembership, field: "joinedAt", sourceKind: "canonical-membership-joinedAt", includeInParentPayload: true },
    { record: ownerWorkspaces[0] ?? null, field: "createdAt", sourceKind: "system-owner-workspace-createdAt", includeInParentPayload: true },
    { record: systemOwnerDoc, field: "createdAt", sourceKind: "system-owner-document-createdAt", includeInParentPayload: true },
    ...childCreatedAtCandidates,
  ]);
  const createdAtEvidence = createdAtEvidenceResult.value;
  const createdAtDisplay = createdAtEvidenceResult.includeInParentPayload
    ? createdAtPreview(createdAtEvidence)
    : "omitted";
  const createdAtKind = createdAtEvidenceKind(createdAtEvidence);

  const proposedParentFields = usersDoc
    ? parentFieldProposals({
      currentWorkspaceId,
      usersDoc,
      systemOwnerDoc,
      name: safeConfirmedName,
      displayName: safeConfirmedDisplayName,
      createdAtEvidence,
      createdAtSourceKind: createdAtEvidenceResult.sourceKind,
      createdAtWillBeIncluded: createdAtEvidenceResult.includeInParentPayload,
    })
    : [];
  const proposedMembershipFields = usersDoc
    ? membershipFieldProposals({
      legacyMembership,
      usersDoc,
    })
    : [];

  if (legacyMembership?.data.role === "system_owner") {
    warnings.push({
      code: "legacy-role-system-owner",
      message: "Legacy role is system_owner, which is not a workspace role; do not convert it automatically.",
    });
  }

  if (canonicalMembership) {
    warnings.push({
      code: "canonical-membership-read-only",
      message: "Nested membership already exists and will not be modified.",
    });
  }
  if (!safeConfirmedName || !safeConfirmedDisplayName) {
    warnings.push({
      code: "explicit-name-required",
      message: `Enter and confirm a workspace name before execution. Suggested default: ${DEFAULT_RECOVERY_WORKSPACE_NAME}`,
    });
  }
  if (!createdAtEvidence) {
    warnings.push({
      code: "created-at-omitted",
      message: "No precise timestamp evidence was found; createdAt will be omitted instead of using the current time.",
    });
  } else if (!createdAtEvidenceResult.includeInParentPayload) {
    warnings.push({
      code: "created-at-reference-only",
      message: "A child document timestamp was found, but it is not a safe parent createdAt source and will be omitted.",
    });
  }
  if (ownerWorkspaces.length) {
    warnings.push({
      code: "owner-workspace-reference-read-only",
      message: "Existing owner workspace documents were inspected only for evidence; fields are not copied automatically.",
    });
  }

  warnings.push({
    code: "real-execution-disabled",
    message: ALLOW_REAL_RECOVERY
      ? "Unexpected: real recovery flag is enabled."
      : "Real recovery execution is disabled by design.",
  });

  const parentRecoveryRequired = Boolean(currentWorkspaceId && !parentWorkspace);
  const membershipRecoveryRequired = !canonicalMembership;
  const parentPayloadPreview: RecoveryParentPayloadPreview | null = currentWorkspaceId && safeConfirmedName && safeConfirmedDisplayName
    ? {
      workspaceId: targetWorkspaceFingerprint,
      name: safeConfirmedName,
      displayName: safeConfirmedDisplayName,
      ownerUid: authUserFingerprint,
      status: "active",
      createdAt: createdAtDisplay,
      updatedAt: "serverTimestamp",
      createdBy: authUserFingerprint,
    }
    : null;
  const parentReady = parentRecoveryRequired
    && proposedParentFields.some((field) => field.fieldName === "workspaceId" && field.includeInRecovery)
    && proposedParentFields.some((field) => field.fieldName === "name" && field.includeInRecovery)
    && proposedParentFields.some((field) => field.fieldName === "displayName" && field.includeInRecovery)
    && proposedParentFields.some((field) => field.fieldName === "ownerUid" && field.includeInRecovery)
    && proposedParentFields.some((field) => field.fieldName === "status" && field.includeInRecovery);
  const readyForParentRecovery = blockingIssues.length === 0
    && sameFirebaseProject
    && parentReady
    && Boolean(canonicalMembership)
    && hasChildData(childCollectionCounts);
  const estimatedParentWriteCount = parentRecoveryRequired ? 1 : 0;
  const estimatedMembershipWriteCount = 0;
  const estimatedTotalWriteCount = readyForParentRecovery ? 1 : estimatedParentWriteCount;

  return {
    dryRun: true,
    writeExecuted: false,
    authUserPresent: true,
    isSystemOwner,
    firebaseProjectFingerprint: projectFingerprint,
    recoveryFirebaseProjectFingerprint: projectFingerprint,
    appNextFirebaseProjectFingerprint: appNextProjectFingerprint,
    sameFirebaseProject,
    firebaseAppName: app.name,
    firebaseAppCount: getApps().length,
    databaseIdKind: "default",
    authUserFingerprint,
    targetWorkspaceFingerprint,
    parentWorkspaceExists: Boolean(parentWorkspace),
    parentRecoveryRequired,
    canonicalMembershipExists: Boolean(canonicalMembership),
    canonicalMembershipRole,
    canonicalMembershipStatus,
    canonicalMembershipActive,
    canonicalMembershipWillChange: false,
    legacyMembershipExists: Boolean(legacyMembership),
    legacyMembershipRole: safeRole(legacyMembership?.data.role),
    legacyMembershipStatus: safeStatus(legacyMembership?.data.status),
    membershipRecoveryRequired,
    membershipWillBeModified: false,
    childCollectionCounts,
    recoveryEvidenceSources: [
      "users/{uid}",
      "systemOwners/{uid}",
      "workspaces/{workspaceId}/members/{uid}",
      "workspace_members/{workspaceId_uid}",
      "workspaceMembers/{workspaceId_uid}",
      "workspaces/{workspaceId} child collection counts",
      "explicit workspace name/display name confirmation",
    ],
    proposedParentFields,
    proposedMembershipFields,
    parentPayloadPreview,
    confirmedWorkspaceName: safeConfirmedName,
    confirmedDisplayName: safeConfirmedDisplayName,
    nameSource: safeConfirmedName && safeConfirmedDisplayName ? "explicit-user-confirmation" : "missing",
    createdAtEvidenceFound: Boolean(createdAtEvidence),
    createdAtEvidenceKind: createdAtKind,
    createdAtEvidenceSourceKind: createdAtEvidenceResult.sourceKind,
    createdAtWillBeIncluded: createdAtEvidenceResult.includeInParentPayload,
    createdAtPreview: createdAtDisplay,
    usersCurrentWorkspaceWillChange: false,
    childCollectionsWillMove: false,
    rulesWillChange: false,
    estimatedParentWriteCount,
    estimatedMembershipWriteCount,
    estimatedTotalWriteCount,
    estimatedWriteCount: estimatedTotalWriteCount,
    blockingIssues,
    warnings,
    readyForParentRecovery,
    readyForRecovery: readyForParentRecovery,
  };
}

function publicPayloadFromPreflight(
  preflight: RecoveryDryRunResult,
  uid: string,
  workspaceId: string,
  createdAtEvidence: CreatedAtEvidence,
) {
  const payload: Record<string, unknown> = {
    workspaceId,
    name: preflight.confirmedWorkspaceName,
    displayName: preflight.confirmedDisplayName,
    ownerUid: uid,
    status: "active",
    updatedAt: serverTimestamp(),
    createdBy: uid,
  };
  if (
    createdAtEvidence.includeInParentPayload
    && (isTimestampLike(createdAtEvidence.value) || createdAtEvidence.value instanceof Date)
  ) {
    payload.createdAt = createdAtEvidence.value;
  }
  return payload;
}

async function readCreatedAtEvidenceForExecution(
  uid: string,
  currentWorkspaceId: string,
): Promise<CreatedAtEvidence> {
  const canonicalMembership = await readDoc(["workspaces", currentWorkspaceId, "members", uid]);
  const legacySnake = await readDoc(["workspace_members", `${currentWorkspaceId}_${uid}`]);
  const legacyCamel = await readDoc(["workspaceMembers", `${currentWorkspaceId}_${uid}`]);
  const legacyMembership = activeLegacyMembership(legacySnake, legacyCamel);
  const systemOwnerDoc = await readDoc(["systemOwners", uid]);
  const ownerWorkspaceSnapshot = await getDocsFromServer(
    query(collection(getFirebaseDb(), "workspaces"), where("ownerUid", "==", uid), limit(10)),
  );
  const ownerWorkspaces = ownerWorkspaceSnapshot.docs.map((item) => ({
    id: item.id,
    data: item.data() as Record<string, unknown>,
  }));
  const childSamples = (await Promise.all(
    RECOVERY_CHILD_COLLECTIONS.slice(0, 8).map((name) => readSmallSample(["workspaces", currentWorkspaceId, name], 3)),
  )).flat();

  const childCreatedAtCandidates = childSamples.map((record) => ({
    record,
    field: "createdAt",
    sourceKind: "child-document-createdAt-reference-only",
    includeInParentPayload: false,
  }));

  return firstTimestampEvidenceCandidate([
    { record: legacyMembership, field: "createdAt", sourceKind: "legacy-membership-createdAt", includeInParentPayload: true },
    { record: legacyMembership, field: "joinedAt", sourceKind: "legacy-membership-joinedAt", includeInParentPayload: true },
    { record: canonicalMembership, field: "createdAt", sourceKind: "canonical-membership-createdAt", includeInParentPayload: true },
    { record: canonicalMembership, field: "joinedAt", sourceKind: "canonical-membership-joinedAt", includeInParentPayload: true },
    { record: ownerWorkspaces[0] ?? null, field: "createdAt", sourceKind: "system-owner-workspace-createdAt", includeInParentPayload: true },
    { record: systemOwnerDoc, field: "createdAt", sourceKind: "system-owner-document-createdAt", includeInParentPayload: true },
    ...childCreatedAtCandidates,
  ]);
}

function childCountsEqual(left: ChildCollectionCount[], right: ChildCollectionCount[]): boolean {
  if (left.length !== right.length) return false;
  return left.every((item) => right.some((next) => next.name === item.name && next.count === item.count));
}

function storeRecoveryReceipt(receipt: RecoveryExecutionReceipt): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem("pm:dev-recovery:last-receipt:v1", JSON.stringify(receipt));
  } catch {
    // Development receipt storage is best-effort only.
  }
}

export async function executeWorkspaceParentRecoveryOnce(
  input: RecoveryPreflightInput,
): Promise<RecoveryExecutionReceipt> {
  if (!isRealRecoveryExecutionEnabled({
    isDevelopment: import.meta.env.DEV,
    envFlag: import.meta.env.VITE_ALLOW_REAL_WORKSPACE_PARENT_RECOVERY === "true",
  })) {
    throw new Error("Real recovery execution is disabled.");
  }
  if (input.confirmationPhrase !== REAL_RECOVERY_CONFIRMATION_PHRASE) {
    throw new Error("Confirmation phrase does not match.");
  }

  const startedAt = new Date().toISOString();
  const preflight = await runWorkspaceParentRecoveryPreflight(input);
  if (!preflight.readyForParentRecovery) {
    throw new Error("Preflight is not ready for parent recovery.");
  }

  const user = auth.currentUser;
  if (!user) {
    throw new Error("Firebase Auth user is required.");
  }

  const usersDoc = await readDoc(["users", user.uid]);
  const currentWorkspaceId = String(usersDoc?.data.currentWorkspaceId || "").trim();
  if (!currentWorkspaceId) {
    throw new Error("users.currentWorkspaceId is required.");
  }

  const db = getFirebaseDb();
  const parentRef = doc(db, "workspaces", currentWorkspaceId);
  const childCountsBefore = preflight.childCollectionCounts;
  const canonicalMembershipBefore = await readDoc(["workspaces", currentWorkspaceId, "members", user.uid]);
  const legacySnakeBefore = await readDoc(["workspace_members", `${currentWorkspaceId}_${user.uid}`]);
  const legacyCamelBefore = await readDoc(["workspaceMembers", `${currentWorkspaceId}_${user.uid}`]);
  const legacyMembershipBefore = activeLegacyMembership(legacySnakeBefore, legacyCamelBefore);
  const createdAtEvidence = await readCreatedAtEvidenceForExecution(user.uid, currentWorkspaceId);
  const writePayload = publicPayloadFromPreflight(preflight, user.uid, currentWorkspaceId, createdAtEvidence);

  await runTransaction(db, async (transaction) => {
    const parentSnapshot = await transaction.get(parentRef);
    if (parentSnapshot.exists()) {
      throw new Error("Parent workspace already exists.");
    }
    transaction.set(parentRef, writePayload);
  }, {
    maxAttempts: 1,
  });

  const parentAfter = await getDocFromServer(parentRef);
  const parentAfterData = parentAfter.exists()
    ? parentAfter.data() as Record<string, unknown>
    : {};
  const serverReadSucceededAfterWrite = parentAfter.exists();
  const workspaceFingerprintAfterWrite = await recoveryFingerprint("workspace", parentAfterData.workspaceId);
  const ownerFingerprintAfterWrite = await recoveryFingerprint("auth-user", parentAfterData.ownerUid);
  const childCountsAfter: ChildCollectionCount[] = [];
  for (const collectionName of RECOVERY_CHILD_COLLECTIONS) {
    childCountsAfter.push({
      name: collectionName,
      count: await safeCount(["workspaces", currentWorkspaceId, collectionName]),
    });
  }
  const usersDocAfter = await readDoc(["users", user.uid]);
  const usersWorkspaceFingerprintAfter = await recoveryFingerprint("workspace", usersDocAfter?.data.currentWorkspaceId);
  const canonicalMembershipAfter = await readDoc(["workspaces", currentWorkspaceId, "members", user.uid]);
  const legacySnakeAfter = await readDoc(["workspace_members", `${currentWorkspaceId}_${user.uid}`]);
  const legacyCamelAfter = await readDoc(["workspaceMembers", `${currentWorkspaceId}_${user.uid}`]);
  const legacyMembershipAfter = activeLegacyMembership(legacySnakeAfter, legacyCamelAfter);
  const canonicalMembershipUnchanged = (!canonicalMembershipBefore && !canonicalMembershipAfter)
    || (Boolean(canonicalMembershipBefore && canonicalMembershipAfter)
      && safeRole(canonicalMembershipBefore?.data.role) === safeRole(canonicalMembershipAfter?.data.role)
      && safeStatus(canonicalMembershipBefore?.data.status) === safeStatus(canonicalMembershipAfter?.data.status));
  const legacyMembershipUnchanged = (!legacyMembershipBefore && !legacyMembershipAfter)
    || (Boolean(legacyMembershipBefore && legacyMembershipAfter)
      && safeRole(legacyMembershipBefore?.data.role) === safeRole(legacyMembershipAfter?.data.role)
      && safeStatus(legacyMembershipBefore?.data.status) === safeStatus(legacyMembershipAfter?.data.status));

  const receipt: RecoveryExecutionReceipt = {
    targetWorkspaceFingerprint: preflight.targetWorkspaceFingerprint,
    firebaseProjectFingerprint: preflight.firebaseProjectFingerprint,
    authUserFingerprint: preflight.authUserFingerprint,
    executionStartedAt: startedAt,
    executionCompletedAt: new Date().toISOString(),
    parentWriteRequested: true,
    parentWriteCommitted: true,
    parentServerConfirmed: parentAfter.exists(),
    parentWorkspaceExistsAfterWrite: parentAfter.exists(),
    serverReadSucceededAfterWrite,
    workspaceFingerprintMatches: workspaceFingerprintAfterWrite === preflight.targetWorkspaceFingerprint,
    ownerFingerprintMatches: ownerFingerprintAfterWrite === preflight.authUserFingerprint,
    statusMatches: parentAfterData.status === "active",
    nameMatches: parentAfterData.name === preflight.confirmedWorkspaceName,
    displayNameMatches: parentAfterData.displayName === preflight.confirmedDisplayName,
    childCountsUnchanged: childCountsEqual(childCountsBefore, childCountsAfter),
    usersCurrentWorkspaceUnchanged: usersWorkspaceFingerprintAfter === preflight.targetWorkspaceFingerprint,
    canonicalMembershipStillExists: Boolean(canonicalMembershipAfter),
    canonicalMembershipUnchanged,
    legacyMembershipUnchanged,
    membershipWriteCount: 0,
    usersWriteCount: 0,
    childWriteCount: 0,
    childCountsBefore,
    childCountsAfter,
    sessionReloadSucceeded: false,
    noticeReadCountAfterRecovery: childCountsAfter.find((item) => item.name === "notices")?.count ?? 0,
    transportErrorKind: "none",
  };
  storeRecoveryReceipt(receipt);
  return receipt;
}
