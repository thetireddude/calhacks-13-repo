import type { ConfirmedEventResponse } from "@gather/contracts";
import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { View } from "react-native";

import { useGroups } from "./groupsState";
import { AppText, Banner, Button, Card, Chip, EmptyState, Screen, VoteButton } from "./ui";
import type { ChipTone } from "./ui";
import { shareIcsFile } from "./icsShare";
import { VotingError, createMockIcsClient, createMockVotingClient } from "./voting";
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
const SESSION_EXPIRED = "Your session has expired. Please sign out and sign in again.";
const errorText = (e: unknown) =>
  e instanceof VotingError && e.code === "unauthenticated" ? SESSION_EXPIRED : GENERIC_ERROR;

// Renders backend-provided vote state for one proposal. Statuses are SPEC section 11 stubs; nothing here
// computes majority, deadlines, veto scope, revision or confirmation. Veto is its own control and its own
// client call; it is never a vote choice and is shown only when the backend says `vetoAllowed`.
export function VoteSection({ proposalId }: { proposalId: string }) {
  // Keyed so a proposal change remounts with fresh state: old counts and errors never show under a new id.
  return <VoteSectionBody key={proposalId} proposalId={proposalId} />;
}

function VoteSectionBody({ proposalId }: { proposalId: string }) {
  const { voting } = useVoting();
  const [state, setState] = useState<ProposalVoteStateView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmingVeto, setConfirmingVeto] = useState(false);
  // False once this body unmounts (proposal changed or screen left): late results are dropped.
  const mounted = useRef(true);
  const inFlight = useRef(false);

  useEffect(() => {
    mounted.current = true;
    let live = true;
    voting.getVoteState(proposalId).then(
      (s) => live && setState(s),
      () => live && setError(GENERIC_ERROR),
    );
    return () => {
      live = false;
      mounted.current = false;
    };
  }, [voting, proposalId]);

  async function act(fn: () => Promise<unknown>) {
    // Ref guard: set synchronously so two presses before a re-render cannot both start a call.
    if (inFlight.current) return;
    inFlight.current = true;
    try {
      await run(fn);
    } finally {
      inFlight.current = false;
    }
  }

  async function run(fn: () => Promise<unknown>) {
    const forId = proposalId;
    const stale = () => !mounted.current;
    setError(null);
    setConfirmingVeto(false);
    setBusy(true);
    try {
      await fn();
    } catch (e) {
      if (!stale()) {
        setError(errorText(e));
        setBusy(false);
      }
      return;
    }
    try {
      const fresh = await voting.getVoteState(forId);
      if (!stale()) setState(fresh);
    } catch {
      if (!stale()) setError("Your action was recorded, but the latest state could not be loaded. Please refresh.");
    }
    if (!stale()) setBusy(false);
  }

  if (!state) return error ? <Banner message={error} /> : <AppText variant="small" muted>Loading votes.</AppText>;

  // Backend flag only; `status` is display-only.
  const canVote = state.voteAllowed;
  const chip: { tone: ChipTone; label?: string } | null =
    state.status === "open"
      ? { tone: "voting" }
      : state.status === "vetoed"
        ? { tone: "vetoed" }
        : state.status === "revision" || state.status === "revote"
          ? { tone: "planning" }
          : state.status === "confirmed"
            ? { tone: "confirmed" }
            : state.status === "cancelled"
              ? { tone: "vetoed", label: "Cancelled" }
              : null;
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

  const approve = () => void act(() => voting.putVote(proposalId, { choice: "approve" }));
  const cantMakeIt = () => void act(() => voting.putVote(proposalId, { choice: "cant_make_it" }));
  const veto = () => void act(() => voting.veto(proposalId));
  const askVeto = () => setConfirmingVeto(true);
  const cancelVeto = () => setConfirmingVeto(false);

  return (
    <View style={{ gap: 12, marginTop: 8 }} testID={`vote-section-${proposalId}`}>
      {chip ? <Chip tone={chip.tone} label={chip.label} /> : null}
      {banner ? (
        <View testID={`vote-banner-${proposalId}`}>
          <Banner tone="info" message={banner} />
        </View>
      ) : null}
      {state.deadline ? (
        <AppText variant="small" muted>{`Voting closes: ${state.deadline}`}</AppText>
      ) : null}
      {state.approveCount !== undefined && state.cantMakeItCount !== undefined ? (
        <Card tone="sky" style={{ gap: 4 }}>
          <AppText variant="label">Group so far</AppText>
          <AppText>{`Yes: ${state.approveCount} | Can't make it: ${state.cantMakeItCount}`}</AppText>
        </Card>
      ) : (
        <AppText variant="small" muted>Vote counts are not available yet.</AppText>
      )}
      {state.myVeto ? <AppText>You vetoed this proposal.</AppText> : null}
      {state.myChoice ? (
        <AppText>{`Your vote: ${state.myChoice === "approve" ? "Yes" : "Can't make it"}`}</AppText>
      ) : null}
      {canVote ? (
        <View style={{ gap: 8 }}>
          <View style={{ flexDirection: "row", gap: 12 }}>
            <VoteButton
              testID={`vote-approve-${proposalId}`}
              kind="yes"
              selected={state.myChoice === "approve"}
              disabled={busy}
              onPress={approve}
            />
            <VoteButton
              testID={`vote-cant-make-it-${proposalId}`}
              kind="cant_make_it"
              selected={state.myChoice === "cant_make_it"}
              disabled={busy}
              onPress={cantMakeIt}
            />
          </View>
          {/* VoteChoice has no "suggest another"; shown disabled until a SPEC section 9 change lands. */}
          <Button
            title="Suggest another (not available yet)"
            variant="outline"
            testID={`vote-suggest-${proposalId}`}
            disabled
            onPress={() => {}}
          />
        </View>
      ) : null}
      {canVote && state.vetoAllowed ? (
        <Card tone="peach" style={{ gap: 8 }}>
          <AppText variant="small">A veto is separate from your vote.</AppText>
          {confirmingVeto ? (
            <View style={{ gap: 8 }}>
              <AppText>Veto this proposal? This is not the same as Can&apos;t make it.</AppText>
              <Button testID={`veto-confirm-${proposalId}`} title="Confirm veto" icon="stop" disabled={busy} onPress={veto} />
              <Button
                testID={`veto-cancel-${proposalId}`}
                title="Cancel"
                variant="secondary"
                disabled={busy}
                onPress={cancelVeto}
              />
            </View>
          ) : (
            <Button
              testID={`veto-${proposalId}`}
              title="Veto this proposal"
              variant="outline"
              icon="stop"
              disabled={busy}
              onPress={askVeto}
            />
          )}
        </Card>
      ) : null}
      {error ? <Banner message={error} /> : null}
    </View>
  );
}

