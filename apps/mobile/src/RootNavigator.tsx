import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { NavigationContainer, createNavigationContainerRef } from "@react-navigation/native";
import type { ParamListBase } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, Button, Linking, View } from "react-native";

import { useAuth } from "./auth";
import { EmailScreen, OtpScreen } from "./screens";
import type { SignedOutParams } from "./screens";
import { parseInviteToken } from "./groups";
import type { GroupClient } from "./groups";
import { GroupsProvider, useGroups } from "./groupsState";
import {
  CreateGroupScreen,
  groupErrorMessage,
  GroupDashboardScreen,
  GroupListScreen,
  InviteScreen,
  MembersScreen,
} from "./groupScreens";
import type { GroupsStackParams } from "./groupScreens";
import {
  createMockLocalScheduleClient,
  createMockMemberSetupClient,
  createMockNotificationPermissionClient,
} from "./memberSetup";
import type {
  LocalScheduleClient,
  MemberSetupClient,
  NotificationPermissionClient,
} from "./memberSetup";
import {
  AvailabilityScreen,
  MemberSetupProvider,
  PreferencesScreen,
  SetupHomeScreen,
  WeeklyPlanningScreen,
} from "./memberSetupScreens";
import type { SetupStackParams } from "./memberSetupScreens";
import { PlanningProvider, PlanningScreen } from "./planningScreens";
import type { PlanningClient } from "./planning";
import { EventsScreen, NotificationsScreen, VotingProvider } from "./votingScreens";
import type { IcsClient, VotingClient } from "./voting";

const SignedOutStack = createNativeStackNavigator<SignedOutParams>();
const GroupsStack = createNativeStackNavigator<GroupsStackParams>();
const SetupStack = createNativeStackNavigator<SetupStackParams>();
const navigationRef = createNavigationContainerRef<ParamListBase>();
const Tabs = createBottomTabNavigator();

function SignOutButton() {
  const { signOut } = useAuth();
  return <Button title="Sign out" onPress={() => void signOut()} />;
}

function GroupsNavigator() {
  return (
    <GroupsStack.Navigator>
      <GroupsStack.Screen name="GroupList" component={GroupListScreen} options={{ headerShown: false }} />
      <GroupsStack.Screen name="CreateGroup" component={CreateGroupScreen} options={{ title: "Create group" }} />
      <GroupsStack.Screen name="GroupDashboard" component={GroupDashboardScreen} options={{ title: "Group" }} />
      <GroupsStack.Screen name="Members" component={MembersScreen} />
      <GroupsStack.Screen name="Invite" component={InviteScreen} options={{ title: "Invite" }} />
    </GroupsStack.Navigator>
  );
}

function SetupNavigator() {
  return (
    <SetupStack.Navigator>
      <SetupStack.Screen name="SetupHome" component={SetupHomeScreen} options={{ headerShown: false }} />
      <SetupStack.Screen name="Preferences" component={PreferencesScreen} options={{ title: "Preferences" }} />
      <SetupStack.Screen name="Availability" component={AvailabilityScreen} options={{ title: "Availability" }} />
      <SetupStack.Screen name="WeeklyPlanning" component={WeeklyPlanningScreen} options={{ title: "Weekly planning" }} />
    </SetupStack.Navigator>
  );
}

// Joins a pending invite token once signed in, then opens the group from whichever tab is focused.
function InviteJoiner({ token, onDone }: { token: string | null; onDone: () => void }) {
  const { joinByToken } = useGroups();
  useEffect(() => {
    if (!token) return;
    joinByToken(token)
      .then(
        (g) => navigationRef.navigate("Groups", { screen: "GroupDashboard", params: { groupId: g.id } }),
        (e) => Alert.alert("Invite", groupErrorMessage(e)),
      )
      .finally(onDone);
  }, [token, joinByToken, onDone]);
  return null;
}

function AuthenticatedTabs() {
  return (
    <Tabs.Navigator screenOptions={{ headerRight: () => <SignOutButton /> }}>
      <Tabs.Screen name="Groups" component={GroupsNavigator} />
      <Tabs.Screen name="Setup" component={SetupNavigator} />
      <Tabs.Screen name="Planning" component={PlanningScreen} />
      <Tabs.Screen name="Events" component={EventsScreen} />
      <Tabs.Screen name="Notifications" component={NotificationsScreen} />
    </Tabs.Navigator>
  );
}

// Authenticated screens are only mounted while a session exists.
// Setup clients are optional so existing callers keep working; defaults are in-memory mocks.
export function RootNavigator({
  groupClient,
  memberSetupClient,
  scheduleClient,
  notificationClient,
  planningClient,
  votingClient,
  icsClient,
}: {
  groupClient: GroupClient;
  memberSetupClient?: MemberSetupClient;
  scheduleClient?: LocalScheduleClient;
  notificationClient?: NotificationPermissionClient;
  planningClient?: PlanningClient;
  votingClient?: VotingClient;
  icsClient?: IcsClient;
}) {
  const [defaults] = useState(() => ({
    member: createMockMemberSetupClient(),
    schedule: createMockLocalScheduleClient(),
    notifications: createMockNotificationPermissionClient(),
  }));
  const { loading, session } = useAuth();
  // Links are captured at the root so one that arrives while signed out is held until sign-in.
  // The launch URL is read once per mount of this component, so sign-out/in does not replay it.
  const [pendingToken, setPendingToken] = useState<string | null>(null);
  useEffect(() => {
    const handle = (url: string | null | undefined) => {
      const token = url ? parseInviteToken(url) : null;
      if (token) setPendingToken(token);
    };
    Linking.getInitialURL().then(handle, () => {});
    const sub = Linking.addEventListener("url", (e) => handle(e.url));
    return () => sub.remove();
  }, []);
  const clearPending = useCallback(() => setPendingToken(null), []);
  if (loading)
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator accessibilityLabel="Loading" />
      </View>
    );
  return (
    <NavigationContainer ref={navigationRef}>
      {session ? (
        <GroupsProvider client={groupClient}>
          <MemberSetupProvider
            member={memberSetupClient ?? defaults.member}
            schedule={scheduleClient ?? defaults.schedule}
            notifications={notificationClient ?? defaults.notifications}
          >
            <PlanningProvider client={planningClient}>
              <VotingProvider voting={votingClient} ics={icsClient}>
                <AuthenticatedTabs />
              </VotingProvider>
            </PlanningProvider>
          </MemberSetupProvider>
          <InviteJoiner token={pendingToken} onDone={clearPending} />
        </GroupsProvider>
      ) : (
        <SignedOutStack.Navigator>
          <SignedOutStack.Screen name="Email" component={EmailScreen} options={{ title: "Sign in" }} />
          <SignedOutStack.Screen name="Otp" component={OtpScreen} options={{ title: "Enter code" }} />
        </SignedOutStack.Navigator>
      )}
    </NavigationContainer>
  );
}
