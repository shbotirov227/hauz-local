# Agent Prompts and Corrections

Selected original user messages are preserved below without IDE metadata; this is
not a complete chat export. HAUZ_CODEX_TASK.md was an internal implementation
brief, removed during final cleanup because it duplicated the task and handoff
documents. References to it in historical prompts are intentionally preserved.

## Phase 1

```text
Read HAUZ\_CODEX\_TASK.md, TASK.md, README.md and the existing source.
Implement Phase 1 only: server-side Appwrite session, email OTP actions,
secure cookie handling, and a typed Personal Account Function client.

Inspect the installed SDK signatures before coding. Do not expose the API key
or session secret to browser JavaScript. Run npm run typecheck and npm run build.
Then summarize what you changed, what you verified, and any blocker.
Do not start Phase 2 yet.
```

## Phase 1 review

```text
Review Phase 1 as a security and correctness reviewer. Do not implement
Phase 2 yet. Inspect every changed auth file and the existing Function.
Check the exact Appwrite SDK calls, authenticated Function execution,
Function responseStatusCode handling, OTP state, cookie lifetime and
flags, CSRF checks, redirect validation, and error classification.
Report concrete findings with file and line numbers. Fix verified defects,
run typecheck and build, and list anything that still needs a live
Appwrite test. Do not commit unrelated existing changes or secrets.
```

## Phase 2

```text
Read HAUZ\_CODEX\_TASK.md and the completed Phase 1 code. Implement Phase 2:
email/code sign-in UI, onboarding, protected /profile view and edit,
SSR-correct header on the first HTML paint, safe return redirects, and logout.

Use the existing server actions and typed Function client. Do not expose
session secrets or API keys. Ensure optional contactEmail and bio fields
send null when cleared, role is read-only after onboarding, and duplicate
Continue clicks cannot create two accounts.

Run typecheck and build. Make meaningful commits without including .env
or unrelated changes. Then give me the exact browser test sequence and
report which behaviors were actually tested against Appwrite versus only
checked locally.
```

## OTP diagnosis

```text
The sign-in form receives ok:false from requestEmailOtp and displays
"Unable to send an email code." Trace requestEmailOtp and its Appwrite
createEmailToken call. Identify the actual failure using safe dev-only
logging of error type, code and HTTP status; never log email, OTP, API key,
cookies or raw exception objects. Check whether CSRF validation rejects
the request before Appwrite is called. Fix the proven cause, then explain
which layer failed. Run typecheck and build.
```

## Public repository audit

```text
Before pushing to my PUBLIC GitHub repository, audit every commit that
will be pushed for API keys, session secrets, OTP values and tracked .env
files. Do not print secret values in the report. Report affected file
names and commit hashes only. Verify the working tree and staged files
too. If a real secret was committed, stop before push and explain the
safe remediation. Do not rewrite history or push automatically.
```

## Three corrections I caught

1. The mapper returned the same fallback for missing server configuration and
   most `createEmailToken` failures, leaving the UI with a generic error. The fix
   added a configuration-specific result and safe development diagnostics with
   only operation, HTTP status and Appwrite error type. Fixed in
   [`6c45d0a`](../../commit/6c45d0a).
2. The mapper classified every Appwrite HTTP 401 as an expired user session,
   even for privileged API-key operations where that conclusion is invalid.
   Session classification is now enabled only for session-authenticated calls.
   Fixed in [`6c45d0a`](../../commit/6c45d0a).
3. Logout used a ref as the button's `disabled` value. The ref blocked duplicate
   handlers but did not trigger a render, so the disabled state was not visible.
   React state now drives the UI while the ref keeps the synchronous guard.
   Fixed in [`463965b`](../../commit/463965b).
