export type RuntimeEnvironment = Readonly<Record<string, string | undefined>>;

export type ProjectContextSource =
  | "firebase-config"
  | "google-cloud-project"
  | "gcloud-project"
  | "explicit-test"
  | "none";

export interface ProjectContextOptions {
  env?: RuntimeEnvironment;
  explicitTestProjectId?: string;
  allowExplicitTestContext?: boolean;
}

export interface ProjectContext {
  projectId: string | null;
  source: ProjectContextSource;
  sourceCount: number;
  malformedFirebaseConfig: boolean;
  conflictingSources: boolean;
}

interface ProjectCandidate {
  source: Exclude<ProjectContextSource, "none">;
  value: string;
}

function normalizedProjectId(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function firebaseConfigProjectId(value: string | undefined): {
  projectId: string;
  malformed: boolean;
} {
  const raw = String(value || "").trim();
  if (!raw) return { projectId: "", malformed: false };
  try {
    const parsed = JSON.parse(raw) as { projectId?: unknown; project_id?: unknown };
    const projectId = normalizedProjectId(parsed.projectId ?? parsed.project_id);
    return { projectId, malformed: !projectId };
  } catch {
    return { projectId: "", malformed: true };
  }
}

export function resolveProjectContext(options: ProjectContextOptions = {}): ProjectContext {
  const env = options.env ?? process.env;
  const runtimeConfig = firebaseConfigProjectId(env.FIREBASE_CONFIG);
  const candidates: ProjectCandidate[] = [];

  if (runtimeConfig.projectId) {
    candidates.push({ source: "firebase-config", value: runtimeConfig.projectId });
  }
  const googleCloudProject = normalizedProjectId(env.GOOGLE_CLOUD_PROJECT);
  if (googleCloudProject) {
    candidates.push({ source: "google-cloud-project", value: googleCloudProject });
  }
  const gcloudProject = normalizedProjectId(env.GCLOUD_PROJECT);
  if (gcloudProject) {
    candidates.push({ source: "gcloud-project", value: gcloudProject });
  }
  if (options.allowExplicitTestContext === true) {
    const explicitTestProjectId = normalizedProjectId(options.explicitTestProjectId);
    if (explicitTestProjectId) {
      candidates.push({ source: "explicit-test", value: explicitTestProjectId });
    }
  }

  const values = new Set(candidates.map((candidate) => candidate.value));
  const selected = candidates[0];
  return Object.freeze({
    projectId: selected?.value || null,
    source: selected?.source || "none",
    sourceCount: candidates.length,
    malformedFirebaseConfig: runtimeConfig.malformed,
    conflictingSources: values.size > 1,
  });
}

export function isDemoProjectId(projectId: string | null): boolean {
  return typeof projectId === "string"
    && /^demo-[a-z0-9][a-z0-9-]{3,}$/.test(projectId);
}

export function safeProjectContextMetadata(context: ProjectContext): Readonly<Record<string, unknown>> {
  return Object.freeze({
    projectPresent: Boolean(context.projectId),
    demoProject: isDemoProjectId(context.projectId),
    source: context.source,
    sourceCount: context.sourceCount,
    malformedFirebaseConfig: context.malformedFirebaseConfig,
    conflictingSources: context.conflictingSources,
  });
}
