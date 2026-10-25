import {
  createRemoteJWKSet,
  decodeProtectedHeader,
  jwtVerify,
  type JWTPayload,
  type JWTVerifyGetKey,
} from "jose";
import type { FastifyReply, FastifyRequest } from "fastify";

export type AuthUser = { sub: string; payload: JWTPayload };

declare module "fastify" {
  interface FastifyRequest {
    authUser?: AuthUser;
  }
}

function getJwtSecret(): Uint8Array {
  const secret = process.env.SUPABASE_JWT_SECRET;
  if (!secret) {
    throw new Error("SUPABASE_JWT_SECRET is not configured");
  }
  return new TextEncoder().encode(secret);
}

function getJwtVerifyOptions(): { issuer?: string; audience?: string } {
  const options: { issuer?: string; audience?: string } = {};
  const issuer = process.env.SUPABASE_JWT_ISSUER?.trim();
  if (issuer) {
    options.issuer = issuer;
  }
  const audience = process.env.SUPABASE_JWT_AUDIENCE?.trim();
  if (audience) {
    options.audience = audience;
  }
  return options;
}

// Supabase projects with asymmetric signing keys issue ES256 tokens; verify those against the
// project's JWKS. HS256 tokens (legacy shared secret, local dev, tests) keep using the secret.
let jwksResolver: JWTVerifyGetKey | undefined;

function getJwks(): JWTVerifyGetKey | undefined {
  if (jwksResolver) {
    return jwksResolver;
  }
  const base = process.env.SUPABASE_URL?.trim().replace(/\/+$/, "");
  if (!base) {
    return undefined;
  }
  jwksResolver = createRemoteJWKSet(new URL(`${base}/auth/v1/.well-known/jwks.json`));
  return jwksResolver;
}

/** Test seam: inject a JWKS resolver instead of fetching the project's remote JWKS. */
export function setJwksResolverForTests(resolver: JWTVerifyGetKey | undefined): void {
  jwksResolver = resolver;
}

export async function verifyBearerToken(
  authorization: string | undefined,
): Promise<AuthUser> {
  if (!authorization?.startsWith("Bearer ")) {
    throw new Error("missing_bearer");
  }
  const token = authorization.slice("Bearer ".length).trim();
  const verifyOptions = getJwtVerifyOptions();
  const { alg } = decodeProtectedHeader(token);
  let payload: JWTPayload;
  if (alg === "HS256") {
    ({ payload } = await jwtVerify(token, getJwtSecret(), { ...verifyOptions, algorithms: ["HS256"] }));
  } else if (alg === "ES256" || alg === "RS256") {
    const jwks = getJwks();
    if (!jwks) {
      throw new Error("jwks_not_configured");
    }
    ({ payload } = await jwtVerify(token, jwks, { ...verifyOptions, algorithms: [alg] }));
  } else {
    throw new Error("unsupported_alg");
  }
  const sub = payload.sub;
  if (!sub || typeof sub !== "string") {
    throw new Error("invalid_sub");
  }
  return { sub, payload };
}

export async function requireAuth(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  try {
    request.authUser = await verifyBearerToken(request.headers.authorization);
  } catch {
    return reply.code(401).send({ error: "unauthorized" });
  }
}
