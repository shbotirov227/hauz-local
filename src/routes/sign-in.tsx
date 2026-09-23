import { createFileRoute, redirect, useRouter } from '@tanstack/react-router'
import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'

import { AuthFeedback } from '../components/auth-feedback'
import { requestEmailOtp, verifyEmailOtp } from '../lib/auth/actions'
import { normalizeReturnPath } from '../lib/auth/redirect'
import type { AuthError } from '../lib/auth/types'

type SignInSearch = { redirect: string }

export const Route = createFileRoute('/sign-in')({
  validateSearch: (search: Record<string, unknown>): SignInSearch => ({
    redirect: normalizeReturnPath(search.redirect),
  }),
  beforeLoad: ({ context, search }) => {
    if (context.auth.status === 'signed_in') {
      throw redirect({ href: search.redirect })
    }

    if (context.auth.status === 'needs_onboarding') {
      throw redirect({
        to: '/onboarding',
        search: { redirect: search.redirect },
      })
    }
  },
  component: SignIn,
})

function SignIn() {
  const { auth } = Route.useRouteContext()
  const { redirect: returnPath } = Route.useSearch()
  const router = useRouter()
  const submitting = useRef(false)
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [codeSent, setCodeSent] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<AuthError | null>(
    auth.status === 'error' ? auth.error : null,
  )
  const [resendSeconds, setResendSeconds] = useState(0)

  useEffect(() => {
    if (resendSeconds <= 0) {
      return
    }

    const timer = window.setTimeout(
      () => setResendSeconds((seconds) => Math.max(0, seconds - 1)),
      1000,
    )
    return () => window.clearTimeout(timer)
  }, [resendSeconds])

  async function sendCode() {
    if (submitting.current) {
      return
    }

    submitting.current = true
    setPending(true)
    setError(null)
    try {
      const result = await requestEmailOtp({
        data: { email, redirect: returnPath },
      })
      if (!result.ok) {
        setError(result)
        return
      }

      setCodeSent(true)
      setResendSeconds(30)
    } catch {
      setError({
        ok: false,
        code: 'appwrite_error',
        message: 'Unable to request an email code. Please try again.',
      })
    } finally {
      submitting.current = false
      setPending(false)
    }
  }

  async function handleEmailSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    await sendCode()
  }

  async function handleCodeSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (submitting.current) {
      return
    }

    submitting.current = true
    setPending(true)
    setError(null)
    try {
      const result = await verifyEmailOtp({
        data: { secret: code, redirect: returnPath },
      })
      if (!result.ok) {
        setError(result)
        return
      }

      if (result.auth.status === 'error') {
        setError(result.auth.error)
        return
      }

      await router.invalidate()
      if (result.auth.status === 'needs_onboarding') {
        await router.navigate({
          to: '/onboarding',
          search: { redirect: result.redirect },
          replace: true,
        })
        return
      }

      if (result.auth.status === 'signed_in') {
        await router.navigate({ href: result.redirect, replace: true })
        return
      }

      setError({
        ok: false,
        code: 'invalid_session',
        message: 'The session could not be established. Request a new code.',
      })
    } catch {
      setError({
        ok: false,
        code: 'appwrite_error',
        message: 'Unable to verify the email code. Please try again.',
      })
    } finally {
      submitting.current = false
      setPending(false)
    }
  }

  return (
    <main>
      <h1>Sign in</h1>
      {!codeSent ? (
        <form onSubmit={handleEmailSubmit}>
          <label htmlFor="email">Email address</label>
          <input
            autoComplete="email"
            id="email"
            maxLength={254}
            onChange={(event) => setEmail(event.target.value)}
            required
            type="email"
            value={email}
          />
          <button disabled={pending} type="submit">
            {pending ? 'Sending...' : 'Email me a code'}
          </button>
        </form>
      ) : (
        <form onSubmit={handleCodeSubmit}>
          <p>
            Enter the code sent to <strong>{email}</strong>.
          </p>
          <label htmlFor="code">Email code</label>
          <input
            autoComplete="one-time-code"
            id="code"
            inputMode="numeric"
            maxLength={128}
            onChange={(event) => setCode(event.target.value)}
            required
            value={code}
          />
          <button disabled={pending} type="submit">
            {pending ? 'Verifying...' : 'Continue'}
          </button>
          <div className="secondary-actions">
            <button
              disabled={pending || resendSeconds > 0}
              onClick={sendCode}
              type="button"
            >
              {resendSeconds > 0
                ? `Resend in ${resendSeconds}s`
                : 'Resend code'}
            </button>
            <button
              disabled={pending}
              onClick={() => {
                setCodeSent(false)
                setCode('')
                setError(null)
              }}
              type="button"
            >
              Use another email
            </button>
          </div>
        </form>
      )}
      <AuthFeedback error={error} />
    </main>
  )
}
