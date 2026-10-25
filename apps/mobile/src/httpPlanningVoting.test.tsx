import type {
  ConfirmedEventResponse,
  PlanningRunProposalsResponse,
  PlanningRunResponse,
  ProposalVetoResponse,
  ProposalVoteResponse,
} from "@gather/contracts";
import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { Linking } from "react-native";

import { createApiClient } from "./apiClient";
import { AuthProvider, createMockAuthClient } from "./auth";
import { createMockGroupClient } from "./groups";
import { createHttpPlanningClient, createHttpVotingClient } from "./httpClients";
import { PlanningError, createMockPlanningClient } from "./planning";
import type { PlanningClient } from "./planning";
import { POLL_INTERVAL_MS } from "./planningScreens";
import { RootNavigator } from "./RootNavigator";
import { FIXTURE_NOTIFICATIONS, VotingError, createMockVotingClient } from "./voting";

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
  test("real-mode notifications are empty and never fixture data", async () => {
    const { voting, fetchImpl } = setup(200);
    const list = await voting.listNotifications();
    expect(list).toEqual([]);
    expect(list).not.toEqual(FIXTURE_NOTIFICATIONS);
    expect(fetchImpl).not.toHaveBeenCalled();
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

  async function open(planningClient: PlanningClient, votingClient = createMockVotingClient()) {
    const auth = createMockAuthClient();
    await auth.signIn("a@example.com", "secret1");
    const view = await render(
      <AuthProvider client={auth}>
        <RootNavigator groupClient={createMockGroupClient()} planningClient={planningClient} votingClient={votingClient} />
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

  test("real mode shows no notifications and says so honestly", async () => {
    await open(createMockPlanningClient("three"), setup(200).voting);
    await fireEvent.press(screen.getByLabelText(/^Notifications, tab/));
    expect(await screen.findByText("Notifications are not available yet.")).toBeTruthy();
    expect(screen.queryByText(FIXTURE_NOTIFICATIONS[0]!.title)).toBeNull();
  });

  test("real mode offers no live ICS export and shows no success notice", async () => {
    const { voting } = setup(200, event);
    await open(createMockPlanningClient("three"), voting);
    await fireEvent.press(screen.getByLabelText(/^Events, tab/));
    expect(await screen.findByText("Calendar export is not available yet")).toBeTruthy();
    expect(screen.queryByText("Add to calendar (.ics)")).toBeNull();
    expect(screen.queryByText(/not connected yet/)).toBeNull();
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
