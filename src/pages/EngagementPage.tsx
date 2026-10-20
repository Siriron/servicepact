import { useCallback, useEffect, useState } from 'react'
import { Card, Chip, Notice, Pending, Spinner, TxLog, Field } from '@/components/Bits'
import { ManifestEditor } from '@/components/ManifestEditor'
import { deployed, friendly, getEngagement, getPacket } from '@/lib/chain'
import { addrUrl, fmtEpoch, nowEpoch, rawUrl, same, short } from '@/lib/format'
import { CRITERION_IDS, CRITERION_LABEL } from '@/lib/types'
import type { DocRef, Engagement, Packet } from '@/lib/types'
import { useActions } from '@/lib/useActions'

const blank = (): DocRef[] => [{ document_id: 'work1', repo: '', commit: '', path: '' }]

function DocList({ title, docs }: { title: string; docs: DocRef[] }) {
  return (
    <div style={{ marginBottom: 8 }}>
      <strong style={{ fontSize: 13 }}>{title}</strong>
      <ul style={{ margin: '4px 0 0', paddingLeft: 18, fontSize: 13 }}>
        {docs.map((d) => <li key={d.document_id}><span className="mono">{d.document_id}</span>: <a className="link" href={rawUrl(d)} target="_blank" rel="noreferrer">{d.repo}@{d.commit.slice(0, 8)}/{d.path}</a></li>)}
      </ul>
    </div>
  )
}

