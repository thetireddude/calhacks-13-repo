import type { PlanningRunResponse, Proposal } from "@gather/contracts";
import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { View } from "react-native";

import { useGroups } from "./groupsState";
import { PlanningError, createMockPlanningClient } from "./planning";
import type { PlanningClient } from "./planning";
import { useTheme } from "./theme";
import { AppText, Banner, Button, Card, EmptyState, Screen, Skeleton, TextField } from "./ui";
import { VoteSection } from "./votingScreens";

const PlanningContext = createContext<PlanningClient | null>(null);

export function PlanningProvider({ client, children }: { client?: PlanningClient; children: ReactNode }) {
  const value = useMemo(() => client ?? createMockPlanningClient(), [client]);
  return <PlanningContext.Provider value={value}>{children}</PlanningContext.Provider>;
}

function usePlanning(): PlanningClient {
  const ctx = useContext(PlanningContext);
  if (!ctx) throw new Error("usePlanning must be used inside PlanningProvider");
  return ctx;
}

// Run-status polling interval while a run is `pending` (no realtime channel exists).
export const POLL_INTERVAL_MS = 3000;

// Spec section 3 / 6.3: show at most three proposals, in backend-provided order. Nothing is re-ranked here.
const MAX_PROPOSALS = 3;

// Card tones by display position (design: peach, mint, sky). Presentation only; order is the backend's.
const CARD_TONES = ["peach", "mint", "sky"] as const;

// Only backend-provided fields are rendered. The Proposal contract has no aggregate attendance counts, location,
// time, cost or inclusion-aware alternative fields yet, so none are shown (SPEC section 9 request recorded in the handoff).
export function ProposalList({ proposals }: { proposals: Proposal[] }) {
  const { colors, radius, bold } = useTheme();
  const shown = proposals.slice(0, MAX_PROPOSALS);
  if (shown.length === 0)
    return (
      <EmptyState
        title="No proposals are available for this run."
        message="No plans yet. Start one and the group will see it first."
      />
    );
  return (
    <View style={{ gap: 16 }}>
      {shown.map((p, i) => (
        <Card key={p.proposalId} tone={CARD_TONES[i]} style={{ gap: 12 }}>
          <View
            style={{
              alignSelf: "flex-start",
              backgroundColor: colors.surface,
              borderRadius: radius.pill,
              paddingHorizontal: 12,
              paddingVertical: 4,
            }}
          >
            <AppText variant="small" style={bold}>
              {i === 0 ? "Top pick" : "Also a good fit"}
            </AppText>
          </View>
          <AppText variant="title">{`#${p.rank} ${p.summary}`}</AppText>
          {p.explanation ? (
            <View style={{ backgroundColor: colors.surface, borderRadius: radius.input, padding: 12 }}>
              <AppText variant="small">{p.explanation}</AppText>
            </View>
          ) : null}
          <VoteSection proposalId={p.proposalId} />
        </Card>
      ))}
    </View>
  );
}

