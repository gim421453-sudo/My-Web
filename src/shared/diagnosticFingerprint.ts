export type DiagnosticFingerprintNamespace = "workspace" | "auth-user" | "firebase-project";

export async function diagnosticFingerprint(
  namespace: DiagnosticFingerprintNamespace,
  value: string | null | undefined,
): Promise<string> {
  const text = String(value || "").trim();
  if (!text) return "-";
  try {
    const cryptoApi = globalThis.crypto;
    if (!cryptoApi?.subtle || typeof TextEncoder === "undefined") return "unavailable";
    const encoded = new TextEncoder().encode(`${namespace}:v1:${text}`);
    const digest = await cryptoApi.subtle.digest("SHA-256", encoded);
    return Array.from(new Uint8Array(digest))
      .slice(0, 4)
      .map((item) => item.toString(16).padStart(2, "0"))
      .join("");
  } catch {
    return "unavailable";
  }
}
