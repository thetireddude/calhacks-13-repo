import type { ConfirmedEventResponse } from "@gather/contracts";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { Button, ScrollView, StyleSheet, Text, View } from "react-native";

import { useGroups } from "./groupsState";
import { createMockIcsClient, createMockVotingClient } from "./voting";
import type {
  ConfirmedEventView,
  IcsClient,
  NotificationItemView,
  ProposalVoteStateView,
  VotingClient,
} from "./voting";

type VotingContextValue = { voting: VotingClient; ics: IcsClient };
const VotingContext = createContext<VotingContextValue | null>(null);

export function VotingProvider({
  voting,
  ics,
  children,
}: {
  voting?: VotingClient;
  ics?: IcsClient;
  children: ReactNode;
}) {
  const value = useMemo(
    () => ({ voting: voting ?? createMockVotingClient(), ics: ics ?? createMockIcsClient() }),
    [voting, ics],
  );
  return <VotingContext.Provider value={value}>{children}</VotingContext.Provider>;
}

function useVoting(): VotingContextValue {
  const ctx = useContext(VotingContext);
  if (!ctx) throw new Error("useVoting must be used inside VotingProvider");
  return ctx;
}

const GENERIC_ERROR = "Something went wrong. Please try again.";

// Renders backend-provided vote state for one proposal. Statuses are SPEC section 11 stubs; nothing here
// computes majority, deadlines, veto scope, revision or confirmation. Veto is its own control and its own
// client call; it is never a vote choice and is shown only when the backend says `vetoAllowed`.
export function VoteSection({ proposalId }: { proposalId: string }) {
  const { voting } = useVoting();
  const [state, setState] = useState<ProposalVoteStateView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let live = true;
    voting.getVoteState(proposalId).then(
      (s) => live && setState(s),
      () => live && setError(GENERIC_ERROR),
    );
    return () => {
      live = false;
    };
  }, [voting, proposalId]);

  async function act(fn: () => Promise<unknown>) {
    setError(null);
    setBusy(true);
    try {
      await fn();
      setState(await voting.getVoteState(proposalId));
    } catch {
      setError(GENERIC_ERROR);
    } finally {
      setBusy(false);
    }
  }

  if (!state) return error ? <Text accessibilityRole="alert">{error}</Text> : <Text>Loading votes.</Text>;

  const canVote = state.status === "open" || state.status === "revote";
  const banner =
    state.status === "vetoed"
      ? "This proposal was vetoed."
      : state.status === "revision"
        ? "This proposal was revised."
        : state.status === "revote"
          ? "Revote: please vote again."
          : state.status === "confirmed"
            ? "This plan is confirmed."
            : state.status === "cancelled"
              ? "This plan was cancelled."
              : state.status === "open"
                ? null
                : `Status: ${state.status}`;

  return (
    <View style={styles.section} testID={`vote-section-${proposalId}`}>
      {banner ? <Text accessibilityRole="alert" testID={`vote-banner-${proposalId}`}>{banner}</Text> : null}
      {state.deadline ? <Text>{`Voting closes: ${state.deadline}`}</Text> : null}
      <Text>{`Interested: ${state.approveCount} | Can't make it: ${state.cantMakeItCount}`}</Text>
      {state.myChoice ? (
        <Text>{`Your vote: ${state.myChoice === "approve" ? "Interested" : "Can't make it"}`}</Text>
      ) : null}
      {canVote ? (
        <View style={styles.row}>
          <Button
            title="Interested"
            testID={`vote-approve-${proposalId}`}
            disabled={busy}
            onPress={() => void act(() => voting.putVote(proposalId, { choice: "approve" }))}
          />
          <Button
            title="Can't make it"
            testID={`vote-cant-make-it-${proposalId}`}
            disabled={busy}
            onPress={() => void act(() => voting.putVote(proposalId, { choice: "cant_make_it" }))}
          />
          {/* VoteChoice has no "suggest another"; shown disabled until a SPEC section 9 change lands. */}
          <Button title="Suggest another (not available yet)" testID={`vote-suggest-${proposalId}`} disabled onPress={() => {}} />
        </View>
      ) : null}
      {canVote && state.vetoAllowed ? (
        <View style={styles.vetoBox}>
          <Text>Veto is separate from voting.</Text>
          <Button
            title="Veto this proposal"
            color="#b00020"
            testID={`veto-${proposalId}`}
            disabled={busy}
            onPress={() => void act(() => voting.veto(proposalId))}
          />
        </View>
      ) : null}
      {error ? <Text accessibilityRole="alert">{error}</Text> : null}
    </View>
  );
}

