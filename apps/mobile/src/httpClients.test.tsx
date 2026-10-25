import type {
  CreateGroupRequest,
  GroupInviteResponse,
  GroupMemberResponse,
  GroupResponse,
  JoinInviteResponse,
  MemberAvailabilityResponse,
  MemberPreferencesResponse,
  PutMemberPreferencesRequest,
} from "@gather/contracts";
import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { Text } from "react-native";

import { createApiClient } from "./apiClient";
import { AuthProvider, createMockAuthClient } from "./auth";
import { RootNavigator } from "./RootNavigator";
import { GroupError, createMockGroupClient } from "./groups";
import { GroupsProvider, useGroups } from "./groupsState";
import { createHttpGroupClient, createHttpMemberSetupClient } from "./httpClients";
import { MemberSetupError } from "./memberSetup";

const TOKEN = "secret-token-xyz";
const group: GroupResponse = { id: "g1", name: "Climbing", createdBy: "u1", createdAt: "2026-01-01T00:00:00.000Z" };
const invite: GroupInviteResponse = { id: "i1", groupId: "g1", token: "tok/1", expiresAt: null, createdAt: "2026-01-01T00:00:00.000Z" };
const member: GroupMemberResponse = { userId: "u1", role: "owner", joinedAt: "2026-01-01T00:00:00.000Z" };
const joined: JoinInviteResponse = { groupId: "g1", userId: "u2", role: "member", joinedAt: "2026-01-02T00:00:00.000Z" };
const prefs: MemberPreferencesResponse = {
  activityTags: ["hike"],
  budgetMin: 0,
  budgetMax: 40,
  travelRadiusKm: null,
  learningOptIn: false,
};
const avail: MemberAvailabilityResponse = {
  windows: [{ startsAt: "2026-01-02T18:00:00Z", endsAt: "2026-01-02T20:00:00Z", label: null }],
};

function setup(status: number | "throw", body: unknown = {}) {
  const fetchImpl = jest.fn(async () => {
    if (status === "throw") throw new Error(`boom ${TOKEN}`);
    return { ok: status >= 200 && status < 300, status, json: async () => body } as Response;
  });
  const api = createApiClient({
    baseUrl: "https://api.test/",
    getAccessToken: async () => TOKEN,
    fetchImpl: fetchImpl as unknown as typeof fetch,
  });
  return { fetchImpl, groups: createHttpGroupClient(api), me: createHttpMemberSetupClient(api) };
}
function lastCall(f: jest.Mock) {
  const [url, init] = f.mock.calls[f.mock.calls.length - 1] as unknown as [string, RequestInit];
  return { url, init, headers: init.headers as Record<string, string> };
}

describe("group client requests and parsing", () => {
  test("createGroup POSTs name with bearer auth and returns the group", async () => {
    const { fetchImpl, groups } = setup(201, group);
    const req: CreateGroupRequest = { name: "Climbing" };
    expect(await groups.createGroup(req)).toEqual(group);
    const c = lastCall(fetchImpl);
    expect(c.url).toBe("https://api.test/v1/groups");
    expect(c.init.method).toBe("POST");
    expect(c.init.body).toBe(JSON.stringify(req));
    expect(c.headers.Authorization).toBe(`Bearer ${TOKEN}`);
  });
  test("listGroups unwraps { groups }", async () => {
    const { fetchImpl, groups } = setup(200, { groups: [group] });
    expect(await groups.listGroups!()).toEqual([group]);
    expect(lastCall(fetchImpl).url).toBe("https://api.test/v1/groups");
    expect(lastCall(fetchImpl).init.method).toBe("GET");
  });
  test("getGroup, createInvite, joinInvite (token encoded), listMembers (unwraps { members })", async () => {
    let s = setup(200, group);
    expect(await s.groups.getGroup("g1")).toEqual(group);
    expect(lastCall(s.fetchImpl).url).toBe("https://api.test/v1/groups/g1");

    s = setup(201, invite);
    expect(await s.groups.createInvite("g1")).toEqual(invite);
    expect(lastCall(s.fetchImpl).url).toBe("https://api.test/v1/groups/g1/invites");
    expect(lastCall(s.fetchImpl).init.method).toBe("POST");

    s = setup(200, joined);
    expect(await s.groups.joinInvite(" tok/1 ")).toEqual(joined);
    expect(lastCall(s.fetchImpl).url).toBe("https://api.test/v1/invites/tok%2F1/join");
    expect(lastCall(s.fetchImpl).init.method).toBe("POST");

    s = setup(200, { members: [member] });
    expect(await s.groups.listMembers("g1")).toEqual([member]);
    expect(lastCall(s.fetchImpl).url).toBe("https://api.test/v1/groups/g1/members");
  });
});

describe("group error mapping", () => {
  const cases: [string, (c: ReturnType<typeof setup>["groups"]) => Promise<unknown>, number | "throw", string][] = [
    ["create 400", (c) => c.createGroup({ name: " " }), 400, "invalid_name"],
    ["join 404", (c) => c.joinInvite("t"), 404, "invalid_invite"],
    ["join 410", (c) => c.joinInvite("t"), 410, "invalid_invite"],
    ["get 404", (c) => c.getGroup("g"), 404, "not_found"],
    ["get 403", (c) => c.getGroup("g"), 403, "forbidden"],
    ["members 401", (c) => c.listMembers("g"), 401, "unauthenticated"],
    ["invite 409", (c) => c.createInvite("g"), 409, "server"],
    ["list 500", (c) => c.listGroups!(), 500, "server"],
    ["create network", (c) => c.createGroup({ name: "x" }), "throw", "network"],
  ];
  test.each(cases)("%s", async (_n, call, status, code) => {
    const { groups } = setup(status);
    const err = (await call(groups).catch((e: unknown) => e)) as GroupError;
    expect(err).toBeInstanceOf(GroupError);
    expect(err.code).toBe(code);
    expect(err.message).not.toContain(TOKEN);
  });
  test("non-idempotent POST is attempted exactly once on failure", async () => {
    const { fetchImpl, groups } = setup(500);
    await groups.createGroup({ name: "x" }).catch(() => {});
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });
});

