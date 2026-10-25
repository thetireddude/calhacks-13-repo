import { StyleSheet, Text, View } from 'react-native';

const PLACEHOLDER_GROUPS = ['Weekend hikers', 'Board game night', 'Study group'];

export function GroupsListScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.hint}>Placeholder groups — create/join API not wired yet.</Text>
      {PLACEHOLDER_GROUPS.map((name) => (
        <View key={name} style={styles.row}>
          <Text style={styles.rowTitle}>{name}</Text>
        </View>
      ))}
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
  hint: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  row: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#ddd',
    paddingVertical: 14,
  },
  rowTitle: {
    fontSize: 17,
    fontWeight: '500',
  },
});
