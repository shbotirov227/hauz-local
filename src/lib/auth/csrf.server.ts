import { getRequestHeader } from '@tanstack/react-start/server'

import type { AuthError } from './types'

function requestHost(): string | null {
  const host = getRequestHeader('host')
  if (!host) {
    return null
  }

  try {
    const url = new URL(`http://${host}`)
    return url.host === host ? url.host : null
  } catch {
    return null
  }
}

function headerOriginHost(headerName: 'origin' | 'referer'): string | null {
  const value = getRequestHeader(headerName)
  if (!value) {
    return null
  }

  try {
    const url = new URL(value)
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      return null
    }

    return url.host
  } catch {
    return null
  }
}

export function assertSameOriginMutation(): AuthError | null {
  const expected = requestHost()
  const origin = getRequestHeader('origin')
  const actual = origin
    ? headerOriginHost('origin')
    : headerOriginHost('referer')

  if (expected && actual === expected) {
    return null
  }

  return {
    ok: false,
    code: 'csrf_failed',
    message: 'This request could not be verified as same-origin.',
  }
}
