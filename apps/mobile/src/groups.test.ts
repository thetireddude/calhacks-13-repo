import type {
  GroupInviteResponse,
  GroupMemberResponse,
  GroupResponse,
  JoinInviteResponse,
} from "@gather/contracts";

import {
  GroupError,
  MOCK_SEED_INVITE_TOKEN,
  MOCK_USER_ID,
  createMockGroupClient,
  inviteLink,
  parseInviteToken,
} from "./groups";

const KEYS = {
  group: ["id", "name", "createdBy", "createdAt"],
  invite: ["id", "groupId", "token", "expiresAt", "createdAt"],
  member: ["userId", "role", "joinedAt"],
  join: ["groupId", "userId", "role", "joinedAt"],
};
const keys = (o: object) => Object.keys(o).sort();
const sorted = (a: string[]) => [...a].sort();

test("createGroup returns a GroupResponse and the creator is a member", async () => {
  const c = createMockGroupClient();
  const g: GroupResponse = await c.createGroup({ name: "  Climbing  " });
  expect(g.name).toBe("Climbing");
  expect(g.createdBy).toBe(MOCK_USER_ID);
  expect(keys(g)).toEqual(sorted(KEYS.group));
  const members = await c.listMembers(g.id);
  expect(members.map((m) => m.userId)).toEqual([MOCK_USER_ID]);
});

test("blank group name is rejected", async () => {
  await expect(createMockGroupClient().createGroup({ name: "  " })).rejects.toMatchObject({ code: "invalid_name" });
});

test("createInvite returns a GroupInviteResponse that can be joined by another client view", async () => {
  const c = createMockGroupClient();
  const g = await c.createGroup({ name: "A" });
  const inv: GroupInviteResponse = await c.createInvite(g.id);
  expect(inv.groupId).toBe(g.id);
  expect(keys(inv)).toEqual(sorted(KEYS.invite));
  await expect(c.createInvite("nope")).rejects.toBeInstanceOf(GroupError);
});

test("joinInvite adds the user once and is idempotent; unknown token fails", async () => {
  const c = createMockGroupClient();
  const j: JoinInviteResponse = await c.joinInvite(MOCK_SEED_INVITE_TOKEN);
  expect(j.groupId).toBe("group-seed");
  expect(keys(j)).toEqual(sorted(KEYS.join));
  await c.joinInvite(MOCK_SEED_INVITE_TOKEN);
  const members: GroupMemberResponse[] = await c.listMembers("group-seed");
  expect(members.map((m) => m.userId)).toEqual(["user-seed", MOCK_USER_ID]);
  members.forEach((m) => expect(keys(m)).toEqual(sorted(KEYS.member)));
  await expect(c.joinInvite("bogus")).rejects.toMatchObject({ code: "invalid_invite" });
});

test("multiple groups can coexist", async () => {
  const c = createMockGroupClient();
  const a = await c.createGroup({ name: "A" });
  const b = await c.createGroup({ name: "B" });
  expect(a.id).not.toBe(b.id);
  expect((await c.getGroup(a.id)).name).toBe("A");
  expect((await c.getGroup(b.id)).name).toBe("B");
});

test("invite links round-trip and only token links parse", () => {
  expect(parseInviteToken(inviteLink("abc-1"))).toBe("abc-1");
  expect(parseInviteToken("https://example.com/invite/abc")).toBeNull();
  expect(parseInviteToken("gather://invite/")).toBeNull();
  expect(parseInviteToken("gather://other/abc")).toBeNull();
  expect(parseInviteToken("gather://invite/%E0%A4%A")).toBeNull();
});

test("privacy: fixtures contain no availability or preference fields", async () => {
  const c = createMockGroupClient();
  const g = await c.createGroup({ name: "A" });
  await c.joinInvite(MOCK_SEED_INVITE_TOKEN);
  const dump = JSON.stringify([
    g,
    await c.createInvite(g.id),
    await c.listMembers(g.id),
    await c.listMembers("group-seed"),
    await c.getGroup("group-seed"),
  ]);
  expect(dump).not.toMatch(/availab|preference|schedule|budget|calendar|email/i);
});
