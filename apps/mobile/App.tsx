import { StatusBar } from "expo-status-bar";

import { AuthProvider, createMockAuthClient } from "./src/auth";
import { createMockGroupClient } from "./src/groups";
import { RootNavigator } from "./src/RootNavigator";

// Replaced by a Supabase-backed AuthClient in DEV1-009.
const authClient = createMockAuthClient();

// Replaced by the API-backed GroupClient once the backend routes are wired.
const groupClient = createMockGroupClient();

export default function App() {
  return (
    <AuthProvider client={authClient}>
      <RootNavigator groupClient={groupClient} />
      <StatusBar style="auto" />
    </AuthProvider>
  );
}
