import { VerifiedActorError } from "./authErrors.js";

export interface BearerTokenRequest {
  headers?: Readonly<Record<string, string | string[] | undefined>>;
  body?: unknown;
  query?: unknown;
  cookies?: unknown;
}

export function extractBearerToken(request: BearerTokenRequest, requestId: string): string {
  const authorization = request.headers?.authorization;
  if (typeof authorization === "undefined") {
    throw new VerifiedActorError("AUTH_HEADER_MISSING", requestId);
  }
  if (typeof authorization !== "string" || !authorization.trim()) {
    throw new VerifiedActorError("AUTH_HEADER_MALFORMED", requestId);
  }

  const match = /^Bearer[\t ]+([^\s,]+)$/i.exec(authorization.trim());
  if (!match?.[1]) {
    throw new VerifiedActorError("AUTH_HEADER_MALFORMED", requestId);
  }
  return match[1];
}
