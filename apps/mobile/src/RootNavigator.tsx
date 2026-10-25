import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { ActivityIndicator, Button, View } from "react-native";

import { useAuth } from "./auth";
import {
  EmailScreen,
  EventsScreen,
  NotificationsScreen,
  OtpScreen,
  PlanningScreen,
} from "./screens";
import type { SignedOutParams } from "./screens";
import type { GroupClient } from "./groups";
import { GroupsProvider } from "./groupsState";
import {
  CreateGroupScreen,
  GroupDashboardScreen,
  GroupListScreen,
  InviteScreen,
  MembersScreen,
} from "./groupScreens";
import type { GroupsStackParams } from "./groupScreens";

const SignedOutStack = createNativeStackNavigator<SignedOutParams>();
const GroupsStack = createNativeStackNavigator<GroupsStackParams>();
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

function AuthenticatedTabs() {
  return (
    <Tabs.Navigator screenOptions={{ headerRight: () => <SignOutButton /> }}>
      <Tabs.Screen name="Groups" component={GroupsNavigator} />
      <Tabs.Screen name="Planning" component={PlanningScreen} />
      <Tabs.Screen name="Events" component={EventsScreen} />
      <Tabs.Screen name="Notifications" component={NotificationsScreen} />
    </Tabs.Navigator>
  );
}

// Authenticated screens are only mounted while a session exists.
export function RootNavigator({ groupClient }: { groupClient: GroupClient }) {
  const { loading, session } = useAuth();
  if (loading)
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator accessibilityLabel="Loading" />
      </View>
    );
  return (
    <NavigationContainer>
      {session ? (
        <GroupsProvider client={groupClient}>
          <AuthenticatedTabs />
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
