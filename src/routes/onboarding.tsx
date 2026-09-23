import { createFileRoute, redirect, useRouter } from '@tanstack/react-router'
import { useRef, useState } from 'react'
import type { FormEvent } from 'react'

import { AuthFeedback } from '../components/auth-feedback'
import { createPersonalAccount } from '../lib/auth/actions'
import { normalizeReturnPath } from '../lib/auth/redirect'
import type { AuthError, PersonalRole } from '../lib/auth/types'

type OnboardingSearch = { redirect: string }

export const Route = createFileRoute('/onboarding')({
  validateSearch: (search: Record<string, unknown>): OnboardingSearch => ({
    redirect: normalizeReturnPath(search.redirect),
  }),
  beforeLoad: ({ context, search }) => {
    if (context.auth.status === 'signed_out') {
      throw redirect({
        to: '/sign-in',
        search: { redirect: search.redirect },
      })
    }

    if (context.auth.status === 'signed_in') {
      throw redirect({ href: search.redirect })
    }
  },
  component: Onboarding,
})

function Onboarding() {
  const { auth } = Route.useRouteContext()
  const { redirect: returnPath } = Route.useSearch()
  const router = useRouter()
  const submitting = useRef(false)
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [role, setRole] = useState<PersonalRole>('property_owner')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<AuthError | null>(
    auth.status === 'error' ? auth.error : null,
  )

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (submitting.current) {
      return
    }

    submitting.current = true
    setPending(true)
    setError(null)
    try {
      const result = await createPersonalAccount({
        data: { firstName, lastName, role },
      })
      if (!result.ok) {
        setError(result)
        if (result.code === 'invalid_session') {
          await router.invalidate()
        }
        return
      }

      await router.invalidate()
      await router.navigate({ href: returnPath, replace: true })
    } catch {
      setError({
        ok: false,
        code: 'function_error',
        message: 'Unable to create your personal account. Please try again.',
      })
    } finally {
      submitting.current = false
      setPending(false)
    }
  }

  if (auth.status === 'error') {
    return (
      <main>
        <h1>Finish your account</h1>
        <AuthFeedback error={error} />
        <button onClick={() => router.invalidate()} type="button">
          Retry
        </button>
      </main>
    )
  }

  return (
    <main>
      <h1>Finish your account</h1>
      <form onSubmit={handleSubmit}>
        <label htmlFor="firstName">First name</label>
        <input
          autoComplete="given-name"
          id="firstName"
          maxLength={100}
          onChange={(event) => setFirstName(event.target.value)}
          required
          value={firstName}
        />
        <label htmlFor="lastName">Last name</label>
        <input
          autoComplete="family-name"
          id="lastName"
          maxLength={100}
          onChange={(event) => setLastName(event.target.value)}
          required
          value={lastName}
        />
        <label htmlFor="role">Role</label>
        <select
          id="role"
          onChange={(event) => setRole(event.target.value as PersonalRole)}
          value={role}
        >
          <option value="property_owner">Property Owner</option>
          <option value="realtor">Realtor</option>
        </select>
        <button disabled={pending} type="submit">
          {pending ? 'Creating account...' : 'Continue'}
        </button>
      </form>
      <AuthFeedback error={error} />
    </main>
  )
}
