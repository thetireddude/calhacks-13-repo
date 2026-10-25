import type { FastifyInstance } from "fastify";
import type { CreateGroupRequest } from "@gather/contracts";
import { requireAuth } from "../auth.js";
import type { GroupsStore } from "./store.js";

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function inviteExpired(expiresAt: string | null): boolean {
  if (!expiresAt) {
    return false;
  }
  return Date.parse(expiresAt) <= Date.now();
}

export function registerGroupRoutes(
  app: FastifyInstance,
  store: GroupsStore,
): void {
  const memberOnly = async (
    request: { params: { groupId: string }; authUser?: { sub: string } },
    reply: { code: (n: number) => { send: (b: unknown) => unknown } },
  ) => {
    const userId = request.authUser!.sub;
    const groupId = request.params.groupId;
    if (!store.getGroup(groupId)) {
      return reply.code(404).send({ error: "not_found" });
    }
    if (!store.isMember(groupId, userId)) {
      return reply.code(403).send({ error: "forbidden" });
    }
  };

  app.post<{ Body: CreateGroupRequest }>(
    "/v1/groups",
    { preHandler: requireAuth },
    async (request, reply) => {
      const name = request.body?.name;
      if (!isNonEmptyString(name)) {
        return reply.code(400).send({ error: "invalid_name" });
      }
      const group = store.createGroup(name.trim(), request.authUser!.sub);
      return reply.code(201).send(group);
    },
  );

  app.get<{ Params: { groupId: string } }>(
    "/v1/groups/:groupId",
    { preHandler: [requireAuth, memberOnly] },
    async (request) => store.getGroup(request.params.groupId)!,
  );

  app.post<{ Params: { groupId: string } }>(
    "/v1/groups/:groupId/invites",
    { preHandler: [requireAuth, memberOnly] },
    async (request, reply) => {
      const invite = store.createInvite(
        request.params.groupId,
        request.authUser!.sub,
      );
      return reply.code(201).send(invite);
    },
  );

  app.post<{ Params: { token: string } }>(
    "/v1/invites/:token/join",
    { preHandler: requireAuth },
    async (request, reply) => {
      const invite = store.getInviteByToken(request.params.token);
      if (!invite || !store.getGroup(invite.groupId)) {
        return reply.code(404).send({ error: "not_found" });
      }
      if (inviteExpired(invite.expiresAt)) {
        return reply.code(410).send({ error: "invite_expired" });
      }
      const membership = store.joinGroup(
        invite.groupId,
        request.authUser!.sub,
      );
      return reply.code(200).send({
        groupId: invite.groupId,
        ...membership,
      });
    },
  );

  app.get<{ Params: { groupId: string } }>(
    "/v1/groups/:groupId/members",
    { preHandler: [requireAuth, memberOnly] },
    async (request) => ({
      members: store.listMembers(request.params.groupId),
    }),
  );
}
