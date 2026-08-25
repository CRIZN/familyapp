# Family App

Family App is a private household coordination app for one Household. Parents see what is happening, what needs review, and what Children have earned. Children see today's work, submit progress, understand Points, and request Rewards.

This is a private one-household production app. V1 product behavior is implemented. Production slices P1 through P19 are done on main. That covers schema, auth gate, first-run setup, Parent allowlist, Child PIN sessions, chores, approvals, goals, rewards, points persistence, parent aggregation, Calendar Connection, the sync engine, and automatic Calendar Sync triggers. The live site is https://familyapp-navy.vercel.app.

Parked ideas live in [docs/FUTURE_FEATURES.md](docs/FUTURE_FEATURES.md). Those are chore templates and Family Display Mode.

## Product overview

Family App centers on a few durable concepts:

- **Household.** The private group using the app.
- **Parents.** Adults with equal Household admin permissions.
- **Children.** Child profiles accessed with Parent-managed Child PINs.
- **Chores.** One-time or recurring responsibilities assigned to exactly one Child.
- **Goals.** Longer-running Child-owned objectives with Progress Check-ins.
- **Points.** The single shared earning and spending balance for each Child.
- **Rewards.** Shared catalog items Children can save toward, request, and redeem.
- **Approval Queue.** One Parent review surface for Chore Submissions, Progress Check-ins, and Reward Requests.
- **Apple Calendar Events.** Read-only synced Events that can be enriched in Family App with Participants.

V1 is intentionally motivating and transparent rather than punitive. Points are awarded for approved work, progress, Goal Completion, Bonus Points, and corrections. Negative Point Adjustments exist for corrections, not consequences.

## Current functionality

### Household setup

- Create the production Household with the authenticated first Parent and at least one Child.
- Create and update Child PINs.
- Enter distinct Parent and Child views.

### Parent view

Parent View is an agenda-first daily command surface labeled `Today`, with focused Parent workflow routes for durable management. It includes:

- Today/Tomorrow Agenda as the first primary Parent surface.
- Needs Attention metrics for Approval Queue volume, Overdue Chores, and unfulfilled Rewards.
- Capped Approval Queue preview with quick actions and a full Approvals workflow.
- Chores Needing Parent Handling and Reward Fulfillment attention modules.
- Compact Child status summaries with one contextual workflow link per Child.
- Focused workflows for Approvals, Chores, Goals, Rewards, Calendar, Points, Household, and Weekly Review.
- Calendar workflow ownership of Family Calendar connection, read-only Event sync, Household Agenda, and Participant enrichment.
- Automatic Calendar Sync on save, on Calendar page loads when the last attempt is more than 15 minutes old, and from Vercel cron at `/api/calendar/sync`. Parents can retry with Sync Now. The feed URL stays server-side after save.
- Chore, Goal, Reward, Point, Household, and Weekly Review management outside the Today screen.

### Child view

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

## Current implementation status

V1 slices 1 through 11 are implemented and covered by Vitest tests:

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

The private-production migration in [docs/IMPLEMENTATION_SLICES.md](docs/IMPLEMENTATION_SLICES.md) is complete through P19:

- Schema, RLS, Supabase magic-link gate, first-run setup, Parent allowlist, and Child PIN sessions.
- Chores, approvals, goals, rewards, and points persistence, plus Parent Today, Briefing, and Weekly Review aggregation.
- Calendar Connection metadata, feed sync engine, and automatic sync triggers.

The latest production slice on main is P19, automatic Calendar Sync triggers.

## Tech stack

- **Framework.** Next.js App Router
- **Language.** TypeScript
- **UI.** Tailwind CSS, local UI primitives, lucide-react icons
- **Domain tests.** Vitest
- **Database schema and migrations.** Drizzle ORM / Drizzle Kit for Postgres
- **Hosting and backend.** Vercel, Supabase Postgres, Supabase Auth

## Repository map

```txt
src/
  app/                  Next.js routes, including /api/calendar/sync
  components/           App shell and shared UI primitives
  domain/               Pure household rules and state transitions
  features/             Parent, Child, and Household setup UI
  lib/supabase/         Supabase browser/server client helpers
  server/               Auth, database, Child, Household, and Calendar modules
  server/db/schema.ts   Drizzle Postgres schema
docs/
  PRD_V1.md             Product brief and V1 scope
  IMPLEMENTATION_SLICES.md
  TECHNICAL_REVIEW.md   Architecture recommendation and guardrails
  FUTURE_FEATURES.md
  adr/                  Architecture decision records
drizzle/                Generated SQL migrations and metadata
```

## Getting started

Install dependencies:

```bash
npm install
```

Create a local `.env.local` for development, or configure the same values as server environment variables in Vercel:

```bash
POSTGRES_URL="postgres://..."
NEXT_PUBLIC_SUPABASE_URL="https://your-project-ref.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-supabase-anon-key"
NEXT_PUBLIC_SITE_URL="http://localhost:3000"
FIRST_RUN_SETUP_TOKEN="replace-with-a-long-random-setup-token"
CHILD_SESSION_SECRET="replace-with-at-least-32-random-bytes"
```

For production, set `NEXT_PUBLIC_SITE_URL` to the deployed origin, currently `https://familyapp-navy.vercel.app`. Also add the production callback URL to Supabase Auth redirect allowlists:

