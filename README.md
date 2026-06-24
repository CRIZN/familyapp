# Family App

Family App is a private household coordination app for one Household. It helps Parents see what is happening, what needs review, and what Children have earned, while giving Children a clear place to see today's work, submit progress, understand Points, and request Rewards.

The current repo is moving from a V1 demo/prototype into a private production app. The domain behavior for the V1 slices is implemented and covered by Vitest tests. The Drizzle/Postgres schema, RLS migration, Supabase Auth gate, server-backed first-run Household setup, Child PIN sessions, and core Parent/Child workflow mutations are wired through server-side authorization and transactional persistence.

## Product Overview

Family App centers on a few durable concepts:

- **Household**: the private group using the app.
- **Parents**: adults with equal Household admin permissions.
- **Children**: child profiles accessed with Parent-managed Child PINs.
- **Chores**: one-time or recurring responsibilities assigned to exactly one Child.
- **Goals**: longer-running Child-owned objectives with Progress Check-ins.
- **Points**: the single shared earning and spending balance for each Child.
- **Rewards**: shared catalog items Children can save toward, request, and redeem.
- **Approval Queue**: one Parent review surface for Chore Submissions, Progress Check-ins, and Reward Requests.
- **Apple Calendar Events**: read-only synced Events that can be enriched in Family App with Participants.

V1 is intentionally motivating and transparent rather than punitive. Points are awarded for approved work, progress, Goal Completion, Bonus Points, and corrections. Negative Point Adjustments exist for corrections, not consequences.

## Current Functionality

### Household Setup

- Create the production Household with the authenticated first Parent and at least one Child.
- Create and update Child PINs.
- Enter distinct Parent and Child views.

### Parent View

Parent View is now an agenda-first daily command surface labeled `Today`, with
focused Parent workflow routes for durable management. It includes:

- Today/Tomorrow Agenda as the first primary Parent surface.
- Needs Attention metrics for Approval Queue volume, Overdue Chores, and unfulfilled Rewards.
- Capped Approval Queue preview with quick actions and a full Approvals workflow.
- Chores Needing Parent Handling and Reward Fulfillment attention modules.
- Compact Child status summaries with one contextual workflow link per Child.
- Focused workflows for Approvals, Chores, Goals, Rewards, Calendar, Points, Household, and Weekly Review.
- Calendar workflow ownership of server-stored Apple Calendar connection metadata, scheduled read-only feed sync, Household Agenda, and Participant enrichment.
- Chore, Goal, Reward, Point, Household, and Weekly Review management outside the Today screen.

### Child View

Child View is PIN-gated and focused on the selected Child. It includes:

- Point Balance.
- Today-first Chores, including Overdue Chores.
- Child-specific Agenda.
- Active Goals and Progress Check-ins.
- Reward Catalog, Reward Contributions, Reward Requests, and cancellations.
- Upcoming Chores.
- Approved and fulfilled Rewards.
- Needs Work items.
- Simplified Point Ledger.
- Wins history.

## Current Implementation Status

The implementation slices in [docs/IMPLEMENTATION_SLICES.md](docs/IMPLEMENTATION_SLICES.md) track V1 delivery and production migration:

- App shell and Household setup.
- Chore creation through Child submission.
- Approval Queue awarding Points for Chores.
- Goals and Progress Check-ins.
- Reward Catalog, Contributions, Requests, and Fulfillment.
- Bonus Points and Point Adjustments.
- Server-side Apple Calendar feed sync with separate Event Enrichment.
- Parent Briefing and Suggested Actions.
- Weekly Review.
- V1 polish, empty states, and responsive quality pass.
- Parent View IA Simplification, including focused Parent workflow routes such as `/parent/approvals`, `/parent/chores`, `/parent/goals`, `/parent/rewards`, `/parent/calendar`, `/parent/points`, `/parent/household`, and `/parent/weekly-review`.

## Tech Stack

- **Framework**: Next.js App Router
- **Language**: TypeScript
- **UI**: Tailwind CSS, local UI primitives, lucide-react icons
- **Domain tests**: Vitest
- **Database schema and migrations**: Drizzle ORM / Drizzle Kit for Postgres
- **Hosting and backend target**: Vercel, Supabase Postgres, Supabase Auth

## Repository Map

```txt
src/
  app/                  Next.js routes
  components/           App shell and shared UI primitives
  domain/               Pure household rules and state transitions
  features/             Parent, Child, and Household setup UI
  server/db/schema.ts   Drizzle Postgres schema
docs/
  PRD_V1.md             Product brief and V1 scope
  IMPLEMENTATION_SLICES.md
  TECHNICAL_REVIEW.md   Architecture recommendation and guardrails
  FUTURE_FEATURES.md
  adr/                  Architecture decision records
drizzle/                Generated SQL migrations and metadata
e2e/                    Playwright production smoke tests
```

## Getting Started

Install dependencies:

```bash
npm install
```

Run the development server:

```bash
npm run dev
```

Then open `http://localhost:3000`.

Useful routes:

- `/` - landing page for the current app shell.
- `/setup` - first-run production Household setup for the authenticated first Parent.
- `/parent` - Parent View.
- `/child` - Child View.

Household setup writes to Postgres through Drizzle and requires `DATABASE_URL`, Supabase Auth configuration, and `FIRST_RUN_SETUP_TOKEN`. Child PIN sessions also require `CHILD_SESSION_SECRET` for signing the 30-day httpOnly Child session cookie.

## Development Commands

```bash
npm run dev         # Start Next.js locally
npm run build       # Build the app
npm run start       # Start a production build
npm run lint        # Run ESLint
npm run typecheck   # Run TypeScript without emitting files
npm test            # Run Vitest once
npm run test:e2e    # Run Playwright production smoke tests when E2E env vars are set
npm run test:watch  # Run Vitest in watch mode
```

Drizzle is configured through `drizzle.config.ts` and the runtime database client reads `DATABASE_URL`.

Production release setup, required environment variables, Vercel configuration, Supabase migration/RLS/backups, and the launch checklist live in [docs/PRODUCTION_RELEASE.md](docs/PRODUCTION_RELEASE.md).

## Engineering Notes

- Domain logic lives in `src/domain` and should stay out of React components.
- Point Ledger entries explain every Point Balance change.
- Review workflows use explicit statuses such as `pending`, `approved`, `needs_work`, `rejected`, `canceled`, and `fulfilled`.
- Chores, Goals, and Rewards are archived instead of deleted so history remains explainable.
- Calendar data is modeled as read-only synced Events plus separate Family App Event Enrichment.
- Child PINs are scoped to the Household and hashed in production storage.
- Production UI should not read or write demo browser `localStorage` Household state.

## Important Docs

- [Product brief](docs/PRD_V1.md)
- [Implementation slices](docs/IMPLEMENTATION_SLICES.md)
- [Technical review](docs/TECHNICAL_REVIEW.md)
- [Production release checklist](docs/PRODUCTION_RELEASE.md)
- [Future features](docs/FUTURE_FEATURES.md)
- [Repo context and glossary](CONTEXT.md)
