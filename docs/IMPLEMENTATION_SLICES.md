# Family App v1 Implementation Slices

These slices break the v1 product brief into independently grabbable tracer bullets. Each slice should be demoable end-to-end across persistence, domain behavior, API/actions, UI, and tests.

## Proposed Order

### 1. App Shell and Household Setup Tracer - Done

**Blocked by**: None

**User stories covered**:
- As a Parent, I can create the Household.
- As a Parent, I can add Parents and Children.
- As a Parent, I can create Child PINs.
- As a Parent or Child, I can enter the correct view for my role.

**What to build**:
Create the responsive web app foundation with Parent View and Child View routes, a minimal persistent Household model, equal Parent permissions, Child PIN access, and Household Setup for adding the first Parents and Children.

**Acceptance criteria**:
- [x] A Parent can complete Household Setup with at least one Parent and one Child.
- [x] A Parent can create or update a Child PIN.
- [x] A Child can enter Child View using their PIN.
- [x] Parent View and Child View are visually distinct and responsive.
- [x] Tests cover Household Setup and Child PIN access behavior.

### 2. Chore Creation to Child Submission Tracer - Done

**Blocked by**: Slice 1

**User stories covered**:
- As a Parent, I can create a Chore for one Child.
- As a Child, I can see today's and upcoming Chores.
- As a Child, I can submit a completed Chore.

**What to build**:
Let Parents create one-time and recurring Chores assigned to exactly one Child, then show those Chores in a today-first Child View where the Child can create a Chore Submission.

**Acceptance criteria**:
- [x] A Parent can create a Chore with Child, Point value, due date, and optional Routine.
- [x] Child View shows today's Chores first and upcoming Chores separately.
- [x] A Child can submit an assigned Chore for review.
- [x] Missed due Chores become Overdue.
- [x] Tests cover one-time Chores, recurring Chores, Child ownership, submission, and Overdue behavior.

### 3. Approval Queue Awards Points for Chores - Done

**Blocked by**: Slice 2

**User stories covered**:
- As a Parent, I can review Chore Submissions in one Approval Queue.
- As a Parent, I can approve, mark Needs Work, Skip, Pause, or Archive Chores.
- As a Child, I can see earned Points and Wins after approval.

**What to build**:
Add the combined Approval Queue starting with Chore Submissions, including type-distinct queue rows, batch-friendly approval, Needs Work, Skip, Pause, Archive, Point Balance updates, Point Ledger entries, and Child Wins for approved Chores.

**Acceptance criteria**:
- [x] Parent View shows pending Chore Submissions in the Approval Queue.
- [x] A Parent can approve one or more Chore Submissions and award Points.
- [x] A Parent can mark a submission Needs Work without awarding Points.
- [x] A Parent can Skip a Chore occurrence without awarding Points.
- [x] A Parent can Pause expected Chore occurrences and Archive inactive Chores.
- [x] Child View shows updated Point Balance, simplified Point Ledger, and Wins.
- [x] Tests cover approval, Needs Work, Skip, Pause, Archive, ledger entries, and batch approval.

### 4. Goals and Progress Check-ins - Done

**Blocked by**: Slice 1, Slice 3

**User stories covered**:
- As a Parent, I can create a Goal for one Child.
- As a Child, I can submit Progress Check-ins.
- As a Parent, I can approve progress or mark it Needs Work.
- As a Parent, I can mark Goal Completion.

**What to build**:
Add plain Child-owned Goals with Point values, Progress Check-ins in Child View, Approval Queue support for check-ins, Point Ledger updates, Wins, and Parent-marked Goal Completion.

**Acceptance criteria**:
- [x] A Parent can create and Archive a Goal for one Child.
- [x] A Child can submit a Progress Check-in for an active Goal.
- [x] The Approval Queue distinguishes Progress Check-ins from Chore Submissions.
- [x] Approved Progress Check-ins can award Points and create Point Ledger entries.
- [x] Needs Work sends a Progress Check-in back without awarding Points.
- [x] Goal Completion can award remaining Points and appear in Wins.
- [x] Tests cover Goal ownership, check-in approval, Needs Work, completion, ledger entries, and Wins.

### 5. Reward Catalog, Contributions, Requests, and Fulfillment - Done

**Blocked by**: Slice 3

**User stories covered**:
- As a Parent, I can create shared Rewards with one Point cost.
- As a Child, I can contribute Points toward a Reward.
- As a Child, I can request a Reward when enough Points are committed or available.
- As a Parent, I can approve and fulfill Reward Requests.