```txt
https://familyapp-navy.vercel.app/auth/callback
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
- `/parent/calendar` - Family Calendar connection, sync status, and Household Agenda.

The first Parent signs in with a Supabase magic link, then visits `/setup` and enters `FIRST_RUN_SETUP_TOKEN` to create the Household. After that, Parent access is controlled by the Parent allowlist stored in Postgres. Children sign in through `/child` with Parent-managed PINs.

## Production setup

The production stack is Vercel for the Next.js app, Supabase Postgres for storage, and Supabase Auth for Parent magic-link sign-in. Calendar Sync uses a Parent-saved `webcal`/ICS feed URL stored server-side and a Vercel cron job at `/api/calendar/sync` every 15 minutes.

1. **Create the production Supabase project.**
   - Create a fresh Supabase project for production.
   - Copy the project URL and anonymous public API key.
   - Copy the production Postgres connection string for `POSTGRES_URL`.
   - Enable the backup level you want before real household use.

2. **Configure Supabase Auth redirects.**
   - In Supabase Auth URL settings, set the site URL to the deployed app origin, such as `https://familyapp-navy.vercel.app`.
   - Add this redirect URL to the allowlist:

```txt
https://familyapp-navy.vercel.app/auth/callback
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
NEXT_PUBLIC_SITE_URL="https://familyapp-navy.vercel.app"
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
   - Approve the Chore Submission and confirm Points and the Point Ledger update.
   - Save the Family Calendar feed from `/parent/calendar` and confirm Sync Now or a later cron run populates the Agenda without showing the feed URL.

## Environment variables

| Variable | Required | Used by | Notes |
| --- | --- | --- | --- |
| `POSTGRES_URL` | Yes | Runtime server code and Drizzle Kit | Postgres connection string from the Supabase project. The runtime database client throws `Missing POSTGRES_URL.` when absent. |
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase browser/server clients | Supabase project URL. Despite the `NEXT_PUBLIC_` prefix, it must be present in the server environment too. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase browser/server clients | Supabase anonymous key. Missing this or the Supabase URL causes Parent sign-in to report `Sign-in is not configured yet.` |
| `NEXT_PUBLIC_SITE_URL` | Recommended | Parent magic-link redirect creation | Canonical app origin. In production this should be the deployed HTTPS origin. If missing, the app falls back to `VERCEL_URL`, then `http://localhost:3000`. |
| `FIRST_RUN_SETUP_TOKEN` | Yes for first setup | First-run Household setup | Long random token entered once at `/setup`. Keep it server-only and rotate/remove it after setup if desired. |
| `CHILD_SESSION_SECRET` | Yes for Child sessions | Child PIN sign-in and session validation | Long stable secret used to sign 30-day httpOnly Child session cookies. Missing it reports `Child sessions are not configured yet.` Rotating it logs out Child sessions. |
| `VERCEL_URL` | Platform-provided fallback | Parent magic-link redirect creation | Usually set by Vercel. Prefer explicit `NEXT_PUBLIC_SITE_URL` for production. |
| `VERCEL_ENV` | Platform-provided | Production migrate-on-build | `scripts/vercel-migrate.mjs` runs Drizzle migrations only when this is `production`. |
| `NODE_ENV` | Platform-provided | Child session cookies and calendar cron | In production, Child session cookies are written with `secure: true`. The `/api/calendar/sync` route accepts Vercel cron user-agents only when `NODE_ENV` is `production`. |

These variables were verified against the live code paths in `src/server/db/client.ts`, `src/lib/supabase/config.ts`, `src/server/auth/actions.ts`, `src/server/household/first-run.ts`, `src/server/child/*`, `src/app/api/calendar/sync/route.ts`, and `scripts/vercel-migrate.mjs`. Calendar Sync does not add a custom cron secret.

## Development commands

```bash
npm run dev            # Start Next.js locally
npm run build          # Build the app
npm run start          # Start a production build
npm run lint           # Run ESLint
npm run typecheck      # Run TypeScript without emitting files
npm test               # Run Vitest once
npm run test:watch     # Run Vitest in watch mode
npm run db:migrate     # Apply Drizzle migrations
npm run vercel-build   # Production Vercel build: migrate, then next build
```

Drizzle is configured through `drizzle.config.ts` and the runtime database client reads `POSTGRES_URL`.

## Engineering notes

- Domain logic lives in `src/domain` and should stay out of React components.
- Point Ledger entries explain every Point Balance change.
- Review workflows use explicit statuses such as `pending`, `approved`, `needs_work`, `rejected`, `canceled`, and `fulfilled`.
- Chores, Goals, and Rewards are archived instead of deleted so history remains explainable.
- Calendar data is modeled as read-only synced Events plus separate Family App Event Enrichment.
- The Family Calendar feed URL is stored server-side and is not returned to the client after save.
- Child PINs are scoped to the Household and hashed in production storage.
- Parent magic-link auth uses Supabase Auth and the `/auth/callback` route, which must return Supabase session cookies on the redirect response.
- Child sessions are signed, httpOnly, same-site cookies containing only Household/Child identity and session version data.

## Important docs

- [Product brief](docs/PRD_V1.md)
- [Implementation slices](docs/IMPLEMENTATION_SLICES.md)
- [Technical review](docs/TECHNICAL_REVIEW.md)
- [Future features](docs/FUTURE_FEATURES.md)
- [Repo context and glossary](CONTEXT.md)
