# Family App Technical Review

## Recommendation

Build Family App as a hosted TypeScript responsive web app:

- **Framework**: Next.js App Router
- **Language**: TypeScript
- **Hosting**: Vercel
- **Database**: Supabase Postgres
- **Authentication**: Supabase Auth for Parents; Child PINs are app-level profiles
- **Authorization**: Server-side authorization plus Postgres Row Level Security
- **ORM and migrations**: Drizzle ORM and Drizzle Kit
- **UI**: Tailwind CSS, shadcn/ui, lucide-react
- **Testing**: Vitest for domain/application tests; Playwright for end-to-end flows
- **Calendar sync**: Read-only Apple Calendar integration through a calendar provider adapter, backed by CalDAV/iCalendar parsing

This stack optimizes for a small private app that still needs to be available from phones on the go, store private household data safely, and evolve without splitting frontend/backend work too early.

## Why this stack fits

### Hosted responsive web app

The product decision is already responsive web app first. Next.js fits because it can serve the UI, server-side data loading, mutations, route handlers, and deployment from one codebase. Vercel is the most direct hosting target for Next.js and supports scheduled cron endpoints, which we can use for calendar sync.

Use a normal Node.js deployment target, not static export. Family App needs authentication, server-side authorization, database writes, scheduled sync, and private data.

### Supabase Postgres and Auth

The domain is relational: Households, Parents, Children, Chores, Goals, Submissions, Rewards, Reward Contributions, Reward Requests, Point Ledger entries, Events, and Event Enrichments. Postgres is a better fit than a document store because the app needs consistency around point accounting and approval state.

Supabase gives us hosted Postgres, Auth, Row Level Security, backups on paid plans, and simple local development options. Parent accounts should be Supabase Auth users. Children should not be Supabase Auth users in v1; they are Child records with Parent-managed Child PINs and child-scoped app sessions.

### Drizzle ORM

Use Drizzle for schema definition, typed queries, and migrations. Keep SQL close enough that ledger and authorization logic remain obvious. Avoid hiding important business rules behind a thick ORM model layer.

### Tailwind, shadcn/ui, and lucide-react

Family App is an operational household tool, not a marketing site. Tailwind plus shadcn/ui gives us fast access to accessible primitives while keeping components local and editable. lucide-react should be the default icon source for action buttons and navigation.

### Vitest and Playwright

The riskiest behavior is not visual polish; it is state transitions:

- Chore Submission -> Approval -> Point Ledger
- Progress Check-in -> Approval -> Goal progress
- Reward Contribution -> Reward Request -> Reserved Points -> Approval -> Fulfillment
- Point Adjustment -> Point Ledger -> Point Balance
- Apple Calendar Event -> Event Enrichment -> Parent and Child Agenda views

These should have fast domain/application tests in Vitest. Playwright should cover the key user journeys across Parent View and Child View.

## Architecture Guidelines

### Keep domain logic out of components

React components should render workflows and call server actions or application services. They should not decide whether Points are awarded, reserved, returned, or spent.

Recommended structure:

```txt
src/
  app/                  Next.js routes and layouts
  components/           Reusable UI components
  features/             Workflow-specific UI and server actions
  domain/               Pure domain rules and state transitions
  server/               Database, auth, authorization, calendar adapters
  test/                 Test fixtures and helpers
```

### Treat Point Ledger as authoritative

Point Ledger entries should be the explanation for every Point Balance change. We may store a denormalized Point Balance for fast reads, but it must be updated in the same transaction as the ledger entry. Never mutate a balance without writing a ledger entry.

Ledger entry types should include at least:

- Chore approval
- Progress Check-in approval
- Goal Completion
- Bonus Points
- Point Adjustment
- Reward Contribution
- Reward Contribution return
- Reward Request reservation
- Reward Request rejection or cancellation return
- Reward Request approval spend

### Use explicit state machines for review workflows

Avoid boolean clusters like `approved`, `rejected`, `completed`, and `pending` living together. Use explicit status values.

Examples:

- Chore Submission: `pending`, `approved`, `needs_work`
- Progress Check-in: `pending`, `approved`, `needs_work`
- Reward Request: `pending`, `approved`, `rejected`, `canceled`, `fulfilled`
- Chore: `active`, `paused`, `archived`
- Goal: `active`, `completed`, `archived`
- Reward: `active`, `archived`

### Put `household_id` on household-owned tables

