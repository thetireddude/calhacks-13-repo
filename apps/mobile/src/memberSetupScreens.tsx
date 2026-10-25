import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { AvailabilityWindow } from "@gather/contracts";
import { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { View } from "react-native";

import { useGroups } from "./groupsState";
import { AppText, Banner, Button, Card, Screen, Skeleton, TextField, Toggle } from "./ui";
import { validatePreferences, validateWeeklySettings, validateWindow } from "./memberSetup";
import type {
  LocalScheduleClient,
  MemberSetupClient,
  NotificationPermissionClient,
} from "./memberSetup";

export type SetupStackParams = {
  SetupHome: undefined;
  Preferences: undefined;
  Availability: undefined;
  WeeklyPlanning: { groupId: string };
};

type SetupDeps = {
  member: MemberSetupClient;
  schedule: LocalScheduleClient;
  notifications: NotificationPermissionClient;
};
const SetupContext = createContext<SetupDeps | null>(null);
export function MemberSetupProvider({ children, ...deps }: SetupDeps & { children: ReactNode }) {
  return <SetupContext.Provider value={deps}>{children}</SetupContext.Provider>;
}
function useSetup(): SetupDeps {
  const ctx = useContext(SetupContext);
  if (!ctx) throw new Error("useSetup must be used inside MemberSetupProvider");
  return ctx;
}

const EDGES: ("left" | "right")[] = ["left", "right"];
const SAVE_FAILED = "Could not save. Please try again.";
const LOAD_FAILED = "Could not load. Please try again.";

export function SetupHomeScreen({ navigation }: NativeStackScreenProps<SetupStackParams, "SetupHome">) {
  const { notifications } = useSetup();
  const { groups } = useGroups();
  const [notice, setNotice] = useState<string | null>(null);

  async function askPermission() {
    let result: "granted" | "denied" = "denied";
    try {
      result = await notifications.request();
    } catch {
      // treat as denied
    }
    setNotice(
      result === "granted"
        ? "Notifications are on."
        : "Notifications are off. You can still use Gather and see updates in the Notifications tab.",
    );
  }

  return (
    <Screen scroll edges={EDGES}>
      <AppText variant="display" accessibilityRole="header">
        Your setup
      </AppText>
      <AppText muted>Only you can see these details.</AppText>
      <Button title="Activity preferences" onPress={() => navigation.navigate("Preferences")} />
      <Button title="Availability" variant="secondary" onPress={() => navigation.navigate("Availability")} />
      <Button title="Allow notifications" variant="secondary" onPress={() => void askPermission()} />
      {notice ? <Banner tone="info" message={notice} /> : null}
      {groups.map((g) => (
        <Button
          key={g.id}
          title={`Weekly planning: ${g.name}`}
          variant="outline"
          onPress={() => navigation.navigate("WeeklyPlanning", { groupId: g.id })}
        />
      ))}
    </Screen>
  );
}

export function PreferencesScreen() {
  const { member } = useSetup();
  const [loaded, setLoaded] = useState(false);
  const [tags, setTags] = useState("");
  const [budgetMin, setBudgetMin] = useState("");
  const [budgetMax, setBudgetMax] = useState("");
  const [radius, setRadius] = useState("");
  const [learningOptIn, setLearningOptIn] = useState(false);
  const [savedLearning, setSavedLearning] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    member.getPreferences().then(
      (p) => {
        setTags(p.activityTags.join(", "));
        setBudgetMin(p.budgetMin === null ? "" : String(p.budgetMin));
        setBudgetMax(p.budgetMax === null ? "" : String(p.budgetMax));
        setRadius(p.travelRadiusKm === null ? "" : String(p.travelRadiusKm));
        setLearningOptIn(p.learningOptIn);
        setSavedLearning(p.learningOptIn);
        setLoadFailed(false);
        setLoaded(true);
      },
      () => setLoadFailed(true),
    );
  }, [member, attempt]);

  async function save() {
    setNotice(null);
    const result = validatePreferences({ tags, budgetMin, budgetMax, radius }, learningOptIn);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setError(null);
    try {
      const saved = await member.putPreferences(result.value);
      setSavedLearning(saved.learningOptIn);
      setNotice("Saved.");
    } catch {
      setError(SAVE_FAILED);
    }
  }

  if (!loaded) {
    return (
      <Screen edges={EDGES}>
        {loadFailed ? (
          <Banner
            message={LOAD_FAILED}
            onRetry={() => {
              setLoadFailed(false);
              setAttempt((n) => n + 1);
            }}
          />
        ) : (
          <View style={{ gap: 12 }}>
            <Skeleton height={56} radius={16} />
            <Skeleton height={56} radius={16} />
            <Skeleton height={56} radius={16} />
          </View>
        )}
      </Screen>
    );
  }
  return (
    <Screen scroll edges={EDGES}>
      <AppText variant="title" accessibilityRole="header">
        Make it yours
      </AppText>
      <AppText muted>Takes a minute. You can change it anytime.</AppText>
      <Card tone="peach">
        <AppText variant="heading">What are you up for?</AppText>
        <TextField
          label="Activity preferences"
          helper="Activities you like (separate with commas)"
          value={tags}
          onChangeText={setTags}
        />
      </Card>
      <Card>
        <AppText variant="heading">Budget per person</AppText>
        <TextField label="Minimum budget" value={budgetMin} onChangeText={setBudgetMin} keyboardType="numeric" />
        <TextField label="Maximum budget" value={budgetMax} onChangeText={setBudgetMax} keyboardType="numeric" />
        <AppText variant="small" muted>
          Budget and radius: leave blank for no limit.
        </AppText>
      </Card>
      <Card>
        <AppText variant="heading">How far will you go?</AppText>
        <TextField label="Travel radius" helper="Travel radius (km)" value={radius} onChangeText={setRadius} keyboardType="numeric" />
      </Card>
      <Card tone="lilac">
        <Toggle label="Learn from my history" value={learningOptIn} onValueChange={setLearningOptIn} />
        <AppText variant="small" muted>
          Only you can see your history. Turn this off and Gather will not use it when suggesting plans.
        </AppText>
        <AppText variant="small">{savedLearning ? "Saved: learning is on." : "Saved: learning is off."}</AppText>
        {learningOptIn !== savedLearning ? <AppText variant="small">Unsaved change.</AppText> : null}
      </Card>
      {error ? <Banner message={error} /> : null}
      {notice ? <Banner tone="info" message={notice} /> : null}
      <Button title="Save preferences" onPress={() => void save()} />
    </Screen>
  );
}

