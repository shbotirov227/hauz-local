# HAUZ take-home — Codex implementation brief

You are implementing the take-home in the existing `hauz-frontend-take-home` repository. Read `TASK.md`, `README.md`, `package.json`, `appwrite.config.json`, `src/**`, and `functions/personal-account/src/**` before changing code. Preserve the starter, its package manager and existing Function contract. Work autonomously through implementation, validation, documentation and meaningful commits. Do not invent successful Appwrite integration if credentials or Cloud access are unavailable: finish locally testable work and report the exact blocker. Never commit `.env`, API keys or session secrets.

## Goal and constraints

Implement email OTP sign-in, onboarding for users without a Personal Account, `/profile` view/edit, an SSR-correct header on the first paint after hard refresh, return to protected paths after sign-in/onboarding, and logout. A browser must never read the Appwrite session secret or API keys. Read/write profile exclusively by executing the provided `personal-account` Function, never the `personal_accounts` table from the web app. Use TypeScript, existing TanStack Start/router/query conventions, accessible plain UI; skip visual polish. Do not add a second auth framework or unnecessary state library.

## Architecture to implement

1. Use a server-only Appwrite SDK adapter and server functions/route handlers for OTP, session verification, profile Function execution and logout. Expose only public endpoint/project ID where necessary. Keep the Appwrite API key server-only; use a short-lived, HttpOnly, Secure in production, SameSite=Lax session cookie with explicit expiry. Decide cookie name and centralize its options. Prevent server-only imports from client bundles. Check current SDK signatures and actual installed versions before writing calls.
2. OTP: initiate email token with Appwrite's documented email OTP API; retain the returned user ID for confirmation without putting any secret in browser storage. Verify user ID + code on the server, establish Appwrite session, set cookie, then fetch current user and Personal Account. Same screens for new/returning users. Provide pending/error states and controlled resend to avoid accidental duplicate requests. Never log OTP, cookie, API key or raw user input.
3. Distinguish credentials: privileged client only for the minimum operations that require it; authenticated per-request session client for `account.get` and Function executions. Do not accidentally execute the Function using an admin/API-key identity: Function ownership derives from `x-appwrite-user-id`. Check whether SDK `functions.createExecution` with session authentication carries this identity; verify against the deployed Function rather than assuming.
4. Implement a small typed API boundary: `CurrentUser`, `PersonalAccount`, success/error union as appropriate. Function executions can return transport success while `responseStatusCode` is 404/401/etc: parse `responseBody`, check Function HTTP status explicitly, classify only `GET 404` as needs-onboarding. Preserve and display useful validation issues; treat unexpected failures as retriable errors.
5. Request-scoped server auth/profile loading for root header and protected routes. No module-global user/session state; no localStorage auth and no hydration-only header correction. Header should render signed-out or first name correctly from server data on the initial HTML after refresh. Avoid leaking one request's account to another. Invalidate/refetch auth and profile/query data after login, onboarding, profile edit and logout. Handle navigation without stale loader data.
6. Routes: `/` simple landing; `/sign-in` email then code; `/onboarding` firstName/lastName and immutable role; `/profile` display/edit firstName/lastName/contactEmail/bio. Protect profile and onboarding server-side; preserve an intended safe return path across the flow. Existing account bypasses onboarding; new account is sent there before final destination. An unauthenticated request to `/profile` ends at `/profile` after authentication and onboarding.
7. Restrict redirect to same-origin application paths starting with one `/`; reject `//host`, backslash, schemes, control characters and malformed encodings. Use `/` as fallback. Never blindly redirect to an untrusted `redirect` query parameter. Route guard should avoid redirect loops.
8. Onboarding: disable Continue while pending and guard repeat submission. The Function already has a unique index on `appwrite_user_id`, recovers competing creates and returns 200 on same-role retry / 409 on differing role. Do not claim button disabling alone guarantees uniqueness; do not modify Function without a concrete verified need.
9. Profile: obtain owner identity only from the authenticated Function execution context; never send user ID as an authority in the PATCH body. Role is shown read-only. Optional empty contactEmail/bio become `null` on PATCH (or omit when unchanged), because empty string is rejected and omitted fields retain stored values. Required name fields must be trimmed and validated. Show errors without wiping form input.
10. Error policy: distinguish expired/invalid session (clear cookie and direct to sign-in), no Personal Account (onboarding), Appwrite/Function outage (show error and allow retry, retain cookie). Never turn every current-user failure into logged-out. CSRF: ensure cookie-authenticated mutations are protected using same-origin Origin/Host checking or framework protection that you verify, including logout; do not use state-changing GET endpoints. No caching of private data across requests.

