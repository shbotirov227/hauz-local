import {
  deleteCookie,
  getCookie,
  setCookie,
} from '@tanstack/react-start/server'

import { getServerEnv } from './env.server'

export const SESSION_COOKIE_NAME = '__hauz_appwrite_session'
export const PENDING_OTP_COOKIE_NAME = '__hauz_pending_otp_user'

function sessionCookieOptions(expires?: Date) {
  const env = getServerEnv()

  return {
    httpOnly: true,
    secure: env.nodeEnv === 'production',
    sameSite: 'lax' as const,
    path: '/',
    ...(expires ? { expires } : {}),
  }
}

function parseFutureExpiry(expireIso: string): Date | null {
  const expires = new Date(expireIso)
  if (!Number.isFinite(expires.getTime()) || expires.getTime() <= Date.now()) {
    return null
  }

  return expires
}

export function readSessionSecret(): string | null {
  return getCookie(SESSION_COOKIE_NAME) ?? null
}

export function writeSessionSecret(secret: string, expireIso: string): boolean {
  const expires = parseFutureExpiry(expireIso)
  if (!expires) {
    return false
  }

  setCookie(SESSION_COOKIE_NAME, secret, sessionCookieOptions(expires))
  return true
}

export function clearSessionSecret(): void {
  deleteCookie(SESSION_COOKIE_NAME, sessionCookieOptions())
}

export function readPendingOtpUserId(): string | null {
  return getCookie(PENDING_OTP_COOKIE_NAME) ?? null
}

export function writePendingOtpUserId(userId: string, expireIso: string): boolean {
  const expires = parseFutureExpiry(expireIso)
  if (!expires) {
    return false
  }

  setCookie(PENDING_OTP_COOKIE_NAME, userId, sessionCookieOptions(expires))
  return true
}

export function clearPendingOtpUserId(): void {
  deleteCookie(PENDING_OTP_COOKIE_NAME, sessionCookieOptions())
}
