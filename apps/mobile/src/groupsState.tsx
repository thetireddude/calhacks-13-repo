import type { GroupResponse } from "@gather/contracts";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { Linking } from "react-native";

import { parseInviteToken } from "./groups";
import type { GroupClient } from "./groups";

type GroupsState = {
  client: GroupClient;
  // Groups this user created or joined in this session; multiple groups are supported.
  groups: GroupResponse[];
  createGroup: (name: string) => Promise<GroupResponse>;
  joinByToken: (token: string) => Promise<GroupResponse>;
};

const GroupsContext = createContext<GroupsState | null>(null);

export function GroupsProvider({ client, children }: { client: GroupClient; children: ReactNode }) {
  const [groups, setGroups] = useState<GroupResponse[]>([]);

  const add = useCallback((group: GroupResponse) => {
    setGroups((prev) => (prev.some((g) => g.id === group.id) ? prev : [...prev, group]));
  }, []);
  const createGroup = useCallback(
    async (name: string) => {
      const group = await client.createGroup({ name });
      add(group);
      return group;
    },
    [client, add],
  );
  const joinByToken = useCallback(
    async (token: string) => {
      const joined = await client.joinInvite(token);
      const group = await client.getGroup(joined.groupId);
      add(group);
      return group;
    },
    [client, add],
  );

  const value = useMemo(() => ({ client, groups, createGroup, joinByToken }), [client, groups, createGroup, joinByToken]);
  return <GroupsContext.Provider value={value}>{children}</GroupsContext.Provider>;
}

export function useGroups(): GroupsState {
  const ctx = useContext(GroupsContext);
  if (!ctx) throw new Error("useGroups must be used inside GroupsProvider");
  return ctx;
}

// Joins from a gather://invite/<token> link, at launch and while running. Mounted only while
// signed in, so a link opened while signed out is handled after sign-in.
export function useInviteLinkJoin(onJoined: (group: GroupResponse) => void, onError: (e: unknown) => void) {
  const { joinByToken } = useGroups();
  useEffect(() => {
    let active = true;
    const handle = (url: string | null | undefined) => {
      const token = url ? parseInviteToken(url) : null;
      if (!token) return;
      joinByToken(token).then(
        (g) => active && onJoined(g),
        (e) => active && onError(e),
      );
    };
    void Linking.getInitialURL().then(handle);
    const sub = Linking.addEventListener("url", (e) => handle(e.url));
    return () => {
      active = false;
      sub.remove();
    };
    // Handlers are intentionally excluded: subscribe once per client.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [joinByToken]);
}