**What to build**:
Add the shared Reward Catalog, Allowance as a normal Reward type, Reward Contributions, child-reversible contributions before request, Reward Requests with Reserved Points, Approval Queue support for requests, and separate Fulfillment after approval.

**Acceptance criteria**:
- [x] A Parent can create, edit, and Archive shared Rewards with one Point cost.
- [x] A Child can contribute available Points toward a Reward.
- [x] A Child can return Reward Contributions before submitting a Reward Request.
- [x] A Reward Request reserves Points while pending and prevents double-spend.
- [x] Approval spends Points; rejection or cancellation returns Reserved Points.
- [x] Fulfillment is tracked separately after approval.
- [x] The Approval Queue visually distinguishes Reward Requests from other item types.
- [x] Tests cover contributions, returns, reservation, approval, rejection/cancellation, fulfillment, and ledger entries.

### 6. Bonus Points and Point Adjustments - Done

**Blocked by**: Slice 3

**User stories covered**:
- As a Parent, I can award Bonus Points.
- As a Parent, I can make positive or negative Point Adjustments with reasons.
- As a Child, I can understand why my Point Balance changed.

**What to build**:
Add Parent flows for Bonus Points and Point Adjustments, requiring a reason for adjustments and recording every change in the Point Ledger. Negative adjustments are corrections, not penalties.

**Acceptance criteria**:
- [x] A Parent can award Bonus Points to a Child.
- [x] A Parent can create a positive or negative Point Adjustment with a required reason.
- [x] The Point Ledger clearly labels Bonus Points and Point Adjustments.
- [x] Child View shows a simplified explanation of each Point change.
- [x] Tests cover Bonus Points, required adjustment reasons, negative corrections, and ledger visibility.

### 7. Read-only Apple Calendar Agenda with Event Enrichment - Done

**Blocked by**: Slice 1

**User stories covered**:
- As a Parent, I can connect the shared Apple Family Calendar.
- As a Parent, I can see the full day-first Household Agenda.
- As a Parent, I can adjust Participants for synced Events.
- As a Child, I can see Events where I am a Participant.

**What to build**:
Add read-only Family Calendar sync using Apple Calendar as the source of truth for Events, then layer Event Enrichment for Participants inside Family App. Parent View shows the full Agenda; Child View shows relevant Events.

**Acceptance criteria**:
- [x] A Parent can connect or configure the shared Apple Family Calendar.
- [x] Synced Events are read-only in Family App.
- [x] Parent View shows a day-first Agenda with Participants.
- [x] A Parent can manually adjust Participants through Event Enrichment.
- [x] Child View shows that Child's Events and all-Household Events when relevant.
- [x] Tests cover read-only Event behavior, Participant enrichment, Parent Agenda, and Child Agenda filtering.

### 8. Parent Briefing and Suggested Actions - Done

**Blocked by**: Slice 3, Slice 5, Slice 7

**User stories covered**:
- As a Parent, I can understand today's household situation from one Briefing.
- As a Parent, I can see Suggested Actions for items that need attention.

**What to build**:
Build the Parent Briefing from existing app state: upcoming Events, pending Approval Queue items, Overdue Chores, unfulfilled Rewards, and rule-based Suggested Actions.

**Acceptance criteria**:
- [x] Briefing shows today's and tomorrow's important Events.
- [x] Briefing summarizes pending Approval Queue items by type.
- [x] Briefing highlights Overdue Chores and unfulfilled Rewards.
- [x] Suggested Actions are rule-based and link to the relevant workflow.
- [x] Tests cover Briefing content and Suggested Action rules.

### 9. Weekly Review - Done

**Blocked by**: Slice 4, Slice 5, Slice 7, Slice 8

**User stories covered**:
- As a Parent, I can review the upcoming week.
- As a Parent, I can review child progress, Point Balances, and pending requests.

**What to build**:
Add the Parent Weekly Review for the upcoming week of Events, child Chore and Goal progress, Point Balances, pending Reward Requests, and unfulfilled Rewards.

**Acceptance criteria**:
- [x] Weekly Review shows upcoming week Events from the Family Calendar.
- [x] Weekly Review summarizes Chores, Overdue Chores, Goals, Point Balances, pending Reward Requests, and unfulfilled Rewards.
- [x] Weekly Review links back into the relevant Parent workflows.
- [x] Tests cover Weekly Review aggregation and empty states.

### 10. V1 Polish, Empty States, and Installable Quality Pass - Done

**Blocked by**: Slices 1-9

