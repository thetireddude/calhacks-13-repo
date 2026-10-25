import type { GroupResponse } from "@gather/contracts";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";

import { GroupError } from "./groups";
import type { GroupClient } from "./groups";

type GroupsState = {
  client: GroupClient;
  // With an API-backed client this is loaded from GET /v1/groups (backend is the source of truth,
  // nothing is persisted locally). With the mock it is the groups created or joined this session.
  groups: GroupResponse[];
  // Error from the last failed listGroups (code only, no body or token); null when the load succeeded.
  loadError: GroupError | null;
  reloadGroups: () => void;
  createGroup: (name: string) => Promise<GroupResponse>;
  joinByToken: (token: string) => Promise<GroupResponse>;
};

const GroupsContext = createContext<GroupsState | null>(null);

export function GroupsProvider({ client, children }: { client: GroupClient; children: ReactNode }) {
  const [groups, setGroups] = useState<GroupResponse[]>([]);
  const [loadError, setLoadError] = useState<GroupError | null>(null);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const reloadGroups = useCallback(() => {
    setLoadError(null);
    setLoadAttempt((n) => n + 1);
  }, []);

  const add = useCallback((group: GroupResponse) => {
    setGroups((prev) => (prev.some((g) => g.id === group.id) ? prev : [...prev, group]));
  }, []);
  // A failed load is surfaced via loadError (with a retry) and never wipes groups already in the list.
  useEffect(() => {
    if (!client.listGroups) return;
    let active = true;
    client.listGroups().then(
      (list) => {
        if (!active) return;
        setLoadError(null);
        setGroups((prev) => [...list, ...prev.filter((p) => !list.some((g) => g.id === p.id))]);
      },
      (e) => {
        if (active) setLoadError(e instanceof GroupError ? e : new GroupError("server"));
      },
    );
    return () => {
      active = false;
    };
  }, [client, loadAttempt]);
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

  const value = useMemo(
    () => ({ client, groups, loadError, reloadGroups, createGroup, joinByToken }),
    [client, groups, loadError, reloadGroups, createGroup, joinByToken],
  );
  return <GroupsContext.Provider value={value}>{children}</GroupsContext.Provider>;
}

export function useGroups(): GroupsState {
  const ctx = useContext(GroupsContext);
  if (!ctx) throw new Error("useGroups must be used inside GroupsProvider");
  return ctx;
}
