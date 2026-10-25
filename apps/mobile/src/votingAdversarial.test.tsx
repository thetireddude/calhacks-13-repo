import { act, fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { useEffect, useRef } from "react";
import type { ReactNode } from "react";

import { createMockGroupClient } from "./groups";
import { GroupsProvider, useGroups } from "./groupsState";
import { FIXTURE_EVENT, createMockIcsClient, createMockVotingClient } from "./voting";
import type {
  ConfirmedEventView,
  IcsClient,
  NotificationItemView,
  ProposalVoteStateView,
  VotingClient,
} from "./voting";
import { EventsScreen, NotificationsScreen, VoteSection, VotingProvider } from "./votingScreens";

const GENERIC = "Something went wrong. Please try again.";

function openState(over: Partial<ProposalVoteStateView> = {}): ProposalVoteStateView {
  return {
    proposalId: "p1",
    status: "open",
    approveCount: 3,
    cantMakeItCount: 1,
    vetoAllowed: true,
    voteAllowed: (over.status ?? "open") === "open" || over.status === "revote",
    deadline: "2026-11-02T20:00:00.000Z",
    ...over,
  };
}

function client(over: Partial<VotingClient> = {}): VotingClient {
  const base = createMockVotingClient();
  return { ...base, getVoteState: async () => openState(), ...over };
}

function deferred<T>() {
  let resolve!: (v: T) => void;
  let reject!: (e: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res as (v: T) => void;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function withProviders(voting: VotingClient, node: ReactNode, ics?: IcsClient) {
  return (
    <VotingProvider voting={voting} ics={ics ?? createMockIcsClient()}>
      {node}
    </VotingProvider>
  );
}

function Seed({ names, children }: { names: string[]; children: ReactNode }) {
  const { createGroup, groups } = useGroups();
  const started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    void (async () => {
      for (const n of names) await createGroup(n);
    })();
  }, [names, createGroup]);
  return groups.length === names.length ? <>{children}</> : null;
}

async function renderEvents(voting: VotingClient, ics?: IcsClient, names = ["Climbing"]) {
  return render(
    withProviders(
      voting,
      <GroupsProvider client={createMockGroupClient()}>
        <Seed names={names}>
          <EventsScreen />
        </Seed>
      </GroupsProvider>,
      ics,
    ),
  );
}

let spies: jest.SpyInstance[] = [];
let unhandled: unknown[] = [];
const onUnhandled = (e: unknown) => unhandled.push(e);
beforeEach(() => {
  unhandled = [];
  process.on("unhandledRejection", onUnhandled);
  spies = (["log", "info", "warn", "error", "debug"] as const).map((m) =>
    jest.spyOn(console, m).mockImplementation(() => {}),
  );
});
afterEach(async () => {
  await new Promise<void>((r) => setImmediate(() => r()));
  process.off("unhandledRejection", onUnhandled);
  expect(unhandled).toEqual([]);
  jest.restoreAllMocks();
});

async function pressVeto(id = "p1") {
  await fireEvent.press(await screen.findByTestId(`veto-${id}`));
  await fireEvent.press(await screen.findByTestId(`veto-confirm-${id}`));
}

const loggedText = () => JSON.stringify(spies.flatMap((s) => s.mock.calls));

describe("veto vs Can't make it", () => {
  test("each button triggers only its own client call", async () => {
    const putVote = jest.fn(createMockVotingClient().putVote);
    const veto = jest.fn(createMockVotingClient().veto);
    await render(withProviders(client({ putVote, veto }), <VoteSection proposalId="p1" />));
    await fireEvent.press(await screen.findByTestId("vote-cant-make-it-p1"));
    await waitFor(() => expect(putVote).toHaveBeenCalledTimes(1));
    expect(putVote).toHaveBeenLastCalledWith("p1", { choice: "cant_make_it" });
    expect(veto).not.toHaveBeenCalled();
    expect(veto).not.toHaveBeenCalled();
    await pressVeto();
    await waitFor(() => expect(veto).toHaveBeenCalledTimes(1));
    expect(putVote).toHaveBeenCalledTimes(1);
    // veto payload never carries a vote choice
    expect(veto.mock.calls[0]).toEqual(["p1"]);
  });

  test("rapid double-press of a vote button produces one call", async () => {
    const d = deferred<unknown>();
    const putVote = jest.fn(() => d.promise as ReturnType<VotingClient["putVote"]>);
    await render(withProviders(client({ putVote }), <VoteSection proposalId="p1" />));
    const btn = await screen.findByTestId("vote-approve-p1");
    await fireEvent.press(btn);
    await fireEvent.press(btn);
    await fireEvent.press(screen.getByTestId("vote-approve-p1"));
    expect(putVote).toHaveBeenCalledTimes(1);
    await act(async () => {
      d.resolve({});
    });
  });

  test("rapid double-press of veto produces one call, and cross-press during a pending vote is blocked", async () => {
    const d = deferred<unknown>();
    const veto = jest.fn(() => d.promise as ReturnType<VotingClient["veto"]>);
    const putVote = jest.fn(createMockVotingClient().putVote);
    await render(withProviders(client({ veto, putVote }), <VoteSection proposalId="p1" />));
    await fireEvent.press(await screen.findByTestId("veto-p1"));
    const btn = await screen.findByTestId("veto-confirm-p1");
    await fireEvent.press(btn);
    await fireEvent.press(btn);
    await fireEvent.press(screen.getByTestId("vote-cant-make-it-p1"));
    expect(veto).toHaveBeenCalledTimes(1);
    expect(putVote).not.toHaveBeenCalled();
    await act(async () => {
      d.resolve({});
    });
  });

  test("veto hidden when vetoAllowed is false", async () => {
    await render(withProviders(client({ getVoteState: async () => openState({ vetoAllowed: false }) }), <VoteSection proposalId="p1" />));
    await screen.findByTestId("vote-approve-p1");
    expect(screen.queryByTestId("veto-p1")).toBeNull();
  });

  test.each(["confirmed", "cancelled", "vetoed", "revision", "weird"])("no vote or veto controls when status is %s even with vetoAllowed", async (status) => {
    await render(withProviders(client({ getVoteState: async () => openState({ status, vetoAllowed: true }) }), <VoteSection proposalId="p1" />));
    await screen.findByTestId("vote-section-p1");
    expect(screen.queryByTestId("veto-p1")).toBeNull();
    expect(screen.queryByTestId("vote-approve-p1")).toBeNull();
    expect(screen.queryByTestId("vote-cant-make-it-p1")).toBeNull();
  });

  test("after a veto, the backend state (vetoed) removes the veto control", async () => {
    let status = "open";
    const v = client({
      getVoteState: async () => openState({ status }),
      veto: async (proposalId) => {
        status = "vetoed";
        return { proposalId, userId: "u", vetoed: true, createdAt: "2026-10-30T10:00:00.000Z" };
      },
    });
    await render(withProviders(v, <VoteSection proposalId="p1" />));
    await pressVeto();
    await screen.findByText("This proposal was vetoed.");
    expect(screen.queryByTestId("veto-p1")).toBeNull();
  });

  test("a Can't make it choice never renders as a veto and vice versa", async () => {
    await render(
      withProviders(client({ getVoteState: async () => openState({ myChoice: "cant_make_it" }) }), <VoteSection proposalId="p1" />),
    );
    await screen.findByText("Your vote: Can't make it");
    expect(screen.queryByText(/veto(ed)?\./i)).toBeNull();
    expect(screen.queryByTestId("vote-banner-p1")).toBeNull();
  });
});

describe("declining members and the Events screen", () => {
  test("member whose own choice is cant_make_it can see the event and use ICS", async () => {
    const exportIcs = jest.fn(createMockIcsClient().exportIcs);
    const v = createMockVotingClient({ event: "confirmed" });
    await v.putVote("proposal-1", { choice: "cant_make_it" });
    await renderEvents(v, { exportIcs });
    await screen.findByText(FIXTURE_EVENT.summary);
    await fireEvent.press(screen.getByText("Add to calendar (.ics)"));
    await screen.findByText("Calendar export is not connected yet (stub).");
    expect(exportIcs).toHaveBeenCalledWith("event-1");
  });

  test("Events screen never calls getVoteState (no dependence on vote data)", async () => {
    const getVoteState = jest.fn(async () => {
      throw new Error("vote data unavailable");
    });
    await renderEvents(client({ getVoteState: getVoteState as unknown as VotingClient["getVoteState"], getConfirmedEvent: async (g) => ({ status: "confirmed", event: { ...FIXTURE_EVENT, groupId: g } }) }));
    await screen.findByText(FIXTURE_EVENT.summary);
    expect(getVoteState).not.toHaveBeenCalled();
    expect(screen.getByText("Add to calendar (.ics)")).toBeTruthy();
  });

  test("cancelled event hides export; none shows neutral text", async () => {
    await renderEvents(createMockVotingClient({ event: "cancelled" }));
    await screen.findByText("This event was cancelled.");
    expect(screen.queryByText("Add to calendar (.ics)")).toBeNull();
  });

  test("no-event state", async () => {
    await renderEvents(createMockVotingClient({ event: "none" }));
    await screen.findByText("No confirmed event yet.");
    expect(screen.queryByText("Add to calendar (.ics)")).toBeNull();
  });

  test("multiple groups each get their own event card with independent state", async () => {
    const v = client({
      getConfirmedEvent: async (g): Promise<ConfirmedEventView> =>
        g === "group-1" || g.endsWith("1")
          ? { status: "confirmed", event: { ...FIXTURE_EVENT, groupId: g, summary: `S-${g}` } }
          : { status: "none" },
    });
    await renderEvents(v, undefined, ["A", "B"]);
    await waitFor(() => expect(screen.getAllByTestId(/^event-/)).toHaveLength(2));
    await waitFor(() => expect(screen.queryAllByText("Loading event.")).toHaveLength(0));
    expect(screen.getAllByText("Add to calendar (.ics)").length).toBeLessThanOrEqual(1);
  });
});

describe("rejecting clients", () => {
  test("putVote rejects: error shown, controls usable, no success state", async () => {
    const putVote = jest.fn().mockRejectedValueOnce(new Error("boom")).mockResolvedValue({});
    await render(withProviders(client({ putVote }), <VoteSection proposalId="p1" />));
    await fireEvent.press(await screen.findByTestId("vote-approve-p1"));
    await screen.findByText(GENERIC);
    expect(screen.queryByText(/Your vote:/)).toBeNull();
    expect(screen.getByTestId("vote-approve-p1").props.accessibilityState?.disabled).toBeFalsy();
    await fireEvent.press(screen.getByTestId("vote-approve-p1"));
    await waitFor(() => expect(putVote).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(screen.queryByText(GENERIC)).toBeNull());
  });

  test("veto rejects: error shown, veto control still available", async () => {
    await render(withProviders(client({ veto: async () => Promise.reject(new Error("no")) }), <VoteSection proposalId="p1" />));
    await pressVeto();
    await screen.findByText(GENERIC);
    expect(screen.queryByText("This proposal was vetoed.")).toBeNull();
    expect(screen.getByTestId("veto-p1")).toBeTruthy();
  });

  test("getVoteState rejects: error, no controls", async () => {
    await render(withProviders(client({ getVoteState: () => Promise.reject(new Error("x")) }), <VoteSection proposalId="p1" />));
    await screen.findByText(GENERIC);
    expect(screen.queryByTestId("vote-approve-p1")).toBeNull();
    expect(screen.queryByTestId("veto-p1")).toBeNull();
  });

  test("getVoteState refresh fails after a successful vote: no false 'Your vote' claim from stale data", async () => {
    let n = 0;
    const v = client({
      getVoteState: async () => {
        if (n++ === 0) return openState();
        throw new Error("refresh failed");
      },
    });
    await render(withProviders(v, <VoteSection proposalId="p1" />));
    await fireEvent.press(await screen.findByTestId("vote-approve-p1"));
    await screen.findByText(/Your action was recorded, but the latest state could not be loaded/);
    expect(screen.queryByText("Your vote: Interested")).toBeNull();
  });

  test("listNotifications rejects", async () => {
    await render(withProviders(client({ listNotifications: () => Promise.reject(new Error("x")) }), <NotificationsScreen />));
    await screen.findByText(GENERIC);
    expect(screen.queryByText("No notifications yet.")).toBeNull();
    expect(screen.queryByText("Loading notifications.")).toBeNull();
  });

  test("getConfirmedEvent rejects", async () => {
    await renderEvents(client({ getConfirmedEvent: () => Promise.reject(new Error("x")) }));
    await screen.findByText(GENERIC);
    expect(screen.queryByText("No confirmed event yet.")).toBeNull();
    expect(screen.queryByText("Add to calendar (.ics)")).toBeNull();
    expect(screen.queryByText("Loading event.")).toBeNull();
  });

  test("ICS export rejects: error shown, no export notice, button remains usable and retry works", async () => {
    const exportIcs = jest.fn().mockRejectedValueOnce(new Error("no")).mockResolvedValue({ filename: "ok.ics" });
    await renderEvents(createMockVotingClient({ event: "confirmed" }), { exportIcs });
    await fireEvent.press(await screen.findByText("Add to calendar (.ics)"));
    await screen.findByText(GENERIC);
    expect(screen.queryByText(/Calendar export is not connected/)).toBeNull();
    await fireEvent.press(screen.getByText("Add to calendar (.ics)"));
    await screen.findByText("Calendar export is not connected yet (stub).");
    expect(screen.queryByText(GENERIC)).toBeNull();
  });

  test("ICS success then failure: stale success notice is cleared", async () => {
    const exportIcs = jest.fn().mockResolvedValueOnce({ filename: "a.ics" }).mockRejectedValueOnce(new Error("x"));
    await renderEvents(createMockVotingClient({ event: "confirmed" }), { exportIcs });
    await fireEvent.press(await screen.findByText("Add to calendar (.ics)"));
    await screen.findByText("Calendar export is not connected yet (stub).");
    await fireEvent.press(screen.getByText("Add to calendar (.ics)"));
    await screen.findByText(GENERIC);
    expect(screen.queryByText(/Calendar export is not connected/)).toBeNull();
  });

  test("synchronously throwing client does not crash the screen", async () => {
    const exportIcs = jest.fn(() => {
      throw new Error("sync");
    });
    await renderEvents(createMockVotingClient({ event: "confirmed" }), { exportIcs: exportIcs as unknown as IcsClient["exportIcs"] });
    await fireEvent.press(await screen.findByText("Add to calendar (.ics)"));
    await screen.findByText(GENERIC);
    expect(screen.queryByText(/Calendar export is not connected/)).toBeNull();
  });
});

describe("stale state", () => {
  test("late response for a previous proposal does not render on the new proposal", async () => {
    const d1 = deferred<ProposalVoteStateView>();
    const v = client({
      getVoteState: (id) => (id === "p1" ? d1.promise : Promise.resolve(openState({ proposalId: id, approveCount: 7, cantMakeItCount: 0 }))),
    });
    const ui = (id: string) => withProviders(v, <VoteSection proposalId={id} />);
    const r = await render(ui("p1"));
    await r.rerender(ui("p2"));
    await screen.findByText("Interested: 7 | Can't make it: 0");
    await act(async () => {
      d1.resolve(openState({ proposalId: "p1", approveCount: 99, cantMakeItCount: 99 }));
    });
    expect(screen.queryByText(/99/)).toBeNull();
    expect(screen.getByTestId("vote-section-p2")).toBeTruthy();
  });

  test("while the new proposal is loading, the old proposal's state is not shown under it", async () => {
    const d2 = deferred<ProposalVoteStateView>();
    const v = client({
      getVoteState: (id) => (id === "p2" ? d2.promise : Promise.resolve(openState({ proposalId: id, approveCount: 5 }))),
    });
    const ui = (id: string) => withProviders(v, <VoteSection proposalId={id} />);
    const r = await render(ui("p1"));
    await screen.findByText("Interested: 5 | Can't make it: 1");
    await r.rerender(ui("p2"));
    // DEFECT CANDIDATE: VoteSection keeps p1's state while p2 loads (testID/buttons still target p1 data).
    expect(screen.queryByText("Interested: 5 | Can't make it: 1")).toBeNull();
    await act(async () => {
      d2.resolve(openState({ proposalId: "p2" }));
    });
  });

  test("a vote action in flight for p1 whose refresh lands after switching to p2 does not render p1 data on p2", async () => {
    const put = deferred<unknown>();
    const refreshP1 = deferred<ProposalVoteStateView>();
    let p1Calls = 0;
    const v = client({
      putVote: () => put.promise as ReturnType<VotingClient["putVote"]>,
      getVoteState: (id) => {
        if (id === "p1") return p1Calls++ === 0 ? Promise.resolve(openState({ proposalId: "p1" })) : refreshP1.promise;
        return Promise.resolve(openState({ proposalId: id, approveCount: 7, cantMakeItCount: 0 }));
      },
    });
    const ui = (id: string) => withProviders(v, <VoteSection proposalId={id} />);
    const r = await render(ui("p1"));
    await fireEvent.press(await screen.findByTestId("vote-approve-p1"));
    await r.rerender(ui("p2"));
    await screen.findByText("Interested: 7 | Can't make it: 0");
    await act(async () => {
      put.resolve({});
    });
    await act(async () => {
      refreshP1.resolve(openState({ proposalId: "p1", approveCount: 42, cantMakeItCount: 42 }));
    });
    // DEFECT CANDIDATE: act() setState is not guarded by the effect's `live` flag.
    expect(screen.queryByText(/42/)).toBeNull();
  });

  test("Events: late response for a removed/replaced client does not surface after unmount (no warnings)", async () => {
    const d = deferred<ConfirmedEventView>();
    const r = await renderEvents(client({ getConfirmedEvent: () => d.promise }));
    await screen.findByText("Loading event.");
    await r.unmount();
    await act(async () => {
      d.resolve({ status: "confirmed", event: FIXTURE_EVENT });
    });
    expect(loggedText()).not.toMatch(/unmounted|not wrapped in act/);
  });

  test("Events: ICS result for group A event id is requested with that event's id only", async () => {
    const exportIcs = jest.fn(createMockIcsClient().exportIcs);
    await renderEvents(createMockVotingClient({ event: "confirmed" }), { exportIcs });
    await fireEvent.press(await screen.findByText("Add to calendar (.ics)"));
    expect(exportIcs).toHaveBeenCalledTimes(1);
    expect(exportIcs.mock.calls[0]).toEqual(["event-1"]);
  });
});

describe("privacy", () => {
  const PRIVATE = {
    memberVotes: [{ userId: "secret-user-77", choice: "cant_make_it" }],
    availability: "SECRET-AVAIL Tue 3pm busy dentist",
    preferences: ["SECRET-PREF sushi"],
    email: "private.person@example.com",
    voters: ["Alice Secretname"],
  };

  test("extra private-looking fields on vote state do not render or get logged", async () => {
    const v = client({ getVoteState: async () => ({ ...openState({ myChoice: "approve" }), ...PRIVATE }) as ProposalVoteStateView });
    await render(withProviders(v, <VoteSection proposalId="p1" />));
    await screen.findByText("Your vote: Interested");
    const dump = JSON.stringify(screen.toJSON());
    for (const s of ["secret-user-77", "SECRET-AVAIL", "SECRET-PREF", "private.person@example.com", "Alice Secretname"]) {
      expect(dump).not.toContain(s);
    }
    expect(screen.getByText("Interested: 3 | Can't make it: 1")).toBeTruthy();
    expect(loggedText()).not.toMatch(/SECRET|secret-user|private\.person/);
  });

  test("extra private fields on confirmed event envelope do not render", async () => {
    const v = client({
      getConfirmedEvent: async (g) =>
        ({ status: "confirmed", event: { ...FIXTURE_EVENT, groupId: g, ...PRIVATE } }) as unknown as ConfirmedEventView,
    });
    await renderEvents(v);
    await screen.findByText(FIXTURE_EVENT.summary);
    const dump = JSON.stringify(screen.toJSON());
    for (const s of ["secret-user-77", "SECRET-AVAIL", "SECRET-PREF", "private.person@example.com", "Alice Secretname"]) {
      expect(dump).not.toContain(s);
    }
  });

  test("extra private fields on notification items do not render", async () => {
    const items = [{ id: "n", title: "T", body: "B", createdAt: "2026-10-30T10:00:00.000Z", ...PRIVATE }] as NotificationItemView[];
    await render(withProviders(client({ listNotifications: async () => items }), <NotificationsScreen />));
    await screen.findByText("T");
    expect(JSON.stringify(screen.toJSON())).not.toMatch(/SECRET|secret-user|private\.person|Alice/);
  });

  test("notification payloads and vote values are never logged", async () => {
    const items = [{ id: "n", title: "LOGCHECK-TITLE", body: "LOGCHECK-BODY", createdAt: "2026-10-30T10:00:00.000Z" }];
    await render(
      withProviders(
        client({ listNotifications: async () => items, putVote: async () => Promise.reject(new Error("LOGCHECK-ERR")) }),
        <>
          <NotificationsScreen />
          <VoteSection proposalId="p1" />
        </>,
      ),
    );
    await screen.findByText("LOGCHECK-TITLE");
    await fireEvent.press(await screen.findByTestId("vote-cant-make-it-p1"));
    await screen.findByText(GENERIC);
    expect(loggedText()).not.toMatch(/LOGCHECK|cant_make_it|approve/);
  });

  test("only aggregate counts and caller's own choice render", async () => {
    await render(withProviders(client({ getVoteState: async () => openState({ myChoice: "cant_make_it" }) }), <VoteSection proposalId="p1" />));
    await screen.findByText("Your vote: Can't make it");
    expect(screen.getAllByText(/Your vote:/)).toHaveLength(1);
    expect(screen.getByText("Interested: 3 | Can't make it: 1")).toBeTruthy();
  });
});

describe("notification feed", () => {
  test("renders with no push registration involved (VotingProvider only)", async () => {
    await render(withProviders(createMockVotingClient(), <NotificationsScreen />));
    await screen.findByText("New proposals");
    expect(screen.getByText("Event confirmed")).toBeTruthy();
  });

  test("empty feed", async () => {
    await render(withProviders(createMockVotingClient({ notifications: [] }), <NotificationsScreen />));
    await screen.findByText("No notifications yet.");
  });

  test("very long titles and bodies render in full without crashing", async () => {
    const title = "T".repeat(5000);
    const body = "B ".repeat(5000).trim();
    await render(
      withProviders(createMockVotingClient({ notifications: [{ id: "x", title, body, createdAt: "2026-10-30T10:00:00.000Z" }] }), <NotificationsScreen />),
    );
    await screen.findByText(title);
    expect(screen.getByText(body)).toBeTruthy();
  });

  test("duplicate-looking ids and many items render", async () => {
    const items = Array.from({ length: 200 }, (_, i) => ({ id: `n${i}`, title: `Title ${i}`, body: "b", createdAt: "2026-10-30T10:00:00.000Z" }));
    await render(withProviders(createMockVotingClient({ notifications: items }), <NotificationsScreen />));
    await screen.findByText("Title 199");
    expect(screen.getByText("Title 0")).toBeTruthy();
  });
});

describe("rendering robustness", () => {
  test("unknown status shows neutral status text with no controls", async () => {
    await render(withProviders(client({ getVoteState: async () => openState({ status: "frobnicated" }) }), <VoteSection proposalId="p1" />));
    await screen.findByText("Status: frobnicated");
    expect(screen.queryByTestId("vote-approve-p1")).toBeNull();
  });

  test("missing deadline renders no deadline line", async () => {
    await render(withProviders(client({ getVoteState: async () => openState({ deadline: undefined }) }), <VoteSection proposalId="p1" />));
    await screen.findByTestId("vote-approve-p1");
    expect(screen.queryByText(/Voting closes/)).toBeNull();
  });

  test.each(["not-a-date", "", "0000-00-00", "2026-13-45T99:99:99Z"])("odd deadline %p does not crash and is not interpreted", async (deadline) => {
    await render(withProviders(client({ getVoteState: async () => openState({ deadline }) }), <VoteSection proposalId="p1" />));
    await screen.findByTestId("vote-approve-p1");
    expect(screen.queryByText("Invalid Date")).toBeNull();
  });

  test("odd confirmedAt does not crash", async () => {
    const v = client({ getConfirmedEvent: async (g) => ({ status: "confirmed", event: { ...FIXTURE_EVENT, groupId: g, confirmedAt: "garbage" } }) });
    await renderEvents(v);
    await screen.findByText("Confirmed at: garbage");
    expect(screen.queryByText(/Invalid Date|NaN/)).toBeNull();
  });

  test("zero counts render", async () => {
    await render(withProviders(client({ getVoteState: async () => openState({ approveCount: 0, cantMakeItCount: 0 }) }), <VoteSection proposalId="p1" />));
    await screen.findByText("Interested: 0 | Can't make it: 0");
  });

  test("one voting section per rendered VoteSection, independent state", async () => {
    const v = client({ getVoteState: async (id) => openState({ proposalId: id, approveCount: id === "a" ? 1 : 2 }) });
    await render(
      withProviders(
        v,
        <>
          <VoteSection proposalId="a" />
          <VoteSection proposalId="b" />
        </>,
      ),
    );
    await screen.findByText("Interested: 1 | Can't make it: 1");
    await screen.findByText("Interested: 2 | Can't make it: 1");
  });
});

describe("no client-side rules", () => {
  test("approveCount below cantMakeIt with status open stays open with all controls", async () => {
    await render(withProviders(client({ getVoteState: async () => openState({ approveCount: 0, cantMakeItCount: 50 }) }), <VoteSection proposalId="p1" />));
    await screen.findByTestId("vote-approve-p1");
    expect(screen.getByTestId("veto-p1")).toBeTruthy();
    expect(screen.queryByTestId("vote-banner-p1")).toBeNull();
  });

  test("approveCount above cantMakeIt with status open does not auto-confirm", async () => {
    await render(withProviders(client({ getVoteState: async () => openState({ approveCount: 100, cantMakeItCount: 0 }) }), <VoteSection proposalId="p1" />));
    await screen.findByTestId("vote-approve-p1");
    expect(screen.queryByText(/confirmed/i)).toBeNull();
  });

  test("deadline in the past with status open does not auto-close", async () => {
    await render(withProviders(client({ getVoteState: async () => openState({ deadline: "2000-01-01T00:00:00.000Z" }) }), <VoteSection proposalId="p1" />));
    await screen.findByTestId("vote-approve-p1");
    expect(screen.getByTestId("veto-p1")).toBeTruthy();
  });

  test("deadline in the future with status confirmed does not enable voting", async () => {
    await render(withProviders(client({ getVoteState: async () => openState({ status: "confirmed", deadline: "2999-01-01T00:00:00.000Z" }) }), <VoteSection proposalId="p1" />));
    await screen.findByText("This plan is confirmed.");
    expect(screen.queryByTestId("vote-approve-p1")).toBeNull();
  });

  test("own vote does not locally change counts or status", async () => {
    await render(withProviders(client({ putVote: async () => ({ proposalId: "p1", userId: "u", choice: "approve", updatedAt: "x" }) }), <VoteSection proposalId="p1" />));
    await fireEvent.press(await screen.findByTestId("vote-approve-p1"));
    await waitFor(() => expect(screen.getByText("Interested: 3 | Can't make it: 1")).toBeTruthy());
  });

  test("revote status re-enables voting; own prior choice displayed as given", async () => {
    await render(withProviders(client({ getVoteState: async () => openState({ status: "revote", myChoice: "approve" }) }), <VoteSection proposalId="p1" />));
    await screen.findByText("Revote: please vote again.");
    expect(screen.getByTestId("vote-approve-p1")).toBeTruthy();
    expect(screen.getByText("Your vote: Interested")).toBeTruthy();
  });
});
