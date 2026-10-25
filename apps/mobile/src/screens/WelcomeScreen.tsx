import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Welcome'>;

export function WelcomeScreen({ navigation }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome to Gather</Text>
      <Text style={styles.body}>
        Placeholder auth — Supabase email OTP will replace this in a later task.
      </Text>
      <Pressable
        accessibilityRole="button"
        style={styles.button}
        onPress={() => navigation.replace('Home')}
      >
        <Text style={styles.buttonLabel}>Continue (mock sign-in)</Text>
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
    marginBottom: 24,
  },
  button: {
    backgroundColor: '#1a1a1a',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  buttonLabel: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
});
