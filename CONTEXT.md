# Family App

The domain language of the family household app — a private tool for coordinating
shared household schedules, responsibilities, goals, and rewards. This file is a
living context map for the repo and the canonical glossary for product/domain
terms.

## Context Maintenance

Keep this file current when the repo structure changes. If you add, remove, move,
or substantially repurpose directories, major entry-point files, or important
documents, update the tree and document index below in the same change.

## Repo Tree

```txt
.
|-- CONTEXT.md
|-- README.md
|-- docs/
|   |-- PRD_V1.md
|   |-- IMPLEMENTATION_SLICES.md
|   |-- TECHNICAL_REVIEW.md
|   |-- FUTURE_FEATURES.md
|   `-- adr/
|       |-- 0001-read-only-apple-calendar.md
|       |-- 0002-responsive-web-app-first.md
|       |-- 0003-parent-accounts-and-child-pins.md
|       |-- 0004-single-points-system.md
|       |-- 0005-nextjs-supabase-vercel-stack.md
|       |-- 0006-point-ledger-is-authoritative.md
|       |-- 0007-parent-view-command-surface.md
|       `-- 0008-private-single-household-production-launch.md
|-- drizzle/
|   |-- 0000_reflective_dracula.sql
|   |-- 0001_bright_preak.sql
|   |-- 0002_colossal_sersi.sql
|   |-- 0003_slippery_sasquatch.sql
|   |-- 0004_p1_full_v1_schema_rls.sql
|   `-- meta/
|       |-- 0000_snapshot.json
|       |-- 0001_snapshot.json
|       |-- 0002_snapshot.json
|       |-- 0003_snapshot.json
|       |-- 0004_snapshot.json
|       `-- _journal.json
|-- src/
|   |-- app/
|   |   |-- page.tsx
|   |   |-- layout.tsx
|   |   |-- globals.css
|   |   |-- auth/
|   |   |   `-- callback/
|   |   |       |-- route.ts
|   |   |       `-- route.test.ts
|   |   |-- child/page.tsx
|   |   |-- parent/
|   |   |   |-- page.tsx
|   |   |   |-- parent-workflow-route.tsx
|   |   |   |-- approvals/page.tsx
|   |   |   |-- calendar/page.tsx
|   |   |   |-- chores/page.tsx
|   |   |   |-- goals/page.tsx
|   |   |   |-- household/page.tsx
|   |   |   |-- points/page.tsx
|   |   |   |-- rewards/page.tsx
|   |   |   `-- weekly-review/page.tsx
|   |   `-- setup/page.tsx
|   |-- components/
|   |   |-- app-shell.tsx
|   |   `-- ui/
|   |       |-- button.tsx
|   |       |-- input.tsx
|   |       `-- label.tsx
|   |-- domain/
|   |   |-- briefing.ts
|   |   |-- briefing.test.ts
|   |   |-- calendar.ts
|   |   |-- calendar.test.ts
|   |   |-- chores.ts
|   |   |-- chores.test.ts
|   |   |-- goals.ts
|   |   |-- goals.test.ts
|   |   |-- household.ts
|   |   |-- household.test.ts
|   |   |-- points.ts
|   |   |-- points.test.ts
|   |   |-- rewards.ts
|   |   |-- rewards.test.ts
|   |   |-- v1-smoke.test.ts
|   |   |-- weekly-review.ts
|   |   `-- weekly-review.test.ts
|   |-- features/
|   |   |-- auth/
|   |   |   |-- locked-app-screen.tsx
|   |   |   `-- private-app-denied-screen.tsx
|   |   |-- child/child-view-page.tsx
|   |   |-- household/
|   |   |   |-- household-setup-page.tsx
|   |   |   `-- local-household-store.ts
|   |   `-- parent/
|   |       |-- parent-view-page.tsx
|   |       `-- parent-workflows.test.ts
|   |-- lib/
|   |   |-- supabase/
|   |   |   |-- client.ts
|   |   |   |-- config.ts
|   |   |   `-- server.ts
|   |   `-- utils.ts
|   |-- server/
|   |   |-- auth/
|   |   |   |-- actions.ts
|   |   |   |-- parent-access.ts
|   |   |   |-- parent-gate.test.ts
|   |   |   `-- parent-gate.ts
|   |   |-- child/
|   |   |   |-- actions.ts
|   |   |   |-- chores.test.ts
|   |   |   |-- chores.ts
|   |   |   |-- queries.ts
|   |   |   |-- repository.ts
|   |   |   |-- session.test.ts
|   |   |   `-- session.ts
|   |   |-- db/
|   |   |   |-- client.ts
|   |   |   |-- schema.test.ts
|   |   |   `-- schema.ts
|   |   `-- household/
|   |       |-- actions.ts
|   |       |-- first-run.test.ts
|   |       |-- first-run.ts
|   |       |-- management.test.ts
|   |       |-- management.ts
|   |       |-- queries.ts
|   |       `-- repository.ts
|   `-- test/
|       `-- server-only.ts
|-- package.json
|-- package-lock.json
|-- next.config.ts
|-- drizzle.config.ts
|-- vitest.config.ts
|-- tailwind.config.ts
|-- postcss.config.js
|-- eslint.config.mjs
|-- tsconfig.json
`-- next-env.d.ts
```

## Current Implementation Snapshot

The V1 product/domain behavior is implemented and covered by Vitest tests.
The private-production migration is complete through P7 in
[docs/IMPLEMENTATION_SLICES.md](docs/IMPLEMENTATION_SLICES.md): full V1
Postgres/RLS schema, Supabase magic-link gate, first-run Household setup,
Parent allowlist and Household management, Child PIN sessions, Parent Chore
management persistence, and Child Chore board/submission persistence.

P8-P16 remain the active production hardening path: Chore approval
transactions, Goals and Progress Check-ins persistence, Rewards persistence,
Bonus Points and Point Adjustments persistence, Parent aggregation, Calendar
Connection metadata, production release hardening, and post-release Apple
Calendar feed sync.

## Important Documents

Read these documents before making product, architectural, or terminology
changes:

**[README.md](README.md)**:
The current project overview, setup instructions, environment variables,
development commands, and operational notes.

**[docs/PRD_V1.md](docs/PRD_V1.md)**:
The v1 product brief. Defines purpose, primary users, v1 scope, out-of-scope
items, durable decisions, and success criteria.

**[docs/IMPLEMENTATION_SLICES.md](docs/IMPLEMENTATION_SLICES.md)**:
The delivery plan. Breaks the v1 brief into independently demoable tracer
bullets with user stories, build notes, dependencies, and acceptance criteria.

**[docs/TECHNICAL_REVIEW.md](docs/TECHNICAL_REVIEW.md)**:
The technical recommendation and architecture guidance. Captures the Next.js,
Supabase, Vercel, Drizzle, Tailwind, local UI primitives, lucide-react, Vitest,
and future end-to-end testing direction.

**[docs/FUTURE_FEATURES.md](docs/FUTURE_FEATURES.md)**:
Ideas intentionally left out of v1, such as Chore templates and Family Display
Mode.

## Architecture Decision Records

Read the ADR folder before changing durable product or technical choices:

**[docs/adr/0001-read-only-apple-calendar.md](docs/adr/0001-read-only-apple-calendar.md)**:
Apple Calendar remains the source of truth for Events; Family App syncs it
read-only in v1.

**[docs/adr/0002-responsive-web-app-first.md](docs/adr/0002-responsive-web-app-first.md)**:
V1 starts as a responsive web app for phones, tablets, and computers.

**[docs/adr/0003-parent-accounts-and-child-pins.md](docs/adr/0003-parent-accounts-and-child-pins.md)**:
Parents use real accounts; Children use Parent-managed Child PINs.

**[docs/adr/0004-single-points-system.md](docs/adr/0004-single-points-system.md)**:
Each Child has one shared Points system across allowance, experiences,
privileges, and other Rewards.

**[docs/adr/0005-nextjs-supabase-vercel-stack.md](docs/adr/0005-nextjs-supabase-vercel-stack.md)**:
The app uses Next.js, TypeScript, Vercel, Supabase Postgres/Auth, Drizzle,
Tailwind CSS, shadcn/ui, and lucide-react.

**[docs/adr/0006-point-ledger-is-authoritative.md](docs/adr/0006-point-ledger-is-authoritative.md)**:
Point Ledger entries explain every Point Balance change and must stay in sync
with any denormalized balance updates.

**[docs/adr/0007-parent-view-command-surface.md](docs/adr/0007-parent-view-command-surface.md)**:
Parent View is the Parent-facing daily command surface; durable management flows
live in focused Parent workflow pages.

**[docs/adr/0008-private-single-household-production-launch.md](docs/adr/0008-private-single-household-production-launch.md)**:
Family App launches as a private production app for one Household with
first-run token setup, Parent email allowlisting, Child PIN sessions, and a
fresh Supabase-backed V1 schema.

**[docs/adr/0009-automatic-calendar-sync-freshness.md](docs/adr/0009-automatic-calendar-sync-freshness.md)**:
Calendar Sync runs on save, stale Calendar page loads, and scheduled cron while
keeping the Family Calendar feed URL server-side.

## Language

**Household**:
The private group of people who coordinate calendars, responsibilities, goals, and rewards together.
The Household is the main unit the app manages.
_Avoid_: Family, home, account, group

**Parent**:
An adult in the Household who coordinates schedules, assigns or approves responsibilities, and manages rewards.
Parents have equal household-admin permissions in v1.
_Avoid_: Adult, guardian, admin

**Child**:
A child in the Household who completes responsibilities, works toward goals, and earns rewards.
_Avoid_: Kid, dependent, member

**Points**:
The flexible earning unit a Child receives for completing responsibilities or making progress toward goals.
Points may later be exchanged for allowance, experiences, or other rewards; v1 does not use Points as penalties.
_Avoid_: Dollars, allowance, coins, stars

**Chore**:
A household responsibility assigned to a Child that can earn Points when completed.
A Chore belongs to one Child, has its own Point value, and may be one-time or recurring.
_Avoid_: Task, responsibility, job

**Chore Submission**:
A Child's claim that a Chore has been completed and is ready for Parent review.
_Avoid_: Completion, check-off, done

**Approval**:
A Parent's confirmation that a Chore Submission earns its Points.
Approvals may be handled one at a time or in batches.
_Avoid_: Verification, acceptance, review

**Approval Queue**:
The combined Parent review list for Chore Submissions, Progress Check-ins, and Reward Requests.
Items in the Approval Queue must remain easy to distinguish by type.
_Avoid_: Inbox, review list, moderation queue

**Needs Work**:
A Parent review outcome that sends a Chore Submission or Progress Check-in back to the Child without awarding Points.
_Avoid_: Reject, fail, deny

**Skip**:
A Parent action that marks a Chore occurrence as not required without awarding Points.
_Avoid_: Delete, reject, dismiss

**Pause**:
A Parent action that temporarily stops expected Chore occurrences for a Child or Routine.
_Avoid_: Disable, vacation mode, suspend

**Archive**:
A Parent action that removes a Chore, Goal, or Reward from active use while preserving its history.
_Avoid_: Delete, remove, retire

**Routine**:
The recurring pattern for a Chore, such as daily, weekly, or a specific weekday.
Chores without a Routine are one-time Chores.
_Avoid_: Schedule, recurrence, repeat rule

**Overdue**:
The state of a Chore that was due but has not been submitted, approved, or skipped.
_Avoid_: Late, missed, expired

**Chores Needing Parent Handling**:
The Parent-facing attention list of Chore occurrences that need a Parent decision, such as Skip or other intervention.
Normal due Chores belong in Child View and Child Status summaries rather than this list.
_Avoid_: Due Chore Occurrences, parent chore list, chore feed

**Goal**:
A longer-running objective assigned to a Child that can earn Points through progress or completion.
A Goal belongs to one Child and has its own Point value.
_Avoid_: Family goal, objective, milestone

**Progress Check-in**:
A Child's claim that they made progress toward a Goal and are ready for Parent review.
Approved Progress Check-ins may award Points.
_Avoid_: Update, log, status, report

**Goal Completion**:
A Parent action that marks a Goal as complete.
Goal Completion may award remaining Points for the Goal.
_Avoid_: Finish, close, done

**Point Balance**:
The single shared total of unspent Points a Child has available to redeem for Rewards.
_Avoid_: Wallet, bank, allowance balance, category balance

**Point Ledger**:
The history of Point changes for a Child, including Points earned, reserved, spent, returned, or awarded as Bonus Points.
_Avoid_: Transaction log, audit trail, history

**Bonus Points**:
Points a Parent awards to a Child outside a Chore or Goal, usually for ad hoc recognition.
_Avoid_: Extra credit, adjustment, gift

**Point Adjustment**:
A Parent-created Point Ledger entry that changes a Child's Point Balance to correct mistakes or handle exceptions.
Point Adjustments may be positive or negative and require a reason; negative Point Adjustments are corrections, not penalties.
_Avoid_: Manual edit, balance edit, correction

**Reward**:
Something a Child can redeem with Points, such as allowance, an experience, or a privilege.
_Avoid_: Prize, payout, redemption option

**Reward Catalog**:
The Household's shared set of Rewards available for Children to request.
Each Reward has one shared Point cost in v1.
_Avoid_: Store, shop, prize list

**Allowance**:
A cash Reward a Child can request using Points.
Allowance is not paid out automatically in v1.
_Avoid_: Automatic payout, weekly allowance, stipend

**Reward Request**:
A Child's request to spend Points on a Reward.
A Reward Request requires Parent approval before Points are spent.
_Avoid_: Redemption, purchase, order

**Reward Contribution**:
Points a Child commits toward a Reward before they have enough Points to request it fully.
Reward Contributions reduce the Child's available Point Balance and can be returned by the Child until a Reward Request is submitted.
_Avoid_: Wish, savings goal, layaway

**Fulfillment**:
A Parent's confirmation that an approved Reward Request has been delivered.
_Avoid_: Completion, payout, delivery

**Reserved Points**:
Points temporarily held for a pending Reward Request so they cannot be spent twice.
Reserved Points return to the Child's Point Balance if the Reward Request is rejected or canceled.
_Avoid_: Hold, pending spend, escrow

**Event**:
A dated calendar item the Household needs to know about, such as a school deadline, practice,
appointment, birthday, parent travel, or family plan.
_Avoid_: Activity, plan, calendar item

**All-Day Event**:
An Event that belongs to a date rather than a specific start and end time.
All-Day Events should remain visibly distinct from timed Events in the Agenda.
_Avoid_: Midnight event, untimed timed event

**Participant**:
A Parent or Child involved in a specific Event.
Events belong to the Household even when only some people participate.
_Avoid_: Attendee, assignee, member

**Event Enrichment**:
Household-specific context added to a read-only Family Calendar Event, such as manually adjusted Participants.
_Avoid_: Event edit, calendar update, override

**Agenda**:
The awareness-focused view of upcoming Household Events and their Participants.
On Parent View, the Today/Tomorrow Agenda is the first information surface.
Events that need Parent attention should be visually elevated within the Agenda rather than removed from it.
_Avoid_: Planner, schedule, calendar feed

**Family Calendar**:
The shared Apple Calendar the Household uses as the source of truth for Events.
Family App reads from the Family Calendar for awareness rather than owning the calendar itself.
_Avoid_: Internal calendar, app calendar, event database

**Calendar Sync**:
The automatic refresh of Events from the Family Calendar into Family App for Household awareness.
Parents should not manually create Family Calendar Events inside Family App as the normal sync path.
_Avoid_: Manual sync, event entry, calendar import

**External Event Identity**:
The Family Calendar identity used to match a synced Event across Calendar Sync runs.
Single Events use the Apple/iCalendar UID; recurring Event occurrences use UID plus occurrence start time.
_Avoid_: Event title, calendar row ID, sync ID

**Briefing**:
A Parent-facing summary of what needs attention, including pending child-related approvals, Overdue Chores, unfulfilled Rewards, and Suggested Actions.
_Avoid_: Digest, notification, report

**Suggested Action**:
A rule-based prompt in the Briefing that points a Parent to something needing attention.
_Avoid_: AI suggestion, recommendation, alert

**Weekly Review**:
A Parent-facing summary for planning the upcoming week and reviewing child progress, Point Balances, and pending requests.
Weekly Review is a focused planning workflow rather than part of the main Parent View.
_Avoid_: Weekly digest, report, planning session

**Parent View**:
The Parent-facing daily command surface for understanding the Household's current situation and taking urgent actions.
Parent View is not the full management console for every create, edit, archive, or configuration workflow.
_Avoid_: Admin view, admin panel, management console, settings page

**Child View**:
The app experience for a Child to see assigned Chores and Goals, submit progress, view their Point Balance, and request Rewards.
_Avoid_: Kid mode, child dashboard, profile

**Wins**:
A Child-facing history of approved Chores, completed Goals, fulfilled Rewards, and Bonus Points.
_Avoid_: Achievements, trophies, activity feed

**Child PIN**:
A Parent-managed short code a Child uses to enter their own Child View.
_Avoid_: Child password, child account, passcode

**Household Setup**:
The initial Parent workflow for creating a Household, adding Parents and Children, connecting the Family Calendar, and creating starter Chores and Rewards.
_Avoid_: Onboarding, setup wizard, account setup