function GroupEvent({ groupId, groupName }: { groupId: string; groupName: string }) {
  const { voting, ics } = useVoting();
  const [view, setView] = useState<ConfirmedEventView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const exportInFlight = useRef(false);

  useEffect(() => {
    let live = true;
    voting.getConfirmedEvent(groupId).then(
      (v) => live && setView(v),
      (e) => live && setError(errorText(e)),
    );
    return () => {
      live = false;
    };
  }, [voting, groupId]);

  async function exportIcs(event: ConfirmedEventResponse) {
    if (exportInFlight.current) return;
    exportInFlight.current = true;
    setNotice(null);
    setError(null);
    setExporting(true);
    try {
      const result = await ics.exportIcs(event.id);
      if (result.content === undefined) {
        setNotice("Calendar export is not connected yet (stub).");
      } else {
        // The user picks the destination in the share sheet; nothing is added to a calendar silently.
        const outcome = await shareIcsFile(result.filename, result.content);
        setNotice(
          outcome === "shared"
            ? "Choose where to save or open the calendar file."
            : "Sharing is not available on this device.",
        );
      }
    } catch {
      setError(GENERIC_ERROR);
    } finally {
      exportInFlight.current = false;
      setExporting(false);
    }
  }

  // Visible to every group member: nothing here reads the member's own vote.
  return (
    <View testID={`event-${groupId}`}>
      <Card tone={view?.status === "confirmed" ? "mint" : "surface"}>
        <AppText variant="heading">{groupName}</AppText>
        {!view && !error ? <AppText variant="small" muted>Loading event.</AppText> : null}
        {view?.status === "none" ? <AppText>No confirmed event yet.</AppText> : null}
        {view && view.status !== "none" ? (
          <>
            {view.status === "confirmed" ? <Chip tone="confirmed" /> : <Chip tone="vetoed" label="Cancelled" />}
            <AppText variant="title">{view.event.summary}</AppText>
            <AppText variant="small" muted>{`Confirmed at: ${view.event.confirmedAt}`}</AppText>
            {view.status === "cancelled" ? (
              <AppText accessibilityRole="alert">This event was cancelled.</AppText>
            ) : (
              <Button title="Add to calendar (.ics)" disabled={exporting} onPress={() => void exportIcs(view.event)} />
            )}
          </>
        ) : null}
        {notice ? <AppText variant="small">{notice}</AppText> : null}
        {error ? <Banner message={error} /> : null}
      </Card>
    </View>
  );
}

export function EventsScreen() {
  const { groups } = useGroups();
  if (groups.length === 0)
    return (
      <Screen edges={["left", "right"]}>
        <EmptyState title="No events yet" message="Create or join a group to see events." />
      </Screen>
    );
  return (
    <Screen scroll edges={["left", "right"]}>
      <AppText variant="display">Events</AppText>
      {groups.map((g) => (
        <GroupEvent key={g.id} groupId={g.id} groupName={g.name} />
      ))}
    </Screen>
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
    <Screen scroll edges={["left", "right"]}>
      <AppText variant="display">What&apos;s new</AppText>
      {error ? <Banner message={error} /> : null}
      {!items && !error ? <AppText variant="small" muted>Loading notifications.</AppText> : null}
      {items && items.length === 0 ? (
        <EmptyState title="No notifications yet." />
      ) : null}
      {items?.map((n) => (
        <Card key={n.id}>
          <AppText variant="heading">{n.title}</AppText>
          <AppText>{n.body}</AppText>
          <AppText variant="small" muted>{n.createdAt}</AppText>
        </Card>
      ))}
    </Screen>
  );
}