function GroupEvent({ groupId, groupName }: { groupId: string; groupName: string }) {
  const { voting, ics } = useVoting();
  const [view, setView] = useState<ConfirmedEventView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    voting.getConfirmedEvent(groupId).then(
      (v) => live && setView(v),
      () => live && setError(GENERIC_ERROR),
    );
    return () => {
      live = false;
    };
  }, [voting, groupId]);

  async function exportIcs(event: ConfirmedEventResponse) {
    setNotice(null);
    setError(null);
    try {
      const res = await ics.exportIcs(event.id);
      setNotice(`Calendar file ready: ${res.filename}`);
    } catch {
      setError(GENERIC_ERROR);
    }
  }

  // Visible to every group member: nothing here reads the member's own vote.
  return (
    <View style={styles.card} testID={`event-${groupId}`}>
      <Text style={styles.cardTitle}>{groupName}</Text>
      {!view && !error ? <Text>Loading event.</Text> : null}
      {view?.status === "none" ? <Text>No confirmed event yet.</Text> : null}
      {view && view.status !== "none" ? (
        <>
          <Text>{view.event.summary}</Text>
          <Text>{`Confirmed at: ${view.event.confirmedAt}`}</Text>
          {view.status === "cancelled" ? (
            <Text accessibilityRole="alert">This event was cancelled.</Text>
          ) : (
            <Button title="Add to calendar (.ics)" onPress={() => void exportIcs(view.event)} />
          )}
        </>
      ) : null}
      {notice ? <Text>{notice}</Text> : null}
      {error ? <Text accessibilityRole="alert">{error}</Text> : null}
    </View>
  );
}

export function EventsScreen() {
  const { groups } = useGroups();
  if (groups.length === 0)
    return (
      <View style={styles.container}>
        <Text>Create or join a group to see events.</Text>
      </View>
    );
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Events</Text>
      {groups.map((g) => (
        <GroupEvent key={g.id} groupId={g.id} groupName={g.name} />
      ))}
    </ScrollView>
  );
}

// The feed comes from the backend list only; it does not depend on push permission or registration.
// Notification contents are rendered, never logged.
export function NotificationsScreen() {
  const { voting } = useVoting();
  const [items, setItems] = useState<NotificationItemView[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    voting.listNotifications().then(
      (l) => live && setItems(l),
      () => live && setError(GENERIC_ERROR),
    );
    return () => {
      live = false;
    };
  }, [voting]);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Notifications</Text>
      {error ? <Text accessibilityRole="alert">{error}</Text> : null}
      {!items && !error ? <Text>Loading notifications.</Text> : null}
      {items && items.length === 0 ? <Text>No notifications yet.</Text> : null}
      {items?.map((n) => (
        <View key={n.id} style={styles.card}>
          <Text style={styles.cardTitle}>{n.title}</Text>
          <Text>{n.body}</Text>
          <Text>{n.createdAt}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, backgroundColor: "#fff", padding: 16, gap: 8 },
  title: { fontSize: 24, fontWeight: "700" },
  section: { gap: 6, marginTop: 6 },
  row: { gap: 6 },
  vetoBox: { borderWidth: 1, borderColor: "#b00020", padding: 8, gap: 4, marginTop: 8 },
  card: { borderWidth: 1, borderColor: "#ccc", padding: 8, gap: 4 },
  cardTitle: { fontWeight: "600" },
});
