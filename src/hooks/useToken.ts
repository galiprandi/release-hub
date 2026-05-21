import { useState } from 'react'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import 'dayjs/locale/es'

dayjs.extend(relativeTime)
dayjs.locale('es')

const SETTINGS_KEY = 'releasehub_settings'

interface JWTPayload {
  exp?: number
  iat?: number
  [key: string]: unknown
}

interface Settings {
  sekiToken: string | null
  discordWebhook: string | null
}

/**
 * Load settings from localStorage
 */
function loadSettings(): Settings {
  try {
    const stored = localStorage.getItem(SETTINGS_KEY)
    if (stored) {
      return JSON.parse(stored) as Settings
    }
  } catch {
    // If parsing fails, return default
  }
  return { sekiToken: null, discordWebhook: null }
}

/**
 * Decodes a JWT token without verification (for exp check only)
 */
export function decodeJWT(token: string): JWTPayload | null {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null

    const payload = parts[1]
    // Convert base64url to base64
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/')
    // Add padding if needed
    const paddedBase64 = base64.padEnd(base64.length + (4 - base64.length % 4) % 4, '=')
    
    // Decode base64 to binary string
    const binaryString = atob(paddedBase64)
    // Convert binary string to UTF-8
    const bytes = new Uint8Array(binaryString.length)
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i)
    }
    const decoded = new TextDecoder().decode(bytes)
    
    return JSON.parse(decoded) as JWTPayload
  } catch {
    return null
  }
}

/**
 * Checks if a JWT token is expired
 */
export function isTokenExpired(token: string): boolean {
  const payload = decodeJWT(token)
  if (!payload || !payload.exp) return false

  const now = Math.floor(Date.now() / 1000)
  return payload.exp < now
}

/**
 * Gets formatted expiration date from token
 */
export function getExpirationDate(token: string): string | null {
  const payload = decodeJWT(token)
  if (!payload || !payload.exp) return null

  const expDate = dayjs.unix(payload.exp)

  return expDate.fromNow()
}

/**
 * Hook to manage Seki API token in localStorage
 * Handles token storage and expiration check
 */
export function useToken() {
  const [token, setTokenState] = useState<string | null>(() => {
    const settings = loadSettings()
    if (settings.sekiToken && !isTokenExpired(settings.sekiToken)) {
      return settings.sekiToken
    }
    return null
  })
  const [isExpired, setIsExpired] = useState(() => {
    const settings = loadSettings()
    return settings.sekiToken ? isTokenExpired(settings.sekiToken) : false
  })
  const [expirationDate, setExpirationDate] = useState<string | null>(() => {
    const settings = loadSettings()
    if (settings.sekiToken) {
      const exp = getExpirationDate(settings.sekiToken)
      return exp || 'El token no tiene fecha de expiración'
    }
    return null
  })

  const saveToken = (newToken: string) => {
    const settings = loadSettings()
    const updated = { ...settings, sekiToken: newToken }
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(updated))
    const expired = isTokenExpired(newToken)
    setIsExpired(expired)
    setTokenState(expired ? null : newToken)
    const exp = getExpirationDate(newToken)
    setExpirationDate(exp || 'El token no tiene fecha de expiración')
  }

  const clearToken = () => {
    const settings = loadSettings()
    const updated = { ...settings, sekiToken: null }
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(updated))
    setTokenState(null)
    setIsExpired(false)
    setExpirationDate(null)
  }

  return {
    token: token || '',
    hasStoredToken: !!token,
    isExpired,
    expirationDate,
    saveToken,
    clearToken,
    needsToken: !token,
  }
}