**User stories covered**:
- As a Parent or Child, I can use the app comfortably on phone, tablet, or desktop.
- As a family, the app feels motivating, clear, and non-punitive.

**What to build**:
Harden responsive layouts, empty states, accessibility, loading/error states, visual distinction in queue items, and copy tone across Parent View and Child View.

**Acceptance criteria**:
- [x] Parent View and Child View are usable on common mobile, tablet, and desktop widths.
- [x] Empty states guide Parents and Children toward the next useful action.
- [x] Approval Queue item types are visually distinct and batch-friendly.
- [x] Point Ledger and Wins feel clear and encouraging for Children.
- [x] Accessibility checks pass for keyboard navigation, labels, contrast, and focus states.
- [x] Smoke tests cover the full v1 happy path.

### 11. Parent View IA Simplification - Done

**Blocked by**: Slices 1-10

**User stories covered**:
- As a Parent, I can open Parent View and immediately see the Today/Tomorrow Agenda.
- As a Parent, I can quickly act on items that need attention without scanning every management surface.
- As a Parent, I can move into focused workflows when I need to create, edit, archive, or configure Household objects.

**What to build**:
Refactor Parent View into an agenda-first daily command surface labeled `Today` in Parent workflow navigation. Move durable creation, editing, archiving, configuration, planning, and full review flows for Chores, Goals, Rewards, Calendar, Household, Points, Approvals, and Weekly Review into focused Parent workflow pages. Add compact persistent Parent workflow navigation for Today, Approvals, Chores, Goals, Rewards, Calendar, Points, Household, and Weekly Review, with contextual links inside Parent View sections. Keep quick actions such as Approve, Needs Work, Skip, and Reward fulfillment near the attention items they resolve.

Create separate Parent routes for `/parent`, `/parent/approvals`, `/parent/chores`, `/parent/goals`, `/parent/rewards`, `/parent/calendar`, `/parent/points`, `/parent/household`, and `/parent/weekly-review`. Extract shared components only as needed to support the route-level IA.

Default `Today` content order: Today/Tomorrow Agenda, Needs Attention summary, capped Approval Queue preview, Chores Needing Parent Handling, Reward Fulfillment, Child Status summaries, then Create/Manage shortcuts.

Use a shared Parent layout for `/parent/*` routes with the Household title, Parent workflow navigation, shared status/error messaging, and demo reset access while the local-demo store remains in use.

**Acceptance criteria**:
- [x] Parent View shows the Today/Tomorrow Agenda as the first primary content area.
- [x] The Agenda shows all Today/Tomorrow Events while visually elevating Events that need Parent attention, such as missing or ambiguous Participants.
- [x] The Calendar workflow owns the full Household Agenda, Apple Calendar connection/sync controls, and Event Participant enrichment; Today shows only the Today/Tomorrow agenda slice.
- [x] Briefing focuses on items needing Parent attention rather than containing the Agenda.
- [x] Parent View includes compact Child status summaries with Point Balance, today's Chore status, active Goal or check-in status, pending Reward state, and one contextual workflow link per Child.
- [x] Child status summaries do not expose full Point Ledgers, full Chore or Goal lists, or Child PIN editing.
- [x] Parent workflow navigation gives Parents predictable access to Today, Approvals, Chores, Goals, Rewards, Calendar, Points, Household, and Weekly Review without crowding the agenda-first view.
- [x] Focused Parent workflow pages exist as separate routes rather than hidden sections of the main Parent View.
- [x] Parent workflow pages share a consistent Parent layout and navigation shell.
- [x] Parent View shows a capped Approval Queue preview with inline quick actions and links to a full Approvals workflow for larger queues or batch review.
- [x] Parent View shows Reward fulfillment as a capped attention module with a quick Fulfill action, while full fulfillment history and Reward Catalog management live in the Rewards workflow.
- [x] Parent View exposes creation and management as links or buttons into focused workflows, not as always-visible forms.
- [x] Chore, Goal, Reward, Calendar, Household, and Points creation/configuration forms are no longer permanently visible on Parent View.
- [x] Full Weekly Review lives at a focused Parent workflow page such as `/parent/weekly-review`, with only a compact link or summary from Parent View.
- [x] Parent View shows Chores Needing Parent Handling for Chore occurrences that need a Parent decision, while normal due Chores stay in Child View and Child Status summaries.
- [x] Quick review actions remain available from Parent View for Approval Queue items, Chores Needing Parent Handling, and unfulfilled Rewards.
- [x] Tests cover the user-facing IA: Today is agenda-first, creation forms are absent from Today, workflow navigation reaches focused pages, focused pages contain their relevant forms and lists, and capped previews link to full workflows.

