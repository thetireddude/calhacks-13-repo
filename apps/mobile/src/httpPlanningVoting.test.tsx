import type {
  ConfirmedEventResponse,
  PlanningRunProposalsResponse,
  PlanningRunResponse,
  ProposalVetoResponse,
  ProposalVoteResponse,
} from "@gather/contracts";
import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { Linking, Share } from "react-native";

import { createApiClient } from "./apiClient";
import { AuthProvider, createMockAuthClient } from "./auth";
import { createMockGroupClient } from "./groups";
import {
  createHttpIcsClient,
  createHttpPlanningClient,
  createHttpScheduleClient,
  createHttpVotingClient,
} from "./httpClients";
import { MemberSetupError } from "./memberSetup";
import { PlanningError, createMockPlanningClient } from "./planning";
import type { PlanningClient } from "./planning";
import { POLL_INTERVAL_MS } from "./planningScreens";
import { RootNavigator } from "./RootNavigator";
import { VotingError, createMockVotingClient } from "./voting";
import type { IcsClient } from "./voting";

const TOKEN = "secret-token-xyz";
const run: PlanningRunResponse = {
  id: "r1",
  groupId: "g1",
  status: "completed",
  initiatedBy: "u1",
  activityRequest: "hike",
  createdAt: "2026-01-01T00:00:00.000Z",
};
const proposals: PlanningRunProposalsResponse = {
  proposals: [{ proposalId: "p1", rank: 1, summary: "Hike", explanation: "Fits the group" }],
};
const vote: ProposalVoteResponse = { proposalId: "p1", userId: "u1", choice: "approve", updatedAt: "2026-01-01T00:00:00.000Z" };
const veto: ProposalVetoResponse = { proposalId: "p1", userId: "u1", vetoed: true, createdAt: "2026-01-01T00:00:00.000Z" };
const event: ConfirmedEventResponse = {
  id: "e1",
  groupId: "g1",
  proposalId: "p1",
  planningRunId: "r1",
  summary: "Hike",
  confirmedAt: "2026-01-02T00:00:00.000Z",
};

function setupApi(status: number | "throw", body: unknown = {}) {
  const fetchImpl = jest.fn(async () => {
    if (status === "throw") throw new Error(`boom ${TOKEN}`);
    return { ok: status >= 200 && status < 300, status, json: async () => body } as Response;
  });
  const api = createApiClient({
    baseUrl: "https://api.test/",
    getAccessToken: async () => TOKEN,
    fetchImpl: fetchImpl as unknown as typeof fetch,
  });
  return { fetchImpl, api };
}
function setup(status: number | "throw", body: unknown = {}) {
  const { fetchImpl, api } = setupApi(status, body);
  return {
    fetchImpl,
    planning: createHttpPlanningClient(api),
    voting: createHttpVotingClient(api),
  };
}
function lastCall(f: jest.Mock) {
  const [url, init] = f.mock.calls[f.mock.calls.length - 1] as unknown as [string, RequestInit];
  return { url, init, headers: init.headers as Record<string, string> };
}

describe("http planning client", () => {
  test("createRun POSTs the request with bearer auth", async () => {
    const { fetchImpl, planning } = setup(201, run);
    expect(await planning.createRun("g/1", { activityRequest: "hike" })).toEqual(run);
    const c = lastCall(fetchImpl);
    expect(c.url).toBe("https://api.test/v1/groups/g%2F1/planning-runs");
    expect(c.init.method).toBe("POST");
    expect(c.init.body).toBe(JSON.stringify({ activityRequest: "hike" }));
    expect(c.headers.Authorization).toBe(`Bearer ${TOKEN}`);
  });
  test("getRun and getProposals use GET on the run routes", async () => {
    const a = setup(200, run);
    expect(await a.planning.getRun("r1")).toEqual(run);
    expect(lastCall(a.fetchImpl).url).toBe("https://api.test/v1/planning-runs/r1");
    expect(lastCall(a.fetchImpl).init.method).toBe("GET");
    const b = setup(200, proposals);
    expect(await b.planning.getProposals("r1")).toEqual(proposals);
    expect(lastCall(b.fetchImpl).url).toBe("https://api.test/v1/planning-runs/r1/proposals");
  });
  test("retryRun POSTs /generate", async () => {
    const { fetchImpl, planning } = setup(200, run);
    await planning.retryRun!("r1");
    expect(lastCall(fetchImpl).url).toBe("https://api.test/v1/planning-runs/r1/generate");
    expect(lastCall(fetchImpl).init.method).toBe("POST");
  });
  test.each([
    [400, "invalid"],
    [401, "unauthenticated"],
    [403, "forbidden"],
    [404, "not_found"],
    [409, "conflict"],
    [500, "server"],
    ["throw", "network"],
  ] as const)("status %s maps to %s, once, without leaking the token", async (status, code) => {
    const { fetchImpl, planning } = setup(status);
    const err = await planning.createRun("g1", {}).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(PlanningError);
    expect((err as PlanningError).code).toBe(code);
    expect(JSON.stringify(err) + String((err as Error).message)).not.toContain(TOKEN);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });
});

