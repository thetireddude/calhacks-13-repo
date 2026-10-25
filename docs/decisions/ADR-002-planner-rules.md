# ADR-002: Planner rules for the initial demo

**Status:** Accepted by project owner on 2026-10-24

## Provider and discovery

- Use `anthropic/claude-haiku-4-5` through Creao for constrained personal
  evaluations. It is the economy model suited to short structured evaluations;
  it cannot make eligibility, score, or vote decisions.
- Use manual, on-demand live discovery only. Bright Data sources are Google
  Maps (venues/activities), Yelp (dining/activity venues), and Facebook Events
  by known public venue. Each live-source failure falls back to seeded data.
- Defer Funcheap and DoTheBay until their custom collectors exist.

## Authorized planner input and privacy

Each member input may contain: opaque member reference, selected activity tags,
per-candidate availability, budget ceiling, travel radius, and a current
inclusion debt only when learning is opted in. It must not contain name, email,
raw calendar data, raw preference history, private event details, or opted-out
history. Public explanations are aggregate only.

## Eligibility and scoring

- A candidate must have a public source URL, title, city, and future date/time.
- A group proposal requires at least two feasible members. A member is feasible
  only when available, within their budget when price is known, and within
  their travel radius when distance is known. Unknown price/distance is not a
  hard exclusion.
- Expected attendance = feasible members / group members.
- Shared preference fit = average tag-overlap score among feasible members.
- Budget/travel fit = average of per-member budget and travel fit, where within
  budget/radius is 1, unknown is 0.5, and outside is 0.
- Inclusion fairness = debt-weighted feasible-member rate. Every member has a
  base weight of 1; opted-in debt adds to that weight. Opted-out members retain
  only the base weight.
- Final score weights are fixed: attendance 45%, preference 30%, budget/travel
  15%, inclusion 10%.

## Inclusion debt

Debt is stored by the backend only for opted-in members, bounded to 0–3. After
a confirmed event, increase debt by 1 if a member was available but infeasible;
do not increase it for voluntary declines or unavailable members. Decrease debt
by 1 when an opted-in member is feasible for a confirmed event. The planner
returns a proposed ledger update; it never persists it.

## Ties

If the top two scores tie exactly, the planner returns a tie-resolution result
containing those two proposals. The backend opens a separate vote between them;
the planner neither casts nor persists votes.
