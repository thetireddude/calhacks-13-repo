import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { AvailabilityWindow } from "@gather/contracts";
import { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { Button, StyleSheet, Switch, Text, TextInput, View } from "react-native";

import { useGroups } from "./groupsState";
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
    <View style={styles.container}>
      <Text style={styles.title}>Your setup</Text>
      <Text>Only you can see these details.</Text>
      <Button title="Activity preferences" onPress={() => navigation.navigate("Preferences")} />
      <Button title="Availability" onPress={() => navigation.navigate("Availability")} />
      <Button title="Allow notifications" onPress={() => void askPermission()} />
      {notice ? <Text>{notice}</Text> : null}
      {groups.map((g) => (
        <Button
          key={g.id}
          title={`Weekly planning: ${g.name}`}
          onPress={() => navigation.navigate("WeeklyPlanning", { groupId: g.id })}
        />
      ))}
    </View>
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
        setLoaded(true);
      },
      () => setError(LOAD_FAILED),
    );
  }, [member]);

  async function save() {
    setNotice(null);
    const result = validatePreferences({ tags, budgetMin, budgetMax, radius }, learningOptIn);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setError(null);
    try {
      await member.putPreferences(result.value);
      setNotice("Saved.");
    } catch {
      setError(SAVE_FAILED);
    }
  }

  if (!loaded && !error) return <View style={styles.container}><Text>Loading</Text></View>;
  return (
    <View style={styles.container}>
      <Text>Activities you like (separate with commas)</Text>
      <TextInput accessibilityLabel="Activity preferences" style={styles.input} value={tags} onChangeText={setTags} />
      <Text>Budget range</Text>
      <TextInput accessibilityLabel="Minimum budget" style={styles.input} value={budgetMin} onChangeText={setBudgetMin} keyboardType="numeric" />
      <TextInput accessibilityLabel="Maximum budget" style={styles.input} value={budgetMax} onChangeText={setBudgetMax} keyboardType="numeric" />
      <Text>Travel radius (km)</Text>
      <TextInput accessibilityLabel="Travel radius" style={styles.input} value={radius} onChangeText={setRadius} keyboardType="numeric" />
      <View style={styles.row}>
        <Text>Learn from my history</Text>
        <Switch accessibilityLabel="Learning opt-in" value={learningOptIn} onValueChange={setLearningOptIn} />
      </View>
      <Text>{learningOptIn ? "Learning is on." : "Learning is off."}</Text>
      {error ? <Text accessibilityRole="alert">{error}</Text> : null}
      {notice ? <Text>{notice}</Text> : null}
      <Button title="Save preferences" onPress={() => void save()} />
    </View>
  );
}

export function AvailabilityScreen() {
  const { member } = useSetup();
  const [windows, setWindows] = useState<AvailabilityWindow[]>([]);
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [label, setLabel] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    member.getAvailability().then(
      (a) => setWindows(a.windows),
      () => setError(LOAD_FAILED),
    );
  }, [member]);

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

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Your availability</Text>
      {windows.length === 0 ? <Text>No windows yet.</Text> : null}
      {windows.map((w, i) => (
        <View key={`${w.startsAt}-${w.endsAt}-${i}`} style={styles.row}>
          <Text>{`${w.startsAt} to ${w.endsAt}${w.label ? ` (${w.label})` : ""}`}</Text>
          <Button title="Remove" accessibilityLabel={`Remove window ${i + 1}`} onPress={() => setWindows((p) => p.filter((_, j) => j !== i))} />
        </View>
      ))}
      <TextInput accessibilityLabel="Window start" style={styles.input} value={start} onChangeText={setStart} autoCapitalize="none" />
      <TextInput accessibilityLabel="Window end" style={styles.input} value={end} onChangeText={setEnd} autoCapitalize="none" />
      <TextInput accessibilityLabel="Window label" style={styles.input} value={label} onChangeText={setLabel} />
      <Button title="Add window" onPress={add} />
      {error ? <Text accessibilityRole="alert">{error}</Text> : null}
      {notice ? <Text>{notice}</Text> : null}
      <Button title="Save availability" onPress={() => void save()} />
    </View>
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
    <View style={styles.container}>
      <Text style={styles.title}>Weekly planning</Text>
      <Text>Draft settings, not yet connected to the backend.</Text>
      <TextInput accessibilityLabel="Weekday" style={styles.input} value={weekday} onChangeText={setWeekday} keyboardType="number-pad" />
      <TextInput accessibilityLabel="Planning time" style={styles.input} value={time} onChangeText={setTime} autoCapitalize="none" />
      <TextInput accessibilityLabel="Voting deadline hours" style={styles.input} value={deadline} onChangeText={setDeadline} keyboardType="number-pad" />
      {error ? <Text accessibilityRole="alert">{error}</Text> : null}
      {notice ? <Text>{notice}</Text> : null}
      <Button title="Save weekly planning" onPress={() => void save()} />
    </View>
  );
}


const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff", padding: 16, gap: 8 },
  title: { fontSize: 24, fontWeight: "700" },
  input: { borderWidth: 1, borderColor: "#999", alignSelf: "stretch", padding: 8 },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
});