export function AvailabilityScreen() {
  const { member } = useSetup();
  const [windows, setWindows] = useState<AvailabilityWindow[]>([]);
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [label, setLabel] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    member.getAvailability().then(
      (a) => {
        setWindows(a.windows);
        setLoadFailed(false);
        setLoaded(true);
      },
      () => setLoadFailed(true),
    );
  }, [member, attempt]);

  function add() {
    setNotice(null);
    const problem = validateWindow(start, end);
    if (problem) {
      setError(problem);
      return;
    }
    setError(null);
    const trimmedLabel = label.trim();
    setWindows((prev) => [
      ...prev,
      { startsAt: start.trim(), endsAt: end.trim(), ...(trimmedLabel ? { label: trimmedLabel } : {}) },
    ]);
    setStart("");
    setEnd("");
    setLabel("");
  }

  async function save() {
    try {
      const saved = await member.putAvailability({ windows });
      setWindows(saved.windows);
      setError(null);
      setNotice("Saved.");
    } catch {
      setError(SAVE_FAILED);
    }
  }

  if (!loaded) {
    return (
      <Screen edges={EDGES}>
        {loadFailed ? (
          <Banner
            message={LOAD_FAILED}
            onRetry={() => {
              setLoadFailed(false);
              setAttempt((n) => n + 1);
            }}
          />
        ) : (
          <View style={{ gap: 12 }}>
            <Skeleton height={56} radius={16} />
            <Skeleton height={56} radius={16} />
            <Skeleton height={56} radius={16} />
          </View>
        )}
      </Screen>
    );
  }

  return (
    <Screen scroll edges={EDGES}>
      <AppText variant="title" accessibilityRole="header">
        Your availability
      </AppText>
      <AppText muted>Enter start and end like 2026-01-02T18:00 (format not final).</AppText>
      {windows.length === 0 ? (
        <Card tone="peach">
          <AppText>No windows yet.</AppText>
        </Card>
      ) : null}
      {windows.map((w, i) => (
        <Card key={`${w.startsAt}-${w.endsAt}-${i}`} tone="mint">
          <AppText>{`${w.startsAt} to ${w.endsAt}${w.label ? ` (${w.label})` : ""}`}</AppText>
          <Button
            title="Remove"
            variant="outline"
            accessibilityLabel={`Remove window ${i + 1}`}
            onPress={() => setWindows((p) => p.filter((_, j) => j !== i))}
          />
        </Card>
      ))}
      <Card>
        <TextField label="Window start" value={start} onChangeText={setStart} autoCapitalize="none" />
        <TextField label="Window end" value={end} onChangeText={setEnd} autoCapitalize="none" />
        <TextField label="Window label" value={label} onChangeText={setLabel} />
        <Button title="Add window" variant="secondary" onPress={add} />
      </Card>
      {error ? <Banner message={error} /> : null}
      {notice ? <Banner tone="info" message={notice} /> : null}
      <Button title="Save availability" onPress={() => void save()} />
    </Screen>
  );
}

// Mobile-local and unapproved: see LocalWeeklySettings in memberSetup.ts.
export function WeeklyPlanningScreen({ route }: NativeStackScreenProps<SetupStackParams, "WeeklyPlanning">) {
  const { schedule } = useSetup();
  const { groupId } = route.params;
  const [weekday, setWeekday] = useState("");
  const [time, setTime] = useState("");
  const [deadline, setDeadline] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    schedule.get(groupId).then(
      (s) => {
        if (!s) return;
        setWeekday(String(s.weekday));
        setTime(s.time);
        setDeadline(String(s.votingDeadlineHours));
      },
      () => setError(LOAD_FAILED),
    );
  }, [schedule, groupId]);

  async function save() {
    setNotice(null);
    const result = validateWeeklySettings(weekday, time, deadline);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setError(null);
    try {
      await schedule.put(groupId, result.value);
      setNotice("Saved.");
    } catch {
      setError(SAVE_FAILED);
    }
  }

  return (
    <Screen scroll edges={EDGES}>
      <AppText variant="title" accessibilityRole="header">
        Weekly planning
      </AppText>
      <Banner tone="info" message="Draft settings, not yet connected to the backend (mobile-local, unapproved)." />
      <AppText muted>Weekday 0 (Sunday) to 6 (Saturday), time like 18:00, deadline in hours.</AppText>
      <TextField label="Weekday" value={weekday} onChangeText={setWeekday} keyboardType="number-pad" />
      <TextField label="Planning time" value={time} onChangeText={setTime} autoCapitalize="none" />
      <TextField label="Voting deadline hours" value={deadline} onChangeText={setDeadline} keyboardType="number-pad" />
      {error ? <Banner message={error} /> : null}
      {notice ? <Banner tone="info" message={notice} /> : null}
      <Button title="Save weekly planning" onPress={() => void save()} />
    </Screen>
  );
}
