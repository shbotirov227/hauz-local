import { Link, createFileRoute, redirect, useRouter } from '@tanstack/react-router'
import {
  ArrowLeft,
  AtSign,
  BriefcaseBusiness,
  FileText,
  LoaderCircle,
  Pencil,
  RotateCcw,
  Save,
  UserRound,
} from 'lucide-react'
import { useRef, useState } from 'react'
import type { FormEvent } from 'react'

import { AuthFeedback } from '../components/auth-feedback'
import { Button, buttonVariants } from '../components/ui/button'
import { Field } from '../components/ui/field'
import { Input } from '../components/ui/input'
import { Textarea } from '../components/ui/textarea'
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

function BackHomeLink() {
  return (
    <Link
      className={`${buttonVariants({ variant: 'secondary', size: 'compact' })} profile-back-link`}
      to="/"
    >
      <ArrowLeft aria-hidden="true" size={17} />
      Back to home
    </Link>
  )
}

function Profile() {
  const { auth } = Route.useRouteContext()
  const router = useRouter()

  if (auth.status === 'error') {
    return (
      <main className="page-shell">
        <BackHomeLink />
        <div className="page-header">
          <div>
            <p className="eyebrow">Personal account</p>
            <h1>Profile</h1>
          </div>
        </div>
        <AuthFeedback error={auth.error} />
        <Button onClick={() => router.invalidate()} type="button">
          <RotateCcw aria-hidden="true" size={18} />
          Retry
        </Button>
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
    const initials = `${account.firstName[0] ?? ''}${account.lastName[0] ?? ''}`

    return (
      <main className="page-shell">
        <BackHomeLink />
        <div className="page-header">
          <div>
            <p className="eyebrow">Personal account</p>
            <h1>Profile</h1>
            <p>Review the details attached to your HAUZ account.</p>
          </div>
          <Button onClick={() => setEditing(true)} variant="secondary" type="button">
            <Pencil aria-hidden="true" size={17} />
            Edit profile
          </Button>
        </div>
        <section className="profile-panel">
          <div className="profile-identity">
            <div className="avatar" aria-hidden="true">{initials.toUpperCase()}</div>
            <div>
              <h2>{`${account.firstName} ${account.lastName}`}</h2>
              <p>{account.role === 'property_owner' ? 'Property Owner' : 'Realtor'}</p>
            </div>
          </div>
          <dl className="profile-details">
            <div>
              <dt><UserRound aria-hidden="true" size={18} />Name</dt>
              <dd>{`${account.firstName} ${account.lastName}`}</dd>
            </div>
            <div>
              <dt><BriefcaseBusiness aria-hidden="true" size={18} />Role</dt>
              <dd>{account.role === 'property_owner' ? 'Property Owner' : 'Realtor'}</dd>
            </div>
            <div>
              <dt><AtSign aria-hidden="true" size={18} />Contact email</dt>
              <dd>{account.contactEmail ?? 'Not provided'}</dd>
            </div>
            <div className="profile-detail-wide">
              <dt><FileText aria-hidden="true" size={18} />Bio</dt>
              <dd className="profile-bio">{account.bio ?? 'Not provided'}</dd>
            </div>
          </dl>
        </section>
      </main>
    )
  }

  return (
    <main className="page-shell page-shell-narrow">
      <div className="page-header">
        <div>
          <p className="eyebrow">Personal account</p>
          <h1>Edit profile</h1>
          <p>Changes are saved securely through your account Function.</p>
        </div>
      </div>
      <form className="profile-form" onSubmit={handleSubmit}>
        <div className="field-row">
          <Field label="First name" name="firstName">
            <Input autoComplete="given-name" id="firstName" maxLength={100} onChange={(event) => setFirstName(event.target.value)} required value={firstName} />
          </Field>
          <Field label="Last name" name="lastName">
            <Input autoComplete="family-name" id="lastName" maxLength={100} onChange={(event) => setLastName(event.target.value)} required value={lastName} />
          </Field>
        </div>
        <Field hint="Role is fixed after onboarding." label="Role" name="role">
          <Input disabled id="role" value={account.role === 'property_owner' ? 'Property Owner' : 'Realtor'} />
        </Field>
        <Field hint="Optional" label="Contact email" name="contactEmail">
          <Input autoComplete="email" id="contactEmail" maxLength={254} onChange={(event) => setContactEmail(event.target.value)} type="email" value={contactEmail} />
        </Field>
        <Field hint={`${bio.length}/2000 characters`} label="Bio" name="bio">
          <Textarea id="bio" maxLength={2000} onChange={(event) => setBio(event.target.value)} rows={6} value={bio} />
        </Field>
        <div className="form-actions">
          <Button disabled={pending} type="submit">
            {pending ? <LoaderCircle className="spin" aria-hidden="true" size={18} /> : <Save aria-hidden="true" size={18} />}
            {pending ? 'Saving...' : 'Save changes'}
          </Button>
          <Button disabled={pending} onClick={cancelEditing} type="button" variant="secondary">
            Cancel
          </Button>
        </div>
      </form>
      <AuthFeedback error={error} />
    </main>
  )
}
