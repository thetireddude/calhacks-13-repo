import type { GroupResponse } from "@gather/contracts";
import { createContext, useCallback, useContext, useMemo, useState } from "react";
import type { ReactNode } from "react";

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
