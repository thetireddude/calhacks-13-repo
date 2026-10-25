import { createClient } from "@supabase/supabase-js";
import { createApiClient } from "../src/apiClient";
import {
  createHttpGroupClient, createHttpMemberSetupClient, createHttpScheduleClient,
  createHttpIcsClient, createHttpPlanningClient, createHttpVotingClient,
} from "../src/httpClients";

const url = process.env.SUPABASE_URL!, anon = process.env.SUPABASE_ANON_KEY!, svc = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const base = "http://localhost:3000";
const admin = createClient(url, svc, { auth: { persistSession: false, autoRefreshToken: false } });
const tag = Date.now().toString(36);
const password = `Smoke-${tag}-Pw!9`;
const results: string[] = [];
const check = async <T,>(name: string, fn: () => Promise<T>): Promise<T | undefined> => {
  try { const v = await fn(); results.push(`PASS ${name}`); return v; }
  catch (e) { const c = (e as { code?: string; status?: number; message?: string }); results.push(`FAIL ${name} -> ${c.code ?? c.status ?? String(c.message).slice(0, 80)}`); return undefined; }
};
const assert = (c: unknown, m: string) => { if (!c) throw { message: m }; };

const created: string[] = [];
const groupIds: string[] = [];
async function mkUser(label: string) {
  const email = `gather-smoke-${tag}-${label}@example.com`;
  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (error || !data.user) throw { message: `createUser ${label}: ${error?.status}` };
  created.push(data.user.id);
  const c = createClient(url, anon, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: s, error: e2 } = await c.auth.signInWithPassword({ email, password });
  if (e2 || !s.session) throw { message: `signIn ${label}: ${e2?.status}` };
  const api = createApiClient({ baseUrl: base, getAccessToken: async () => s.session!.access_token });
  return { id: data.user.id, api };
}

try {
  const A = await mkUser("a"), B = await mkUser("b");
  const me = await check("A: GET /v1/me with real Supabase token", async () => { const m: any = await A.api.getMe(); assert(m && (m.userId ?? m.id ?? m.sub), "no id"); return m; });
  if (me) await check("A: /v1/me id equals Supabase user id", async () => assert([(me as any).userId, (me as any).id, (me as any).sub].includes(A.id), "id mismatch"));
  const gc = createHttpGroupClient(A.api), gb = createHttpGroupClient(B.api);
  const group = await check("A: create group", () => gc.createGroup({ name: `Smoke ${tag}` }));
  if (group) groupIds.push(group.id);
  if (!group) throw { message: "no group; stopping" };
  await check("A: list my groups includes it", async () => assert((await (gc as any).listGroups()).some((g: any) => g.id === group.id), "missing"));
  const ms = createHttpMemberSetupClient(A.api);
  await check("A: preferences persist (round trip, opt-out)", async () => {
    await ms.putPreferences({ activityTags: ["food"], budgetMin: 5, budgetMax: 30, travelRadiusKm: 10, learningOptIn: false });
    const p = await ms.getPreferences(); assert(p.learningOptIn === false && p.activityTags[0] === "food", "mismatch");
  });
  await check("A: availability persist", async () => {
    await ms.putAvailability({ windows: [{ startsAt: "2026-11-07T18:00:00Z", endsAt: "2026-11-07T21:00:00Z", label: "sat" }] });
    assert((await ms.getAvailability()).windows.length === 1, "mismatch");
  });
  const sc = createHttpScheduleClient(A.api);
  await check("A: schedule put/get", async () => { await sc.put(group.id, { timezone: "America/Los_Angeles", weeklyEnabled: false }); assert((await sc.get(group.id)).timezone === "America/Los_Angeles", "mismatch"); });
  const inv = await check("A: create invite", () => gc.createInvite(group.id));
  if (inv) await check("B: join via invite", async () => { await gb.joinInvite((inv as any).token); });
  await check("A: members == 2", async () => assert((await gc.listMembers(group.id)).length === 2, "count"));
  await check("B: list my groups includes it", async () => assert((await (gb as any).listGroups()).some((g: any) => g.id === group.id), "missing"));
  await check("B cannot read A's prefs via own client (own data only)", async () => assert((await createHttpMemberSetupClient(B.api).getPreferences()).activityTags.length === 0, "leak"));
  const pc = createHttpPlanningClient(A.api);
  const run = await check("A: create planning run", () => pc.createRun(group.id, { activityRequest: "smoke test" }));
  const props = run ? await check("A: proposals (<=3)", async () => { const r: any = await pc.getProposals(run.id); assert(r.proposals.length >= 1 && r.proposals.length <= 3, "count " + r.proposals.length); return r.proposals; }) : undefined;
  if (props) results.push(`INFO planner in use: ${String(props[0].proposalId).startsWith("mock-") ? "mock" : "real (@gather/planner)"}; first proposal: ${String(props[0].summary).slice(0, 60)}`);
  const va = createHttpVotingClient(A.api), vb = createHttpVotingClient(B.api);
  if (props) {
    await check("A: vote approve", async () => { await va.putVote(props[0].proposalId, { choice: "approve" }); });
    await check("B: vote cant_make_it", async () => { await vb.putVote(props[0].proposalId, { choice: "cant_make_it" }); });
    const ev: any = await check("A: confirmed event present", async () => { const e: any = await va.getConfirmedEvent(group.id); assert(e.status === "confirmed", "status " + e.status); return e; });
    if (ev) {
      await check("B (declined): can read confirmed event", async () => assert(((await vb.getConfirmedEvent(group.id)) as any).status === "confirmed", "no event"));
      await check("B: notifications has event_confirmed", async () => assert((await vb.listNotifications()).length >= 1, "empty"));
      await check("B: ICS export is VCALENDAR", async () => { const r: any = await createHttpIcsClient(B.api).exportIcs(ev.event.id); assert(String(r.content).includes("BEGIN:VCALENDAR") && String(r.content).includes("END:VCALENDAR"), "bad ics"); });
    }
  }
} catch (e) { results.push(`ABORT ${(e as any).message ?? e}`); }
finally {
  if (groupIds.length) { const r = await admin.from("groups").delete().in("id", groupIds); results.push(`cleanup groups: ${r.error ? "error " + r.error.code : "ok"}`); }
  for (const id of created) { const r = await admin.auth.admin.deleteUser(id); results.push(`cleanup user: ${r.error ? "error " + r.error.status : "ok"}`); }
  console.log(results.join("\n"));
}