export function EngagementPage({ id, account }: { id: string; account: string | null }) {
  const [eng, setEng] = useState<Engagement | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [work, setWork] = useState<DocRef[]>(blank())
  const [packets, setPackets] = useState<Packet[] | null>(null)
  const act = useActions(account)

  const load = useCallback(async () => {
    setLoading(true); setErr(null)
    try { setEng(await getEngagement(id)) } catch (e) { setErr(friendly(e)); setEng(null) } finally { setLoading(false) }
  }, [id])
  useEffect(() => { if (deployed()) void load(); else setLoading(false) }, [load])

  const writeContract = async (o: { label: string; functionName: string; args: unknown[]; value?: bigint }) => { if (await act.writeContract(o)) await load() }

  if (!deployed()) return <Notice kind="warn">The contract is not deployed yet, so engagements cannot be read.</Notice>
  if (loading && !eng) return <Spinner label="Loading engagement" />
  if (err || !eng) return <Notice kind="error">{err ?? 'Engagement not found.'}</Notice>

  const isClient = same(account, eng.client)
  const isContractor = same(account, eng.contractor)
  const now = nowEpoch()
  const canReclaim = isClient && (eng.state === 'FUNDED' || eng.state === 'REJECTED'
    || (eng.state === 'OPEN' && eng.revision === 0 && now > eng.deadline_epoch)
    || (eng.state === 'STALLED' && (eng.revision > eng.max_repairs || now > eng.stalled_at + eng.resubmit_window_seconds)))
  const canResubmit = isContractor && eng.state === 'STALLED' && eng.revision <= eng.max_repairs && now <= eng.stalled_at + eng.resubmit_window_seconds
  const adj = eng.adjudication

  return (
    <div>
      <Card title={`Engagement ${eng.engagement_id}`} right={<><Chip v={eng.state} /> <button className="btn btn-ghost" onClick={() => void load()} disabled={loading}>Refresh</button></>}>
        <p style={{ margin: 0, fontSize: 14 }}>
          Amount <strong>{eng.amount}</strong> (wei of GEN) · deadline <span className="mono">{eng.deadline_iso}</span> · revision {eng.revision}/{eng.max_repairs + 1}
        </p>
        <p style={{ margin: '6px 0 0', fontSize: 13, color: 'var(--muted)' }}>
          Client <a className="link mono" href={addrUrl(eng.client)} target="_blank" rel="noreferrer">{short(eng.client)}</a>{isClient && ' (you)'} · Contractor <a className="link mono" href={addrUrl(eng.contractor)} target="_blank" rel="noreferrer">{short(eng.contractor)}</a>{isContractor && ' (you)'}
        </p>
        {eng.state === 'RELEASED' && <p style={{ fontSize: 13 }}>Released to the contractor ({eng.contractor_receipt}). Payouts land only after finalization.</p>}
        {eng.state === 'RECLAIMED' && <p style={{ fontSize: 13 }}>Returned to the client ({eng.client_receipt}). Payouts land only after finalization.</p>}
      </Card>

      <Card title="Locked documents and criteria">
        <DocList title="Statement of work (client)" docs={eng.sow} />
        <DocList title="Acceptance checklist (client)" docs={eng.checklist} />
        <ul style={{ paddingLeft: 18, fontSize: 13, margin: '8px 0' }}>
          {CRITERION_IDS.map((c) => <li key={c}><strong>{CRITERION_LABEL[c]}:</strong> {eng.criteria[c]}</li>)}
        </ul>
        <Notice kind="info">The work product must contain both markers, exactly: <code className="mono">{eng.markers.engagement}</code> and <code className="mono">{eng.markers.contractor}</code></Notice>
      </Card>

      {adj.criteria && (
        <Card title={`Adjudication (revision ${adj.revision ?? eng.revision}): ${adj.outcome}`}>
          <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
            <tbody>
              {adj.criteria.map((c) => (
                <tr key={c.criterion_id} style={{ borderTop: '1px solid var(--border)' }}>
                  <td style={{ padding: '6px 0' }}>{CRITERION_LABEL[c.criterion_id]}</td>
                  <td><Chip v={c.status} /></td>
                  <td style={{ color: 'var(--muted)' }}>{c.observed_fact}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {adj.reasoning && <p style={{ fontSize: 13, color: 'var(--muted)' }}>Audit note: {adj.reasoning}</p>}
          {adj.outcome && <p style={{ fontSize: 12, color: 'var(--subtle)' }}>Provisional until finalized: the verdict stays appealable until the transaction is finalized.</p>}
        </Card>
      )}

      <Card title="Actions">
        {!account && <Notice kind="info">Connect a wallet to act on this engagement.</Notice>}
        {act.error && <Notice kind="error">{act.error}</Notice>}
        <Pending action={act.busy} />
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {isClient && eng.state === 'DRAFT' && <button className="btn btn-primary" disabled={!!act.busy} onClick={() => void writeContract({ label: 'Fund', functionName: 'fund_engagement', args: [eng.engagement_id], value: BigInt(eng.amount) })}>Fund {eng.amount}</button>}
          {isClient && eng.state === 'FUNDED' && <button className="btn btn-primary" disabled={!!act.busy} onClick={() => void writeContract({ label: 'Open', functionName: 'open_engagement', args: [eng.engagement_id] })}>Open for delivery</button>}
          {eng.state === 'SUBMITTED' && <button className="btn btn-primary" disabled={!!act.busy || !account} onClick={() => void writeContract({ label: 'Adjudicate', functionName: 'adjudicate_engagement', args: [eng.engagement_id] })}>Adjudicate (anyone)</button>}
          {isContractor && eng.state === 'DELIVERED' && <button className="btn btn-primary" disabled={!!act.busy} onClick={() => void writeContract({ label: 'Release payment', functionName: 'release_payment', args: [eng.engagement_id] })}>Release payment</button>}
          {canReclaim && <button className="btn btn-danger" disabled={!!act.busy} onClick={() => void writeContract({ label: 'Reclaim funds', functionName: 'reclaim_funds', args: [eng.engagement_id] })}>Reclaim funds</button>}
        </div>
        {eng.state === 'OPEN' && isClient && eng.revision === 0 && now <= eng.deadline_epoch && <p style={{ fontSize: 13, color: 'var(--muted)' }}>Reclaiming opens after the deadline if the contractor never delivers.</p>}
        {eng.state === 'STALLED' && isClient && !canReclaim && <p style={{ fontSize: 13, color: 'var(--muted)' }}>The contractor can still repair until {fmtEpoch(eng.stalled_at + eng.resubmit_window_seconds)} or until the repair budget runs out.</p>}

        {((isContractor && eng.state === 'OPEN' && eng.revision === 0) || canResubmit) && (
          <div style={{ marginTop: 14 }}>
            <Field label={canResubmit ? 'Resubmit work product (commit-pinned files)' : 'Submit work product (commit-pinned files)'} hint="Each file must be pushed to a public GitHub repo and contain both markers above. Use the full 40-character commit SHA.">
              <ManifestEditor docs={work} onChange={setWork} max={4} prefix="work" />
            </Field>
            {canResubmit
              ? <button className="btn btn-primary" disabled={!!act.busy} onClick={() => void writeContract({ label: 'Resubmit', functionName: 'resubmit_delivery', args: [eng.engagement_id, JSON.stringify(work)] })}>Resubmit</button>
              : <button className="btn btn-primary" disabled={!!act.busy} onClick={() => void writeContract({ label: 'Submit delivery', functionName: 'submit_delivery', args: [eng.engagement_id, JSON.stringify(work)] })}>Submit delivery</button>}
          </div>
        )}
      </Card>

      {eng.revision > 0 && (
        <Card title="Delivery history" right={<button className="btn btn-ghost" onClick={() => { Promise.all(Array.from({ length: eng.revision }, (_, i) => getPacket(eng.engagement_id, i + 1))).then(setPackets).catch((e) => setErr(friendly(e))) }}>{packets ? 'Reload' : 'Show'}</button>}>
          {!packets && <p style={{ fontSize: 13, color: 'var(--muted)', margin: 0 }}>{eng.revision} revision(s) submitted.</p>}
          {packets?.map((p) => (
            <div key={p.revision} style={{ marginBottom: 8 }}>
              <strong style={{ fontSize: 13 }}>Revision {p.revision}</strong> <Chip v={p.state} /> <span style={{ fontSize: 12, color: 'var(--muted)' }}>submitted {fmtEpoch(p.submitted_at)}</span>
              <DocList title="Work product" docs={p.work} />
            </div>
          ))}
        </Card>
      )}

      <Card title="Transaction log"><TxLog log={act.log} /></Card>
    </div>
  )
}
