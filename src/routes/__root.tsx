import type { QueryClient } from '@tanstack/react-query'
import {
  HeadContent,
  Link,
  Outlet,
  Scripts,
  createRootRouteWithContext,
  useRouter,
} from '@tanstack/react-router'
import { useRef, useState } from 'react'

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
})

function RootLayout() {
  const { auth } = Route.useRouteContext()
  const router = useRouter()
  const submitting = useRef(false)
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
    }
  }

  return (
    <>
      <header className="site-header">
        <Link className="brand" to="/">
          HAUZ
        </Link>
        <nav aria-label="Account">
          {signedInLabel ? (
            <>
              {auth.status === 'signed_in' ? (
                <Link to="/profile">{signedInLabel}</Link>
              ) : (
                <span>{signedInLabel}</span>
              )}
              <button
                className="link-button"
                disabled={submitting.current}
                onClick={handleLogout}
                type="button"
              >
                Log out
              </button>
            </>
          ) : (
            <Link to="/sign-in" search={{ redirect: '/' }}>
              Sign in
            </Link>
          )}
        </nav>
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
