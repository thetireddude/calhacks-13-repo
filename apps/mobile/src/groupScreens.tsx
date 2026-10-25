import type { GroupInviteResponse, GroupMemberResponse } from "@gather/contracts";
import type { NavigationProp, ParamListBase } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useEffect, useState } from "react";
import { Share, View } from "react-native";

import { GroupError, inviteLink } from "./groups";
import { useGroups } from "./groupsState";
import { AppText, Banner, Button, Card, EmptyState, Screen, Skeleton, TextField } from "./ui";
import type { CardTone } from "./ui";

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
      case "forbidden":
        return "You are not a member of that group.";
      case "unauthenticated":
        return "Your session has expired. Please sign out and sign in again.";
      case "network":
        return "Could not reach Gather. Check your connection and try again.";
      case "server":
        return "Something went wrong. Please try again.";
    }
  }
  return "Something went wrong. Please try again.";
}

const EDGES: ("left" | "right")[] = ["left", "right"];
const GROUP_TONES: CardTone[] = ["peach", "mint", "sky"];

export function GroupListScreen({ navigation }: Props<"GroupList">) {
  const { groups, loadError, reloadGroups, joinByToken } = useGroups();
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
    <Screen scroll edges={EDGES}>
      <AppText variant="display" accessibilityRole="header">
        Your groups
      </AppText>
      <Button title="Create group" icon="plus" onPress={() => navigation.navigate("CreateGroup")} />
      {loadError ? <Banner message={groupErrorMessage(loadError)} onRetry={reloadGroups} /> : null}
      {groups.length === 0 && !loadError ? (
        <EmptyState title="No groups yet." message="Create a group or join one with an invite." />
      ) : null}
      {groups.length > 0 ? <AppText variant="label" muted>{`${groups.length} ${groups.length === 1 ? "group" : "groups"}`}</AppText> : null}
      {groups.map((g, i) => (
        <Card
          key={g.id}
          tone={GROUP_TONES[i % GROUP_TONES.length]}
          accessibilityLabel={g.name}
          onPress={() => navigation.navigate("GroupDashboard", { groupId: g.id })}
        >
          <AppText variant="title">{g.name}</AppText>
        </Card>
      ))}
      <Card tone="surface">
        <AppText variant="heading">Join with code</AppText>
        <AppText variant="small" muted>
          Have an invite? Open the link, or paste its token.
        </AppText>
        <TextField
          label="Invite token"
          value={token}
          onChangeText={(t) => {
            setToken(t);
            setError(null);
          }}
          autoCapitalize="none"
          editable={!busy}
          error={error}
        />
        <Button title="Join group" icon="key" variant="secondary" onPress={() => void join()} disabled={busy || token.trim() === ""} />
      </Card>
    </Screen>
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
    <Screen scroll edges={EDGES}>
      <AppText variant="title">Name your group</AppText>
      <TextField
        label="Group name"
        value={name}
        onChangeText={(t) => {
          setName(t);
          setError(null);
        }}
        editable={!busy}
        error={error}
      />
      <Button title="Create" onPress={() => void create()} busy={busy} />
    </Screen>
  );
}

export function GroupDashboardScreen({ navigation, route }: Props<"GroupDashboard">) {
  const { groups } = useGroups();
  const { groupId } = route.params;
  const group = groups.find((g) => g.id === groupId);
  // Planning, confirmed event and notifications are placeholder tabs until their tasks land.
  const tab = (name: string) => navigation.getParent<NavigationProp<ParamListBase>>()?.navigate(name);

  if (!group) {
    return (
      <Screen edges={EDGES}>
        <AppText>Group not found.</AppText>
      </Screen>
    );
  }
  return (
    <Screen scroll edges={EDGES}>
      <AppText variant="display" accessibilityRole="header">
        {group.name}
      </AppText>
      <Button title="Open planning" onPress={() => tab("Planning")} />
      <Button title="View confirmed event" variant="secondary" onPress={() => tab("Events")} />
      <Button title="Open notifications" variant="secondary" onPress={() => tab("Notifications")} />
      <Button title="Members" variant="outline" onPress={() => navigation.navigate("Members", { groupId })} />
      <Button title="Invite members" variant="outline" onPress={() => navigation.navigate("Invite", { groupId })} />
    </Screen>
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

  if (error) {
    return (
      <Screen edges={EDGES}>
        <Banner message={error} />
      </Screen>
    );
  }
  if (!members) {
    return (
      <Screen edges={EDGES}>
        <Skeleton height={72} radius={24} />
        <Skeleton height={72} radius={24} style={{ marginTop: 12 }} />
      </Screen>
    );
  }
  // Only the group-visible GroupMemberResponse fields are rendered.
  return (
    <Screen scroll edges={EDGES}>
      {members.map((m, i) => (
        <Card key={m.userId} tone={GROUP_TONES[i % GROUP_TONES.length]} style={{ gap: 4 }}>
          <View accessible accessibilityLabel={`Member ${m.userId}`} style={{ gap: 4 }}>
            <AppText variant="heading">{m.userId}</AppText>
            <AppText variant="small">Role: {m.role}</AppText>
            <AppText variant="small" muted>
              Joined: {m.joinedAt}
            </AppText>
          </View>
        </Card>
      ))}
    </Screen>
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
    <Screen scroll edges={EDGES}>
      <AppText variant="title">Invite your people</AppText>
      <Button title="Generate invite link" icon="key" onPress={() => void generate()} disabled={busy} />
      {error ? <Banner message={error} /> : null}
      {invite ? (
        <Card tone="mint">
          <AppText selectable>{inviteLink(invite.token)}</AppText>
          <Button title="Share invite" onPress={() => void Share.share({ message: inviteLink(invite.token) })} />
        </Card>
      ) : null}
    </Screen>
  );
}
