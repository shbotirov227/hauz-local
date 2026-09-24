# HAUZ Personal Account

A TanStack Start application for passwordless Appwrite authentication,
onboarding and personal-account management. Authentication is rendered on the
server, so the header is correct in the first HTML response after a hard
refresh.

## Architecture

- TanStack Start loaders and server functions provide the SSR and browser/server
  boundary.
- Appwrite email OTP is created and verified only on the server.
- The Appwrite session secret is stored in an `HttpOnly`, `SameSite=Lax`
  cookie. It is also `Secure` in production.
- Profile data is read and written only through the authenticated
  `personal-account` Appwrite Function. The web application never accesses the
  table directly.
- `src/components/ui` contains reusable shadcn-style owned components. Variants
  use `class-variance-authority`; icons use `lucide-react`.

## Requirements

- Node.js 22 or newer
- An Appwrite Cloud project
- Appwrite CLI authentication for deployment

## Appwrite Setup

1. Create a new Appwrite project.
2. Put its project ID and regional endpoint in `appwrite.config.json`.
3. Authenticate and deploy the database, table and Function:

```bash
npx appwrite login
npm run appwrite:push
```

`appwrite push table` treats the config as the complete schema and can remove
tables not present in the file. Run it only against a fresh/dedicated project.

Confirm that the `personal-account` Function has a ready deployment and its
execute access is `users`.

Create an Appwrite API key with these scopes:

- `sessions.write`
- `users.read`
- `users.write`
- `execution.write`

## Environment

Copy the example file:

```bash
cp .env.example .env
```

Fill in all four values:

```dotenv
APPWRITE_ENDPOINT=https://fra.cloud.appwrite.io/v1
APPWRITE_PROJECT_ID=
APPWRITE_API_KEY=
APPWRITE_FUNCTION_ID=personal-account
```

`.env` is ignored by Git. Never put an API key or session secret in a variable
prefixed with `VITE_`, browser code, committed file or client-visible response.

## Run Locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Useful commands:

```bash
npm run typecheck
npm run build
npm run preview
npm run generate-routes
```

## Browser Test Sequence

1. Open `/` signed out and confirm the header shows **Sign in**.
2. Open `/profile`; confirm it redirects to `/sign-in?redirect=%2Fprofile`.
3. Request an email code, enter it and confirm a new user reaches onboarding.
4. Complete onboarding and confirm the final page is `/profile`.
5. Double-click **Continue** while onboarding and confirm only one account exists.
6. Edit first name, last name, contact email and bio; refresh and confirm they
   persist.
7. Clear contact email and bio, save, refresh and confirm both display as not
   provided.
8. Confirm role is visible but cannot be edited after onboarding.
9. Hard-refresh signed in and confirm the first rendered header shows the first
   name without flicker.
10. Log out, hard-refresh and confirm the header shows **Sign in**.
11. Sign in again and confirm the existing account skips onboarding.
12. Try external redirect values such as `//example.com` and
    `https://example.com`; confirm navigation falls back to `/`.

## Function Contract

| Method | Body | Result |
|---|---|---|
| `GET /personal-account` | none | `200`, or `404` when onboarding is needed |
| `POST /personal-account` | `firstName`, `lastName`, `role` | `201`, idempotent `200`, or role-conflict `409` |
| `PATCH /personal-account` | any editable profile fields | `200` with the updated account |

The Function derives ownership from Appwrite's authenticated execution context.
The browser does not send a user ID as authorization. On PATCH, omitted optional
fields are retained and explicit `null` clears `contactEmail` or `bio`.

See `NOTES.md` for design decisions and production follow-ups.
