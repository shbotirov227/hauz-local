# Agent Prompts and Corrections

The following are the material prompts used to implement and review this
submission. They are included as requested by the take-home brief.

## Prompts

> Read HAUZ_CODEX_TASK.md, TASK.md, README.md and the existing source. Implement
> Phase 1 only: server-side Appwrite session, email OTP actions, secure cookie
> handling, and a typed Personal Account Function client. Inspect the installed
> SDK signatures before coding. Do not expose the API key or session secret to
> browser JavaScript. Run npm run typecheck and npm run build.

> Review Phase 1 as a security and correctness reviewer. Inspect every changed
> auth file and the existing Function. Check exact Appwrite SDK calls,
> authenticated Function execution, responseStatusCode handling, OTP state,
> cookie lifetime and flags, CSRF checks, redirect validation, and error
> classification. Fix verified defects and run typecheck and build.

> Implement Phase 2: email/code sign-in UI, onboarding, protected /profile view
> and edit, SSR-correct header on the first HTML paint, safe return redirects,
> and logout. Use the existing server actions and typed Function client. Ensure
> optional contactEmail and bio fields send null when cleared, role is read-only
> after onboarding, and duplicate Continue clicks cannot create two accounts.

> Diagnose “Unable to send an email code.” Trace sign-in.tsx through the OTP
> server action to Appwrite createEmailToken. Check environment presence without
> printing values, SDK error status/type/code, CSRF ordering, and whether the
> server action returns an error inside HTTP 200. Add safe development-only
> diagnostics and never log email, OTP, API key, cookies or raw exceptions.

> Audit every commit that will be pushed for API keys, session secrets, OTP
> values and tracked .env files. Verify working tree and staged files. Do not
> print secret values, rewrite history or push automatically.

> Update the remaining submission work and add a polished UI with reusable
> global Button and Input-style components, similar to the shadcn owned-component
> approach.

## Three corrections I caught

1. The first error mapper collapsed Appwrite failures into a generic message,
   which hid the missing-runtime-env and HTTP status boundary. Fixed in
   [`6c45d0a`](../../commit/6c45d0a).
2. The initial mapper treated every Appwrite 401 as an expired user session,
   including privileged API-key operations. Invalid-session classification is
   now opt-in per operation. Fixed in [`6c45d0a`](../../commit/6c45d0a).
3. Logout used a ref as the button's `disabled` value. The ref blocked duplicate
   handlers but did not trigger a render, so users could not see the pending
   state. A separate React state now drives the UI while the ref keeps the
   synchronous guard. Fixed in [`463965b`](../../commit/463965b).
