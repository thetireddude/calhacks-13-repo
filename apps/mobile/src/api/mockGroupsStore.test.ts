import assert from 'node:assert/strict';
import { test } from 'node:test';

import { MockGroupsStore } from './mockGroupsStore.js';

test('create, list, and join via invite token', () => {
  const store = new MockGroupsStore();
  const ownerId = 'user-owner';
  const joinerId = 'user-joiner';

  const group = store.createGroup('Hikers', ownerId);
  assert.equal(store.listGroupsForUser(ownerId).length, 1);
  assert.equal(store.listGroupsForUser(joinerId).length, 0);

  const invite = store.createInvite(group.id, ownerId);
  const membership = store.joinGroup(invite.groupId, joinerId);
  assert.equal(membership.role, 'member');
  assert.equal(store.listGroupsForUser(joinerId).length, 1);
  assert.equal(store.listGroupsForUser(joinerId)[0]?.id, group.id);

  const byToken = store.getInviteByToken(invite.token);
  assert.equal(byToken?.groupId, group.id);
});
