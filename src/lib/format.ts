import { STUDIONET } from '@/config/chains'

export const short = (a: string) => (a && a.length > 12 ? `${a.slice(0, 6)}…${a.slice(-4)}` : a)
export const same = (a?: string | null, b?: string | null) => !!a && !!b && a.toLowerCase() === b.toLowerCase()
export const txUrl = (h: string) => `${STUDIONET.explorerBase}/transactions/${h}`
export const addrUrl = (a: string) => `${STUDIONET.explorerBase}/address/${a}`
export const fmtEpoch = (s: number) => (s > 0 ? new Date(s * 1000).toISOString().replace('.000Z', 'Z') : 'n/a')
export const rawUrl = (d: { repo: string; commit: string; path: string }) => `https://raw.githubusercontent.com/${d.repo}/${d.commit}/${d.path}`
export const nowEpoch = () => Math.floor(Date.now() / 1000)

/** Largest escrow the contract accepts (10^24 wei). Amounts are handled as strings/BigInt end to end. */
export const MAX_AMOUNT = 10n ** 24n
export function validAmount(text: string): boolean {
  if (!/^\d+$/.test(text)) return false
  const v = BigInt(text)
  return v >= 1n && v <= MAX_AMOUNT
}

export function parseJson<T>(raw: unknown): T {
  if (typeof raw === 'string') return JSON.parse(raw) as T
  throw new Error('Unexpected contract response')
}