## Production Launch Slices

These slices move the completed V1 demo into a private production app for one Household. Keep slices intentionally small: create the full V1 Supabase schema first, then wire one workflow at a time through server actions, Drizzle, Supabase Auth, and server-side authorization. Do not preserve the `localStorage` demo persistence path as a parallel mode.

**Launch decisions**:
- Production launch is private to one Household, not a public multi-Household product.
- The first production Parent signs in with a Supabase magic link, then uses `FIRST_RUN_SETUP_TOKEN` to create the fresh production Household.
- Parent access is allowlisted by exact Parent email, and every Parent request verifies the authenticated Supabase email against an allowed Parent row.
- Children use 30-day signed, httpOnly, same-site Household-scoped sessions from Parent-managed PINs; PIN changes invalidate existing Child sessions.
- Production starts fresh in Supabase Postgres with the full V1 launch schema; no demo `localStorage` data migration is required.
- Production release includes V1 slices 1-11 wired to Supabase and server actions, with live Apple Calendar feed fetching the only base feature allowed to follow after release.
- Apple Calendar uses a public `webcal`/ICS feed URL stored server-side as Calendar Connection data; the URL is treated as a secret and is not echoed back to the client after save.

### P1. Full V1 Supabase Schema, Constraints, and RLS - Done

**Blocked by**: V1 Slice 11

**What to build**:
Create or harden the complete V1 Drizzle/Supabase schema for a fresh production instance, including Household-owned tables, indexes, foreign keys, state enums, Point Ledger data, Calendar Connection fields for a server-side public feed URL, Child session invalidation fields, and Row Level Security policies. Schema and RLS ship together.

**Acceptance criteria**:
- [ ] Drizzle schema and generated migrations cover all V1 entities from slices 1-11.
- [ ] Every household-owned table has `household_id` and appropriate foreign keys.
- [ ] State fields use explicit status enums rather than boolean clusters.
- [ ] Point Ledger entries can represent every production Point Balance change.
- [ ] Calendar Connection stores the public feed URL server-side and supports safe client metadata.
- [ ] Child rows include a session invalidation field such as `pin_updated_at` or `session_version`.
- [ ] RLS is enabled for household-owned tables and denies access by default.
- [ ] RLS policies enforce Parent email allowlist access and Child-session scoped access where applicable.
- [ ] Tests or migration checks verify the schema, constraints, and RLS policy shape.

### P2. Supabase Auth Gate and Locked App Shell - Done

**Blocked by**: P1

**What to build**:
Add Supabase Auth integration for Parent magic links and a server-rendered app gate. Anonymous visitors and authenticated-but-unallowlisted users must see only generic private-app screens with no Household details.

**Acceptance criteria**:
- [x] Supabase client/server helpers are configured for Next.js App Router.
- [x] Parent sign-in uses email magic links.
- [x] Anonymous users see only a locked sign-in screen.
- [x] Authenticated users whose email is not allowlisted see a generic private-app denial.
- [x] No locked or denied state exposes Household names, Parent identities, Child profiles, or PIN existence.
- [x] Tests cover the auth gate decisions without relying on client-only hiding.

### P3. First-Run Household Setup and Local Demo Removal - Done

**Blocked by**: P2

**What to build**:
Replace `localStorage` Household setup with a server-backed first-run setup. A verified Supabase user can create the one production Household only when no Household exists and the submitted `FIRST_RUN_SETUP_TOKEN` matches the server-only environment variable.

**Acceptance criteria**:
- [x] First-run setup requires an authenticated Supabase user and valid `FIRST_RUN_SETUP_TOKEN`.
- [x] Setup creates the Household, first Parent row for the authenticated email, initial Children, and hashed Child PINs in Supabase.
- [x] Setup is disabled once a Household exists.
- [x] Parent View loads Household data from server-side Drizzle queries.
- [x] `localStorage` Household persistence and demo reset are removed from production UI code.
- [x] Tests cover successful first-run setup, invalid token rejection, and setup lockout after Household creation.

### P4. Parent Allowlist and Household Management - Done

**Blocked by**: P3

**What to build**:
Wire the Household workflow to server actions for Parent allowlist management, Child profile management, and Child PIN updates. Every Parent request must verify the authenticated Supabase email maps to an allowed Parent row.

