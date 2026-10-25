import type { MeResponse } from "@gather/contracts";
import { StatusBar } from "expo-status-bar";
import { StyleSheet, Text, View } from "react-native";

// Type-only import proves the workspace contract dependency compiles.
// Real profile data arrives from the backend in a later task.
export type HomeProfile = MeResponse;

export function HomeScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Gather</Text>
      <Text>Plan together. Coming soon.</Text>
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#fff" },
  title: { fontSize: 32, fontWeight: "700", marginBottom: 8 },
});
