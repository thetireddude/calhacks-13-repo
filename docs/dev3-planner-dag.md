# Developer 3 planner DAG

```text
DEV3-001  planner vertical review/test
    |
    v
DEV3-002  contract proposal + Dev 1/Dev 2 sign-off
    |
    v
DEV3-003  compose real PlannerPort
   /   \
  v     v
DEV3-004  Creao verification       DEV3-005  Bright Data verification
  (credentials)                      (credentials)
   \     /
    v   v
GATE2-001  Core API ↔ real planner integration
```

DEV3-004 and DEV3-005 verify optional live-provider paths. GATE2-001 can proceed with the seeded fallback after DEV3-003; it does not wait for external credentials.

The only shared-contract mutation is DEV3-002 and needs recorded Dev 1/Dev 2 agreement. All other DEV3 tasks are confined to `packages/planner/**`.
