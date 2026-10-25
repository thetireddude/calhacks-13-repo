import type { FastifyInstance } from "fastify";
import { requireAuth } from "../auth.js";
import type { GroupsStore } from "../groups/store.js";
import type { PlanningStore } from "../planning/store.js";
import type { VotingStore } from "../voting/store.js";

export type EventConfirmedNotification = {
  type: "event_confirmed";
  groupId: string;
  eventId: string;
  summary: string;
  createdAt: string;
};

export function registerNotificationRoutes(
  app: FastifyInstance,
  groupsStore: GroupsStore,
  _planningStore: PlanningStore,
  votingStore: VotingStore,
): void {
  app.get(
    "/v1/me/notifications",
    { preHandler: requireAuth },
    async (request) => {
      const groups = await groupsStore.listGroupsForUser(request.authUser!.sub);
      const notifications: EventConfirmedNotification[] = [];
      for (const group of groups) {
        const event = await votingStore.getConfirmedEvent(group.id);
        if (!event) {
          continue;
        }
        notifications.push({
          type: "event_confirmed",
          groupId: event.groupId,
          eventId: event.id,
          summary: event.summary,
          createdAt: event.confirmedAt,
        });
      }
      return { notifications };
    },
  );
}