Every household-owned table should include `household_id` unless it is truly global. V1 is one Household per Parent account, but the database should still enforce household ownership. That protects us from accidental cross-household data leaks if the product ever grows.

### Authorization belongs on the server

Client-side checks improve UX, but they are not security. Every mutation must verify the current actor:

- Parent actions require an authenticated Parent in the Household.
- Child actions require a valid child-scoped session for that Child.
- Child View can only access that Child's Chores, Goals, Point Balance, Point Ledger, Reward Contributions, Reward Requests, Wins, and relevant Events.

Use Supabase Row Level Security as a database backstop, but keep application-level authorization readable in server code.

### Child PINs are not global passwords

A Child PIN should only grant access within the correct Household context. Do not allow a bare PIN to discover a Household. A safe v1 shape is:

1. A Parent creates the Child PIN.
2. A Child selects their profile from a Household-specific entry point.
3. The PIN creates a child-scoped session for that Child.

Store Child PINs hashed, never as plaintext.

### Calendar sync is an adapter, not a dependency everywhere

The rest of the app should not know about CalDAV details. Define a calendar provider boundary that returns normalized read-only Events. The Apple implementation can use CalDAV and iCalendar parsing behind that boundary.

Store:

- External calendar identifier
- External event UID
- Recurrence instance identifier when relevant
- Event title, start, end, all-day flag, timezone, location, and last synced timestamp
- Read-only sync metadata

Store Event Enrichment separately from synced Events. Participants are Family App data, not Apple Calendar edits.

### Calendar credentials stay server-side

Apple Calendar credentials or app-specific passwords must never reach the browser. Store them as encrypted server-side secrets. Calendar sync should run from server code or a scheduled cron endpoint.

### Prefer boring consistency over clever realtime

V1 does not need realtime subscriptions. Most state changes are parent/child workflow updates, and normal page refresh/revalidation is enough. Add realtime only after the basic app is reliable.

### Archive instead of delete

Chores, Goals, and Rewards should be archived, not deleted, because historical Point Ledger entries and Wins need stable references.

## Hosting Plan

### Vercel

Host the Next.js app on Vercel:

- Production deployment for family use on phones and computers
- Preview deployments for pull requests or branches
- Environment variables for Supabase and Apple Calendar sync secrets
- Cron endpoint for periodic read-only calendar sync

### Supabase

Use one Supabase project:

- Postgres database
- Supabase Auth for Parent accounts
- RLS policies for household data protection
- Migrations managed from the repo
- Paid backups before production family use

## Testing Strategy

### Domain and application tests

Use Vitest for fast tests around point accounting, approvals, routines, rewards, and agenda filtering. These tests should run without a browser.

Minimum early test suites:

- Household setup and role rules
- Chore routine due/overdue behavior
- Chore Submission review outcomes
- Point Ledger and Point Balance invariants
- Goal Progress Check-in and Goal Completion
- Reward Contributions, reservations, approval, rejection, and fulfillment
- Event Enrichment and Participant filtering

### End-to-end tests

Use Playwright for full happy paths:

- Parent completes Household Setup
- Child enters Child View with PIN
- Parent creates Chore
- Child submits Chore
- Parent approves from Approval Queue
- Child sees Points and Wins
- Child contributes toward a Reward
- Child submits Reward Request
- Parent approves and fulfills Reward

## Implementation Guardrails

- Keep server actions thin; move business rules into application/domain functions.
- Do not compute Point Balance in UI code.
- Do not update Point Balance outside the ledger transaction.
- Do not expose Apple Calendar credentials to client code.
- Do not edit Apple Calendar from Family App in v1.
- Do not create child email/password accounts in v1.
- Do not add notifications, AI, messaging, attachments, streaks, shopping lists, or consequences during v1 slices.
- Keep Approval Queue item types visually distinct from the first implementation.
- Keep empty states useful and action-oriented.

## Source Notes

Checked on 2026-06-23:

- Next.js docs: App Router installation and deployment options.
- Vercel docs: cron jobs for Vercel Functions.
- Supabase docs: Auth, Postgres database, and Row Level Security.
- Apple Support: app-specific passwords for third-party iCloud Mail, Calendar, and Contacts access.
- Drizzle docs: schema, migrations, and typed queries.
- Tailwind CSS docs: Next.js setup.
- shadcn/ui docs: Next.js setup.
- Playwright docs: end-to-end testing support.
