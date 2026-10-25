import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Button } from "react-native";

import { useAuth } from "./auth";
import {
  EmailScreen,
  EventsScreen,
  GroupsScreen,
  NotificationsScreen,
  OtpScreen,
  PlanningScreen,
} from "./screens";
import type { SignedOutParams } from "./screens";

const SignedOutStack = createNativeStackNavigator<SignedOutParams>();
const Tabs = createBottomTabNavigator();

function SignOutButton() {
  const { signOut } = useAuth();
  return <Button title="Sign out" onPress={() => void signOut()} />;
}

function AuthenticatedTabs() {
  return (
    <Tabs.Navigator screenOptions={{ headerRight: () => <SignOutButton /> }}>
      <Tabs.Screen name="Groups" component={GroupsScreen} />
      <Tabs.Screen name="Planning" component={PlanningScreen} />
      <Tabs.Screen name="Events" component={EventsScreen} />
      <Tabs.Screen name="Notifications" component={NotificationsScreen} />
    </Tabs.Navigator>
  );
}

// Authenticated screens are only mounted while a session exists.
export function RootNavigator() {
  const { loading, session } = useAuth();
  if (loading) return null;
  return (
    <NavigationContainer>
      {session ? (
        <AuthenticatedTabs />
      ) : (
        <SignedOutStack.Navigator>
          <SignedOutStack.Screen name="Email" component={EmailScreen} options={{ title: "Sign in" }} />
          <SignedOutStack.Screen name="Otp" component={OtpScreen} options={{ title: "Enter code" }} />
        </SignedOutStack.Navigator>
      )}
    </NavigationContainer>
  );
}