## Execution sequence and commits

### Phase 0 — inspect and setup (about 30 minutes)
Read repository files and compare README instructions with installed SDK. Install dependencies, run baseline `npm run typecheck` and `npm run build`. Set up a NEW free Appwrite project following README; allow ~20 minutes for setup and email the team if blocked longer. Never run `appwrite:push` against an existing project with other tables: `push table` may delete tables absent from config. Document setup blockers. Commit only relevant project changes.

### Phase 1 — secure infrastructure (about 2 hours)
Implement env validation, server-only Appwrite clients, cookie/session helpers, OTP server actions and typed Function execution/error mapping. Verify current SDK call signatures. Add focused tests for redirect normalization, Function status classification, and cookie/error handling where practical. Commit e.g. `feat(auth): add server-side Appwrite session and function client`.

### Phase 2 — routes and UX (about 2.5 hours)
Implement sign-in/code form, protected routing, onboarding, profile and header/logout. Cover pending/errors, safe redirects, null clearing and query/loader invalidation. Commit e.g. `feat(flow): add email sign-in and onboarding` and `feat(profile): add protected profile and SSR header`.

### Phase 3 — integration and review (about 2 hours)
Run typecheck/build/tests. In a real browser on the deployed Appwrite project test: fresh sign-in → onboarding → profile; returning sign-in skips onboarding; direct signed-out `/profile` returns there; hard refresh signed-in and signed-out headers; profile edits including null clearing; double-click onboarding; logout/back navigation; invalid/expired session and simulated Function outage; external redirect payloads. Check devtools network and build output for secret leakage. Fix actual defects and make separate meaningful fix commits. Do not fabricate three agent mistakes: record three genuine agent-generated issues you noticed and corrected, with corresponding fix commit hashes; if fewer than three occurred, state that honestly and ask the employer whether that submission requirement can be adjusted.

### Phase 4 — handoff (about 45 minutes)
Update `README.md` with exact setup, env variable names, Appwrite deployment commands, run/build/test commands and manual test steps. Write `NOTES.md` <= one page, in your own words: architecture; unsafe brief notes you changed and why; verified limits; production follow-ups. Save the prompts in `AGENT_PROMPTS.md` or `prompts/` with the exact prompts used and add the real three mistake → fix-commit links. Keep full commit history. Create a PRIVATE GitHub repo from this starter, push commits, verify no `.env`/secrets, and deliver repository URL. Do not claim verification that did not happen.

## Acceptance checklist

- First HTML/header after hard reload reflects actual signed-in state and first name.
- OTP works for new and returning users; no browser-readable session secret/API key.
- Unonboarded user sees onboarding; existing account skips it; role stays immutable.
- `/profile` guard, safe redirect, edit and explicit `null` clearing work.
- Function is the only path to profile data; user ID is not trusted from browser.
- 404 onboarding, 401 expired session, 409 conflict, validation and transient outage are distinct.
- All auth/profile mutations avoid CSRF and race/stale-cache problems.
- Typecheck/build pass; README, one-page NOTES, actual prompts and honest fix-commit references are present.

When you finish, report implemented changes, commit hashes, checks performed, any blocked cloud scenario, and concise reasons for each security decision. Expect to explain every important line without an agent in the follow-up interview.
