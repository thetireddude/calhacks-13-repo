import { StatusBar } from "expo-status-bar";

import { AuthProvider, createMockAuthClient } from "./src/auth";
import { RootNavigator } from "./src/RootNavigator";

// Replaced by a Supabase-backed AuthClient in DEV1-009.
const authClient = createMockAuthClient();

export default function App() {
  return (
    <AuthProvider client={authClient}>
      <RootNavigator />
      <StatusBar style="auto" />
    </AuthProvider>
  );
}
