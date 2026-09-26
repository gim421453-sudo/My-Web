import type { AuthorityDocumentReader } from "./authorizationTypes.js";
import { createAdminAuthorityDocumentReader, getTrustedAdminFirestore } from "../runtime/adminFirestore.js";

export const OWNER_SOURCES = Object.freeze([
  "trusted_migration",
  "system_bootstrap",
] as const);

export const MEMBERSHIP_SOURCES = Object.freeze([
  "invite",
  "admin_approval",
  "trusted_migration",
  "student_link",
  "system_bootstrap",
] as const);

export function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function hasOnlyKeys(data: Record<string, unknown>, allowed: ReadonlySet<string>): boolean {
  return Object.keys(data).every((key) => allowed.has(key));
}

export function isValidDocumentId(value: unknown): value is string {
  if (typeof value !== "string" || !value || value !== value.trim()) return false;
  if (value === "." || value === ".." || value.includes("/")) return false;
  return new TextEncoder().encode(value).length <= 1_500;
}

export function defaultAuthorityDocumentReader(): AuthorityDocumentReader {
  return createAdminAuthorityDocumentReader(getTrustedAdminFirestore().firestore);
}
