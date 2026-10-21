import { useCallback, useState } from 'react'
import { friendly, writeContract as sendWrite, TimeoutError } from './chain'

export interface LogEntry { at: string; action: string; status: string; execution: string; hash: string; note: string }

export function useActions(account: string | null) {
  const [busy, setBusy] = useState<string | null>(null)
  const [log, setLog] = useState<LogEntry[]>([])
  const [error, setError] = useState<string | null>(null)

  const writeContract = useCallback(async (opts: { label: string; functionName: string; args: unknown[]; value?: bigint }): Promise<boolean> => {
    const { label: action, functionName: fn, args, value = 0n } = opts
    if (!account) { setError('Connect a wallet first.'); return false }
    setBusy(action); setError(null)
    const at = new Date().toISOString()
    try {
      const o = await sendWrite({ functionName: fn, args, account, value })
      setLog((l) => [{ at, action, status: o.status, execution: o.execution, hash: o.hash, note: !o.ok ? 'the execution did not succeed' : o.execution === 'UNKNOWN' ? 'accepted; the SDK reported no execution result, confirm via Refresh' : 'accepted (provisional until finalized)' }, ...l])
      if (!o.ok) setError(`${action}: the transaction was ${o.status} with execution result ${o.execution}. Nothing changed on-chain.`)
      return o.ok
    } catch (e) {
      const hash = e instanceof TimeoutError ? e.txHash : ''
      setLog((l) => [{ at, action, status: e instanceof TimeoutError ? 'TIMEOUT' : 'FAILED', execution: '-', hash, note: friendly(e) }, ...l])
      setError(friendly(e))
      return false
    } finally {
      setBusy(null)
    }
  }, [account])

  const clear = useCallback(() => { setLog([]); setError(null) }, [])
  return { busy, log, error, writeContract, clear, setError }
}
