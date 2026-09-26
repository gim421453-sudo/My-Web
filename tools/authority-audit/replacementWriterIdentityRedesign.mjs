export const FAILED_G2_ACCOUNT_ID = "myweb-class-migration-writer-g2";
export const REPLACEMENT_WRITER_GENERATION_2B_ACCOUNT_ID = "myweb-class-mig-writer-g2";
export const REPLACEMENT_WRITER_GENERATION_2B_SERVICE_ACCOUNT = "myweb-class-mig-writer-g2@my-management-app-8a933.iam.gserviceaccount.com";
export const SERVICE_ACCOUNT_ID_MIN_LENGTH = 6;
export const SERVICE_ACCOUNT_ID_MAX_LENGTH = 30;

export function isProviderCompatibleServiceAccountId(accountId) {
  return typeof accountId === "string" && accountId.length >= SERVICE_ACCOUNT_ID_MIN_LENGTH && accountId.length <= SERVICE_ACCOUNT_ID_MAX_LENGTH && /^[a-z][a-z0-9-]*[a-z0-9]$/.test(accountId);
}

export const REPLACEMENT_WRITER_IDENTITY_REDESIGN_CONTRACT = Object.freeze({
  failedCandidateIsHistoricalOnly: true,
  failedCandidateRetryAllowed: false,
  replacementGeneration: "REPLACEMENT_WRITER_GENERATION_2B",
  candidateAvailabilityAsserted: false,
  candidateLength: REPLACEMENT_WRITER_GENERATION_2B_ACCOUNT_ID.length,
  nextRemoteOperation: "READ_ONLY_REPLACEMENT_WRITER_2B_PREFLIGHT",
  m3Allowed: false,
  m4Allowed: false,
  firestoreAllowed: false,
  tokenAllowed: false,
});
