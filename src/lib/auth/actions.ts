import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'

import {
  createPersonalAccount as createPersonalAccountWithSession,
  createEmailOtp,
  createSessionFromOtp,
  deleteCurrentSession,
  getCurrentUser,
  getPersonalAccount,
  updatePersonalAccount as updatePersonalAccountWithSession,
} from './appwrite.server'
import {
  clearPendingOtpUserId,
  clearSessionSecret,
  readPendingOtpUserId,
  readSessionSecret,
  writePendingOtpUserId,
  writeSessionSecret,
} from './cookies.server'
import { assertSameOriginMutation } from './csrf.server'
import { normalizeReturnPath } from './redirect'
import type {
  AuthError,
  AuthResult,
  CurrentAuth,
  PersonalAccount,
} from './types'

const emailInputSchema = z.object({
  email: z.email().max(254),
  redirect: z.string().optional(),
})

const verifyOtpInputSchema = z.object({
  secret: z.string().trim().min(1).max(128),
  redirect: z.string().optional(),
})

const emptyInputSchema = z.object({}).optional()

const createPersonalAccountInputSchema = z
  .object({
    firstName: z.string().trim().min(1).max(100),
    lastName: z.string().trim().min(1).max(100),
    role: z.enum(['property_owner', 'realtor']),
  })
  .strict()

const updatePersonalAccountInputSchema = z
  .object({
    firstName: z.string().trim().min(1).max(100),
    lastName: z.string().trim().min(1).max(100),
    contactEmail: z.union([z.email().max(254), z.null()]),
    bio: z.union([z.string().trim().min(1).max(2000), z.null()]),
  })
  .strict()

function invalidInput(message: string, field = ''): AuthError {
  return {
    ok: false,
    code: 'invalid_request',
    message,
    issues: [{ field, message }],
  }
}

function parseWithResult<T>(
  schema: z.ZodType<T>,
  value: unknown,
): AuthResult<{ data: T }> {
  const parsed = schema.safeParse(value)
  if (parsed.success) {
    return { ok: true, data: parsed.data }
  }

  return {
    ok: false,
    code: 'invalid_request',
    message: 'The submitted data is invalid.',
    issues: parsed.error.issues.map((issue) => ({
      field: issue.path.join('.'),
      message: issue.message,
    })),
  }
}

async function loadAuthFromSession(sessionSecret: string): Promise<CurrentAuth> {
  const currentUser = await getCurrentUser(sessionSecret)
  if (!currentUser.ok) {
    if (currentUser.code === 'invalid_session') {
      clearSessionSecret()
      return { status: 'signed_out', user: null, personalAccount: null }
    }

    return {
      status: 'error',
      user: null,
      personalAccount: null,
      error: currentUser,
    }
  }

  const personalAccount = await getPersonalAccount(sessionSecret)
  if (personalAccount.ok) {
    return {
      status: 'signed_in',
      user: currentUser.user,
      personalAccount: personalAccount.personalAccount,
    }
  }

  if (personalAccount.code === 'needs_onboarding') {
    return {
      status: 'needs_onboarding',
      user: currentUser.user,
      personalAccount: null,
    }
  }

  if (personalAccount.code === 'invalid_session') {
    clearSessionSecret()
    return { status: 'signed_out', user: null, personalAccount: null }
  }

  return {
    status: 'error',
    user: currentUser.user,
    personalAccount: null,
    error: personalAccount,
  }
}

export const getCurrentAuth = createServerFn({ method: 'GET' }).handler(
  async (): Promise<CurrentAuth> => {
    const sessionSecret = readSessionSecret()
    if (!sessionSecret) {
      return { status: 'signed_out', user: null, personalAccount: null }
    }

    return loadAuthFromSession(sessionSecret)
  },
)

export const requestEmailOtp = createServerFn({ method: 'POST' })
  .validator((data: unknown) => data)
  .handler(async ({ data }): Promise<
    AuthResult<{ expire: string; redirect: string }>
  > => {
    const csrfError = assertSameOriginMutation()
    if (csrfError) {
      return csrfError
    }

    const parsed = parseWithResult(emailInputSchema, data)
    if (!parsed.ok) {
      return parsed
    }

    const result = await createEmailOtp(parsed.data.email.trim().toLowerCase())
    if (!result.ok) {
      return result
    }

    if (!writePendingOtpUserId(result.userId, result.expire)) {
      return {
        ok: false,
        code: 'appwrite_error',
        message: 'Appwrite returned an invalid email code expiry.',
      }
    }

    return {
      ok: true,
      expire: result.expire,
      redirect: normalizeReturnPath(parsed.data.redirect),
    }
  })

