import type { PlanningRunResponse, Proposal } from "@gather/contracts";
import { createContext, useContext, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { ActivityIndicator, Button, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { useGroups } from "./groupsState";
import { createMockPlanningClient } from "./planning";
import type { PlanningClient } from "./planning";
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

// Spec section 3 / 6.3: show at most three proposals, in backend-provided order. Nothing is re-ranked here.
const MAX_PROPOSALS = 3;

// Only backend-provided fields are rendered. The Proposal contract has no aggregate attendance counts or
// inclusion-aware alternative fields yet, so none are shown (SPEC section 9 request recorded in the handoff).
export function ProposalList({ proposals }: { proposals: Proposal[] }) {
  const shown = proposals.slice(0, MAX_PROPOSALS);
  if (shown.length === 0) return <Text>No proposals are available for this run.</Text>;
  return (
    <View style={styles.list}>
      {shown.map((p) => (
        <View key={p.proposalId} style={styles.card}>
          <Text style={styles.cardTitle}>{`#${p.rank} ${p.summary}`}</Text>
          {p.explanation ? <Text>{p.explanation}</Text> : null}
          <VoteSection proposalId={p.proposalId} />
        </View>
      ))}
    </View>
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
      return (
        <View style={styles.list}>
          <ActivityIndicator accessibilityLabel="Planning in progress" />
          <Text>Planning is in progress.</Text>
          <Button title="Refresh status" onPress={onRefresh} disabled={busy} />
        </View>
      );
    case "completed":
      return proposals ? (
        <ProposalList proposals={proposals} />
      ) : (
        <View style={styles.list}>
          <Text>Loading proposals.</Text>
          <Button title="Refresh proposals" onPress={onRefresh} disabled={busy} />
        </View>
      );
    case "failed":
      return (
        <View style={styles.list}>
          <Text accessibilityRole="alert">Planning did not finish. You can try again.</Text>
          <Button title="Try again" onPress={onRetry} disabled={busy} />
        </View>
      );
    default:
      return (
        <View style={styles.list}>
          <Text>{`Status: ${run.status}`}</Text>
          <Button title="Refresh status" onPress={onRefresh} disabled={busy} />
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

  async function work(fn: () => Promise<void>) {
    setError(null);
    setBusy(true);
    try {
      await fn();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
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

  if (!group)
    return (
      <View style={styles.container}>
        <Text>Create or join a group to start planning.</Text>
      </View>
    );

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Plan an activity</Text>
      {groups.length > 1
        ? groups.map((g) => (
            <Button
              key={g.id}
              title={g.id === group.id ? `${g.name} (selected)` : g.name}
              disabled={busy}
              onPress={() => {
                setGroupId(g.id);
                setRun(null);
                setProposals(null);
              }}
            />
          ))
        : <Text>{group.name}</Text>}
      <Text>What would you like to do? (optional)</Text>
      <TextInput
        accessibilityLabel="Activity request"
        style={styles.input}
        value={request}
        onChangeText={setRequest}
        multiline
        editable={!busy}
      />
      <Button title="Start planning" onPress={() => void start()} disabled={busy} />
      {error ? <Text accessibilityRole="alert">{error}</Text> : null}
      {run && run.groupId === group.id ? (
        <RunView
          run={run}
          proposals={proposals}
          busy={busy}
          onRefresh={() => void work(() => load(run.id))}
          onRetry={() => void start()}
        />
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, backgroundColor: "#fff", padding: 16, gap: 8 },
  title: { fontSize: 24, fontWeight: "700" },
  input: { borderWidth: 1, borderColor: "#999", alignSelf: "stretch", padding: 8, minHeight: 60 },
  list: { gap: 8 },
  card: { borderWidth: 1, borderColor: "#ccc", padding: 8, gap: 4 },
  cardTitle: { fontWeight: "600" },
});
