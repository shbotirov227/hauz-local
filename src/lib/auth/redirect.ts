const FALLBACK_RETURN_PATH = '/'

export function normalizeReturnPath(value: unknown): string {
  if (typeof value !== 'string') {
    return FALLBACK_RETURN_PATH
  }

  if (!value || value[0] !== '/' || value.startsWith('//')) {
    return FALLBACK_RETURN_PATH
  }

  if (value.includes('\\') || /[\u0000-\u001f\u007f]/u.test(value)) {
    return FALLBACK_RETURN_PATH
  }

  try {
    const decoded = decodeURI(value)
    if (decoded.includes('\\') || /[\u0000-\u001f\u007f]/u.test(decoded)) {
      return FALLBACK_RETURN_PATH
    }
  } catch {
    return FALLBACK_RETURN_PATH
  }

  try {
    const parsed = new URL(value, 'https://hauz.local')
    if (parsed.origin !== 'https://hauz.local') {
      return FALLBACK_RETURN_PATH
    }

    return `${parsed.pathname}${parsed.search}${parsed.hash}`
  } catch {
    return FALLBACK_RETURN_PATH
  }
}
