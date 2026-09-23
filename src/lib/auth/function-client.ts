import { z } from 'zod'

import type {
  AuthError,
  AuthResult,
  PersonalAccount,
  PersonalRole,
  ValidationIssue,
} from './types'

const personalRoleSchema = z.enum(['property_owner', 'realtor'])

const personalAccountSchema = z.object({
  personalAccountId: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  role: personalRoleSchema,
  contactEmail: z.string().nullable(),
  bio: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

const functionErrorBodySchema = z.object({
  error: z.string().optional(),
  message: z.string().optional(),
  issues: z
    .array(
      z.object({
        field: z.string(),
        message: z.string(),
      }),
    )
    .optional(),
})

export type PersonalAccountCreateInput = {
  firstName: string
  lastName: string
  role: PersonalRole
}

export type PersonalAccountPatchInput = {
  firstName?: string
  lastName?: string
  contactEmail?: string | null
  bio?: string | null
}

export type PersonalAccountMethod = 'GET' | 'POST' | 'PATCH'

export type FunctionHttpResponse = {
  method: PersonalAccountMethod
  statusCode: number
  body: string
}

function parseJson(body: string): unknown {
  if (!body.trim()) {
    return null
  }

  return JSON.parse(body)
}

function errorFromBody(
  fallback: AuthError,
  body: string,
): AuthError {
  try {
    const parsed = functionErrorBodySchema.safeParse(parseJson(body))
    if (!parsed.success) {
      return fallback
    }

    return {
      ...fallback,
      message: parsed.data.message ?? fallback.message,
      issues: parsed.data.issues as Array<ValidationIssue> | undefined,
    }
  } catch {
    return fallback
  }
}

export function classifyPersonalAccountExecution(
  response: FunctionHttpResponse,
): AuthResult<{ personalAccount: PersonalAccount }> {
  if (response.statusCode === 200 || response.statusCode === 201) {
    try {
      const parsed = personalAccountSchema.safeParse(parseJson(response.body))
      if (parsed.success) {
        return { ok: true, personalAccount: parsed.data }
      }
    } catch {
      // Fall through to the controlled function error below.
    }

    return {
      ok: false,
      code: 'function_error',
      message: 'The Personal Account Function returned an unexpected body.',
    }
  }

  if (response.statusCode === 404 && response.method === 'GET') {
    return {
      ok: false,
      code: 'needs_onboarding',
      message: 'The signed-in user has no personal account yet.',
    }
  }

  if (response.statusCode === 401) {
    return errorFromBody(
      {
        ok: false,
        code: 'invalid_session',
        message: 'The Appwrite session is not authorized for this request.',
      },
      response.body,
    )
  }

  if (response.statusCode === 400) {
    return errorFromBody(
      {
        ok: false,
        code: 'invalid_request',
        message: 'The Personal Account request is invalid.',
      },
      response.body,
    )
  }

  if (response.statusCode === 409) {
    return errorFromBody(
      {
        ok: false,
        code: 'conflict',
        message: 'The Personal Account request conflicts with existing data.',
      },
      response.body,
    )
  }

  return errorFromBody(
    {
      ok: false,
      code: 'function_error',
      message: 'The Personal Account Function is unavailable.',
    },
    response.body,
  )
}
