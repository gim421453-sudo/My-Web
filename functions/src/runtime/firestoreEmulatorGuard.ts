import {
  isDemoProjectId,
  resolveProjectContext,
  type RuntimeEnvironment,
} from "./projectContext.js";
import {
  TRUSTED_BACKEND_MODE_ENV,
  type TrustedBackendGuardOptions,
  type TrustedBackendRuntimeContext,
} from "./emulatorGuard.js";

export type FirestoreEmulatorGuardCode =
  | "FIRESTORE_CREDENTIAL_ENV_BLOCKED"
  | "FIRESTORE_MODE_NOT_EMULATOR"
  | "FIRESTORE_CONFIG_INVALID"
  | "FIRESTORE_PROJECT_SOURCE_CONFLICT"
  | "FIRESTORE_PROJECT_ID_MISSING"
  | "FIRESTORE_PROJECT_ID_NOT_DEMO"
  | "FIRESTORE_EMULATOR_REQUIRED";

export class FirestoreEmulatorGuardError extends Error {
  readonly code: FirestoreEmulatorGuardCode;

  constructor(code: FirestoreEmulatorGuardCode) {
    super(code);
    this.name = "FirestoreEmulatorGuardError";
    this.code = code;
  }
}

function hasExternalCredential(env: RuntimeEnvironment): boolean {
  return Boolean(String(env.GOOGLE_APPLICATION_CREDENTIALS || "").trim());
}

function isAllowedFirestoreEmulatorHost(value: string | undefined): boolean {
  const match = /^(127\.0\.0\.1|localhost):([1-9][0-9]{0,4})$/.exec(String(value || "").trim());
  return Boolean(match && Number(match[2]) <= 65535);
}

export function assertFirestoreEmulatorOnly(
  options: TrustedBackendGuardOptions = {},
): TrustedBackendRuntimeContext {
  const env = options.env ?? process.env;
  if (hasExternalCredential(env)) {
    throw new FirestoreEmulatorGuardError("FIRESTORE_CREDENTIAL_ENV_BLOCKED");
  }
  if (String(env[TRUSTED_BACKEND_MODE_ENV] || "").trim().toLowerCase() !== "emulator") {
    throw new FirestoreEmulatorGuardError("FIRESTORE_MODE_NOT_EMULATOR");
  }

  const project = resolveProjectContext(options);
  if (project.malformedFirebaseConfig) {
    throw new FirestoreEmulatorGuardError("FIRESTORE_CONFIG_INVALID");
  }
  if (project.conflictingSources) {
    throw new FirestoreEmulatorGuardError("FIRESTORE_PROJECT_SOURCE_CONFLICT");
  }
  if (!project.projectId) {
    throw new FirestoreEmulatorGuardError("FIRESTORE_PROJECT_ID_MISSING");
  }
  if (!isDemoProjectId(project.projectId)) {
    throw new FirestoreEmulatorGuardError("FIRESTORE_PROJECT_ID_NOT_DEMO");
  }
  if (!isAllowedFirestoreEmulatorHost(env.FIRESTORE_EMULATOR_HOST)) {
    throw new FirestoreEmulatorGuardError("FIRESTORE_EMULATOR_REQUIRED");
  }

  return Object.freeze({
    projectId: project.projectId,
    mode: "emulator",
    demoProject: true,
    projectSource: project.source,
  });
}
