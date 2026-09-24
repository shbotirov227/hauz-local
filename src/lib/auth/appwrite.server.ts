import {
  Account,
  AppwriteException,
  Client,
  ExecutionMethod,
  Functions,
  ID,
  type Models,
} from 'node-appwrite'

import {
  classifyPersonalAccountExecution,
  type PersonalAccountCreateInput,
  type PersonalAccountMethod,
  type PersonalAccountPatchInput,
} from './function-client'
import { getServerEnv, ServerConfigurationError } from './env.server'
import type { AuthError, AuthResult, CurrentUser, PersonalAccount } from './types'

type AppwriteErrorOptions = {
  operation: string
  invalidSessionOnUnauthorized?: boolean
}

function baseClient(): Client {
  const env = getServerEnv()
  return new Client().setEndpoint(env.endpoint).setProject(env.projectId)
}

function privilegedAccount(): Account {
  const env = getServerEnv()
  return new Account(baseClient().setKey(env.apiKey))
}

function sessionClient(sessionSecret: string): Client {
  return baseClient().setSession(sessionSecret)
}

function toCurrentUser(user: Models.User<Models.Preferences>): CurrentUser {
  return {
    id: user.$id,
    email: user.email,
    name: user.name,
    emailVerification: user.emailVerification,
  }
}

export function mapAppwriteError(
  error: unknown,
  message = 'Appwrite rejected the request.',
  options: AppwriteErrorOptions = { operation: 'appwrite_request' },
): AuthError {
  const diagnostic =
    error instanceof AppwriteException
      ? { status: error.code, code: error.type || 'unknown' }
      : error instanceof ServerConfigurationError
        ? { status: 0, code: 'server_configuration_missing' }
        : { status: 0, code: 'non_appwrite_error' }

  if (process.env.NODE_ENV === 'development') {
    console.error('[appwrite]', { operation: options.operation, ...diagnostic })
  }

  if (error instanceof ServerConfigurationError) {
    return {
      ok: false,
      code: 'appwrite_error',
      message:
        'Email sign-in is not configured on this server. Add the required Appwrite settings to .env and restart the server.',
    }
  }

  if (error instanceof AppwriteException) {
    const invalidSession =
      options.invalidSessionOnUnauthorized && error.code === 401

    let safeMessage = message
    if (options.operation === 'create_email_token') {
      if (error.code === 400) {
        safeMessage =
          'Appwrite rejected the email address. Check it carefully and try again.'
      } else if (error.code === 401 || error.code === 403) {
        safeMessage =
          'Email sign-in is not configured correctly. Check the Appwrite API key and its required scopes.'
      } else if (error.code === 404) {
        safeMessage =
          'The configured Appwrite project could not be found. Check the endpoint and project ID.'
      } else if (error.code === 429) {
        safeMessage =
          'Too many email code requests. Wait a moment before trying again.'
      } else if (error.code >= 500) {
        safeMessage =
          'The email service is temporarily unavailable. Please try again.'
      }
    }

    return {
      ok: false,
      code: invalidSession ? 'invalid_session' : 'appwrite_error',
      message: safeMessage,
    }
  }

  return {
    ok: false,
    code: 'appwrite_error',
    message:
      options.operation === 'create_email_token'
        ? 'The authentication service could not be reached. Please try again.'
        : message,
  }
}

export async function createEmailOtp(email: string): Promise<
  AuthResult<{
    userId: string
    expire: string
    phrase: string | null
  }>
> {
  try {
    const token = await privilegedAccount().createEmailToken({
      userId: ID.unique(),
      email,
      phrase: false,
    })

    return {
      ok: true,
      userId: token.userId,
      expire: token.expire,
      phrase: token.phrase || null,
    }
  } catch (error) {
    return mapAppwriteError(error, 'Unable to send an email code.', {
      operation: 'create_email_token',
    })
  }
}

export async function createSessionFromOtp(
  userId: string,
  secret: string,
): Promise<AuthResult<{ sessionSecret: string; expire: string }>> {
  try {
    const session = await privilegedAccount().createSession({ userId, secret })

    if (!session.secret) {
      return {
        ok: false,
        code: 'appwrite_error',
        message: 'Appwrite did not return a session secret.',
      }
    }

    return {
      ok: true,
      sessionSecret: session.secret,
      expire: session.expire,
    }
  } catch (error) {
    return mapAppwriteError(error, 'Unable to verify that email code.', {
      operation: 'create_session_from_otp',
    })
  }
}

export async function getCurrentUser(
  sessionSecret: string,
): Promise<AuthResult<{ user: CurrentUser }>> {
  try {
    const user = await new Account(sessionClient(sessionSecret)).get()
    return { ok: true, user: toCurrentUser(user) }
  } catch (error) {
    return mapAppwriteError(error, 'Unable to load the current user.', {
      operation: 'get_current_user',
      invalidSessionOnUnauthorized: true,
    })
  }
}

async function executePersonalAccount(
  sessionSecret: string,
  method: PersonalAccountMethod,
  body?: PersonalAccountCreateInput | PersonalAccountPatchInput,
): Promise<AuthResult<{ personalAccount: PersonalAccount }>> {
  try {
    const env = getServerEnv()
    const functions = new Functions(sessionClient(sessionSecret))
    const execution = await functions.createExecution({
      functionId: env.functionId,
      body: body ? JSON.stringify(body) : '',
      async: false,
      xpath: '/personal-account',
      method: ExecutionMethod[method],
      headers: body ? { 'content-type': 'application/json' } : {},
    })

    return classifyPersonalAccountExecution({
      method,
      statusCode: execution.responseStatusCode,
      body: execution.responseBody,
    })
  } catch (error) {
    return mapAppwriteError(
      error,
      'Unable to execute the Personal Account Function.',
      {
        operation: 'execute_personal_account',
        invalidSessionOnUnauthorized: true,
      },
    )
  }
}

export function getPersonalAccount(sessionSecret: string) {
  return executePersonalAccount(sessionSecret, 'GET')
}

export function createPersonalAccount(
  sessionSecret: string,
  body: PersonalAccountCreateInput,
) {
  return executePersonalAccount(sessionSecret, 'POST', body)
}

export function updatePersonalAccount(
  sessionSecret: string,
  body: PersonalAccountPatchInput,
) {
  return executePersonalAccount(sessionSecret, 'PATCH', body)
}

export async function deleteCurrentSession(sessionSecret: string): Promise<void> {
  try {
    await new Account(sessionClient(sessionSecret)).deleteSession({
      sessionId: 'current',
    })
  } catch (error) {
    const mapped = mapAppwriteError(error, 'Unable to delete the session.', {
      operation: 'delete_current_session',
      invalidSessionOnUnauthorized: true,
    })
    if (mapped.code !== 'invalid_session') {
      throw error
    }
  }
}