function PlanningInProgress({ busy, onRefresh }: { busy: boolean; onRefresh: () => void }) {
  const { colors } = useTheme();
  return (
    <Card tone="lilac" style={{ gap: 16, alignItems: "center" }}>
      <View
        accessible
        accessibilityLabel="Planning in progress"
        style={{
          width: 96,
          height: 96,
          borderRadius: 48,
          backgroundColor: colors.coral,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <AppText variant="display" color={colors.onCoral}>
          ✦
        </AppText>
      </View>
      <AppText variant="title" style={{ textAlign: "center" }}>
        Hang tight, we’re on it
      </AppText>
      <AppText style={{ textAlign: "center" }}>Planning is in progress.</AppText>
      <AppText variant="small" muted style={{ textAlign: "center" }}>
        Nobody’s private calendar is shared with the group.
      </AppText>
      <Button title="Refresh status" variant="secondary" onPress={onRefresh} disabled={busy} />
    </Card>
  );
}

// Status strings are SPEC section 11 stubs: `pending` and `completed` are named by the contract, `failed` is
// handled as the recoverable case, anything else gets a neutral display.
function RunView({
  run,
  proposals,
  busy,
  onRefresh,
  onRetry,
}: {
  run: PlanningRunResponse;
  proposals: Proposal[] | null;
  busy: boolean;
  onRefresh: () => void;
  onRetry: () => void;
}) {
  switch (run.status) {
    case "pending":
      return <PlanningInProgress busy={busy} onRefresh={onRefresh} />;
    case "completed":
      return proposals ? (
        <ProposalList proposals={proposals} />
      ) : (
        <View style={{ gap: 12 }}>
          <AppText>Loading proposals.</AppText>
          <Skeleton height={120} radius={24} />
          <Button title="Refresh proposals" variant="secondary" onPress={onRefresh} disabled={busy} />
        </View>
      );
    case "failed":
      // retryBusy disables the button while in flight; the work() ref guard also drops double presses (tested).
      return <Banner message="Planning did not finish. You can try again." retryLabel="Try again" retryBusy={busy} onRetry={onRetry} />;
    default:
      return (
        <View style={{ gap: 12 }}>
          <AppText>{`Status: ${run.status}`}</AppText>
          <Button title="Refresh status" variant="secondary" onPress={onRefresh} disabled={busy} />
        </View>
      );
  }
}

export function PlanningScreen() {
  const client = usePlanning();
  const { groups } = useGroups();
  const [groupId, setGroupId] = useState<string | null>(null);
  const [request, setRequest] = useState("");
  const [run, setRun] = useState<PlanningRunResponse | null>(null);
  const [proposals, setProposals] = useState<Proposal[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const activeId = groupId ?? groups[0]?.id ?? null;
  const group = groups.find((g) => g.id === activeId);

  async function load(runId: string) {
    const latest = await client.getRun(runId);
    setRun(latest);
    setProposals(latest.status === "completed" ? (await client.getProposals(runId)).proposals : null);
  }

  const inFlight = useRef(false);

  async function work(fn: () => Promise<void>) {
    // Ref guard: set synchronously so a double press before re-render cannot start two calls.
    if (inFlight.current) return;
    inFlight.current = true;
    setError(null);
    setBusy(true);
    try {
      await fn();
    } catch (e) {
      setError(
        e instanceof PlanningError && e.code === "unauthenticated"
          ? "Your session has expired. Please sign out and sign in again."
          : "Something went wrong. Please try again.",
      );
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }

  // Both start and retry submit a new planning run: the contract has no separate retry route.
  const start = () =>
    work(async () => {
      if (!activeId) return;
      const text = request.trim();
      const created = await client.createRun(activeId, text === "" ? {} : { activityRequest: text });
      setRun(created);
      setProposals(null);
      await load(created.id);
    });

  // Retry a failed run in place when the client supports it (real API); otherwise start a new run.
  const retry = (runId: string) =>
    client.retryRun
      ? work(async () => {
          setRun(await client.retryRun!(runId));
          setProposals(null);
          await load(runId);
        })
      : start();

  // Poll getRun only while the run is pending. Stops on any other status, on error, or on unmount/run change.
  const pollRunId = run?.status === "pending" ? run.id : null;
  useEffect(() => {
    if (!pollRunId) return;
    let live = true;
    let inFlight = false;
    const timer = setInterval(() => {
      if (inFlight) return;
      inFlight = true;
      client
        .getRun(pollRunId)
        .then(async (latest) => {
          if (!live) return;
          const done = latest.status === "completed" ? (await client.getProposals(pollRunId)).proposals : null;
          if (!live) return;
          setRun(latest);
          if (done) setProposals(done);
        })
        .catch(() => {
          if (!live) return;
          clearInterval(timer);
          setError("Something went wrong. Please try again.");
        })
        .finally(() => {
          inFlight = false;
        });
    }, POLL_INTERVAL_MS);
    return () => {
      live = false;
      clearInterval(timer);
    };
  }, [client, pollRunId]);

  // Screens sit under the navigation header, so no top safe-area edge; bottom padding clears the floating tab bar.
  if (!group)
    return (
      <Screen edges={[]}>
        <AppText>Create or join a group to start planning.</AppText>
      </Screen>
    );

  return (
    <Screen scroll edges={[]} contentStyle={{ paddingBottom: 120 }}>
      <AppText variant="display">Plan an activity</AppText>
      {groups.length > 1 ? (
        groups.map((g) => (
          <Button
            key={g.id}
            title={g.id === group.id ? `${g.name} (selected)` : g.name}
            variant={g.id === group.id ? "secondary" : "outline"}
            disabled={busy}
            onPress={() => {
              setGroupId(g.id);
              setRun(null);
              setProposals(null);
            }}
          />
        ))
      ) : (
        <AppText variant="heading">{group.name}</AppText>
      )}
      <TextField
        label="What would you like to do? (optional)"
        accessibilityLabel="Activity request"
        value={request}
        onChangeText={setRequest}
        multiline
        editable={!busy}
      />
      <Button title="Start planning" onPress={() => void start()} disabled={busy} />
      {error ? <Banner message={error} /> : null}
      {run && run.groupId === group.id ? (
        <RunView
          run={run}
          proposals={proposals}
          busy={busy}
          onRefresh={() => void work(() => load(run.id))}
          onRetry={() => void retry(run.id)}
        />
      ) : null}
    </Screen>
  );
}
