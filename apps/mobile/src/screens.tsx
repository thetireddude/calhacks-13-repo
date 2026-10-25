import { useState } from "react";
import { View } from "react-native";

import { AuthError, useAuth } from "./auth";
import { useTheme } from "./theme";
import { AppText, Button, Screen, TextField } from "./ui";

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
  const { colors, bold, radius } = useTheme();
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

  const bubble = { borderRadius: radius.card, paddingHorizontal: 16, paddingVertical: 12, maxWidth: "75%" } as const;
  return (
    <Screen scroll edges={["left", "right"]} contentStyle={{ justifyContent: "center", flexGrow: 1 }}>
      <View
        accessible={false}
        importantForAccessibility="no-hide-descendants"
        style={{ backgroundColor: colors.peach, borderRadius: radius.card, padding: 20, gap: 12 }}
      >
        <View style={[bubble, { backgroundColor: colors.surface, alignSelf: "flex-start" }]}>
          <AppText style={bold}>we should hang out soon!</AppText>
        </View>
        <View style={[bubble, { backgroundColor: colors.coral, alignSelf: "flex-end" }]}>
          <AppText color={colors.onCoral} style={bold}>
            Saturday?
          </AppText>
        </View>
        <View style={[bubble, { backgroundColor: colors.butter, alignSelf: "flex-start" }]}>
          <AppText style={bold}>I’m in. Who else?</AppText>
        </View>
      </View>
      <AppText variant="display" accessibilityRole="header">
        Turn “we should” into “see you there.”
      </AppText>
      <AppText muted>Plans for your people, without the group-chat shuffle.</AppText>
      <TextField
        label="Email"
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
      <TextField
        label="Password"
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
      {error ? (
        <AppText variant="small" accessibilityRole="alert" color={colors.danger}>
          {error}
        </AppText>
      ) : null}
      <Button title="Sign in" icon="arrow" onPress={() => void submit(signIn, false)} busy={busy} />
      <Button title="Create account" variant="secondary" onPress={() => void submit(signUp, true)} disabled={busy} />
    </Screen>
  );
}
