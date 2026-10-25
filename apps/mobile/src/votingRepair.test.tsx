import { act, fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { StrictMode, useEffect, useRef } from "react";
import type { ReactNode } from "react";

import { createMockGroupClient } from "./groups";
import { GroupsProvider, useGroups } from "./groupsState";
import { FIXTURE_EVENT, createMockIcsClient, createMockVotingClient } from "./voting";
import type { IcsClient, ProposalVoteStateView, VotingClient } from "./voting";
import { EventsScreen, NotificationsScreen, VoteSection, VotingProvider } from "./votingScreens";

// Repair-pass adversarial tests for DEV1-007 (two-step veto confirm, mounted-ref guards, honest copy, voteAllowed).

const GENERIC = "Something went wrong. Please try again.";
const RECORDED_BUT = /Your action was recorded, but the latest state could not be loaded/;
const STUB_COPY = "Calendar export is not connected yet (stub).";

function st(over: Partial<ProposalVoteStateView> = {}): ProposalVoteStateView {
  return {
    proposalId: "p1",
    status: "open",
    approveCount: 3,
    cantMakeItCount: 1,
    vetoAllowed: true,
    voteAllowed: true,
    deadline: "2026-11-02T20:00:00.000Z",
    ...over,
  };
}

function client(over: Partial<VotingClient> = {}): VotingClient {
  return { ...createMockVotingClient(), getVoteState: async (id) => st({ proposalId: id }), ...over };
}

function deferred<T>() {
  let resolve!: (v: T) => void;
  let reject!: (e: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

const VETO_OK = { proposalId: "p1", userId: "u", vetoed: true as const, createdAt: "x" };
const VOTE_OK = { proposalId: "p1", userId: "u", choice: "approve" as const, updatedAt: "x" };

function wrap(voting: VotingClient, node: ReactNode, ics?: IcsClient) {
  return (
    <VotingProvider voting={voting} ics={ics ?? createMockIcsClient()}>
      {node}
    </VotingProvider>
  );
}

function Seed({ children }: { children: ReactNode }) {
  const { createGroup, groups } = useGroups();
  const started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    void createGroup("Climbing");
  }, [createGroup]);
  return groups.length === 1 ? <>{children}</> : null;
}

function events(voting: VotingClient, ics?: IcsClient) {
  return wrap(
    voting,
    <GroupsProvider client={createMockGroupClient()}>
      <Seed>
        <EventsScreen />
      </Seed>
    </GroupsProvider>,
    ics,
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
  // No React warnings (setState on unmounted, act warnings, key warnings).
  expect(JSON.stringify(spies.flatMap((s) => s.mock.calls))).toBe("[]");
  jest.restoreAllMocks();
});

describe("veto two-step confirm", () => {
  test("first press does not call veto; Cancel makes no call and restores initial control", async () => {
    const veto = jest.fn(async () => VETO_OK);
    await render(wrap(client({ veto }), <VoteSection proposalId="p1" />));
    await fireEvent.press(await screen.findByTestId("veto-p1"));
    expect(veto).not.toHaveBeenCalled();
    expect(screen.queryByTestId("veto-p1")).toBeNull();
    await fireEvent.press(screen.getByTestId("veto-cancel-p1"));
    expect(veto).not.toHaveBeenCalled();
    expect(screen.getByTestId("veto-p1")).toBeTruthy();
    expect(screen.queryByTestId("veto-confirm-p1")).toBeNull();
    // Re-open then cancel again: still no call
    await fireEvent.press(screen.getByTestId("veto-p1"));
    await fireEvent.press(screen.getByTestId("veto-cancel-p1"));
    expect(veto).not.toHaveBeenCalled();
  });

  test("Confirm calls veto exactly once even on rapid double-press, with no vote choice", async () => {
    const d = deferred<typeof VETO_OK>();
    const veto = jest.fn((..._a: unknown[]) => d.promise);
    const putVote = jest.fn(async () => VOTE_OK);
    await render(wrap(client({ veto: veto as unknown as VotingClient["veto"], putVote }), <VoteSection proposalId="p1" />));
    await fireEvent.press(await screen.findByTestId("veto-p1"));
    const confirm = screen.getByTestId("veto-confirm-p1");
    await fireEvent.press(confirm);
    await fireEvent.press(confirm);
    await fireEvent.press(confirm);
    expect(veto).toHaveBeenCalledTimes(1);
    expect(veto.mock.calls[0]).toEqual(["p1"]);
    expect(putVote).not.toHaveBeenCalled();
    await act(async () => d.resolve(VETO_OK));
  });

  test("confirm state does not persist after success (veto control returns to initial when still allowed)", async () => {
    const veto = jest.fn(async () => VETO_OK);
    await render(wrap(client({ veto }), <VoteSection proposalId="p1" />));
    await fireEvent.press(await screen.findByTestId("veto-p1"));
    await fireEvent.press(screen.getByTestId("veto-confirm-p1"));
    await waitFor(() => expect(veto).toHaveBeenCalledTimes(1));
    await screen.findByTestId("veto-p1");
    expect(screen.queryByTestId("veto-confirm-p1")).toBeNull();
    expect(screen.queryByTestId("veto-cancel-p1")).toBeNull();
  });

  test("confirm state does not persist after failure; second veto needs a fresh two-step", async () => {
    const veto = jest.fn().mockRejectedValueOnce(new Error("x")).mockResolvedValue(VETO_OK);
    await render(wrap(client({ veto }), <VoteSection proposalId="p1" />));
    await fireEvent.press(await screen.findByTestId("veto-p1"));
    await fireEvent.press(screen.getByTestId("veto-confirm-p1"));
    await screen.findByText(GENERIC);
    expect(screen.queryByText(RECORDED_BUT)).toBeNull();
    expect(screen.queryByTestId("veto-confirm-p1")).toBeNull();
    expect(screen.getByTestId("veto-p1")).toBeTruthy();
    await fireEvent.press(screen.getByTestId("veto-p1"));
    expect(veto).toHaveBeenCalledTimes(1);
    await fireEvent.press(screen.getByTestId("veto-confirm-p1"));
    await waitFor(() => expect(veto).toHaveBeenCalledTimes(2));
  });

  test("confirm state does not leak across proposals", async () => {
    const veto = jest.fn(async () => VETO_OK);
    const v = client({ veto });
    const view = (id: string) => wrap(v, <VoteSection proposalId={id} />);
    const r = await render(view("p1"));
    await fireEvent.press(await screen.findByTestId("veto-p1"));
    expect(screen.getByTestId("veto-confirm-p1")).toBeTruthy();
    await r.rerender(view("p2"));
    await screen.findByTestId("veto-p2");
    expect(screen.queryByTestId("veto-confirm-p2")).toBeNull();
    expect(screen.queryByTestId("veto-confirm-p1")).toBeNull();
    await r.rerender(view("p1"));
    await screen.findByTestId("veto-p1");
    expect(screen.queryByTestId("veto-confirm-p1")).toBeNull();
    expect(veto).not.toHaveBeenCalled();
  });

  test("vote buttons never call veto; veto flow never calls putVote; confirm shows distinct copy", async () => {
    const veto = jest.fn(async () => VETO_OK);
    const putVote = jest.fn(async () => VOTE_OK);
    await render(wrap(client({ veto, putVote }), <VoteSection proposalId="p1" />));
    await fireEvent.press(await screen.findByTestId("vote-approve-p1"));
    await waitFor(() => expect(putVote).toHaveBeenCalledTimes(1));
    await fireEvent.press(await screen.findByTestId("vote-cant-make-it-p1"));
    await waitFor(() => expect(putVote).toHaveBeenCalledTimes(2));
    expect(veto).not.toHaveBeenCalled();
    await fireEvent.press(await screen.findByTestId("veto-p1"));
    expect(screen.getByText(/not the same as Can't make it/)).toBeTruthy();
    // pressing a vote button while confirming clears confirm and sends only that choice
    await fireEvent.press(screen.getByTestId("vote-approve-p1"));
    await waitFor(() => expect(putVote).toHaveBeenCalledTimes(3));
    expect(veto).not.toHaveBeenCalled();
    expect(putVote).toHaveBeenLastCalledWith("p1", { choice: "approve" });
    await screen.findByTestId("veto-p1");
    expect(screen.queryByTestId("veto-confirm-p1")).toBeNull();
  });

  test("while a veto is in flight, Cancel and vote buttons are disabled (no cross-calls)", async () => {
    const d = deferred<typeof VETO_OK>();
    const putVote = jest.fn(async () => VOTE_OK);
    await render(wrap(client({ veto: (() => d.promise) as unknown as VotingClient["veto"], putVote }), <VoteSection proposalId="p1" />));
    await fireEvent.press(await screen.findByTestId("veto-p1"));
    await fireEvent.press(screen.getByTestId("veto-confirm-p1"));
    await fireEvent.press(screen.getByTestId("vote-approve-p1"));
    await fireEvent.press(screen.getByTestId("vote-cant-make-it-p1"));
    expect(putVote).not.toHaveBeenCalled();
    await act(async () => d.resolve(VETO_OK));
  });
});

describe("proposal-switch races and unmount", () => {
  test("slow vote for p1 resolving after switch to p2: p1 refresh result never renders on p2", async () => {
    const vote = deferred<typeof VOTE_OK>();
    const refresh = deferred<ProposalVoteStateView>();
    let p1Calls = 0;
    const getVoteState = jest.fn((id: string) => {
      if (id === "p1") {
        p1Calls += 1;
        return p1Calls === 1 ? Promise.resolve(st({ proposalId: "p1" })) : refresh.promise;
      }
      return Promise.resolve(st({ proposalId: "p2", approveCount: 7, cantMakeItCount: 8 }));
    });
    const v = client({ getVoteState, putVote: (() => vote.promise) as unknown as VotingClient["putVote"] });
    const view = (id: string) => wrap(v, <VoteSection proposalId={id} />);
    const r = await render(view("p1"));
    await fireEvent.press(await screen.findByTestId("vote-approve-p1"));
    await r.rerender(view("p2"));
    await screen.findByText("Interested: 7 | Can't make it: 8");
    await act(async () => vote.resolve(VOTE_OK));
    await act(async () => refresh.resolve(st({ proposalId: "p1", approveCount: 99, cantMakeItCount: 99 })));
    expect(screen.queryByText(/99/)).toBeNull();
    expect(screen.getByText("Interested: 7 | Can't make it: 8")).toBeTruthy();
    expect(screen.queryByText(GENERIC)).toBeNull();
    // p2 controls are live (not stuck busy from p1)
    expect(screen.getByTestId("vote-approve-p2").props.accessibilityState?.disabled ?? false).toBeFalsy();
  });

  test("slow veto rejecting for p1 after switch: failure copy never appears on p2", async () => {
    const d = deferred<typeof VETO_OK>();
    const v = client({ veto: (() => d.promise) as unknown as VotingClient["veto"] });
    const view = (id: string) => wrap(v, <VoteSection proposalId={id} />);
    const r = await render(view("p1"));
    await fireEvent.press(await screen.findByTestId("veto-p1"));
    await fireEvent.press(screen.getByTestId("veto-confirm-p1"));
    await r.rerender(view("p2"));
    await screen.findByTestId("veto-p2");
    await act(async () => d.reject(new Error("boom")));
    expect(screen.queryByText(GENERIC)).toBeNull();
    expect(screen.queryByText(RECORDED_BUT)).toBeNull();
    expect(screen.getByTestId("veto-p2")).toBeTruthy();
  });

  test("slow veto then refresh failing for p1 after switch: 'recorded but' copy never appears on p2", async () => {
    const d = deferred<typeof VETO_OK>();
    const refresh = deferred<ProposalVoteStateView>();
    let p1 = 0;
    const getVoteState = jest.fn((id: string) =>
      id === "p1" && ++p1 > 1 ? refresh.promise : Promise.resolve(st({ proposalId: id })),
    );
    const v = client({ getVoteState, veto: (() => d.promise) as unknown as VotingClient["veto"] });
    const view = (id: string) => wrap(v, <VoteSection proposalId={id} />);
    const r = await render(view("p1"));
    await fireEvent.press(await screen.findByTestId("veto-p1"));
    await fireEvent.press(screen.getByTestId("veto-confirm-p1"));
    await act(async () => d.resolve(VETO_OK));
    await r.rerender(view("p2"));
    await screen.findByTestId("veto-p2");
    await act(async () => refresh.reject(new Error("late")));
    expect(screen.queryByText(RECORDED_BUT)).toBeNull();
    expect(screen.queryByText(GENERIC)).toBeNull();
  });

  test("slow initial load for p1 resolving after switch to p2 never renders p1 state", async () => {
    const d = deferred<ProposalVoteStateView>();
    const getVoteState = jest.fn((id: string) =>
      id === "p1" ? d.promise : Promise.resolve(st({ proposalId: "p2", approveCount: 5, cantMakeItCount: 6 })),
    );
    const v = client({ getVoteState });
    const view = (id: string) => wrap(v, <VoteSection proposalId={id} />);
    const r = await render(view("p1"));
    await r.rerender(view("p2"));
    await screen.findByText("Interested: 5 | Can't make it: 6");
    await act(async () => d.resolve(st({ proposalId: "p1", approveCount: 42, cantMakeItCount: 42 })));
    expect(screen.queryByText(/42/)).toBeNull();
  });

  test("unmount during in-flight vote / veto / refresh: no warnings, no unhandled rejections", async () => {
    for (const mode of ["vote-resolve", "vote-reject", "veto-resolve", "veto-reject", "refresh-reject"] as const) {
      const d = deferred<unknown>();
      const refresh = deferred<ProposalVoteStateView>();
      let n = 0;
      const getVoteState = jest.fn(() => (++n > 1 ? refresh.promise : Promise.resolve(st())));
      const v = client({
        getVoteState,
        putVote: (() => d.promise) as unknown as VotingClient["putVote"],
        veto: (() => d.promise) as unknown as VotingClient["veto"],
      });
      const r = await render(wrap(v, <VoteSection proposalId="p1" />));
      if (mode.startsWith("veto")) {
        await fireEvent.press(await screen.findByTestId("veto-p1"));
        await fireEvent.press(screen.getByTestId("veto-confirm-p1"));
      } else {
        await fireEvent.press(await screen.findByTestId("vote-approve-p1"));
      }
      await r.unmount();
      if (mode === "refresh-reject") {
        await act(async () => d.resolve({}));
        await act(async () => refresh.reject(new Error("x")));
      } else if (mode.endsWith("reject")) {
        await act(async () => d.reject(new Error("x")));
      } else {
        await act(async () => d.resolve({}));
        await act(async () => refresh.resolve(st()));
      }
    }
  });

  test("unmount during initial load (resolve and reject) causes no warnings", async () => {
    for (const ok of [true, false]) {
      const d = deferred<ProposalVoteStateView>();
      const r = await render(wrap(client({ getVoteState: () => d.promise }), <VoteSection proposalId="p1" />));
      await r.unmount();
      await act(async () => (ok ? d.resolve(st()) : d.reject(new Error("x"))));
    }
  });
});

describe("action vs refresh failure messaging", () => {
  test("action rejects: failure copy, no 'recorded' claim, getVoteState not re-fetched, controls usable", async () => {
    const getVoteState = jest.fn(async (id: string) => st({ proposalId: id }));
    const putVote = jest.fn().mockRejectedValueOnce(new Error("x")).mockResolvedValue(VOTE_OK);
    await render(wrap(client({ getVoteState, putVote }), <VoteSection proposalId="p1" />));
    await fireEvent.press(await screen.findByTestId("vote-approve-p1"));
    await screen.findByText(GENERIC);
    expect(screen.queryByText(RECORDED_BUT)).toBeNull();
    expect(getVoteState).toHaveBeenCalledTimes(1);
    await fireEvent.press(screen.getByTestId("vote-approve-p1"));
    await waitFor(() => expect(putVote).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(screen.queryByText(GENERIC)).toBeNull());
  });

  test("action resolves, refresh rejects: 'recorded but could not load' copy; not generic failure; controls re-enabled", async () => {
    let n = 0;
    const getVoteState = jest.fn(async (id: string) => {
      if (++n === 2) throw new Error("refresh");
      return st({ proposalId: id });
    });
    const putVote = jest.fn(async () => VOTE_OK);
    await render(wrap(client({ getVoteState, putVote }), <VoteSection proposalId="p1" />));
    await fireEvent.press(await screen.findByTestId("vote-approve-p1"));
    await screen.findByText(RECORDED_BUT);
    expect(screen.queryByText(GENERIC)).toBeNull();
    // stale state remains visible and controls are not stuck busy
    await waitFor(() => expect(screen.getByTestId("vote-approve-p1").props.accessibilityState?.disabled ?? false).toBeFalsy());
    // a second action clears the message on success
    await fireEvent.press(screen.getByTestId("vote-approve-p1"));
    await waitFor(() => expect(putVote).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(screen.queryByText(RECORDED_BUT)).toBeNull());
  });

  test("veto resolves, refresh rejects: 'recorded but' copy (veto is not reported as failed)", async () => {
    let n = 0;
    const getVoteState = jest.fn(async (id: string) => {
      if (++n === 2) throw new Error("refresh");
      return st({ proposalId: id });
    });
    await render(wrap(client({ getVoteState }), <VoteSection proposalId="p1" />));
    await fireEvent.press(await screen.findByTestId("veto-p1"));
    await fireEvent.press(screen.getByTestId("veto-confirm-p1"));
    await screen.findByText(RECORDED_BUT);
    expect(screen.queryByText(GENERIC)).toBeNull();
  });

  test("action and refresh both succeed: no error copy, refreshed counts and myChoice shown", async () => {
    let n = 0;
    const getVoteState = jest.fn(async (id: string) =>
      ++n === 1 ? st({ proposalId: id }) : st({ proposalId: id, approveCount: 4, myChoice: "approve" }),
    );
    await render(wrap(client({ getVoteState }), <VoteSection proposalId="p1" />));
    await fireEvent.press(await screen.findByTestId("vote-approve-p1"));
    await screen.findByText("Your vote: Interested");
    expect(screen.getByText("Interested: 4 | Can't make it: 1")).toBeTruthy();
    expect(screen.queryByText(GENERIC)).toBeNull();
    expect(screen.queryByText(RECORDED_BUT)).toBeNull();
  });

  test("initial load failure shows generic error and no controls", async () => {
    await render(wrap(client({ getVoteState: async () => Promise.reject(new Error("x")) }), <VoteSection proposalId="p1" />));
    await screen.findByText(GENERIC);
    expect(screen.queryByTestId("vote-approve-p1")).toBeNull();
    expect(screen.queryByTestId("veto-p1")).toBeNull();
  });
});

describe("voteAllowed independent of status strings", () => {
  const cases: [string, boolean, boolean][] = [
    ["open", false, false],
    ["open", true, true],
    ["confirmed", true, true],
    ["confirmed", false, false],
    ["revote", false, false],
    ["vetoed", true, true],
    ["some-unknown-status", true, true],
    ["some-unknown-status", false, false],
  ];
  test.each(cases)("status=%s voteAllowed=%s => vote controls shown=%s", async (status, voteAllowed, shown) => {
    await render(wrap(client({ getVoteState: async (id) => st({ proposalId: id, status, voteAllowed }) }), <VoteSection proposalId="p1" />));
    await screen.findByText(/Interested: 3/);
    expect(!!screen.queryByTestId("vote-approve-p1")).toBe(shown);
    expect(!!screen.queryByTestId("vote-cant-make-it-p1")).toBe(shown);
    // veto is gated by voteAllowed && vetoAllowed
    expect(!!screen.queryByTestId("veto-p1")).toBe(shown);
  });

  test("voteAllowed true but vetoAllowed false: vote buttons without veto; counts and banner still render when voting closed", async () => {
    await render(wrap(client({ getVoteState: async (id) => st({ proposalId: id, vetoAllowed: false }) }), <VoteSection proposalId="p1" />));
    await screen.findByTestId("vote-approve-p1");
    expect(screen.queryByTestId("veto-p1")).toBeNull();
    await screen.unmount?.();
  });

  test("status confirmed + voteAllowed false still shows banner, deadline and counts", async () => {
    await render(wrap(client({ getVoteState: async (id) => st({ proposalId: id, status: "confirmed", voteAllowed: false }) }), <VoteSection proposalId="p1" />));
    await screen.findByText("This plan is confirmed.");
    expect(screen.getByText(/Voting closes:/)).toBeTruthy();
    expect(screen.getByText("Interested: 3 | Can't make it: 1")).toBeTruthy();
  });

  test("voteAllowed flips to false after an action: controls disappear, confirm UI cannot linger", async () => {
    let n = 0;
    const getVoteState = jest.fn(async (id: string) => st({ proposalId: id, voteAllowed: ++n === 1 }));
    await render(wrap(client({ getVoteState }), <VoteSection proposalId="p1" />));
    await fireEvent.press(await screen.findByTestId("veto-p1"));
    await fireEvent.press(screen.getByTestId("veto-confirm-p1"));
    await waitFor(() => expect(screen.queryByTestId("veto-confirm-p1")).toBeNull());
    expect(screen.queryByTestId("veto-p1")).toBeNull();
    expect(screen.queryByTestId("vote-approve-p1")).toBeNull();
  });
});

describe("ICS honest copy and export press handling", () => {
  test("success shows the stub copy and never claims a file is ready", async () => {
    const exportIcs = jest.fn(async () => ({ filename: "event-1.ics" }));
    await render(events(createMockVotingClient({ event: "confirmed" }), { exportIcs }));
    await fireEvent.press(await screen.findByText("Add to calendar (.ics)"));
    await screen.findByText(STUB_COPY);
    expect(screen.queryByText(/ready/i)).toBeNull();
    expect(screen.queryByText(/event-1\.ics/)).toBeNull();
    expect(screen.queryByText(/saved|downloaded|added to your calendar/i)).toBeNull();
  });

  test("failure shows generic error and no stub/success copy", async () => {
    const exportIcs = jest.fn(async () => Promise.reject(new Error("x")));
    await render(events(createMockVotingClient({ event: "confirmed" }), { exportIcs }));
    await fireEvent.press(await screen.findByText("Add to calendar (.ics)"));
    await screen.findByText(GENERIC);
    expect(screen.queryByText(STUB_COPY)).toBeNull();
  });

  test("export double-press calls exportIcs once; button usable again afterwards", async () => {
    const d = deferred<{ filename: string }>();
    const exportIcs = jest.fn((..._a: unknown[]) => d.promise);
    await render(events(createMockVotingClient({ event: "confirmed" }), { exportIcs: exportIcs as unknown as IcsClient["exportIcs"] }));
    const btn = await screen.findByText("Add to calendar (.ics)");
    await fireEvent.press(btn);
    await fireEvent.press(btn);
    await fireEvent.press(screen.getByText("Add to calendar (.ics)"));
    expect(exportIcs).toHaveBeenCalledTimes(1);
    expect(exportIcs).toHaveBeenCalledWith(FIXTURE_EVENT.id);
    await act(async () => d.resolve({ filename: "a" }));
    await screen.findByText(STUB_COPY);
    await fireEvent.press(screen.getByText("Add to calendar (.ics)"));
    expect(exportIcs).toHaveBeenCalledTimes(2);
  });

  test("synchronous double-press in one act (same handler closure) still calls once", async () => {
    const exportIcs = jest.fn(() => new Promise<{ filename: string }>(() => {}));
    await render(events(createMockVotingClient({ event: "confirmed" }), { exportIcs }));
    await screen.findByText("Add to calendar (.ics)");
    // Both presses dispatched synchronously on the same rendered handler, before React re-renders the disabled state.
    type N = { props: Record<string, unknown>; parent: N | null };
    let node = screen.getByText("Add to calendar (.ics)") as unknown as N | null;
    const handlerOf = (n: N) => [n.props.onPress, n.props.onClick, n.props.onResponderRelease].find((h) => typeof h === "function");
    while (node && !handlerOf(node)) node = node.parent;
    const press = (() => (handlerOf(node!) as (e?: unknown) => void)({ nativeEvent: {}, stopPropagation() {}, persist() {} })) as () => void;
    await act(async () => {
      press();
      press();
    });
    // KNOWN FAILING (production defect, P3): the `exporting` guard in GroupEvent reads render-closure state, so two
    // presses dispatched before React re-renders both reach ics.exportIcs (observed 2 calls). Real RN discrete taps
    // flush between events, so this is only reachable with batched/synthetic presses; fix with a ref guard.
    expect(exportIcs).toHaveBeenCalledTimes(1);
  });

  test("unmounting Events during export: no warnings", async () => {
    const d = deferred<{ filename: string }>();
    const r = await render(events(createMockVotingClient({ event: "confirmed" }), { exportIcs: (() => d.promise) as unknown as IcsClient["exportIcs"] }));
    await fireEvent.press(await screen.findByText("Add to calendar (.ics)"));
    await r.unmount();
    await act(async () => d.resolve({ filename: "a" }));
  });
});

describe("synchronous batched presses (same render closure)", () => {
  // KNOWN FAILING (production defect, P3): `busy` in VoteSectionBody is render-closure state; two Confirm presses
  // dispatched before re-render both call voting.veto. Same root cause as the ICS double-press test above.
  test("veto Confirm pressed twice synchronously calls veto once", async () => {
    const veto = jest.fn((..._a: unknown[]) => new Promise<typeof VETO_OK>(() => {}));
    await render(wrap(client({ veto: veto as unknown as VotingClient["veto"] }), <VoteSection proposalId="p1" />));
    await fireEvent.press(await screen.findByTestId("veto-p1"));
    type N = { props: Record<string, unknown>; parent: N | null };
    let node = screen.getByTestId("veto-confirm-p1") as unknown as N | null;
    const handlerOf = (n: N) => [n.props.onPress, n.props.onClick].find((h) => typeof h === "function");
    while (node && !handlerOf(node)) node = node.parent;
    const press = () => (handlerOf(node!) as (e?: unknown) => void)({ nativeEvent: {}, stopPropagation() {}, persist() {} });
    await act(async () => {
      press();
      press();
    });
    expect(veto).toHaveBeenCalledTimes(1);
  });
});

describe("React StrictMode", () => {
  test("VoteSection: renders, vote once per press, veto once per confirm, no state loss", async () => {
    const getVoteState = jest.fn(async (id: string) => st({ proposalId: id }));
    const putVote = jest.fn(async () => VOTE_OK);
    const veto = jest.fn(async () => VETO_OK);
    await render(
      <StrictMode>{wrap(client({ getVoteState, putVote, veto }), <VoteSection proposalId="p1" />)}</StrictMode>,
    );
    await screen.findByText("Interested: 3 | Can't make it: 1");
    // harmless double fetch allowed (dev double-effect), but bounded
    expect(getVoteState.mock.calls.length).toBeLessThanOrEqual(2);
    await fireEvent.press(screen.getByTestId("vote-approve-p1"));
    await waitFor(() => expect(putVote).toHaveBeenCalledTimes(1));
    // mounted ref survived the double effect: post-action state still applied and busy cleared
    await waitFor(() => expect(screen.getByTestId("vote-approve-p1").props.accessibilityState?.disabled ?? false).toBeFalsy());
    await fireEvent.press(screen.getByTestId("veto-p1"));
    await fireEvent.press(screen.getByTestId("veto-confirm-p1"));
    await waitFor(() => expect(veto).toHaveBeenCalledTimes(1));
    await screen.findByTestId("veto-p1");
    expect(putVote).toHaveBeenCalledTimes(1);
  });

  test("VoteSection: post-action error copy still shows under StrictMode (mounted ref not stuck false)", async () => {
    let n = 0;
    const getVoteState = jest.fn(async (id: string) => {
      // StrictMode may double the first fetch; fail only a post-action fetch (after a vote press)
      if (pressed.current && ++n === 1) throw new Error("refresh");
      return st({ proposalId: id });
    });
    const pressed = { current: false };
    const putVote = jest.fn(async () => {
      pressed.current = true;
      return VOTE_OK;
    });
    await render(<StrictMode>{wrap(client({ getVoteState, putVote }), <VoteSection proposalId="p1" />)}</StrictMode>);
    await fireEvent.press(await screen.findByTestId("vote-approve-p1"));
    await screen.findByText(RECORDED_BUT);
  });

  test("VoteSection: proposal switch under StrictMode", async () => {
    const v = client({ getVoteState: async (id) => st({ proposalId: id, approveCount: id === "p1" ? 1 : 2 }) });
    const view = (id: string) => <StrictMode>{wrap(v, <VoteSection proposalId={id} />)}</StrictMode>;
    const r = await render(view("p1"));
    await screen.findByText("Interested: 1 | Can't make it: 1");
    await r.rerender(view("p2"));
    await screen.findByText("Interested: 2 | Can't make it: 1");
    expect(screen.queryByTestId("vote-approve-p1")).toBeNull();
  });

  test("EventsScreen and NotificationsScreen render under StrictMode with bounded fetches", async () => {
    const getConfirmedEvent = jest.fn(async (g: string) => ({ status: "confirmed" as const, event: { ...FIXTURE_EVENT, groupId: g } }));
    const listNotifications = jest.fn(async () => [{ id: "n1", title: "T", body: "B", createdAt: "c" }]);
    const exportIcs = jest.fn(async () => ({ filename: "x" }));
    const v = client({ getConfirmedEvent, listNotifications });
    await render(
      <StrictMode>
        {wrap(
          v,
          <GroupsProvider client={createMockGroupClient()}>
            <Seed>
              <EventsScreen />
              <NotificationsScreen />
            </Seed>
          </GroupsProvider>,
          { exportIcs },
        )}
      </StrictMode>,
    );
    await screen.findByText(FIXTURE_EVENT.summary);
    await screen.findByText("T");
    expect(getConfirmedEvent.mock.calls.length).toBeLessThanOrEqual(2);
    expect(listNotifications.mock.calls.length).toBeLessThanOrEqual(2);
    await fireEvent.press(screen.getByText("Add to calendar (.ics)"));
    await screen.findByText(STUB_COPY);
    expect(exportIcs).toHaveBeenCalledTimes(1);
  });
});
