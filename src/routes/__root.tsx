import type { QueryClient } from '@tanstack/react-query'
import {
  HeadContent,
  Link,
  Outlet,
  Scripts,
  createRootRouteWithContext,
  useRouter,
} from '@tanstack/react-router'
import { Building2, LogIn, LogOut, UserRound } from 'lucide-react'
import { useRef, useState } from 'react'

import { Button, buttonVariants } from '../components/ui/button'
import { logout, getCurrentAuth } from '../lib/auth/actions'
import type { AuthError } from '../lib/auth/types'
import appCss from '../styles.css?url'

export interface RouterContext {
  queryClient: QueryClient
}

export const Route = createRootRouteWithContext<RouterContext>()({
  beforeLoad: async () => ({ auth: await getCurrentAuth() }),
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: 'HAUZ' },
    ],
    links: [{ rel: 'stylesheet', href: appCss }],
  }),
  component: RootLayout,
  shellComponent: RootDocument,
  notFoundComponent: () => <NotFound />,
})

function RootLayout() {
  const { auth } = Route.useRouteContext()
  const router = useRouter()
  const submitting = useRef(false)
  const [loggingOut, setLoggingOut] = useState(false)
  const [logoutError, setLogoutError] = useState<AuthError | null>(null)

  const signedInLabel =
    auth.status === 'signed_in'
      ? auth.personalAccount.firstName
      : auth.status === 'needs_onboarding'
        ? auth.user.email
        : auth.status === 'error'
          ? (auth.user?.email ?? 'Account unavailable')
          : null

  async function handleLogout() {
    if (submitting.current) {
      return
    }

    submitting.current = true
    setLoggingOut(true)
    setLogoutError(null)
    try {
      const result = await logout({ data: {} })
      if (!result.ok) {
        setLogoutError(result)
        return
      }

      await router.invalidate()
      await router.navigate({ to: '/', replace: true })
    } catch {
      setLogoutError({
        ok: false,
        code: 'appwrite_error',
        message: 'Unable to log out. Please try again.',
      })
    } finally {
      submitting.current = false
      setLoggingOut(false)
    }
  }

  return (
    <>
      <header className="site-header">
        <div className="header-inner">
          <Link className="brand" to="/">
            <span className="brand-mark" aria-hidden="true">
              <Building2 size={19} />
            </span>
            HAUZ
          </Link>
        <nav aria-label="Account" className="account-nav">
          {signedInLabel ? (
            <>
              {auth.status === 'signed_in' ? (
                <Link className="account-link" to="/profile">
                  <UserRound aria-hidden="true" size={17} />
                  <span>{signedInLabel}</span>
                </Link>
              ) : (
                <span className="account-label">{signedInLabel}</span>
              )}
              <Button
                aria-label="Log out"
                disabled={loggingOut}
                onClick={handleLogout}
                size="compact"
                type="button"
                variant="ghost"
              >
                <LogOut aria-hidden="true" size={17} />
                Log out
              </Button>
            </>
          ) : (
            <Link
              className={buttonVariants({ size: 'compact', variant: 'secondary' })}
              to="/sign-in"
              search={{ redirect: '/' }}
            >
              <LogIn aria-hidden="true" size={17} />
              Sign in
            </Link>
          )}
        </nav>
        </div>
      </header>
      {logoutError ? (
        <p className="header-error" role="alert">
          {logoutError.message}
        </p>
      ) : null}
      <Outlet />
    </>
  )
}

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  )
}

function NotFound() {
  return (
    <main className="empty-page">
      <p className="error-code">404</p>
      <h1>Page not found</h1>
      <p>The page you requested does not exist.</p>
      <Link className={buttonVariants({ variant: 'primary' })} to="/">
        Go home
      </Link>
    </main>
  )
}
