import { StatusBar } from "expo-status-bar";

import { AuthProvider, createMockAuthClient } from "./src/auth";
import { createMockGroupClient } from "./src/groups";
import { createExpoNotificationPermissionClient } from "./src/notifications";
import { createMockPlanningClient } from "./src/planning";
import { createMockIcsClient, createMockVotingClient } from "./src/voting";
import { RootNavigator } from "./src/RootNavigator";

// Replaced by a Supabase-backed AuthClient in DEV1-009.
const authClient = createMockAuthClient();

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