export const verifyEmailOtp = createServerFn({ method: 'POST' })
  .validator((data: unknown) => data)
  .handler(async ({ data }): Promise<
    AuthResult<{
      auth: CurrentAuth
      redirect: string
    }>
  > => {
    const csrfError = assertSameOriginMutation()
    if (csrfError) {
      return csrfError
    }

    const parsed = parseWithResult(verifyOtpInputSchema, data)
    if (!parsed.ok) {
      return parsed
    }

    const pendingUserId = readPendingOtpUserId()
    if (!pendingUserId) {
      return invalidInput(
        'Request a new email code before verifying it.',
        'secret',
      )
    }

    const session = await createSessionFromOtp(
      pendingUserId,
      parsed.data.secret,
    )
    if (!session.ok) {
      return session
    }

    clearPendingOtpUserId()
    if (!writeSessionSecret(session.sessionSecret, session.expire)) {
      try {
        await deleteCurrentSession(session.sessionSecret)
      } catch {
        // The invalid session cannot be retained because no cookie was written.
      }

      return {
        ok: false,
        code: 'appwrite_error',
        message: 'Appwrite returned an invalid session expiry.',
      }
    }

    const auth = await loadAuthFromSession(session.sessionSecret)
    return {
      ok: true,
      auth,
      redirect: normalizeReturnPath(parsed.data.redirect),
    }
  })

export const createPersonalAccount = createServerFn({ method: 'POST' })
  .validator((data: unknown) => data)
  .handler(async ({ data }): Promise<
    AuthResult<{ personalAccount: PersonalAccount }>
  > => {
    const csrfError = assertSameOriginMutation()
    if (csrfError) {
      return csrfError
    }

    const parsed = parseWithResult(createPersonalAccountInputSchema, data)
    if (!parsed.ok) {
      return parsed
    }

    const sessionSecret = readSessionSecret()
    if (!sessionSecret) {
      return missingSessionError()
    }

    const result = await createPersonalAccountWithSession(
      sessionSecret,
      parsed.data,
    )
    if (!result.ok && result.code === 'invalid_session') {
      clearSessionSecret()
    }

    return result
  })

export const updatePersonalAccount = createServerFn({ method: 'POST' })
  .validator((data: unknown) => data)
  .handler(async ({ data }): Promise<
    AuthResult<{ personalAccount: PersonalAccount }>
  > => {
    const csrfError = assertSameOriginMutation()
    if (csrfError) {
      return csrfError
    }

    const parsed = parseWithResult(updatePersonalAccountInputSchema, data)
    if (!parsed.ok) {
      return parsed
    }

    const sessionSecret = readSessionSecret()
    if (!sessionSecret) {
      return missingSessionError()
    }

    const result = await updatePersonalAccountWithSession(
      sessionSecret,
      parsed.data,
    )
    if (!result.ok && result.code === 'invalid_session') {
      clearSessionSecret()
    }

    return result
  })

export const logout = createServerFn({ method: 'POST' })
  .validator((data: unknown) => {
    const parsed = emptyInputSchema.safeParse(data)
    if (!parsed.success) {
      return {}
    }

    return parsed.data ?? {}
  })
  .handler(async (): Promise<AuthResult<{ signedOut: true }>> => {
    const csrfError = assertSameOriginMutation()
    if (csrfError) {
      return csrfError
    }

    const sessionSecret = readSessionSecret()
    clearPendingOtpUserId()
    clearSessionSecret()

    if (sessionSecret) {
      try {
        await deleteCurrentSession(sessionSecret)
      } catch {
        // Local logout is complete even if remote revocation is unavailable.
      }
    }

    return { ok: true, signedOut: true }
  })

export function missingSessionError(): AuthError {
  return {
    ok: false,
    code: 'invalid_session',
    message: 'Sign in before continuing.',
    issues: [{ field: 'session', message: 'Sign in before continuing.' }],
  }
}