describe("member setup client", () => {
  test("preferences GET/PUT round-trip including learning opt-out", async () => {
    let s = setup(200, prefs);
    expect(await s.me.getPreferences()).toEqual(prefs);
    expect(lastCall(s.fetchImpl).url).toBe("https://api.test/v1/me/preferences");
    expect(lastCall(s.fetchImpl).headers.Authorization).toBe(`Bearer ${TOKEN}`);

    const req: PutMemberPreferencesRequest = { ...prefs, learningOptIn: false };
    s = setup(200, req);
    expect(await s.me.putPreferences(req)).toEqual(req);
    const c = lastCall(s.fetchImpl);
    expect(c.init.method).toBe("PUT");
    expect(JSON.parse(c.init.body as string)).toEqual(req);
    expect(JSON.parse(c.init.body as string).learningOptIn).toBe(false);
  });
  test("availability GET/PUT", async () => {
    let s = setup(200, avail);
    expect(await s.me.getAvailability()).toEqual(avail);
    expect(lastCall(s.fetchImpl).url).toBe("https://api.test/v1/me/availability");
    s = setup(200, avail);
    expect(await s.me.putAvailability(avail)).toEqual(avail);
    expect(lastCall(s.fetchImpl).init.method).toBe("PUT");
    expect(JSON.parse(lastCall(s.fetchImpl).init.body as string)).toEqual(avail);
  });
  test.each([
    [400, "invalid"],
    [401, "unauthenticated"],
    [500, "server"],
    ["throw", "network"],
  ] as const)("status %s maps to %s without leaking the token", async (status, code) => {
    const { me } = setup(status);
    const err = await me.putPreferences(prefs).catch((e) => e);
    expect(err).toBeInstanceOf(MemberSetupError);
    expect(err.code).toBe(code);
    expect(err.message).not.toContain(TOKEN);
  });
});

describe("GroupsProvider wiring", () => {
  function List() {
    const { groups } = useGroups();
    return <Text>{groups.map((g) => g.name).join(",") || "none"}</Text>;
  }
  test("loads groups from the backend client on mount", async () => {
    const { groups } = setup(200, { groups: [group] });
    render(
      <GroupsProvider client={groups}>
        <List />
      </GroupsProvider>,
    );
    await waitFor(() => expect(screen.getByText("Climbing")).toBeTruthy());
  });
  test("the mock client (no listGroups) starts empty with no load error", () => {
    expect(createMockGroupClient().listGroups).toBeUndefined();
  });
});

describe("GroupsProvider load errors", () => {
  function Probe() {
    const { groups, loadError, reloadGroups, createGroup } = useGroups();
    return (
      <>
        <Text>{groups.map((g) => g.name).join(",") || "none"}</Text>
        {loadError ? <Text>{`error:${loadError.code}`}</Text> : null}
        <Text onPress={reloadGroups}>reload</Text>
        <Text onPress={() => void createGroup("Mid")}>create</Text>
      </>
    );
  }
  function flaky(failWith: GroupError, list: GroupResponse[]) {
    let fail = true;
    const base = createMockGroupClient();
    const client = {
      ...base,
      listGroups: jest.fn(async () => {
        if (fail) throw failWith;
        return list;
      }),
      createGroup: jest.fn(async () => ({ ...group, id: "mid", name: "Mid" })),
    };
    return { client, heal: () => (fail = false) };
  }
  test("a failed load surfaces the error code and Retry recovers the list", async () => {
    const { client, heal } = flaky(new GroupError("network"), [group]);
    render(
      <GroupsProvider client={client}>
        <Probe />
      </GroupsProvider>,
    );
    await waitFor(() => expect(screen.getByText("error:network")).toBeTruthy());
    heal();
    fireEvent.press(screen.getByText("reload"));
    await waitFor(() => expect(screen.getByText("Climbing")).toBeTruthy());
    expect(screen.queryByText("error:network")).toBeNull();
  });
  test("groups created before a retry survive it, deduped by id", async () => {
    const { client, heal } = flaky(new GroupError("server"), [group, { ...group, id: "mid", name: "Mid" }]);
    render(
      <GroupsProvider client={client}>
        <Probe />
      </GroupsProvider>,
    );
    await waitFor(() => expect(screen.getByText("error:server")).toBeTruthy());
    fireEvent.press(screen.getByText("create"));
    await waitFor(() => expect(screen.getByText("Mid")).toBeTruthy());
    heal();
    fireEvent.press(screen.getByText("reload"));
    await waitFor(() => expect(screen.getByText("Climbing,Mid")).toBeTruthy());
  });
  test("a 401 load failure shows the session-expired message on the groups list", async () => {
    const { groups } = setup(401);
    const auth = createMockAuthClient();
    await auth.signIn("a@example.com", "secret1");
    await render(
      <AuthProvider client={auth}>
        <RootNavigator groupClient={groups} />
      </AuthProvider>,
    );
    expect(await screen.findByText("Your session has expired. Please sign out and sign in again.")).toBeTruthy();
    expect(screen.getByText("Retry")).toBeTruthy();
  });
});
