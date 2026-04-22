import { useState } from 'react'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import 'dayjs/locale/en'

dayjs.extend(relativeTime)
dayjs.locale('en')

const TOKEN_KEY = 'seki_api_token'

interface JWTPayload {
  exp?: number
  iat?: number
  [key: string]: unknown
}

/**
 * Decodes a JWT token without verification (for exp check only)
 */
function decodeJWT(token: string): JWTPayload | null {
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
function isTokenExpired(token: string): boolean {
  const payload = decodeJWT(token)
  if (!payload || !payload.exp) return false

  const now = Math.floor(Date.now() / 1000)
  return payload.exp < now
}

/**
 * Gets formatted expiration date from token
 */
function getExpirationDate(token: string): string | null {
  const payload = decodeJWT(token)
  if (!payload || !payload.exp) return null

  const expDate = dayjs.unix(payload.exp)
  const now = dayjs()

  if (expDate.isBefore(now)) {
    return `Auth Token expiration: ${expDate.from(now)}`
  }

  return `Auth Token expiration: ${expDate.from(now)}`
}

/**
 * Hook to manage Seki API token in localStorage
 * Handles token storage, expiration check, and provides fallback to env token
 */
export function useToken() {
  const [token, setTokenState] = useState<string | null>(() => {
    const storedToken = localStorage.getItem(TOKEN_KEY)
    if (storedToken && !isTokenExpired(storedToken)) {
      return storedToken
    }
    return null
  })
  const [isExpired, setIsExpired] = useState(() => {
    const storedToken = localStorage.getItem(TOKEN_KEY)
    return storedToken ? isTokenExpired(storedToken) : false
  })
  const [expirationDate, setExpirationDate] = useState<string | null>(() => {
    const storedToken = localStorage.getItem(TOKEN_KEY)
    if (storedToken) {
      const exp = getExpirationDate(storedToken)
      return exp || 'Token has no expiration date'
    }
    return null
  })

  const saveToken = (newToken: string) => {
    localStorage.setItem(TOKEN_KEY, newToken)
    const expired = isTokenExpired(newToken)
    setIsExpired(expired)
    setTokenState(expired ? null : newToken)
    const exp = getExpirationDate(newToken)
    setExpirationDate(exp || 'Token has no expiration date')
  }

  const clearToken = () => {
    localStorage.removeItem(TOKEN_KEY)
    setTokenState(null)
    setIsExpired(false)
    setExpirationDate(null)
  }

  // Get effective token (localStorage first, then fallback to env)
  const effectiveToken = token || import.meta.env.VITE_SEKI_API_TOKEN || ''

  return {
    token: effectiveToken,
    hasStoredToken: !!token,
    isExpired,
    expirationDate,
    saveToken,
    clearToken,
    needsToken: !token && !import.meta.env.VITE_SEKI_API_TOKEN,
  }
}
