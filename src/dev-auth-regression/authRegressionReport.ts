import {
  compareAuthFixtures,
  type AuthComparisonResult,
} from "../auth/sessionComparison";
import { authRegressionFixtures } from "./authRegressionFixtures";

export function runAuthRegressionComparison(): AuthComparisonResult[] {
  return compareAuthFixtures(authRegressionFixtures);
}

export function summarizeAuthRegressionComparison(
  results: readonly AuthComparisonResult[] = runAuthRegressionComparison(),
): {
  total: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
} {
  const severities = results.flatMap((result) => result.mismatches.map((mismatch) => mismatch.severity));
  return {
    total: results.length,
    critical: severities.filter((severity) => severity === "CRITICAL").length,
    high: severities.filter((severity) => severity === "HIGH").length,
    medium: severities.filter((severity) => severity === "MEDIUM").length,
    low: severities.filter((severity) => severity === "LOW").length,
  };
}
