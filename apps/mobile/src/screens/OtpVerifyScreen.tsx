import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { MockAuthError, getMockOtpHint, verifyEmailOtp } from '../api/mockAuth';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'OtpVerify'>;

export function OtpVerifyScreen({ navigation, route }: Props) {
  const { email } = route.params;
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onVerify() {
    setError(null);
    setLoading(true);
    try {
      await verifyEmailOtp(email, code);
      navigation.replace('Home');
    } catch (err) {
      if (err instanceof MockAuthError) {
        setError(err.message);
      } else {
        setError('Something went wrong. Try again.');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Enter code</Text>
      <Text style={styles.body}>
        We sent a one-time code to {email}. Mock API accepts {getMockOtpHint()} for any email.
      </Text>
      <TextInput
        accessibilityLabel="One-time code"
        autoCapitalize="none"
        autoComplete="one-time-code"
        autoCorrect={false}
        editable={!loading}
        keyboardType="number-pad"
        maxLength={6}
        placeholder="6-digit code"
        style={styles.input}
        textContentType="oneTimeCode"
        value={code}
        onChangeText={setCode}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Pressable
        accessibilityRole="button"
        disabled={loading || code.trim().length < 6}
        style={[styles.button, (loading || code.trim().length < 6) && styles.buttonDisabled]}
        onPress={onVerify}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonLabel}>Verify and continue</Text>
        )}
      </Pressable>
      <Pressable
        accessibilityRole="button"
        disabled={loading}
        style={styles.link}
        onPress={() => navigation.goBack()}
      >
        <Text style={styles.linkLabel}>Use a different email</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingHorizontal: 24,
    justifyContent: 'center',
  },
  title: {
    fontSize: 26,
    fontWeight: '600',
    marginBottom: 12,
  },
  body: {
    fontSize: 16,
    color: '#444',
    lineHeight: 22,
    marginBottom: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 18,
    letterSpacing: 4,
    marginBottom: 8,
  },
  error: {
    color: '#b00020',
    fontSize: 14,
    marginBottom: 8,
  },
  button: {
    backgroundColor: '#1a1a1a',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignSelf: 'stretch',
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonLabel: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  link: {
    paddingVertical: 16,
    alignSelf: 'center',
  },
  linkLabel: {
    color: '#0066cc',
    fontSize: 16,
  },
});
