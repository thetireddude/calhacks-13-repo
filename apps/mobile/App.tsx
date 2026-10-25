import { StatusBar } from "expo-status-bar";

import { AuthProvider, createMockAuthClient } from "./src/auth";
import { createMockGroupClient } from "./src/groups";
import { createExpoNotificationPermissionClient } from "./src/notifications";
import { createMockPlanningClient } from "./src/planning";
import { createMockIcsClient, createMockVotingClient } from "./src/voting";
import { RootNavigator } from "./src/RootNavigator";
import { createDefaultSupabaseAuthClient } from "./src/supabaseAuth";

// Real Supabase email OTP when the public env vars are set; mock otherwise (dev/tests without env).
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const authClient =
  supabaseUrl && supabaseAnonKey
    ? createDefaultSupabaseAuthClient(supabaseUrl, supabaseAnonKey)
    : createMockAuthClient();

// Replaced by the API-backed GroupClient once the backend routes are wired.
const groupClient = createMockGroupClient();

// Replaced by the API-backed MemberSetupClient later; push permission uses Expo for real.
const notificationClient = createExpoNotificationPermissionClient();
// Replaced by the API-backed PlanningClient once the backend routes are wired.
const planningClient = createMockPlanningClient();

// Replaced by the API-backed VotingClient and IcsClient once the backend routes are wired.
const votingClient = createMockVotingClient();
const icsClient = createMockIcsClient();

export default function App() {
  return (
    <AuthProvider client={authClient}>
      <RootNavigator
        groupClient={groupClient}
        notificationClient={notificationClient}
        planningClient={planningClient}
        votingClient={votingClient}
        icsClient={icsClient}
      />
      <StatusBar style="auto" />
    </AuthProvider>
  );
}
