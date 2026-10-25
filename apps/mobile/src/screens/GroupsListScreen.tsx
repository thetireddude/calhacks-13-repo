import { useFocusEffect } from '@react-navigation/native';
import type { GroupResponse } from '@gather/contracts';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import {
  MockGroupsError,
  createGroup,
  createGroupInvite,
  joinGroupInvite,
  listMyGroups,
} from '../api/mockGroups';
import { getMockAuthSession } from '../api/mockAuth';

type Panel = 'none' | 'create' | 'join';

export function GroupsListScreen() {
  const session = getMockAuthSession();
  const [groups, setGroups] = useState<GroupResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [panel, setPanel] = useState<Panel>('none');
  const [groupName, setGroupName] = useState('');
  const [inviteToken, setInviteToken] = useState('');
  const [lastInviteToken, setLastInviteToken] = useState<string | null>(null);

  const loadGroups = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const list = await listMyGroups();
      setGroups(list);
    } catch (e) {
      const message =
        e instanceof MockGroupsError ? e.message : 'Could not load groups.';
      setError(message);
      setGroups([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadGroups();
    }, [loadGroups]),
  );

  async function handleCreate() {
    setBusy(true);
    setError(null);
    try {
      const group = await createGroup({ name: groupName });
      setGroupName('');
      setPanel('none');
      const invite = await createGroupInvite(group.id);
      setLastInviteToken(invite.token);
      await loadGroups();
    } catch (e) {
      setError(e instanceof MockGroupsError ? e.message : 'Could not create group.');
    } finally {
      setBusy(false);
    }
  }

  async function handleJoin() {
    setBusy(true);
    setError(null);
    try {
      await joinGroupInvite(inviteToken);
      setInviteToken('');
      setPanel('none');
      await loadGroups();
    } catch (e) {
      setError(e instanceof MockGroupsError ? e.message : 'Could not join group.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {session ? (
        <Text style={styles.subtitle}>Signed in as {session.email}</Text>
      ) : null}

      <View style={styles.actions}>
        <Pressable
          accessibilityRole="button"
          style={[styles.button, panel === 'create' && styles.buttonActive]}
          disabled={busy}
          onPress={() => {
            setError(null);
            setPanel(panel === 'create' ? 'none' : 'create');
          }}
        >
          <Text style={styles.buttonLabel}>Create group</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          style={[styles.buttonSecondary, panel === 'join' && styles.buttonActive]}
          disabled={busy}
          onPress={() => {
            setError(null);
            setPanel(panel === 'join' ? 'none' : 'join');
          }}
        >
          <Text style={styles.buttonSecondaryLabel}>Join with code</Text>
        </Pressable>
      </View>

      {panel === 'create' ? (
        <View style={styles.form}>
          <TextInput
            accessibilityLabel="Group name"
            placeholder="Group name"
            style={styles.input}
            value={groupName}
            onChangeText={setGroupName}
            editable={!busy}
          />
          <Pressable
            accessibilityRole="button"
            style={styles.submit}
            disabled={busy || groupName.trim().length === 0}
            onPress={() => void handleCreate()}
          >
            {busy ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonLabel}>Save</Text>
            )}
          </Pressable>
        </View>
      ) : null}

      {panel === 'join' ? (
        <View style={styles.form}>
          <TextInput
            accessibilityLabel="Invite code"
            placeholder="Paste invite code"
            style={styles.input}
            value={inviteToken}
            onChangeText={setInviteToken}
            editable={!busy}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <Pressable
            accessibilityRole="button"
            style={styles.submit}
            disabled={busy || inviteToken.trim().length === 0}
            onPress={() => void handleJoin()}
          >
            {busy ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonLabel}>Join</Text>
            )}
          </Pressable>
        </View>
      ) : null}

      {lastInviteToken ? (
        <View style={styles.inviteBanner}>
          <Text style={styles.inviteTitle}>Invite code (share to join)</Text>
          <Text selectable style={styles.inviteToken}>
            {lastInviteToken}
          </Text>
        </View>
      ) : null}

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {loading ? (
        <ActivityIndicator style={styles.loader} />
      ) : groups.length === 0 ? (
        <Text style={styles.empty}>No groups yet. Create one or join with a code.</Text>
      ) : (
        groups.map((group) => (
          <View key={group.id} style={styles.row}>
            <Text style={styles.rowTitle}>{group.name}</Text>
            {session && group.createdBy === session.userId ? (
              <Text style={styles.rowMeta}>You created this group</Text>
            ) : (
              <Text style={styles.rowMeta}>Member</Text>
            )}
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 32,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  button: {
    backgroundColor: '#1a1a1a',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
  },
  buttonSecondary: {
    backgroundColor: '#eee',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
  },
  buttonActive: {
    opacity: 0.85,
  },
  buttonLabel: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '500',
  },
  buttonSecondaryLabel: {
    color: '#1a1a1a',
    fontSize: 15,
    fontWeight: '500',
  },
  form: {
    marginBottom: 16,
    gap: 10,
  },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  submit: {
    backgroundColor: '#1a1a1a',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  inviteBanner: {
    backgroundColor: '#f5f5f5',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  inviteTitle: {
    fontSize: 13,
    color: '#444',
    marginBottom: 6,
  },
  inviteToken: {
    fontSize: 14,
    fontFamily: 'monospace',
  },
  error: {
    color: '#b00020',
    marginBottom: 12,
    fontSize: 14,
  },
  loader: {
    marginTop: 24,
  },
  empty: {
    fontSize: 15,
    color: '#666',
    marginTop: 8,
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
  rowMeta: {
    fontSize: 13,
    color: '#666',
    marginTop: 4,
  },
});
