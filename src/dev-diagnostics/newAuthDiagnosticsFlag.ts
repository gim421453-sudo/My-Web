export type OwnerAdminDiagnosticsAuthMode = "legacy-direct" | "new-provider";

interface ResolveNewAuthDiagnosticsFlagInput {
  search?: string;
  envValue?: unknown;
}

function parseBooleanSwitch(value: unknown): boolean | null {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(normalized)) return true;
  if (["0", "false", "no", "off"].includes(normalized)) return false;
  return null;
}

function queryValue(search: string, key: string): string | null {
  const query = search.startsWith("?") ? search.slice(1) : search;
  if (!query) return null;

  for (const part of query.split("&")) {
    const [rawKey, rawValue = ""] = part.split("=");
    if (decodeURIComponent(rawKey || "") === key) {
      return decodeURIComponent(rawValue.replace(/\+/g, " "));
    }
  }

  return null;
}

export function resolveNewAuthDiagnosticsFlag({
  search = "",
  envValue,
}: ResolveNewAuthDiagnosticsFlagInput = {}): boolean {
  const querySwitch = parseBooleanSwitch(queryValue(search, "newAuth"));
  if (querySwitch !== null) return querySwitch;

  const envSwitch = parseBooleanSwitch(envValue);
  if (envSwitch !== null) return envSwitch;

  return false;
}

export function authModeForNewAuthDiagnosticsFlag(
  enabled: boolean,
): OwnerAdminDiagnosticsAuthMode {
  return enabled ? "new-provider" : "legacy-direct";
}
