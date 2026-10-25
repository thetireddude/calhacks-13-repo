import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useState } from "react";
import { ActivityIndicator, Button, StyleSheet, Text, TextInput, View } from "react-native";

import { AuthError, useAuth } from "./auth";

export type SignedOutParams = {
  Email: undefined;
  Otp: { email: string };
};

// Client-side shape check only; not an approved email policy.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function messageFor(e: unknown): string {
  if (e instanceof AuthError) {
    switch (e.code) {
      case "invalid_code":
        return "That code is not correct. Check it and try again.";
      case "expired_code":
        return "That code has expired. Tap Resend code to get a new one.";
      case "network":
        return "Network problem. Check your connection and try again.";
    }
  }
  return "Something went wrong. Please try again.";
}

export function EmailScreen({ navigation }: NativeStackScreenProps<SignedOutParams, "Email">) {
  const { requestOtp } = useAuth();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function send() {
    const trimmed = email.trim();
    if (!EMAIL_PATTERN.test(trimmed)) {
      setError("Enter a valid email address.");
      return;
    }
    setError(null);
    setBusy(true);
    try {
      await requestOtp(trimmed);
      navigation.navigate("Otp", { email: trimmed });
    } catch (e) {
      setError(messageFor(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Gather</Text>
      <Text>Enter your email to get a sign-in code.</Text>
      <TextInput
        accessibilityLabel="Email"
        style={styles.input}
        value={email}
        onChangeText={(t) => {
          setEmail(t);
          setError(null);
        }}
        autoCapitalize="none"
        keyboardType="email-address"
        editable={!busy}
      />
      {error ? <Text accessibilityRole="alert">{error}</Text> : null}
      {busy ? <ActivityIndicator accessibilityLabel="Sending code" /> : null}
      <Button title="Send code" onPress={() => void send()} disabled={busy} />
    </View>
  );
}

export function OtpScreen({ route }: NativeStackScreenProps<SignedOutParams, "Otp">) {
  const { verifyOtp, requestOtp } = useAuth();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function verify() {
    if (code.trim() === "") {
      setError("Enter the code.");
      return;
    }
    setError(null);
    setNotice(null);
    setBusy(true);
    try {
      await verifyOtp(route.params.email, code.trim());
    } catch (e) {
      setError(messageFor(e));
      setBusy(false);
    }
    // On success the navigator swaps to authenticated tabs and this screen unmounts.
  }

  async function resend() {
    setError(null);
    setNotice(null);
    setBusy(true);
    try {
      await requestOtp(route.params.email);
      setCode("");
      setNotice("A new code was sent.");
    } catch (e) {
      setError(messageFor(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text>Enter the code we sent you.</Text>
      <TextInput
        accessibilityLabel="Code"
        style={styles.input}
        value={code}
        onChangeText={(t) => {
          setCode(t);
          setError(null);
        }}
        keyboardType="number-pad"
        editable={!busy}
      />
      {error ? <Text accessibilityRole="alert">{error}</Text> : null}
      {notice ? <Text>{notice}</Text> : null}
      {busy ? <ActivityIndicator accessibilityLabel="Working" /> : null}
      <Button title="Verify" onPress={() => void verify()} disabled={busy} />
      <Button title="Resend code" onPress={() => void resend()} disabled={busy} />
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

export const EventsScreen = placeholder("Events");
export const NotificationsScreen = placeholder("Notifications");

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#fff", padding: 16 },
  title: { fontSize: 32, fontWeight: "700", marginBottom: 8 },
  input: { borderWidth: 1, borderColor: "#999", alignSelf: "stretch", margin: 12, padding: 8 },
});