describe("http voting client", () => {
  test("putVote is a PUT with the choice body", async () => {
    const { fetchImpl, voting } = setup(200, vote);
    expect(await voting.putVote("p1", { choice: "approve" })).toEqual(vote);
    const c = lastCall(fetchImpl);
    expect(c.url).toBe("https://api.test/v1/proposals/p1/vote");
    expect(c.init.method).toBe("PUT");
    expect(c.init.body).toBe(JSON.stringify({ choice: "approve" }));
    expect(c.headers.Authorization).toBe(`Bearer ${TOKEN}`);
  });
  test("veto is a separate POST route with no body", async () => {
    const { fetchImpl, voting } = setup(200, veto);
    expect(await voting.veto("p1")).toEqual(veto);
    const c = lastCall(fetchImpl);
    expect(c.url).toBe("https://api.test/v1/proposals/p1/veto");
    expect(c.init.method).toBe("POST");
    expect(c.init.body).toBeUndefined();
  });
  test("getConfirmedEvent returns the event; 404 means no event yet", async () => {
    const a = setup(200, event);
    expect(await a.voting.getConfirmedEvent("g1")).toEqual({ status: "confirmed", event });
    expect(lastCall(a.fetchImpl).url).toBe("https://api.test/v1/groups/g1/confirmed-event");
    const b = setup(404);
    expect(await b.voting.getConfirmedEvent("g1")).toEqual({ status: "none" });
  });
  test("getConfirmedEvent surfaces other failures as errors", async () => {
    const err = await setup(403).voting.getConfirmedEvent("g1").catch((e: unknown) => e);
    expect((err as VotingError).code).toBe("forbidden");
    expect(((await setup(401).voting.getConfirmedEvent("g1").catch((e: unknown) => e)) as VotingError).code).toBe(
      "unauthenticated",
    );
  });
  test.each([
    [400, "invalid"],
    [401, "unauthenticated"],
    [403, "forbidden"],
    [404, "not_found"],
    [500, "server"],
    ["throw", "network"],
  ] as const)("failed vote with status %s maps to %s and is attempted once", async (status, code) => {
    const { fetchImpl, voting } = setup(status);
    const err = await voting.putVote("p1", { choice: "approve" }).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(VotingError);
    expect((err as VotingError).code).toBe(code);
    expect(String((err as Error).message)).not.toContain(TOKEN);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });
  test("getVoteState has no invented tallies and only remembers the caller's own acknowledged actions", async () => {
    const { voting } = setup(200, vote);
    const before = await voting.getVoteState("p1");
    expect(before.approveCount).toBeUndefined();
    expect(before.cantMakeItCount).toBeUndefined();
    expect(before.deadline).toBeUndefined();
    expect(before.myChoice).toBeUndefined();
    await voting.putVote("p1", { choice: "approve" });
    expect((await voting.getVoteState("p1")).myChoice).toBe("approve");
  });
  test("a failed vote does not change the remembered state", async () => {
    const { voting } = setup(500);
    await voting.putVote("p1", { choice: "approve" }).catch(() => {});
    expect((await voting.getVoteState("p1")).myChoice).toBeUndefined();
  });
  test("listNotifications GETs /v1/me/notifications and maps only what the API returns", async () => {
    const { voting, fetchImpl } = setup(200, {
      notifications: [
        { type: "event_confirmed", groupId: "g1", eventId: "e1", summary: "Hike", createdAt: "2026-01-02T00:00:00.000Z" },
        { type: "something_new", groupId: "g1", eventId: "e2", summary: "Other", createdAt: "2026-01-03T00:00:00.000Z" },
      ],
    });
    const list = await voting.listNotifications();
    expect(list).toEqual([
      { id: "event_confirmed:e1", title: "Event confirmed", body: "Hike", createdAt: "2026-01-02T00:00:00.000Z" },
    ]);
    const c = lastCall(fetchImpl);
    expect(c.url).toBe("https://api.test/v1/me/notifications");
    expect(c.init.method).toBe("GET");
    expect(c.headers.Authorization).toBe(`Bearer ${TOKEN}`);
    expect(await setup(200, { notifications: [] }).voting.listNotifications()).toEqual([]);
  });
  test.each([
    [0, "network"],
    [401, "unauthenticated"],
    [500, "server"],
  ])("listNotifications status %s maps to %s without leaking the token", async (status, code) => {
    const { voting } = setup(status);
    const err = await voting.listNotifications().catch((e: unknown) => e);
    expect(err).toBeInstanceOf(VotingError);
    expect((err as VotingError).code).toBe(code);
    expect(JSON.stringify(err) + (err as Error).message).not.toContain(TOKEN);
  });
});

