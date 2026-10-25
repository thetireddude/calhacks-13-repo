import { useState } from "react";
import { ActivityIndicator, Button, StyleSheet, Text, TextInput, View } from "react-native";

import { AuthError, useAuth } from "./auth";

export type SignedOutParams = {
  SignIn: undefined;
};

const MIN_PASSWORD_LENGTH = 6; // Supabase default minimum

function messageFor(e: unknown): string {
  if (e instanceof AuthError) {
    switch (e.code) {
      case "invalid_credentials":
        return "Incorrect email or password.";
      case "email_taken":
        return "An account with this email already exists. Try signing in.";
      case "weak_password":
        return "That password is too weak. Choose a longer or less common one.";
      case "confirmation_required":
        return "Email confirmation is still turned on in Supabase. Turn off Confirm email in the Supabase auth settings and try again.";
      case "network":
        return "Network problem. Check your connection and try again.";
    }
  }
  return "Something went wrong. Please try again.";
}

export function SignInScreen() {
  const { signIn, signUp } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(action: typeof signIn, isSignUp: boolean) {
    const trimmed = email.trim();
    if (!trimmed.includes("@")) {
      setError("Enter a valid email address.");
      return;
    }
    // Minimum length applies to new accounts only; an existing account may have a shorter password.
    if (isSignUp ? password.length < MIN_PASSWORD_LENGTH : password.length === 0) {
      setError(isSignUp ? `Password must be at least ${MIN_PASSWORD_LENGTH} characters.` : "Enter your password.");
      return;
    }
    setError(null);
    setBusy(true);
    try {
      await action(trimmed, password);
      // On success the navigator swaps to authenticated tabs and this screen unmounts.
    } catch (e) {
      setError(messageFor(e));
      setBusy(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Gather</Text>
      <Text>Sign in or create an account.</Text>
      <TextInput
        accessibilityLabel="Email"
        style={styles.input}
        value={email}
        onChangeText={(t) => {
          setEmail(t);
          setError(null);
        }}
        autoCapitalize="none"
        autoComplete="email"
        autoCorrect={false}
        keyboardType="email-address"
        editable={!busy}
      />
      <TextInput
        accessibilityLabel="Password"
        style={styles.input}
        value={password}
        onChangeText={(t) => {
          setPassword(t);
          setError(null);
        }}
        secureTextEntry
        autoCapitalize="none"
        autoComplete="password"
        autoCorrect={false}
        editable={!busy}
      />
      {error ? <Text accessibilityRole="alert">{error}</Text> : null}
      {busy ? <ActivityIndicator accessibilityLabel="Working" /> : null}
      <Button title="Sign in" onPress={() => void submit(signIn, false)} disabled={busy} />
      <Button title="Create account" onPress={() => void submit(signUp, true)} disabled={busy} color="#666" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#fff", padding: 16 },
  title: { fontSize: 32, fontWeight: "700", marginBottom: 8 },
  input: { borderWidth: 1, borderColor: "#999", alignSelf: "stretch", margin: 12, padding: 8 },
});
