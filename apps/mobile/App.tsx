import { Text } from "react-native";
import { StatusBar } from "expo-status-bar";

import { AuthProvider, createMockAuthClient } from "./src/auth";
import { createApiClient } from "./src/apiClient";
import { createMockGroupClient } from "./src/groups";
import {
  createHttpGroupClient,
  createHttpIcsClient,
  createHttpMemberSetupClient,
  createHttpPlanningClient,
  createHttpScheduleClient,
  createHttpVotingClient,
} from "./src/httpClients";
import { createExpoNotificationPermissionClient } from "./src/notifications";
import { createMockPlanningClient } from "./src/planning";
import { createMockIcsClient, createMockVotingClient } from "./src/voting";
import { selectBackend } from "./src/backendConfig";
import { useAppFonts } from "./src/fonts";
import { FontsLoadedContext } from "./src/theme";
import { RootNavigator } from "./src/RootNavigator";
import { createDefaultSupabaseAuthClient } from "./src/supabaseAuth";

// Real Supabase email+password auth when the public env vars are set. The mock is only a dev/test fallback;
// a release build with missing config shows an explicit error instead of silently using the mock.
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const allowMock = __DEV__ || process.env.JEST_WORKER_ID !== undefined;
const authClient =
  supabaseUrl && supabaseAnonKey
    ? createDefaultSupabaseAuthClient(supabaseUrl, supabaseAnonKey)
    : allowMock
      ? createMockAuthClient()
      : null;

// Real group and member-setup clients need the API URL and real Supabase session tokens. Mocks are only
// a dev/test fallback; a release build with a missing API URL shows an error instead of mocking.
// The token comes from the Supabase client (current, auto-refreshed), not the stale session snapshot.
const apiUrl = process.env.EXPO_PUBLIC_API_URL;
const backend = selectBackend({ supabaseUrl, supabaseAnonKey, apiUrl }, allowMock);
const api =
  backend === "real" && authClient && "getAccessToken" in authClient
    ? createApiClient({ baseUrl: apiUrl as string, getAccessToken: () => authClient.getAccessToken() })
    : null;
const apiMissing = backend === "config_error";
const groupClient = api ? createHttpGroupClient(api) : createMockGroupClient();
// undefined lets RootNavigator fall back to its in-memory mock.
const memberSetupClient = api ? createHttpMemberSetupClient(api) : undefined;
const scheduleClient = api ? createHttpScheduleClient(api) : undefined;

// Replaced by the API-backed MemberSetupClient later; push permission uses Expo for real.
const notificationClient = createExpoNotificationPermissionClient();
// Planning, vote, veto, confirmed-event, notifications feed, ICS export and weekly schedule are real when the
// API is configured. Still unavailable (no API route, SPEC section 9 requests): vote-state tallies/deadline
// and push-device registration. The mock is explicit here, never a silent fallback.
const mockVoting = createMockVotingClient();
const planningClient = api ? createHttpPlanningClient(api) : createMockPlanningClient();
const votingClient = api ? createHttpVotingClient(api) : mockVoting;
const icsClient = api ? createHttpIcsClient(api) : createMockIcsClient();

export default function App() {
  const fonts = useAppFonts();
  // Wait for fonts; a load failure falls through and the app uses system fonts.
  if (fonts === "loading") return null;
  if (!authClient) {
    return <Text>Configuration error: Supabase URL and anon key are not set.</Text>;
  }
  if (apiMissing) {
    return <Text>Configuration error: API URL is not set.</Text>;
  }
  return (
    <FontsLoadedContext.Provider value={fonts === "loaded"}>
    <AuthProvider client={authClient}>
      <RootNavigator
        groupClient={groupClient}
        memberSetupClient={memberSetupClient}
        scheduleClient={scheduleClient}
        notificationClient={notificationClient}
        planningClient={planningClient}
        votingClient={votingClient}
        icsClient={icsClient}
      />
      <StatusBar style="auto" />
    </AuthProvider>
    </FontsLoadedContext.Provider>
  );
}
