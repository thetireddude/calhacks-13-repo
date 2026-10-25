import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { AvailabilityWindow } from "@gather/contracts";
import { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { View } from "react-native";

import { useGroups } from "./groupsState";
import { AppText, Banner, Button, Card, Screen, Skeleton, TextField, Toggle } from "./ui";
import { MemberSetupError, validatePreferences, validateWindow } from "./memberSetup";
import type {
  MemberSetupClient,
  NotificationPermissionClient,
  ScheduleClient,
} from "./memberSetup";

export type SetupStackParams = {
  SetupHome: undefined;
  Preferences: undefined;
  Availability: undefined;
  WeeklyPlanning: { groupId: string };
};

type SetupDeps = {
  member: MemberSetupClient;
  schedule: ScheduleClient;
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

// Stores GroupSchedule config (timezone + weekly toggle) through the ScheduleClient. The backend does not
// auto-plan from it yet (SPEC section 11), so the screen says so rather than implying a schedule runs.
const TIMEZONE_HINT = "Enter a timezone such as America/Los_Angeles.";
const SCHEDULE_FORBIDDEN = "You do not have access to this group's settings.";
const SCHEDULE_NOT_FOUND = "This group was not found.";
const SCHEDULE_REJECTED = "The server rejected these settings. Enter a timezone such as America/Los_Angeles.";

// Light client-side check only; the server stays authoritative for timezone validation.
function isIanaTimezone(tz: string): boolean {
  if (tz.trim() === "") return false;
  try {
    new Intl.DateTimeFormat(undefined, { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

export function WeeklyPlanningScreen({ route }: NativeStackScreenProps<SetupStackParams, "WeeklyPlanning">) {
  const { schedule } = useSetup();
  const { groupId } = route.params;
  const [timezone, setTimezone] = useState("");
  const [weeklyEnabled, setWeeklyEnabled] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    schedule.get(groupId).then(
      (s) => {
        if (!live) return;
        setTimezone(s.timezone);
        setWeeklyEnabled(s.weeklyEnabled);
        setLoaded(true);
      },
      () => live && setError(LOAD_FAILED),
    );
    return () => {
      live = false;
    };
  }, [schedule, groupId]);

  async function save() {
    if (saving) return;
    setNotice(null);
    setError(null);
    if (!isIanaTimezone(timezone)) {
      setError(TIMEZONE_HINT);
      return;
    }
    setSaving(true);
    try {
      const saved = await schedule.put(groupId, { timezone, weeklyEnabled });
      setTimezone(saved.timezone);
      setWeeklyEnabled(saved.weeklyEnabled);
      setNotice("Saved.");
    } catch (e) {
      const code = e instanceof MemberSetupError ? e.code : null;
      setError(
        code === "invalid"
          ? SCHEDULE_REJECTED
          : code === "forbidden"
            ? SCHEDULE_FORBIDDEN
            : code === "not_found"
              ? SCHEDULE_NOT_FOUND
              : SAVE_FAILED,
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen scroll edges={EDGES}>
      <AppText variant="title" accessibilityRole="header">
        Weekly planning
      </AppText>
      <Banner tone="info" message="These settings are saved for your group. Automatic weekly planning is not available yet." />
      {loaded ? (
        <>
          <TextField label="Timezone" value={timezone} onChangeText={setTimezone} autoCapitalize="none" />
          <Toggle label="Weekly planning enabled" value={weeklyEnabled} onValueChange={setWeeklyEnabled} />
        </>
      ) : error ? null : (
        <AppText variant="small" muted>Loading settings.</AppText>
      )}
      {error ? <Banner message={error} /> : null}
      {notice ? <Banner tone="info" message={notice} /> : null}
      {loaded ? <Button title="Save weekly planning" disabled={saving} onPress={() => void save()} /> : null}
    </Screen>
  );
}
