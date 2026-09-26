import { onRequest } from "firebase-functions/v2/https";
import type { Request, Response } from "express";
import {
  SECURITY_CONTRACT_VERSION,
  TRUSTED_BACKEND_VERSION,
  TrustedBackendGuardError,
} from "../runtime/emulatorGuard.js";
import { ensureTrustedAdminApp } from "../runtime/adminApp.js";

export function createTrustedBackendHealthHandler(
  initializeAdmin: typeof ensureTrustedAdminApp = ensureTrustedAdminApp,
) {
  return (request: Request, response: Response): void => {
    if (request.method !== "GET") {
      response.status(405).json({ ok: false, code: "method-not-allowed" });
      return;
    }

    try {
      const { context } = initializeAdmin();
      response.status(200).json({
        ok: true,
        mode: context.mode,
        demoProject: context.demoProject,
        backendVersion: TRUSTED_BACKEND_VERSION,
        securityContractVersion: SECURITY_CONTRACT_VERSION,
      });
    } catch (error) {
      console.warn(
        "[TB-01 health guard]",
        error instanceof TrustedBackendGuardError ? error.code : "TB_HEALTH_UNAVAILABLE",
      );
      response.status(503).json({
        ok: false,
        code: error instanceof TrustedBackendGuardError
          ? "trusted-backend-emulator-guard-denied"
          : "trusted-backend-health-unavailable",
        backendVersion: TRUSTED_BACKEND_VERSION,
        securityContractVersion: SECURITY_CONTRACT_VERSION,
      });
    }
  };
}

export const trustedBackendHealth = onRequest(
  { cors: false },
  createTrustedBackendHealthHandler(),
);