**Acceptance criteria**:
- [x] Parent rows can be created for exact invited email addresses.
- [x] Parent access is granted only when the authenticated Supabase email matches an allowed Parent row.
- [x] Child profile updates and PIN changes persist through Drizzle.
- [x] Child PINs are hashed server-side and never returned to the client.
- [x] Child PIN changes update the Child session invalidation field.
- [x] Tests cover allowlisted access, unallowlisted denial, and PIN update invalidation data.

### P5. Child PIN Sessions and Child App Gate - Done

**Blocked by**: P4

**What to build**:
Replace demo Child session storage with signed, httpOnly, same-site Child session cookies. Child sessions last 30 days and are valid only inside the production Household context.

**Acceptance criteria**:
- [x] Child sign-in verifies the PIN against the server-side hash for the selected Child.
- [x] Successful sign-in creates a signed 30-day httpOnly same-site cookie containing only Household/Child identity and session version data.
- [x] Child requests validate the cookie against the current Child row before returning data.
- [x] PIN changes invalidate existing Child sessions.
- [x] Child logout clears the session cookie.
- [x] Tests cover valid PIN sign-in, invalid PIN rejection, scoped Child data access, and invalidated sessions.

### P6. Parent Chore Management Persistence - Done

**Blocked by**: P5

**What to build**:
Wire the Chores workflow for Parent-created and Parent-managed Chores through server actions and Drizzle.

**Acceptance criteria**:
- [x] Parents can create one-time and recurring Chores assigned to one Child.
- [x] Parents can Pause and Archive Chores.
- [x] Chore forms and Chore lists use server-backed data, not client demo state.
- [x] Server actions enforce Parent allowlist authorization.
- [x] Domain tests still cover Chore validation and recurrence behavior.
- [x] Integration tests cover Parent Chore creation and management persistence.

### P7. Child Chore Board and Submission Persistence - Done

**Blocked by**: P6

**What to build**:
Wire Child View Chore boards and Chore Submission actions through Child session authorization and Drizzle.

**Acceptance criteria**:
- [x] Child View shows today, upcoming, overdue, and pending-review Chores from Supabase.
- [x] Children can submit only their own due or Overdue Chores.
- [x] Chore Submissions persist with occurrence dates and pending status.
- [x] Child session authorization prevents access to another Child's Chores.
- [x] Tests cover Child ownership, submission persistence, and Overdue behavior.

### P8. Chore Approval Queue and Point Ledger Persistence - Done

**Blocked by**: P7

**What to build**:
Wire the Approval Queue for Chore Submissions, including Approve, Needs Work, Skip, and batch-friendly approval with Point Ledger and Point Balance updates in one database transaction.

**Acceptance criteria**:
- [x] Parent Approval Queue shows pending Chore Submissions from Supabase.
- [x] Approving Chore Submissions creates Point Ledger entries and updates Point Balance atomically.
- [x] Needs Work and Skip persist without awarding Points.
- [x] Batch approval works for multiple Chore Submissions.
- [x] Server actions enforce Parent allowlist authorization.
- [x] Tests cover transaction safety, ledger entries, balance updates, Needs Work, Skip, and batch approval.

### P9. Goals and Progress Check-ins Persistence - Done

**Blocked by**: P8

**What to build**:
Wire Goals, Progress Check-ins, Goal approval outcomes, and Goal Completion through server actions and Drizzle.

**Acceptance criteria**:
- [x] Parents can create, complete, and Archive Goals for one Child.
- [x] Children can submit Progress Check-ins for their own active Goals.
- [x] Approval Queue distinguishes Progress Check-ins from Chore Submissions.
- [x] Approved Progress Check-ins and Goal Completion create Point Ledger entries and Wins atomically.
- [x] Needs Work persists without awarding Points.
- [x] Tests cover Goal ownership, check-in approval, Needs Work, completion, ledger entries, and Wins.

### P10. Reward Catalog and Child Reward Actions Persistence - Done

**Blocked by**: P8

**What to build**:
Wire Reward Catalog management plus Child Reward Contributions, contribution returns, Reward Requests, and cancellations through server actions and Drizzle.

**Acceptance criteria**:
- [x] Parents can create, edit, and Archive shared Rewards.
- [x] Children can contribute available Points toward Rewards and return active contributions.
- [x] Children can submit Reward Requests when enough Points are committed or available.
- [x] Pending Reward Requests reserve Points and prevent double-spend.
- [x] Cancellation returns Reserved Points.
- [x] Tests cover Reward Catalog persistence, contributions, returns, reservations, cancellation, and ledger entries.

