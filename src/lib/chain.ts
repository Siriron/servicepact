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

// A read of an engagement that does not exist reverts with "engagement not found"; the RPC layer surfaces it as "execution failed".
export const isNotFound = (e: unknown): boolean => /not found|execution failed/i.test(e instanceof Error ? e.message : String(e))

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

type Rec = Record<string, unknown>
const asRec = (v: unknown): Rec => (v && typeof v === 'object' ? (v as Rec) : {})

/**
 * genlayer-js 1.1.x on Studio returns a simplified receipt: statusName is renamed to `status_name`,
 * and the execution result is not under `txExecutionResultName` but in consensus_data.leader_receipt[0]
 * (`execution_result`, e.g. SUCCESS). Read all known shapes. ACCEPTED is not success, so an explicit
 * execution error fails; if the SDK reports no execution result at all, we do not call it a failure and
 * the callers re-read on-chain state, which is the source of truth.
 */
export function interpretReceipt(receipt: unknown): { status: string; execution: string; ok: boolean } {
  const r = asRec(receipt)
  const named = r.status_name ?? r.statusName
  const status = typeof named === 'string' ? named : typeof r.status === 'string' ? r.status : 'UNKNOWN'
  const consensus = asRec(r.consensus_data)
  const leader = Array.isArray(consensus.leader_receipt) ? asRec(consensus.leader_receipt[0]) : {}
  const raw = r.txExecutionResultName ?? leader.execution_result ?? asRec(leader.genvm_result).result_code
  const execution = typeof raw === 'string' && raw !== '' ? raw : 'UNKNOWN'
  const e = execution.toUpperCase()
  const failed = e.includes('ERROR')
  const undecided = /UNDETERMINED|TIMEOUT|CANCEL/i.test(status)   // own states, never treated as success
  return { status, execution, ok: !undecided && !failed }
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
  const { status, execution, ok } = interpretReceipt(receipt)
  return { hash, status, execution, ok }
}