describe("http schedule client", () => {
  const schedule = { timezone: "America/Los_Angeles", weeklyEnabled: true };
  test("get and put use the schedule route with bearer auth", async () => {
    const a = createHttpScheduleClient(setupApi(200, schedule).api);
    expect(await a.get("g/1")).toEqual(schedule);
    const f = setupApi(200, schedule);
    await createHttpScheduleClient(f.api).put("g1", schedule);
    const c = lastCall(f.fetchImpl);
    expect(c.url).toBe("https://api.test/v1/groups/g1/schedule");
    expect(c.init.method).toBe("PUT");
    expect(c.init.body).toBe(JSON.stringify(schedule));
    expect(c.headers.Authorization).toBe(`Bearer ${TOKEN}`);
    const g = setupApi(200, schedule);
    await createHttpScheduleClient(g.api).get("g/1");
    expect(lastCall(g.fetchImpl).url).toBe("https://api.test/v1/groups/g%2F1/schedule");
    expect(lastCall(g.fetchImpl).init.method).toBe("GET");
  });
  test.each([
    [0, "network"],
    [400, "invalid"],
    [401, "unauthenticated"],
    [403, "server"],
    [500, "server"],
  ])("status %s maps to %s, PUT is attempted once, no token leak", async (status, code) => {
    const f = setupApi(status);
    const err = await createHttpScheduleClient(f.api).put("g1", schedule).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(MemberSetupError);
    expect((err as MemberSetupError).code).toBe(code);
    expect(f.fetchImpl).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(err) + (err as Error).message).not.toContain(TOKEN);
  });
});

