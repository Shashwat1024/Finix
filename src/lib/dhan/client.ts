import { DhanHolding, DhanTransaction } from '@/types'

const DHAN_BASE_URL = 'https://api.dhan.co'

// DHAN error codes that mean "no data" — treat as empty, not errors
const EMPTY_DATA_CODES = new Set([
  'DH-1111', // No holdings available
  'DH-1112', // No positions available
  'DH-1113', // No orders available
  'DH-1114', // No trades available
])

interface DhanErrorResponse {
  errorType?: string
  errorCode?: string
  errorMessage?: string
}

class DhanApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    public readonly dhanMessage: string
  ) {
    super(`[${code}] ${dhanMessage}`)
    this.name = 'DhanApiError'
  }
}

function extractClientId(token: string): string {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return ''
    // base64url → base64
    const payload = parts[1].replace(/-/g, '+').replace(/_/g, '/')
    const decoded = JSON.parse(Buffer.from(payload, 'base64').toString('utf-8'))
    // DHAN uses different claim names depending on token version
    return (
      decoded.dhanClientId ??
      decoded.clientId ??
      decoded.client_id ??
      decoded.sub ??
      ''
    )
  } catch {
    return ''
  }
}

export class DhanClient {
  private token: string
  readonly clientId: string

  constructor(token: string) {
    this.token = token.trim()
    this.clientId = extractClientId(this.token)
  }

  private async request<T>(path: string, options?: RequestInit): Promise<T | null> {
    const res = await fetch(`${DHAN_BASE_URL}${path}`, {
      ...options,
      headers: {
        'access-token': this.token,
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    })

    const text = await res.text()

    if (!res.ok) {
      let parsed: DhanErrorResponse = {}
      try { parsed = JSON.parse(text) } catch {}

      const code = parsed.errorCode ?? `HTTP_${res.status}`
      const msg = parsed.errorMessage ?? text

      // Treat known "no data" codes as null (caller converts to [])
      if (EMPTY_DATA_CODES.has(code)) return null

      throw new DhanApiError(res.status, code, msg)
    }

    if (!text) return null
    return JSON.parse(text) as T
  }

  async getHoldings(): Promise<DhanHolding[]> {
    const data = await this.request<DhanHolding[] | { data: DhanHolding[] }>('/v2/holdings')
    if (data === null) return []
    return Array.isArray(data) ? data : (data.data ?? [])
  }

  async getLedger(fromDate: string, toDate: string): Promise<DhanTransaction[]> {
    if (!this.clientId) {
      throw new Error(
        'Could not extract clientId from DHAN token. ' +
        'Paste the full JWT access token from DHAN → My Profile → Access Token (starts with eyJ…).'
      )
    }

    // DHAN has used both "clientId" and "customerId" across API versions — try both
    const body = JSON.stringify({ clientId: this.clientId, customerId: this.clientId, fromDate, toDate })
    const data = await this.request<DhanTransaction[] | { data: DhanTransaction[] }>('/v2/ledger', {
      method: 'POST',
      body,
    })
    if (data === null) return []
    return Array.isArray(data) ? data : (data.data ?? [])
  }

  async getQuote(securityId: string): Promise<{ ltp: number }> {
    const data = await this.request<unknown>('/v2/marketfeed/ltp', {
      method: 'POST',
      body: JSON.stringify({ NSE_EQ: [securityId] }),
    })
    const d = data as { data?: { NSE_EQ?: Record<string, { last_price: number }> } } | null
    return { ltp: d?.data?.NSE_EQ?.[securityId]?.last_price ?? 0 }
  }
}

export function createDhanClient(encryptedToken: string): DhanClient {
  return new DhanClient(decryptToken(encryptedToken))
}

function decryptToken(encrypted: string): string {
  return Buffer.from(encrypted, 'base64').toString('utf-8')
}

export function encryptToken(plainToken: string): string {
  return Buffer.from(plainToken, 'utf-8').toString('base64')
}
