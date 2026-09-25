# Implementation Notes

## Main decisions

I kept TanStack Start because it is the supplied stack and its server functions
give the application a clear browser/server boundary. The root route loads auth
on the server, which makes the account header correct in the first HTML response
instead of fixing it after hydration.

The Appwrite API key is used only by server code for OTP/session operations. The
session secret is stored in an `HttpOnly`, `SameSite=Lax` cookie with Appwrite's expiry
(`Secure` in production), so browser JavaScript cannot read either credential.
Mutating server functions validate same-origin `Origin`/`Host` headers.

Profile operations use a session-authenticated Appwrite Function execution. The
Function gets ownership from Appwrite's execution context; I intentionally did
not send or trust the profile user ID from the browser. Function transport
success is not treated as business success: `responseStatusCode` and the typed
response body are checked separately. Only GET 404 means onboarding.

Return redirects accept only local paths beginning with one slash. Schemes,
protocol-relative paths, backslashes, control characters and malformed encodings
fall back to `/`. Empty optional profile fields are sent as `null`, because an
omitted field means “keep the old value.” Role is excluded from profile updates.

The Function's unique index is the final protection against duplicate onboarding
accounts. The disabled button and client ref improve UX but are not the data
integrity guarantee.

## Brief decisions I changed

I did not follow the suggestion to send a user ID with profile edits because a
browser-provided ID is not trustworthy. I also clear the cookie only for a
verified invalid/expired session; temporary Appwrite or Function failures remain
retryable instead of silently logging the user out.

I changed the supplied Function's unexpected-error logging. It previously logged
the raw exception message or stack; Appwrite SDK errors can contain credentials
or other sensitive details. The Function now records only a fixed, generic log
message and still returns the same controlled 500 response.

The PDF brief says to submit a private repository, but the interview instruction
superseded that with a public-repository requirement. This submission follows the
later interview instruction and keeps secrets out of Git history.

## Verification and next steps

The author previously exercised OTP sign-in and the primary pages on Appwrite.
Local checks and the remaining live regression sequence are in `TESTING.md`;
mocked tests do not prove Cloud integration. Before production I would add E2E
coverage, distributed rate limiting for OTP requests, structured redacted
observability, CSP/security headers, key rotation procedures and monitored email
delivery. I would also test invalid-session and Function-outage scenarios against
a dedicated staging project.
