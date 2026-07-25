const sensitiveKeys = /password|passwordHash|password_hash|token|authorization|secret/i

export function maskSensitive(value) {
  if (Array.isArray(value)) return value.map(maskSensitive)
  if (!value || typeof value !== 'object') return value
  return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, sensitiveKeys.test(key) ? '******' : maskSensitive(item)]))
}

export function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for']
  return (Array.isArray(forwarded) ? forwarded[0] : forwarded?.split(',')[0])?.trim() || req.ip || req.socket?.remoteAddress || ''
}

export function parseUserAgent(userAgent = '') {
  const browser = /Edg\//.test(userAgent) ? 'Edge' : /Chrome\//.test(userAgent) ? 'Chrome' : /Firefox\//.test(userAgent) ? 'Firefox' : /Safari\//.test(userAgent) ? 'Safari' : 'Unknown'
  const os = /Windows NT/.test(userAgent) ? 'Windows' : /Mac OS X/.test(userAgent) ? 'macOS' : /Linux/.test(userAgent) ? 'Linux' : /Android/.test(userAgent) ? 'Android' : /iPhone|iPad/.test(userAgent) ? 'iOS' : 'Unknown'
  return { browser, os }
}
