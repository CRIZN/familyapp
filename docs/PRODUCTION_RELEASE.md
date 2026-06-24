# Production Release

Family App launches as a private production app for one Household on Vercel and Supabase. Production starts from a fresh Supabase Postgres database; do not migrate or preserve demo browser state.

## Required Environment Variables

Set these in Vercel Production and in any local shell that runs server-backed flows:

| Name | Scope | Notes |
| --- | --- | --- |
| `DATABASE_URL` | Server | Supabase Postgres connection string used by Drizzle and runtime server code. Use the production pooled connection string for Vercel. |
| `NEXT_PUBLIC_SUPABASE_URL` | Browser/server | Supabase project URL for Auth clients. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Browser/server | Supabase anonymous key for Auth clients. Keep RLS enabled; this key is public by design. |
| `NEXT_PUBLIC_SITE_URL` | Server | Canonical production origin used for Supabase magic-link redirects, for example `https://familyapp.example`. |
| `FIRST_RUN_SETUP_TOKEN` | Server | Long random token required once for first-run Household setup after Parent magic-link authentication. Rotate or remove after setup. |
| `CHILD_SESSION_SECRET` | Server | At least 32 random bytes used to sign 30-day Child session cookies. Rotating it signs all Children out. |

Optional production smoke variables for `npm run test:e2e`:

| Name | Notes |
| --- | --- |
| `FAMILYAPP_E2E_BASE_URL` | Production deployment URL. |
| `FAMILYAPP_E2E_PARENT_EMAIL` | Allowlisted Parent email for magic-link request checks. |
| `FAMILYAPP_E2E_PARENT_MAGIC_LINK` | Fresh Supabase magic link for the authenticated smoke path. |
| `FAMILYAPP_E2E_SETUP_TOKEN` | First-run setup token for a fresh production smoke database. |

## Vercel

`vercel.json` pins the project to the Next.js framework and standard commands:

- Install: `npm ci`
- Build: `npm run build`
- Dev: `npm run dev`

Production deployment checklist:

- Create the Vercel project from this repository.
- Set all required environment variables in the Production environment.
- Set Supabase Auth redirect URLs to `NEXT_PUBLIC_SITE_URL` and `NEXT_PUBLIC_SITE_URL/auth/callback`.
- Deploy from the release branch and verify `npm run build` passes in Vercel.
- Keep preview deployments enabled for PR validation, but use a separate Supabase project or database for preview tests.

Rollback-safe configuration:

- Keep the previous successful Vercel deployment available before promoting a new one.
- Do not rotate `CHILD_SESSION_SECRET`, `FIRST_RUN_SETUP_TOKEN`, or Supabase Auth keys during ordinary app rollbacks.
- If rolling back after a migration, confirm the previous deployment can read the current schema before switching traffic.

## Supabase

Production project checklist:

- Create a fresh Supabase project for production.
- Apply Drizzle migrations in order with production `DATABASE_URL`.
- Confirm all Household-owned tables have RLS enabled and Parent/Child policies from the latest migration are present.
- Confirm `calendar_connections.public_feed_url` is stored server-side only and is not exposed through client responses.
- Enable Supabase backups or point-in-time recovery for the production project before first use.
- Store production database credentials only in Vercel environment variables and local operator secrets.

Operational verification:

- Run `npm run typecheck`, `npm test`, and `npm run build` against the release branch before deployment.
- On a fresh machine or CI runner, run `npm run test:e2e:install` once before browser tests.
- Run `npm run test:e2e` with the production smoke variables against a fresh production-like deployment.
- After first-run setup, remove or rotate `FIRST_RUN_SETUP_TOKEN` once it is no longer needed.

## Release Smoke Path

The Playwright smoke test in `e2e/production-happy-path.spec.ts` covers:

- Anonymous private-app denial and Parent magic-link request.
- First-run Household setup with a verified Parent and setup token.
- Child PIN sign-in.
- Child Chore submission and Parent approval.
- Points update after approval.
- Reward creation, Child request, Parent approval, and fulfillment.
- Weekly Review visibility after the happy path.

Run it only against a fresh production-like database because it creates real Household data:

```bash
npm run test:e2e:install
npm run test:e2e
```

## Launch Checklist

- [ ] Production env vars are set in Vercel and match `.env.example`.
- [ ] Vercel production deployment uses `npm ci` and `npm run build`.
- [ ] Supabase migrations are applied to the production project.
- [ ] Supabase RLS is enabled and policy checks pass.
- [ ] Supabase backups or point-in-time recovery are enabled.
- [ ] The first Parent can request and complete a magic-link sign-in.
- [ ] First-run setup accepts only the valid `FIRST_RUN_SETUP_TOKEN`.
- [ ] First-run setup creates the Household, first Parent, Children, and Child PINs.
- [ ] A Parent whose email is not allowlisted sees only the private-app denial state.
- [ ] Anonymous visitors see only the locked private app screen.
- [ ] Each Child can sign in with their current PIN and cannot sign in after a PIN rotation without the new PIN.
- [ ] Child Chore submission, Parent approval, Points, Rewards, and Weekly Review pass the Playwright smoke path.
- [ ] No production UI path reads or writes demo `localStorage` Household state.
