import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useState } from "react";
import { Button, StyleSheet, Text, TextInput, View } from "react-native";

import { useAuth } from "./auth";

export type SignedOutParams = {
  Email: undefined;
  Otp: { email: string };
};

export function EmailScreen({ navigation }: NativeStackScreenProps<SignedOutParams, "Email">) {
  const { requestOtp } = useAuth();
  const [email, setEmail] = useState("");
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Gather</Text>
      <Text>Enter your email to get a sign-in code.</Text>
      <TextInput
        accessibilityLabel="Email"
        style={styles.input}
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />
      <Button
        title="Send code"
        onPress={async () => {
          if (email.trim() === "") return;
          await requestOtp(email.trim());
          navigation.navigate("Otp", { email: email.trim() });
        }}
      />
    </View>
  );
}

export function OtpScreen({ route }: NativeStackScreenProps<SignedOutParams, "Otp">) {
  const { verifyOtp } = useAuth();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  return (
    <View style={styles.container}>
      <Text>Enter the code we sent you.</Text>
      <TextInput
        accessibilityLabel="Code"
        style={styles.input}
        value={code}
        onChangeText={setCode}
        keyboardType="number-pad"
      />
      {error ? <Text>{error}</Text> : null}
      <Button
        title="Verify"
        onPress={async () => {
          try {
            await verifyOtp(route.params.email, code);
          } catch (e) {
            setError(e instanceof Error ? e.message : "Could not sign in.");
          }
        }}
      />
    </View>
  );
}

function placeholder(label: string) {
  return function PlaceholderScreen() {
    return (
      <View style={styles.container}>
        <Text>{label} placeholder</Text>
      </View>
    );
  };
}

export const GroupsScreen = placeholder("Groups");
export const PlanningScreen = placeholder("Planning");
export const EventsScreen = placeholder("Events");
export const NotificationsScreen = placeholder("Notifications");

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#fff", padding: 16 },
  title: { fontSize: 32, fontWeight: "700", marginBottom: 8 },
  input: { borderWidth: 1, borderColor: "#999", alignSelf: "stretch", margin: 12, padding: 8 },
});
