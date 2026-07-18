const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api'

export type LedgerRow = {
  id: number
  entry_date: string
  entry_type: 'charge' | 'payment'
  category: string
  payer: string
  amount: number
  fee: number | null
  balance: number
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, init)
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`${res.status} ${res.statusText}${text ? `: ${text}` : ''}`)
  }
  return res.json() as Promise<T>
}

export function triggerScrape() {
  return request<{ status: string }>('/trigger', { method: 'POST' })
}

export function getMonthCharges(year: number, month: number) {
  return request<{ entries: LedgerRow[] }>(`/charges/month?year=${year}&month=${month}`)
}

export function getAllCharges() {
  return request<{ entries: LedgerRow[] }>(`/charges/all`)
}