describe("http ics client", () => {
  const ics = "BEGIN:VCALENDAR\r\nEND:VCALENDAR\r\n";
  function icsSetup(status: number | "throw") {
    const fetchImpl = jest.fn(async () => {
      if (status === "throw") throw new Error(`boom ${TOKEN}`);
      return { ok: status >= 200 && status < 300, status, text: async () => ics } as Response;
    });
    const api = createApiClient({
      baseUrl: "https://api.test/",
      getAccessToken: async () => TOKEN,
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    return { fetchImpl, client: createHttpIcsClient(api) };
  }
  test("exportIcs GETs the calendar route with bearer auth and returns the text", async () => {
    const { fetchImpl, client } = icsSetup(200);
    expect(await client.exportIcs("e/1")).toEqual({ filename: "event-e/1.ics", content: ics });
    const c = lastCall(fetchImpl);
    expect(c.url).toBe("https://api.test/v1/events/e%2F1/calendar.ics");
    expect(c.init.method).toBe("GET");
    expect(c.headers.Authorization).toBe(`Bearer ${TOKEN}`);
    expect(c.headers.Accept).toBe("text/calendar");
  });
  test.each([
    ["throw", "network"],
    [401, "unauthenticated"],
    [403, "forbidden"],
    [404, "not_found"],
    [500, "server"],
  ] as const)("status %s maps to %s without leaking the token", async (status, code) => {
    const { client } = icsSetup(status);
    const err = await client.exportIcs("e1").catch((e: unknown) => e);
    expect(err).toBeInstanceOf(VotingError);
    expect((err as VotingError).code).toBe(code);
    expect(JSON.stringify(err) + (err as Error).message).not.toContain(TOKEN);
  });

});

describe("screens with real clients and polling", () => {
  beforeEach(() => {
    jest.spyOn(Linking, "getInitialURL").mockResolvedValue(null);
    jest.spyOn(Linking, "addEventListener").mockReturnValue({ remove: () => {} });
  });
  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  async function open(planningClient: PlanningClient, votingClient = createMockVotingClient(), icsClient?: IcsClient) {
    const auth = createMockAuthClient();
    await auth.signIn("a@example.com", "secret1");
    const view = await render(
      <AuthProvider client={auth}>
        <RootNavigator groupClient={createMockGroupClient()} planningClient={planningClient} votingClient={votingClient} icsClient={icsClient} />
      </AuthProvider>,
    );
    await screen.findByText("Your groups");
    await fireEvent.press(screen.getByText("Create group"));
    await fireEvent.changeText(await screen.findByLabelText("Group name"), "Climbing");
    await fireEvent.press(screen.getByText("Create"));
    await fireEvent.press(await screen.findByText("Open planning"));
    await screen.findByText("Plan an activity");
    return view;
  }

  function pendingClient(statuses: string[]) {
    const base = createMockPlanningClient("pending");
    const getRun = jest.fn(async (runId: string) => {
      const r = await base.getRun(runId);
      return { ...r, status: (statuses.length > 1 ? statuses.shift() : statuses[0]) ?? "pending" };
    });
    const getProposals = jest.fn(base.getProposals);
    return { client: { ...base, getRun, getProposals } as PlanningClient, getRun, getProposals };
  }

  test("polls while pending and stops once completed", async () => {
    const { client, getRun } = pendingClient(["pending", "pending", "completed", "completed"]);
    await open(client);
    jest.useFakeTimers();
    await fireEvent.press(screen.getByText("Start planning"));
    await screen.findByText("Planning is in progress.");
    const afterStart = getRun.mock.calls.length;
    await act(async () => {
      await jest.advanceTimersByTimeAsync(POLL_INTERVAL_MS);
    });
    expect(getRun.mock.calls.length).toBeGreaterThan(afterStart);
    await act(async () => {
      await jest.advanceTimersByTimeAsync(POLL_INTERVAL_MS * 3);
    });
    await screen.findByText("Loading proposals.", {}, { timeout: 100 }).catch(() => {});
    const settled = getRun.mock.calls.length;
    await act(async () => {
      await jest.advanceTimersByTimeAsync(POLL_INTERVAL_MS * 5);
    });
    expect(getRun.mock.calls.length).toBe(settled);
  });

  test("stops polling when the run fails", async () => {
    const { client, getRun } = pendingClient(["pending", "failed"]);
    await open(client);
    jest.useFakeTimers();
    await fireEvent.press(screen.getByText("Start planning"));
    await screen.findByText("Planning is in progress.");
    await act(async () => {
      await jest.advanceTimersByTimeAsync(POLL_INTERVAL_MS);
    });
    expect(screen.getByText("Planning did not finish. You can try again.")).toBeTruthy();
    const n = getRun.mock.calls.length;
    await act(async () => {
      await jest.advanceTimersByTimeAsync(POLL_INTERVAL_MS * 5);
    });
    expect(getRun.mock.calls.length).toBe(n);
  });

  test("retry uses retryRun in place when the client supports it", async () => {
    const base = createMockPlanningClient("failed");
    const retryRun = jest.fn(async (runId: string) => ({ ...(await base.getRun(runId)), status: "completed" }));
    const getProposals = jest.fn(async () => proposals);
    const getRun = jest.fn(async (runId: string) => ({
      ...(await base.getRun(runId)),
      status: retryRun.mock.calls.length > 0 ? "completed" : "failed",
    }));
    await open({ ...base, retryRun, getRun, getProposals });
    await fireEvent.press(screen.getByText("Start planning"));
    await fireEvent.press(await screen.findByText("Try again"));
    await screen.findByText("#1 Hike");
    expect(retryRun).toHaveBeenCalledWith("run-1");
  });

  test("double press on Try again issues one retry call", async () => {
    const base = createMockPlanningClient("failed");
    let release: (r: PlanningRunResponse) => void = () => {};
    const retryRun = jest.fn(() => new Promise<PlanningRunResponse>((r) => (release = r)));
    await open({ ...base, retryRun });
    await fireEvent.press(screen.getByText("Start planning"));
    const again = await screen.findByText("Try again");
    await fireEvent.press(again);
    await fireEvent.press(again);
    expect(retryRun).toHaveBeenCalledTimes(1);
    await act(async () => release({ ...(await base.getRun("run-1")), status: "failed" }));
  });

  test("real mode renders backend notifications as returned", async () => {
    const { voting } = setup(200, {
      notifications: [
        { type: "event_confirmed", groupId: "g1", eventId: "e1", summary: "Saturday hike", createdAt: "2026-01-02T00:00:00.000Z" },
      ],
    });
    await open(createMockPlanningClient("three"), voting);
    await fireEvent.press(screen.getByLabelText(/^Notifications, tab/));
    expect(await screen.findByText("Event confirmed")).toBeTruthy();
    expect(screen.getByText("Saturday hike")).toBeTruthy();
    expect(screen.queryByText(/not available yet/)).toBeNull();
  });

  test("real mode with an empty feed shows the normal empty state", async () => {
    await open(createMockPlanningClient("three"), setup(200, { notifications: [] }).voting);
    await fireEvent.press(screen.getByLabelText(/^Notifications, tab/));
    expect(await screen.findByText("No notifications yet.")).toBeTruthy();
    expect(screen.queryByText(/not available yet/)).toBeNull();
  });

  test("real mode ICS button calls the client, then the OS share sheet", async () => {
    const share = jest.spyOn(Share, "share").mockResolvedValue({ action: "sharedAction", activityType: undefined });
    const { voting } = setup(200, event);
    const exportIcs = jest.fn(async (id: string) => ({ filename: `event-${id}.ics`, content: "BEGIN:VCALENDAR" }));
    await open(createMockPlanningClient("three"), voting, { exportIcs });
    await fireEvent.press(screen.getByLabelText(/^Events, tab/));
    await fireEvent.press(await screen.findByText("Add to calendar (.ics)"));
    await screen.findByText("Choose where to save the calendar file.");
    expect(exportIcs).toHaveBeenCalledWith("e1");
    expect(share).toHaveBeenCalledWith({ message: "BEGIN:VCALENDAR", title: "event-e1.ics" });
    expect(screen.queryByText(/not connected yet/)).toBeNull();
  });

  test("real mode ICS failure shows an error and does not open the share sheet", async () => {
    const share = jest.spyOn(Share, "share").mockResolvedValue({ action: "sharedAction", activityType: undefined });
    const { voting } = setup(200, event);
    await open(createMockPlanningClient("three"), voting, {
      exportIcs: async () => {
        throw new VotingError("forbidden");
      },
    });
    await fireEvent.press(screen.getByLabelText(/^Events, tab/));
    await fireEvent.press(await screen.findByText("Add to calendar (.ics)"));
    await screen.findByRole("alert");
    expect(share).not.toHaveBeenCalled();
  });

  test("a 401 on planning shows session-expired messaging", async () => {
    const base = createMockPlanningClient("three");
    await open({ ...base, createRun: async () => { throw new PlanningError("unauthenticated"); } });
    await fireEvent.press(screen.getByText("Start planning"));
    expect(await screen.findByText("Your session has expired. Please sign out and sign in again.")).toBeTruthy();
  });

  test("real-shaped vote state hides tallies and shows own vote after voting", async () => {
    const { voting } = setup(200, vote);
    await open(createMockPlanningClient("three"), voting);
    await fireEvent.press(screen.getByText("Start planning"));
    await screen.findByText("#1 Option 1: Saturday hike");
    expect(screen.queryByText(/Yes: /)).toBeNull();
    expect(screen.getAllByText("Vote counts are not available yet.").length).toBeGreaterThan(0);
    await fireEvent.press((await screen.findAllByText("Yes"))[0]!);
    await screen.findByText("Your vote: Yes");
  });

  // Last on purpose: unmounting the whole navigation tree leaves state that breaks later renders.
  test("stops polling on unmount", async () => {
    const { client, getRun } = pendingClient([]);
    const view = await open(client);
    jest.useFakeTimers();
    await fireEvent.press(screen.getByText("Start planning"));
    await screen.findByText("Planning is in progress.");
    view.unmount();
    const n = getRun.mock.calls.length;
    await act(async () => {
      await jest.advanceTimersByTimeAsync(POLL_INTERVAL_MS * 5);
    });
    expect(getRun.mock.calls.length).toBe(n);
  });
});
