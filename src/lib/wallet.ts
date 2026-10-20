import { useCallback, useEffect, useState } from 'react'
import { ensureChain } from './chain'

export function useWallet() {
  const [account, setAccount] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const eth = window.ethereum
    if (!eth) return
    eth.request({ method: 'eth_accounts' }).then((a) => { const l = a as string[]; if (l[0]) setAccount(l[0]) }).catch(() => {})
    const onChange = (a: string[]) => setAccount(a[0] || null)
    eth.on?.('accountsChanged', onChange as never)
    return () => eth.removeListener?.('accountsChanged', onChange as never)
  }, [])

  const connect = useCallback(async () => {
    setError(null)
    try {
      if (!window.ethereum) throw new Error('No wallet found. Install a browser wallet such as MetaMask.')
      const a = (await window.ethereum.request({ method: 'eth_requestAccounts' })) as string[]
      await ensureChain()
      setAccount(a[0] ?? null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not connect')
    }
  }, [])

  return { account, connect, error }
}
