import { createFileRoute, redirect, useRouter } from '@tanstack/react-router'
import { useRef, useState } from 'react'
import type { FormEvent } from 'react'

import { AuthFeedback } from '../components/auth-feedback'
import { updatePersonalAccount } from '../lib/auth/actions'
import { normalizeReturnPath } from '../lib/auth/redirect'
import type { AuthError, PersonalAccount } from '../lib/auth/types'

const PROFILE_RETURN_PATH = '/profile'

export const Route = createFileRoute('/profile')({
  beforeLoad: ({ context, location }) => {
    const returnPath = normalizeReturnPath(location.href)
    if (context.auth.status === 'signed_out') {
      throw redirect({
        to: '/sign-in',
        search: { redirect: returnPath },
      })
    }

    if (context.auth.status === 'needs_onboarding') {
      throw redirect({
        to: '/onboarding',
        search: { redirect: returnPath },
      })
    }
  },
  component: Profile,
})

function Profile() {
  const { auth } = Route.useRouteContext()
  const router = useRouter()

  if (auth.status === 'error') {
    return (
      <main>
        <h1>Profile</h1>
        <AuthFeedback error={auth.error} />
        <button onClick={() => router.invalidate()} type="button">
          Retry
        </button>
      </main>
    )
  }

  if (auth.status !== 'signed_in') {
    return null
  }

  return <ProfileDetails account={auth.personalAccount} />
}

function ProfileDetails({ account }: { account: PersonalAccount }) {
  const router = useRouter()
  const submitting = useRef(false)
  const [editing, setEditing] = useState(false)
  const [firstName, setFirstName] = useState(account.firstName)
  const [lastName, setLastName] = useState(account.lastName)
  const [contactEmail, setContactEmail] = useState(account.contactEmail ?? '')
  const [bio, setBio] = useState(account.bio ?? '')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<AuthError | null>(null)

  function cancelEditing() {
    setFirstName(account.firstName)
    setLastName(account.lastName)
    setContactEmail(account.contactEmail ?? '')
    setBio(account.bio ?? '')
    setError(null)
    setEditing(false)
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (submitting.current) {
      return
    }

    submitting.current = true
    setPending(true)
    setError(null)
    try {
      const result = await updatePersonalAccount({
        data: {
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          contactEmail: contactEmail.trim() || null,
          bio: bio.trim() || null,
        },
      })
      if (!result.ok) {
        setError(result)
        if (result.code === 'invalid_session') {
          await router.invalidate()
          await router.navigate({
            to: '/sign-in',
            search: { redirect: PROFILE_RETURN_PATH },
            replace: true,
          })
        }
        return
      }

      await router.invalidate()
      setEditing(false)
    } catch {
      setError({
        ok: false,
        code: 'function_error',
        message: 'Unable to update your profile. Please try again.',
      })
    } finally {
      submitting.current = false
      setPending(false)
    }
  }

  if (!editing) {
    return (
      <main>
        <div className="page-heading">
          <h1>Profile</h1>
          <button onClick={() => setEditing(true)} type="button">
            Edit profile
          </button>
        </div>
        <dl className="profile-details">
          <dt>Name</dt>
          <dd>{`${account.firstName} ${account.lastName}`}</dd>
          <dt>Role</dt>
          <dd>{account.role === 'property_owner' ? 'Property Owner' : 'Realtor'}</dd>
          <dt>Contact email</dt>
          <dd>{account.contactEmail ?? 'Not provided'}</dd>
          <dt>Bio</dt>
          <dd className="profile-bio">{account.bio ?? 'Not provided'}</dd>
        </dl>
      </main>
    )
  }

  return (
    <main>
      <h1>Edit profile</h1>
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
        <input
          disabled
          id="role"
          value={
            account.role === 'property_owner' ? 'Property Owner' : 'Realtor'
          }
        />
        <label htmlFor="contactEmail">Contact email</label>
        <input
          autoComplete="email"
          id="contactEmail"
          maxLength={254}
          onChange={(event) => setContactEmail(event.target.value)}
          type="email"
          value={contactEmail}
        />
        <label htmlFor="bio">Bio</label>
        <textarea
          id="bio"
          maxLength={2000}
          onChange={(event) => setBio(event.target.value)}
          rows={6}
          value={bio}
        />
        <div className="form-actions">
          <button disabled={pending} type="submit">
            {pending ? 'Saving...' : 'Save changes'}
          </button>
          <button disabled={pending} onClick={cancelEditing} type="button">
            Cancel
          </button>
        </div>
      </form>
      <AuthFeedback error={error} />
    </main>
  )
}
