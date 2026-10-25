import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

export function HomeScreen({ navigation }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Home</Text>
      <Text style={styles.body}>
        After real auth, this is the signed-in landing screen before planning and voting flows.
      </Text>
      <Pressable
        accessibilityRole="button"
        style={styles.button}
        onPress={() => navigation.navigate('GroupsList')}
      >
        <Text style={styles.buttonLabel}>My groups</Text>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        style={styles.link}
        onPress={() => navigation.replace('Welcome')}
      >
        <Text style={styles.linkLabel}>Sign out (mock)</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingHorizontal: 24,
    paddingTop: 16,
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
    marginBottom: 16,
  },
  buttonLabel: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  link: {
    paddingVertical: 8,
  },
  linkLabel: {
    color: '#0066cc',
    fontSize: 16,
  },
});
