import { createClient } from 'genlayer-js'
import { studionet } from 'genlayer-js/chains'
import { TransactionStatus } from 'genlayer-js/types'
import { CONTRACT_ADDRESS, STUDIONET } from '@/config/chains'
import { parseJson } from './format'
import type { Engagement, Packet } from './types'

type Addr = `0x${string}`
const contract = () => {
  if (!CONTRACT_ADDRESS) throw new Error('The contract is not deployed yet. Set CONTRACT_ADDRESS in src/config/chains.ts.')
  return CONTRACT_ADDRESS as Addr
}
export const deployed = () => CONTRACT_ADDRESS !== ''

const readClient = () => createClient({ chain: studionet })

export function friendly(e: unknown): string {
  const m = e instanceof Error ? e.message : String(e)
  if (/429|-32429|rate/i.test(m)) return 'StudioNet is rate-limiting this connection. Wait a minute, then retry.'
  if (/-32028|in-flight/i.test(m)) return 'Too many transactions are pending for this wallet. Wait for them to finish.'
  if (/user rejected|denied|4001/i.test(m)) return 'The wallet request was rejected.'
  return m
}

export async function readContract(opts: { functionName: string; args?: unknown[] }): Promise<unknown> {
  const raw = await readClient().readContract({ address: contract(), functionName: opts.functionName, args: (opts.args ?? []) as never })
  return parseJson<unknown>(raw)
}
export const getEngagement = async (id: string) => (await readContract({ functionName: 'get_engagement', args: [id] })) as Engagement
export const getPacket = async (id: string, rev: number) => (await readContract({ functionName: 'get_packet', args: [id, BigInt(rev)] })) as Packet
export const getIds = async (offset: number, limit: number) => (await readContract({ functionName: 'get_engagement_ids', args: [BigInt(offset), BigInt(limit)] })) as { total: number; offset: number; ids: string[] }

export async function ensureChain(): Promise<void> {
  const eth = window.ethereum
  if (!eth) throw new Error('No wallet found. Install a browser wallet such as MetaMask.')
  try {
    await eth.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: STUDIONET.idHex }] })
  } catch (err) {
    const code = (err as { code?: number }).code
    if (code === 4902) {
      await eth.request({
        method: 'wallet_addEthereumChain',
        params: [{ chainId: STUDIONET.idHex, chainName: STUDIONET.name, rpcUrls: [STUDIONET.rpcUrl], nativeCurrency: { name: 'GEN', symbol: 'GEN', decimals: 18 }, blockExplorerUrls: [STUDIONET.explorerBase] }],
      })
      await eth.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: STUDIONET.idHex }] })
    } else if (code === -32002) {
      await new Promise((r) => setTimeout(r, 3000))
    } else throw err
  }
}

export class TimeoutError extends Error {
  txHash: string
  isTimeout = true
  constructor(hash: string) {
    super(`Consensus is taking longer than expected. The transaction was submitted; check it directly: ${STUDIONET.explorerBase}/transactions/${hash}`)
    this.txHash = hash
  }
}

export interface TxOutcome { hash: string; status: string; execution: string; ok: boolean }

export async function writeContract(opts: { functionName: string; args: unknown[]; account: string; value?: bigint }): Promise<TxOutcome> {
  const { functionName, args, account, value = 0n } = opts
  await ensureChain()
  const client = createClient({ chain: studionet, account: account as Addr, provider: window.ethereum as never })
  const hash = await client.writeContract({ address: contract(), functionName, args: args as never, value })
  let receipt: unknown
  try {
    receipt = await client.waitForTransactionReceipt({ hash, status: TransactionStatus.ACCEPTED, retries: 120, interval: 4000 })
  } catch {
    throw new TimeoutError(hash)
  }
  const r = receipt as { statusName?: string; txExecutionResultName?: string }
  const status = r.statusName ?? 'UNKNOWN'
  const execution = r.txExecutionResultName ?? 'UNKNOWN'
  // ACCEPTED is not success: the committee can agree on an execution error. Success needs FINISHED_WITH_RETURN.
  const ok = (status === 'ACCEPTED' || status === 'FINALIZED') && execution === 'FINISHED_WITH_RETURN'
  return { hash, status, execution, ok }
}
