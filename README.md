# Family App

Family App is a private household coordination app for one Household. It helps Parents see what is happening, what needs review, and what Children have earned, while giving Children a clear place to see today's work, submit progress, understand Points, and request Rewards.

The current repo is moving from a V1 demo/prototype into a private production app. The domain behavior for the V1 slices is implemented and covered by Vitest tests. The production path currently includes the Drizzle/Postgres schema, RLS migration, Supabase Auth gate, server-backed first-run Household setup, Parent allowlist and Household management, Child PIN sessions, Parent Chore management, and Child Chore submission persistence. The remaining production slices are moving approval, goals, rewards, points, aggregation, and calendar connection workflows behind server-side authorization and transactional persistence.

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
- Calendar workflow ownership of demo Apple Calendar configuration, read-only Event sync entry, Household Agenda, and Participant enrichment.
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

The V1 product/domain behavior is implemented and covered by tests:

- App shell and Household setup.
- Chore creation through Child submission.
- Approval Queue awarding Points for Chores.
- Goals and Progress Check-ins.
- Reward Catalog, Contributions, Requests, and Fulfillment.
- Bonus Points and Point Adjustments.
- Read-only Apple Calendar Agenda with Event Enrichment.
- Parent Briefing and Suggested Actions.
- Weekly Review.
- V1 polish, empty states, and responsive quality pass.
- Parent View IA Simplification, including focused Parent workflow routes such as `/parent/approvals`, `/parent/chores`, `/parent/goals`, `/parent/rewards`, `/parent/calendar`, `/parent/points`, `/parent/household`, and `/parent/weekly-review`.

The private-production migration slices in [docs/IMPLEMENTATION_SLICES.md](docs/IMPLEMENTATION_SLICES.md) are partly complete:

- **Done**: P1-P7, covering the full V1 Postgres/RLS schema, Supabase magic-link gate, first-run setup, Parent allowlist and Household management, Child PIN sessions, Parent Chore management persistence, and Child Chore board/submission persistence.
- **In progress / pending**: P8-P16, covering Chore approval transactions, Goals and Progress Check-ins persistence, Rewards persistence, Bonus Points and Point Adjustments persistence, Parent aggregation, Calendar Connection metadata, production release hardening, and post-release Apple Calendar feed sync.

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
  lib/supabase/         Supabase browser/server client helpers
  server/               Auth, database, Child, and Household server modules
  server/db/schema.ts   Drizzle Postgres schema
docs/
  PRD_V1.md             Product brief and V1 scope
  IMPLEMENTATION_SLICES.md
  TECHNICAL_REVIEW.md   Architecture recommendation and guardrails
  FUTURE_FEATURES.md
  adr/                  Architecture decision records
drizzle/                Generated SQL migrations and metadata
```

## Getting Started

Install dependencies:

```bash
npm install
```

Create a local `.env.local` for development, or configure the same values as server environment variables in Vercel or your deployment platform:

```bash
POSTGRES_URL="postgres://..."
NEXT_PUBLIC_SUPABASE_URL="https://your-project-ref.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-supabase-anon-key"
NEXT_PUBLIC_SITE_URL="http://localhost:3000"
FIRST_RUN_SETUP_TOKEN="replace-with-a-long-random-setup-token"
CHILD_SESSION_SECRET="replace-with-at-least-32-random-bytes"
```

For production, set `NEXT_PUBLIC_SITE_URL` to the deployed origin, such as `https://familyapp.example`. Also add the production callback URL to Supabase Auth redirect allowlists:

```txt
https://familyapp.example/auth/callback
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

The first Parent signs in with a Supabase magic link, then visits `/setup` and enters `FIRST_RUN_SETUP_TOKEN` to create the Household. After that, Parent access is controlled by the Parent allowlist stored in Postgres. Children sign in through `/child` with Parent-managed PINs.

## Production Setup

The intended production stack is Vercel for the Next.js app, Supabase Postgres for storage, and Supabase Auth for Parent magic-link sign-in. The current production migration is partly complete: P1-P7 are done, while P8-P16 are still moving the remaining V1 workflows behind server-side persistence and authorization. Use this runbook for the private production environment, and complete the remaining production slices before treating the app as fully launch-ready.

1. **Create the production Supabase project.**
   - Create a fresh Supabase project for production.
   - Copy the project URL and anonymous public API key.
   - Copy the production Postgres connection string for `POSTGRES_URL`.
   - Enable the backup level you want before real household use.

2. **Configure Supabase Auth redirects.**
   - In Supabase Auth URL settings, set the site URL to the deployed app origin, such as `https://familyapp.example`.
   - Add this redirect URL to the allowlist:

```txt
https://familyapp.example/auth/callback
```

3. **Generate production secrets.**
   - Create a long, random `FIRST_RUN_SETUP_TOKEN`; this is entered once at `/setup`.
   - Create a stable `CHILD_SESSION_SECRET` with at least 32 random bytes; rotating it signs out Child sessions.

4. **Configure Vercel environment variables.**
   Set these variables for the production deployment:

```bash
POSTGRES_URL="postgres://..."
NEXT_PUBLIC_SUPABASE_URL="https://your-project-ref.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-supabase-anon-key"
NEXT_PUBLIC_SITE_URL="https://familyapp.example"
FIRST_RUN_SETUP_TOKEN="replace-with-a-long-random-setup-token"
CHILD_SESSION_SECRET="replace-with-at-least-32-random-bytes"
```

