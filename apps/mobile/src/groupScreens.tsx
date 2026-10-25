import type { GroupInviteResponse, GroupMemberResponse } from "@gather/contracts";
import type { NavigationProp, ParamListBase } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useEffect, useState } from "react";
import { ActivityIndicator, Button, ScrollView, Share, StyleSheet, Text, TextInput, View } from "react-native";

import { GroupError, inviteLink } from "./groups";
import { useGroups } from "./groupsState";

export type GroupsStackParams = {
  GroupList: undefined;
  CreateGroup: undefined;
  GroupDashboard: { groupId: string };
  Members: { groupId: string };
  Invite: { groupId: string };
};
type Props<T extends keyof GroupsStackParams> = NativeStackScreenProps<GroupsStackParams, T>;

export function groupErrorMessage(e: unknown): string {
  if (e instanceof GroupError) {
    switch (e.code) {
      case "invalid_name":
        return "Enter a group name.";
      case "invalid_invite":
        return "That invite link is not valid.";
      case "not_found":
        return "That group could not be found.";
    }
  }
  return "Something went wrong. Please try again.";
}

export function GroupListScreen({ navigation }: Props<"GroupList">) {
  const { groups, joinByToken } = useGroups();
  const [token, setToken] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function join() {
    setError(null);
    setBusy(true);
    try {
      const g = await joinByToken(token);
      setToken("");
      navigation.navigate("GroupDashboard", { groupId: g.id });
    } catch (e) {
      setError(groupErrorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Your groups</Text>
      {groups.length === 0 ? <Text>No groups yet.</Text> : null}
      {groups.map((g) => (
        <Button key={g.id} title={g.name} onPress={() => navigation.navigate("GroupDashboard", { groupId: g.id })} />
      ))}
      <Button title="Create group" onPress={() => navigation.navigate("CreateGroup")} />
      <Text>Have an invite? Open the link, or paste its token.</Text>
      <TextInput
        accessibilityLabel="Invite token"
        style={styles.input}
        value={token}
        onChangeText={(t) => {
          setToken(t);
          setError(null);
        }}
        autoCapitalize="none"
        editable={!busy}
      />
      {error ? <Text accessibilityRole="alert">{error}</Text> : null}
      <Button title="Join group" onPress={() => void join()} disabled={busy || token.trim() === ""} />
    </ScrollView>
  );
}

export function CreateGroupScreen({ navigation }: Props<"CreateGroup">) {
  const { createGroup } = useGroups();
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function create() {
    setError(null);
    setBusy(true);
    try {
      const g = await createGroup(name);
      navigation.replace("GroupDashboard", { groupId: g.id });
    } catch (e) {
      setError(groupErrorMessage(e));
      setBusy(false);
    }
  }

  return (
    <View style={styles.container}>
      <TextInput
        accessibilityLabel="Group name"
        style={styles.input}
        value={name}
        onChangeText={(t) => {
          setName(t);
          setError(null);
        }}
        editable={!busy}
      />
      {error ? <Text accessibilityRole="alert">{error}</Text> : null}
      <Button title="Create" onPress={() => void create()} disabled={busy} />
    </View>
  );
}

export function GroupDashboardScreen({ navigation, route }: Props<"GroupDashboard">) {
  const { groups } = useGroups();
  const { groupId } = route.params;
  const group = groups.find((g) => g.id === groupId);
  // Planning, confirmed event and notifications are placeholder tabs until their tasks land.
  const tab = (name: string) => navigation.getParent<NavigationProp<ParamListBase>>()?.navigate(name);

  if (!group) return <View style={styles.container}><Text>Group not found.</Text></View>;
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{group.name}</Text>
      <Button title="Members" onPress={() => navigation.navigate("Members", { groupId })} />
      <Button title="Invite members" onPress={() => navigation.navigate("Invite", { groupId })} />
      <Button title="Open planning" onPress={() => tab("Planning")} />
      <Button title="View confirmed event" onPress={() => tab("Events")} />
      <Button title="Open notifications" onPress={() => tab("Notifications")} />
    </View>
  );
}

export function MembersScreen({ route }: Props<"Members">) {
  const { client } = useGroups();
  const [members, setMembers] = useState<GroupMemberResponse[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    client.listMembers(route.params.groupId).then(
      (m) => active && setMembers(m),
      (e) => active && setError(groupErrorMessage(e)),
    );
    return () => {
      active = false;
    };
  }, [client, route.params.groupId]);

  if (error) return <View style={styles.container}><Text accessibilityRole="alert">{error}</Text></View>;
  if (!members) return <View style={styles.container}><ActivityIndicator accessibilityLabel="Loading members" /></View>;
  // Only the group-visible GroupMemberResponse fields are rendered.
  return (
    <ScrollView contentContainerStyle={styles.container}>
      {members.map((m) => (
        <View key={m.userId} accessibilityLabel={`Member ${m.userId}`}>
          <Text>{m.userId}</Text>
          <Text>Role: {m.role}</Text>
          <Text>Joined: {m.joinedAt}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

export function InviteScreen({ route }: Props<"Invite">) {
  const { client } = useGroups();
  const [invite, setInvite] = useState<GroupInviteResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function generate() {
    setError(null);
    setBusy(true);
    try {
      setInvite(await client.createInvite(route.params.groupId));
    } catch (e) {
      setError(groupErrorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.container}>
      <Button title="Generate invite link" onPress={() => void generate()} disabled={busy} />
      {error ? <Text accessibilityRole="alert">{error}</Text> : null}
      {invite ? (
        <>
          <Text selectable>{inviteLink(invite.token)}</Text>
          <Button title="Share invite" onPress={() => void Share.share({ message: inviteLink(invite.token) })} />
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#fff", padding: 16, gap: 8 },
  title: { fontSize: 24, fontWeight: "700", marginBottom: 8 },
  input: { borderWidth: 1, borderColor: "#999", alignSelf: "stretch", margin: 12, padding: 8 },
});
