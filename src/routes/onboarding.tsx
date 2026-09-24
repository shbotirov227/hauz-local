import { createFileRoute, redirect, useRouter } from '@tanstack/react-router'
import { ArrowRight, LoaderCircle, UserRound } from 'lucide-react'
import { useRef, useState } from 'react'
import type { FormEvent } from 'react'

import { AuthFeedback } from '../components/auth-feedback'
import { Button } from '../components/ui/button'
import { Field } from '../components/ui/field'
import { Input } from '../components/ui/input'
import { Select } from '../components/ui/select'
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
      <main className="auth-page">
        <section className="form-panel">
          <h1>Finish your account</h1>
          <AuthFeedback error={error} />
          <Button onClick={() => router.invalidate()} type="button">
            Retry
          </Button>
        </section>
      </main>
    )
  }

  return (
    <main className="auth-page auth-page-wide">
      <section className="form-panel">
        <div className="panel-icon" aria-hidden="true">
          <UserRound size={22} />
        </div>
        <p className="eyebrow">One last step</p>
        <h1>Finish your account</h1>
        <p className="panel-copy">
          Tell us how you use HAUZ. Your role cannot be changed later.
        </p>
        <form className="stack-form" onSubmit={handleSubmit}>
          <div className="field-row">
            <Field label="First name" name="firstName">
              <Input
                autoComplete="given-name"
                id="firstName"
                maxLength={100}
                onChange={(event) => setFirstName(event.target.value)}
                required
                value={firstName}
              />
            </Field>
            <Field label="Last name" name="lastName">
              <Input
                autoComplete="family-name"
                id="lastName"
                maxLength={100}
                onChange={(event) => setLastName(event.target.value)}
                required
                value={lastName}
              />
            </Field>
          </div>
          <Field
            hint="Choose carefully. This is locked after account creation."
            label="I am a"
            name="role"
          >
            <Select
              id="role"
              onChange={(event) => setRole(event.target.value as PersonalRole)}
              value={role}
            >
              <option value="property_owner">Property Owner</option>
              <option value="realtor">Realtor</option>
            </Select>
          </Field>
          <Button className="button-full" disabled={pending} type="submit">
            {pending ? <LoaderCircle className="spin" aria-hidden="true" size={18} /> : <ArrowRight aria-hidden="true" size={18} />}
            {pending ? 'Creating account...' : 'Continue'}
          </Button>
        </form>
        <AuthFeedback error={error} />
      </section>
    </main>
  )
}