5. **Apply database migrations to production.**
   Production Vercel deploys run migrations automatically before `next build`
   through `npm run vercel-build`. Vercel is forced to use that command by
   `vercel.json`, and the migration step only runs when `VERCEL_ENV=production`.
   Missing `POSTGRES_URL` fails the production deploy instead of shipping an app
   pointed at an unmigrated database.

   For a one-off repair or first production bootstrap, you can still run Drizzle
   Kit manually against the production database from a trusted shell:

```bash
export POSTGRES_URL="postgres://..."
npm run db:migrate
```

   After the migrations apply, verify the Supabase tables exist and Row Level Security is enabled.

6. **Deploy the app.**
   - Connect the repository to Vercel.
   - Use the checked-in Vercel build command, `npm run vercel-build`.
   - Deploy to production after the environment variables are present.

7. **Run the first Household setup.**
   - Visit the production app and request a Parent magic link.
   - Open the magic link as the first Parent.
   - Visit `/setup`, enter `FIRST_RUN_SETUP_TOKEN`, create the Household, create the initial Child profiles, and set Child PINs.

8. **Verify production access controls.**
   - Confirm the first Parent can open `/parent`.
   - Add any additional Parent emails from `/parent/household`, then confirm each invited Parent can sign in with a magic link.
   - Confirm an unallowlisted authenticated email sees only the private-app denial screen.
   - Confirm a Child can sign in at `/child` with the configured PIN.
   - Confirm incorrect Child PINs do not reveal Household or Child details.

9. **Finish with a production smoke test.**
   - Create a Chore as a Parent.
   - Confirm the Chore appears for the assigned Child.
   - Submit the Chore from the Child view.
   - Check the Parent attention and management surfaces that are already backed by Supabase for the current production slice set.

## Environment Variables

| Variable | Required | Used by | Notes |
| --- | --- | --- | --- |
| `POSTGRES_URL` | Yes | Runtime server code and Drizzle Kit | Postgres connection string. Vercel Postgres generates this automatically. The runtime database client throws `Missing POSTGRES_URL.` when absent. |
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase browser/server clients | Supabase project URL. Despite the `NEXT_PUBLIC_` prefix, it must be present in the server environment too. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase browser/server clients | Supabase anonymous key. Missing this or the Supabase URL causes Parent sign-in to report `Sign-in is not configured yet.` |
| `NEXT_PUBLIC_SITE_URL` | Recommended | Parent magic-link redirect creation | Canonical app origin. In production this should be the deployed HTTPS origin. If missing, the app falls back to `VERCEL_URL`, then `http://localhost:3000`. |
| `FIRST_RUN_SETUP_TOKEN` | Yes for first setup | First-run Household setup | Long random token entered once at `/setup`. Keep it server-only and rotate/remove it after setup if desired. |
| `CHILD_SESSION_SECRET` | Yes for Child sessions | Child PIN sign-in and session validation | Long stable secret used to sign 30-day httpOnly Child session cookies. Rotating it logs out Child sessions. |
| `VERCEL_URL` | Platform-provided fallback | Parent magic-link redirect creation | Usually set by Vercel. Prefer explicit `NEXT_PUBLIC_SITE_URL` for production. |
| `NODE_ENV` | Platform-provided | Child session cookie security | In production, Child session cookies are written with `secure: true`. |

These variables were verified against the live code paths in `src/server/db/client.ts`, `src/lib/supabase/config.ts`, `src/server/auth/actions.ts`, `src/server/household/first-run.ts`, and `src/server/child/*`.

## Development Commands

```bash
npm run dev         # Start Next.js locally
npm run build       # Build the app
npm run start       # Start a production build
npm run lint        # Run ESLint
npm run typecheck   # Run TypeScript without emitting files
npm test            # Run Vitest once
npm run test:watch  # Run Vitest in watch mode
```

Drizzle is configured through `drizzle.config.ts` and the runtime database client reads `POSTGRES_URL`.

## Engineering Notes

- Domain logic lives in `src/domain` and should stay out of React components.
- Point Ledger entries explain every Point Balance change.
- Review workflows use explicit statuses such as `pending`, `approved`, `needs_work`, `rejected`, `canceled`, and `fulfilled`.
- Chores, Goals, and Rewards are archived instead of deleted so history remains explainable.
- Calendar data is modeled as read-only synced Events plus separate Family App Event Enrichment.
- Child PINs are scoped to the Household and hashed in production storage.
- Parent magic-link auth uses Supabase Auth and the `/auth/callback` route, which must return Supabase session cookies on the redirect response.
- Child sessions are signed, httpOnly, same-site cookies containing only Household/Child identity and session version data.
- Production migration work after P7 should move the remaining client-side domain transitions for approvals, goals, rewards, points, aggregation, and calendar connection workflows behind server actions, authorization checks, and transactional Drizzle persistence.

## Important Docs

- [Product brief](docs/PRD_V1.md)
- [Implementation slices](docs/IMPLEMENTATION_SLICES.md)
- [Technical review](docs/TECHNICAL_REVIEW.md)
- [Future features](docs/FUTURE_FEATURES.md)
- [Repo context and glossary](CONTEXT.md)