### P11. Reward Approval and Fulfillment Persistence - Done

**Blocked by**: P10

**What to build**:
Wire Reward Request review and fulfillment through the Approval Queue and Rewards workflow.

**Acceptance criteria**:
- [x] Approval Queue visually distinguishes Reward Requests.
- [x] Parent approval spends Reserved Points and creates ledger entries atomically.
- [x] Rejection returns Reserved Points.
- [x] Fulfillment is tracked separately after approval.
- [x] Rewards workflow shows unfulfilled Rewards and fulfillment history from Supabase.
- [x] Tests cover approval, rejection, fulfillment, balance changes, and ledger entries.

### P12. Bonus Points, Point Adjustments, Ledger, and Wins Persistence - Done

**Blocked by**: P11

**What to build**:
Wire Bonus Points, Point Adjustments, Point Ledger displays, and Wins displays through server actions and Drizzle.

**Acceptance criteria**:
- [x] Parents can award Bonus Points to a Child.
- [x] Parents can create positive or negative Point Adjustments with a required reason.
- [x] All Point Balance changes appear in the authoritative Point Ledger.
- [x] Child View shows simplified Point Ledger and Wins from Supabase.
- [x] Server actions enforce Parent allowlist authorization.
- [x] Tests cover Bonus Points, required adjustment reasons, negative corrections, ledger visibility, and Wins visibility.

### P13. Parent Today, Briefing, and Weekly Review Production Aggregation - Done

**Blocked by**: P9, P12

**What to build**:
Wire Parent Today, Needs Attention, Child Status summaries, Briefing, Suggested Actions, and Weekly Review to server-backed aggregation over Supabase data.

**Acceptance criteria**:
- [x] Parent Today loads agenda-independent attention data from Supabase.
- [x] Approval Queue preview, Chores Needing Parent Handling, Reward Fulfillment, and Child Status summaries are server-backed.
- [x] Briefing Suggested Actions link to focused Parent workflows.
- [x] Weekly Review summarizes Chores, Goals, Point Balances, pending Reward Requests, and unfulfilled Rewards from Supabase.
- [x] Empty states remain useful when no data exists.
- [x] Tests cover aggregation rules and empty states over persisted data.

### P14. Calendar Connection Metadata Without Live Feed Sync - Done

**Blocked by**: P3

**What to build**:
Wire the Calendar workflow enough for production release without live Apple feed fetching. Parents can save or replace the public `webcal`/ICS feed URL server-side, but the client only sees safe metadata.

**Acceptance criteria**:
- [x] Parents can save Calendar name and public feed URL through a server action.
- [x] The feed URL is stored server-side and is not echoed back to the client after save.
- [x] Calendar screens show safe connection metadata and empty/not-connected states.
- [x] Event Enrichment UI handles an empty agenda gracefully.
- [x] Tests cover feed URL write-only behavior and Parent authorization.

### P15. Production Release Hardening - Done

**Blocked by**: P1-P14

**What to build**:
Prepare the private production release on Vercel and Supabase with operational checks, release smoke tests, and rollback-safe configuration.

**Acceptance criteria**:
- [x] Required environment variables are documented, including Supabase values, `FIRST_RUN_SETUP_TOKEN`, and Child session signing secret.
- [x] Vercel production deployment is configured for the Next.js app.
- [x] Supabase production project has migrations applied, RLS enabled, and backups configured.
- [x] Playwright covers the production happy path across Parent magic-link setup, Child PIN sign-in, Chore approval, Points, Rewards, and Weekly Review.
- [x] A release checklist covers first-run setup, Parent allowlist verification, Child PIN verification, and private-app denial states.
- [x] No production UI path reads or writes demo `localStorage` Household state.

### P16. Post-Release Apple Calendar Feed Sync - Done

**Blocked by**: P14

**What to build**:
Add server-side scheduled fetching and parsing of the public Apple Calendar `webcal`/ICS feed into normalized read-only Events, preserving Family App Event Enrichment.

**Acceptance criteria**:
- [x] Vercel cron or an equivalent server route fetches the stored feed URL server-side.
- [x] ICS parsing creates and updates read-only Calendar Events without exposing the feed URL.
- [x] Event Enrichment remains separate from synced Events.
- [x] Parent Agenda and Child Agenda show synced Events with Participant filtering.
- [x] Sync failures are logged and surfaced to Parents as safe, non-secret status.
- [x] Tests cover feed parsing, Event upsert behavior, enrichment preservation, and agenda filtering.
