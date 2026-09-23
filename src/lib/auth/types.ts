export type CurrentUser = {
  id: string
  email: string
  name: string
  emailVerification: boolean
}

export const PERSONAL_ROLES = ['property_owner', 'realtor'] as const

export type PersonalRole = (typeof PERSONAL_ROLES)[number]

export type PersonalAccount = {
  personalAccountId: string
  firstName: string
  lastName: string
  role: PersonalRole
  contactEmail: string | null
  bio: string | null
  createdAt: string
  updatedAt: string
}

export type ValidationIssue = {
  field: string
  message: string
}

export type AuthErrorCode =
  | 'invalid_request'
  | 'csrf_failed'
  | 'appwrite_error'
  | 'invalid_session'
  | 'needs_onboarding'
  | 'conflict'
  | 'function_error'

export type AuthError = {
  ok: false
  code: AuthErrorCode
  message: string
  issues?: Array<ValidationIssue>
}

export type AuthSuccess<T> = {
  ok: true
} & T

export type AuthResult<T> = AuthSuccess<T> | AuthError

export type CurrentAuth =
  | {
      status: 'signed_out'
      user: null
      personalAccount: null
    }
  | {
      status: 'needs_onboarding'
      user: CurrentUser
      personalAccount: null
    }
  | {
      status: 'signed_in'
      user: CurrentUser
      personalAccount: PersonalAccount
    }
  | {
      status: 'error'
      user: CurrentUser | null
      personalAccount: null
      error: AuthError
    }
