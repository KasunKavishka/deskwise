This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Authentication and data setup

Deskwise uses Supabase Auth for username/password accounts and Supabase Postgres for reservations. The office admin creates employee accounts and gives each employee their username and initial password. Usernames must be 3–32 characters and use letters, numbers, dots, underscores, or hyphens. Passwords must be at least 12 characters.

### Create a Supabase project

1. Create a project in the [Supabase dashboard](https://supabase.com/dashboard).
2. In **Project Settings → API Keys**, copy the project URL, publishable key, and service-role key.
3. In **SQL Editor**, run [`supabase/migrations/20261018000000_create_reservations.sql`](./supabase/migrations/20261018000000_create_reservations.sql).
4. Copy `.env.example` to `.env.local` for local development, then configure these variables in `.env.local` and in **Vercel → Project Settings → Environment Variables** for production:

   | Variable | Value | Exposure |
   | --- | --- | --- |
   | `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | Public |
   | `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase publishable key | Public |
   | `SUPABASE_SERVICE_ROLE_KEY` | Supabase service-role key | Secret; server only |
   | `ADMIN_SETUP_SECRET` | Random secret with at least 32 characters | Secret; server only |

   Never commit `.env.local`, the service-role key, or the admin setup secret. `.env.example` lists the required variable names.

5. Create a random setup secret, for example with `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`, and enter it directly in the Vercel environment settings. Add all four variables to the Production environment and redeploy.
6. Open the deployed app. On first launch, use **Set up the first admin account**. Enter the setup secret, admin name, fixed username, and a strong password. The first admin account can only be created once.
7. Remove `ADMIN_SETUP_SECRET` from Vercel after creating the admin and redeploy. The existing admin login will continue to work; the bootstrap endpoint will remain disabled.
8. Sign in as admin and create employee logins from the **Employees** panel. Share each initial password securely; Deskwise does not show it again after account creation.

Username accounts use internal, non-deliverable Supabase email identities; employees sign in with their username and do not need an email address. Password recovery by email is not enabled. The service-role key is used only in server routes; reservation access is available only through authenticated routes, and row-level security is enabled on the reservations table. Account creation is protected by the initial setup secret and the authenticated admin role.

Signed-in users can browse desk availability, make or cancel reservations, and review reservations by date. Admins can create employee accounts and cancel any reservation; employees can cancel their own. Users can change their password from **Settings** by confirming their current password. Desk inventory is currently fixed in the application, and live presence requires a separately configured device integration.

## End-to-end regression tests

The Playwright suite exercises first-admin setup, employee creation, desk availability, reservation conflicts, role-based cancellation, password updates, and subsequent sign-in against a real Supabase project.

1. Create a **dedicated, disposable Supabase test project**. Never point E2E tests at production or a project containing accounts or data you need to keep. The suite requires the project to have no existing Deskwise admin.
2. Run the reservations migration from the setup instructions above.
3. Set these variables in the shell used to run the tests:

   | Variable | Value |
   | --- | --- |
   | `E2E_SUPABASE_URL` | Test project URL |
   | `E2E_SUPABASE_PUBLISHABLE_KEY` | Test project's publishable key |
   | `E2E_SUPABASE_SERVICE_ROLE_KEY` | Test project's service-role key; never commit or share it |
   | `E2E_ADMIN_SETUP_SECRET` | Random test setup secret with at least 32 characters |

4. Install the browser once with `npx playwright install chromium`, then run `npm run test:e2e`.

The test creates uniquely named temporary accounts and deletes them after the run. Auth-user deletion cascades to their reservations. A run requires an empty admin state so it can exercise first-time setup; if a run is forcibly terminated, remove only its `e2e_...` test accounts from the disposable project before rerunning. GitHub's **Supabase E2E** workflow can be run manually after adding the four variables as repository Actions secrets. The regular CI workflow runs lint and a production build on pushes and pull requests.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
