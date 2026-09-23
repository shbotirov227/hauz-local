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
import { getServerEnv } from './env.server'
import type { AuthError, AuthResult, CurrentUser, PersonalAccount } from './types'

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
): AuthError {
  if (error instanceof AppwriteException) {
    return {
      ok: false,
      code: error.code === 401 ? 'invalid_session' : 'appwrite_error',
      message,
    }
  }

  return {
    ok: false,
    code: 'appwrite_error',
    message,
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
    return mapAppwriteError(error, 'Unable to send an email code.')
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
    return mapAppwriteError(error, 'Unable to verify that email code.')
  }
}

export async function getCurrentUser(
  sessionSecret: string,
): Promise<AuthResult<{ user: CurrentUser }>> {
  try {
    const user = await new Account(sessionClient(sessionSecret)).get()
    return { ok: true, user: toCurrentUser(user) }
  } catch (error) {
    return mapAppwriteError(error, 'Unable to load the current user.')
  }
}

async function executePersonalAccount(
  sessionSecret: string,
  method: PersonalAccountMethod,
  body?: PersonalAccountCreateInput | PersonalAccountPatchInput,
): Promise<AuthResult<{ personalAccount: PersonalAccount }>> {
  const env = getServerEnv()
  const functions = new Functions(sessionClient(sessionSecret))

  try {
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
    return mapAppwriteError(error, 'Unable to execute the Personal Account Function.')
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
    const mapped = mapAppwriteError(error)
    if (mapped.code !== 'invalid_session') {
      throw error
    }
  }
}
