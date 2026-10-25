import { jwtVerify, type JWTPayload } from "jose";
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

export async function verifyBearerToken(
  authorization: string | undefined,
): Promise<AuthUser> {
  if (!authorization?.startsWith("Bearer ")) {
    throw new Error("missing_bearer");
  }
  const token = authorization.slice("Bearer ".length).trim();
  const { payload } = await jwtVerify(token, getJwtSecret());
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
    reply.code(401).send({ error: "unauthorized" });
  }
}
