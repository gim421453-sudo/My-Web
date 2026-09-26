import { randomUUID } from "node:crypto";
import { onRequest } from "firebase-functions/v2/https";
import type { Request, Response } from "express";
import {
  logSafeAuthFailure,
  normalizeVerifiedActorError,
  safeAuthErrorBody,
  type SafeAuthLogger,
} from "./authErrors.js";
import {
  verifyActorFromRequest,
  type VerifiedActor,
  type VerifiedActorOptions,
} from "./verifiedActor.js";

export type ActorVerifier = (
  request: Request,
  options: VerifiedActorOptions,
) => Promise<VerifiedActor>;

export function createVerifiedActorProbeHandler(
  options: VerifiedActorOptions = {},
  verifier: ActorVerifier = verifyActorFromRequest,
  logger: SafeAuthLogger = console.warn,
) {
  return async (request: Request, response: Response): Promise<void> => {
    if (request.method !== "POST") {
      response.status(405).json({ ok: false, code: "method-not-allowed" });
      return;
    }

    try {
      const actor = await verifier(request, options);
      response.status(200).json({
        ok: true,
        actorVerified: true,
        emailVerified: actor.auth.emailVerified,
        accountEnabled: true,
        mfaEvidence: actor.auth.mfaEvidence,
        emulator: true,
      });
    } catch (error) {
      const normalized = normalizeVerifiedActorError(error, randomUUID());
      logSafeAuthFailure(normalized, logger);
      response.status(normalized.httpStatus).json(safeAuthErrorBody(normalized));
    }
  };
}

export const trustedBackendActorProbe = onRequest(
  { cors: false },
  createVerifiedActorProbeHandler(),
);

export const trustedBackendVerifiedEmailProbe = onRequest(
  { cors: false },
  createVerifiedActorProbeHandler({ requireEmailVerified: true }),
);
