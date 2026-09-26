import {
  isDemoProjectId,
  resolveProjectContext,
  safeProjectContextMetadata,
  type ProjectContextOptions,
  type RuntimeEnvironment,
} from "./projectContext.js";

export const TRUSTED_BACKEND_MODE_ENV = "MYWEB_TRUSTED_BACKEND_MODE";
export const TRUSTED_BACKEND_VERSION = "tb01.0.0";
export const SECURITY_CONTRACT_VERSION = "tb01";

export type TrustedBackendGuardCode =
  | "TB_CREDENTIAL_ENV_BLOCKED"
  | "TB_MODE_NOT_EMULATOR"
  | "TB_FIREBASE_CONFIG_INVALID"
  | "TB_PROJECT_SOURCE_CONFLICT"
  | "TB_PROJECT_ID_MISSING"
  | "TB_PROJECT_ID_NOT_DEMO"
  | "TB_FUNCTIONS_EMULATOR_REQUIRED"
  | "TB_FIRESTORE_EMULATOR_REQUIRED"
  | "TB_AUTH_EMULATOR_REQUIRED";

export class TrustedBackendGuardError extends Error {
  readonly code: TrustedBackendGuardCode;

  constructor(code: TrustedBackendGuardCode) {
    super(code);
    this.name = "TrustedBackendGuardError";
    this.code = code;
  }
}

export interface TrustedBackendGuardOptions extends ProjectContextOptions {
  env?: RuntimeEnvironment;
}

export interface TrustedBackendRuntimeContext {
  projectId: string;
  mode: "emulator";
  demoProject: true;
  projectSource: string;
}

function hasExternalCredential(env: RuntimeEnvironment): boolean {
  return Boolean(String(env.GOOGLE_APPLICATION_CREDENTIALS || "").trim());
}

export function isLoopbackEmulatorHost(value: string | undefined): boolean {
  const hostPort = String(value || "").trim().toLowerCase();
  const match = /^(127\.0\.0\.1|localhost|\[::1\]):([1-9][0-9]{0,4})$/.exec(hostPort);
  if (!match?.[2]) return false;
  return Number(match[2]) <= 65535;
}

export function assertTrustedBackendEmulatorOnly(
  options: TrustedBackendGuardOptions = {},
): TrustedBackendRuntimeContext {
  const env = options.env ?? process.env;
  if (hasExternalCredential(env)) {
    throw new TrustedBackendGuardError("TB_CREDENTIAL_ENV_BLOCKED");
  }

  const mode = String(env[TRUSTED_BACKEND_MODE_ENV] || "").trim().toLowerCase();
  if (mode !== "emulator") {
    throw new TrustedBackendGuardError("TB_MODE_NOT_EMULATOR");
  }

  const project = resolveProjectContext(options);
  if (project.malformedFirebaseConfig) {
    throw new TrustedBackendGuardError("TB_FIREBASE_CONFIG_INVALID");
  }
  if (project.conflictingSources) {
    throw new TrustedBackendGuardError("TB_PROJECT_SOURCE_CONFLICT");
  }
  if (!project.projectId) {
    throw new TrustedBackendGuardError("TB_PROJECT_ID_MISSING");
  }
  if (!isDemoProjectId(project.projectId)) {
    throw new TrustedBackendGuardError("TB_PROJECT_ID_NOT_DEMO");
  }
  if (String(env.FUNCTIONS_EMULATOR || "").toLowerCase() !== "true") {
    throw new TrustedBackendGuardError("TB_FUNCTIONS_EMULATOR_REQUIRED");
  }
  if (!isLoopbackEmulatorHost(env.FIRESTORE_EMULATOR_HOST)) {
    throw new TrustedBackendGuardError("TB_FIRESTORE_EMULATOR_REQUIRED");
  }
  if (!isLoopbackEmulatorHost(env.FIREBASE_AUTH_EMULATOR_HOST)) {
    throw new TrustedBackendGuardError("TB_AUTH_EMULATOR_REQUIRED");
  }

  return Object.freeze({
    projectId: project.projectId,
    mode: "emulator",
    demoProject: true,
    projectSource: project.source,
  });
}

export function safeTrustedBackendMetadata(
  options: TrustedBackendGuardOptions = {},
): Readonly<Record<string, unknown>> {
  const env = options.env ?? process.env;
  const project = resolveProjectContext(options);
  return Object.freeze({
    mode: String(env[TRUSTED_BACKEND_MODE_ENV] || "").trim().toLowerCase() || "missing",
    ...safeProjectContextMetadata(project),
    functionsEmulator: String(env.FUNCTIONS_EMULATOR || "").toLowerCase() === "true",
    firestoreEmulator: isLoopbackEmulatorHost(env.FIRESTORE_EMULATOR_HOST),
    authEmulator: isLoopbackEmulatorHost(env.FIREBASE_AUTH_EMULATOR_HOST),
    credentialEnvironmentPresent: hasExternalCredential(env),
    backendVersion: TRUSTED_BACKEND_VERSION,
    securityContractVersion: SECURITY_CONTRACT_VERSION,
  });
}
