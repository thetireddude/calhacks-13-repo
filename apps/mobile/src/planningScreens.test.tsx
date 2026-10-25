import { fireEvent, render, screen } from "@testing-library/react-native";
import { Linking } from "react-native";

import { AuthProvider, createMockAuthClient } from "./auth";
import { createMockGroupClient } from "./groups";
import { FIXTURE_MANY_PROPOSALS, createMockPlanningClient } from "./planning";
import type { MockPlanningScenario, PlanningClient } from "./planning";
import { RootNavigator } from "./RootNavigator";

async function openPlanning(planningClient: PlanningClient) {
  const auth = createMockAuthClient();
  await auth.verifyOtp("a@example.com", "123456");
  await render(
    <AuthProvider client={auth}>
      <RootNavigator groupClient={createMockGroupClient()} planningClient={planningClient} />
    </AuthProvider>,
  );
  await screen.findByText("Your groups");
  await fireEvent.press(screen.getByText("Create group"));
  await fireEvent.changeText(await screen.findByLabelText("Group name"), "Climbing");
  await fireEvent.press(screen.getByText("Create"));
  await fireEvent.press(await screen.findByText("Open planning"));
  await screen.findByText("Plan an activity");
}

async function startPlanning(scenario: MockPlanningScenario) {
  await openPlanning(createMockPlanningClient(scenario));
  await fireEvent.changeText(screen.getByLabelText("Activity request"), "something outdoors");
  await fireEvent.press(screen.getByText("Start planning"));
}

beforeEach(() => {
  jest.spyOn(Linking, "getInitialURL").mockResolvedValue(null);
  jest.spyOn(Linking, "addEventListener").mockReturnValue({ remove: () => {} });
});
afterEach(() => jest.restoreAllMocks());

test("three proposals render in backend order with rank and explanation", async () => {
  await startPlanning("three");
  await screen.findByText("#1 Option 1: Saturday hike");
  expect(screen.getByText("#2 Option 2: Saturday hike")).toBeTruthy();
  expect(screen.getByText("#3 Option 3: Saturday hike")).toBeTruthy();
  expect(screen.getByText("Ranked 2 by the planner for group fit.")).toBeTruthy();
});

test("backend order is kept even when it differs from rank order", async () => {
  const client = createMockPlanningClient("three");
  const reversed = [...(await client.getProposals((await client.createRun("g", {})).id)).proposals].reverse();
  const custom: PlanningClient = { ...client, getProposals: async () => ({ proposals: reversed }) };
  await openPlanning(custom);
  await fireEvent.press(screen.getByText("Start planning"));
  await screen.findByText("#3 Option 3: Saturday hike");
  const titles = screen.getAllByText(/^#\d Option/).map((n) => n.props.children);
  expect(titles).toEqual(["#3 Option 3: Saturday hike", "#2 Option 2: Saturday hike", "#1 Option 1: Saturday hike"]);
});

test("more than three proposals are capped at three", async () => {
  expect(FIXTURE_MANY_PROPOSALS.length).toBeGreaterThan(3);
  await startPlanning("many");
  await screen.findByText("#3 Option 3: Saturday hike");
  expect(screen.queryByText("#4 Option 4: Saturday hike")).toBeNull();
  expect(screen.queryByText("#5 Option 5: Saturday hike")).toBeNull();
});

test("empty result shows a neutral message and no proposals", async () => {
  await startPlanning("empty");
  await screen.findByText("No proposals are available for this run.");
  expect(screen.queryByText(/^#\d/)).toBeNull();
});

test("pending run shows progress and a status refresh", async () => {
  await startPlanning("pending");
  await screen.findByText("Planning is in progress.");
  expect(screen.getByLabelText("Planning in progress")).toBeTruthy();
  expect(screen.getByText("Refresh status")).toBeTruthy();
});

test("failed run is recoverable: Try again starts a new run", async () => {
  const client = createMockPlanningClient("failed");
  const createRun = jest.spyOn(client, "createRun");
  await openPlanning(client);
  await fireEvent.press(screen.getByText("Start planning"));
  await screen.findByText("Planning did not finish. You can try again.");
  await fireEvent.press(screen.getByText("Try again"));
  await screen.findByText("Planning did not finish. You can try again.");
  expect(createRun).toHaveBeenCalledTimes(2);
});

test("an unrecognised run status gets a neutral display", async () => {
  const client = createMockPlanningClient("three");
  const odd: PlanningClient = { ...client, getRun: async (id) => ({ ...(await client.getRun(id)), status: "queued" }) };
  await openPlanning(odd);
  await fireEvent.press(screen.getByText("Start planning"));
  await screen.findByText("Status: queued");
});

test("privacy: private-looking fields and scores are never rendered, request text is not logged", async () => {
  const client = createMockPlanningClient("three");
  const leaky = {
    proposalId: "p1",
    rank: 1,
    summary: "Safe summary",
    explanation: "Safe explanation",
    deterministicScore: 0.87,
    unavailableMembers: ["user-secret"],
    availability: [{ userId: "user-secret", start: "2026-01-01T09:00" }],
    preferenceHistory: ["secret-history"],
  };
  const withLeak: PlanningClient = { ...client, getProposals: async () => ({ proposals: [leaky] }) };
  const log = jest.spyOn(console, "log").mockImplementation(() => {});
  await openPlanning(withLeak);
  await fireEvent.changeText(screen.getByLabelText("Activity request"), "private-request-text");
  await fireEvent.press(screen.getByText("Start planning"));
  await screen.findByText("#1 Safe summary");
  expect(screen.queryByText(/user-secret|secret-history|0\.87|unavailable/i)).toBeNull();
  expect(JSON.stringify(log.mock.calls)).not.toContain("private-request-text");
});
