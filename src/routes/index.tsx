import { Link, createFileRoute } from '@tanstack/react-router'
import { ArrowRight, KeyRound, ShieldCheck, UserRound } from 'lucide-react'

import { buttonVariants } from '../components/ui/button'

export const Route = createFileRoute('/')({ component: Home })

function Home() {
  const { auth } = Route.useRouteContext()
  const isSignedIn = auth.status === 'signed_in'

  return (
    <main className="home-page">
      <section className="home-intro">
        <p className="eyebrow">Personal account</p>
        <h1>Your details, ready for your next move.</h1>
        <p className="home-copy">
          Keep your HAUZ identity current in one secure place, whether you own
          property or help clients find theirs.
        </p>
        <Link
          className={buttonVariants({ variant: 'primary' })}
          search={isSignedIn ? undefined : { redirect: '/profile' }}
          to={isSignedIn ? '/profile' : '/sign-in'}
        >
          {isSignedIn ? 'Open profile' : 'Get started'}
          <ArrowRight aria-hidden="true" size={18} />
        </Link>
      </section>

      <section aria-label="Account benefits" className="benefit-grid">
        <article className="benefit-item">
          <UserRound aria-hidden="true" size={22} />
          <h2>One clear profile</h2>
          <p>Manage your name, role and contact details without extra steps.</p>
        </article>
        <article className="benefit-item">
          <KeyRound aria-hidden="true" size={22} />
          <h2>Password-free access</h2>
          <p>Use a one-time email code instead of remembering another password.</p>
        </article>
        <article className="benefit-item">
          <ShieldCheck aria-hidden="true" size={22} />
          <h2>Server-side security</h2>
          <p>Your Appwrite session stays in a protected server cookie.</p>
        </article>
      </section>
    </main>
  )
}
