# Submission Verification

The supplied README.md and TASK.md are intentionally preserved. This document
contains supplementary setup and verification details, not changes to the brief.

## Setup notes

- Follow README.md on a fresh Appwrite project. The committed config uses a
  project ID placeholder. Replace it and the regional endpoint before CLI push.
- The running web app reads APPWRITE_ENDPOINT, APPWRITE_PROJECT_ID,
  APPWRITE_API_KEY and APPWRITE_FUNCTION_ID from the server environment, not
  appwrite.config.json. Restoring the config placeholder does not change an
  existing runtime integration. Do not redeploy just to test the web UI.
- Keep .env untracked. Never use VITE_ prefixes for credentials. Production needs
  HTTPS because the session cookie is Secure there.
- Use Node 22.6 or newer for the additional native TypeScript test runner
  (verification environment: Node 24). No new test dependency is required.

## Local commands

```bash
npm ci
npm test
npm run typecheck
npm run build
git diff --check
npm run dev
```

The unit tests exercise real redirect and Function-response code and Function
handlers with mocked storage. They do not prove Appwrite authentication, email
delivery, deployed permissions or the deployed database's unique index.

## Browser regression sequence

Use disposable test accounts in your own project. Never record actual OTPs,
session cookies or API keys in screenshots, test reports or Git.

1. Open a private browser window at http://localhost:3000/profile. Expect sign-in
   with a return path to /profile and a signed-out header in the HTML response.
2. Request a code for a new test email. Check pending state; a wrong code must
   show an error without creating a session. Enter the valid code privately.
3. Expect onboarding. Enter names and choose Property Owner. Double-click
   Continue. Expect /profile; confirm exactly one row for this test user in the
   Appwrite Console. Repeat with another account choosing Realtor.
4. Hard-refresh /profile. In the document response (not just the hydrated DOM),
   confirm the first name and Log out are already present. Repeat on / and a
   nonexistent route (404); the shared header must still be correct.
5. Edit names, contact email and bio. Save and refresh; values must persist and
   the header must show the updated first name. Role must stay read-only.
6. Clear contact email and bio, save and refresh. Expect Not provided; confirm
   both stored columns are null. Test Cancel and rejected blank required names.
7. Log out. Visit /profile and use Back followed by refresh: no protected profile
   should remain available. Sign in with the same email; onboarding must be skipped.
8. Try /sign-in?redirect=https%3A%2F%2Fexample.com,
   /sign-in?redirect=%2F%2Fexample.com and /sign-in?redirect=%2Fsign-in.
   After sign-in, stay on this site without a redirect loop.
9. At 320, 375, 496 and 1280 CSS-pixel widths, check names (including a 100-character
   name), Log out and forms remain visible without horizontal overflow.
10. In a dedicated staging project, revoke the test session in Appwrite and
    refresh: expect sign-in. Simulate a Function outage only in staging: expect
    a retryable error, not automatic cookie deletion. Restore service and retry.
11. In browser storage, confirm HttpOnly and SameSite=Lax on the session cookie;
    production HTTPS must also have Secure. Do not copy its value. Check that
    client scripts and action JSON responses do not contain credentials.
12. Test cross-origin mutation rejection in staging (including logout). A server
    action can return HTTP 200 with ok:false; verify the result, not just transport
    status. Confirm rejected requests do not execute the Appwrite operation.

## Evidence and remaining handoff

Local verification on 2026-09-25:

- Seven unit tests, TypeScript checking and the production client/SSR build pass.
- Signed-out HTTP checks pass for /, /sign-in, /profile, /onboarding and a missing
  route. Auth search defaults can cause a canonical 307 before the final response.
  Protected routes reach sign-in; /profile retains its intended return path.
- The signed-out header is present in response HTML, not added only by hydration.
- Ten client build artifacts contain none of the checked server credential/code
  markers. This is a boundary check, not proof of every possible leakage path.
- Pattern-based scanning of six reachable commits, the index and non-ignored
  working files found no credential candidates. .env is ignored and was not read.
  Pattern scanning cannot guarantee the absence of every kind of secret.

The author previously reported successful live OTP sign-in and primary pages.
That is not a claim that all scenarios above were tested. This final preparation
has no connected browser or access to the test mailbox; live scenarios above
remain a release checklist. Do not mark them passed based on mocked tests.

Before submission: complete this live checklist, read NOTES.md and express its
decisions in your own words, review the diff, commit only intended files, and
push the full history to the public repository. The interview's public-repository
instruction supersedes the PDF's private-repository wording, as NOTES.md explains.
