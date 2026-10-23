import { useState } from 'react'
import { Card, Field, Notice, Pending, TxLog } from '@/components/Bits'
import { ManifestEditor } from '@/components/ManifestEditor'
import { deployed } from '@/lib/chain'
import { validAmount } from '@/lib/format'
import { navigate } from '@/lib/router'
import { CRITERION_IDS, CRITERION_LABEL, DEFAULT_CRITERIA } from '@/lib/types'
import type { CriterionId, DocRef } from '@/lib/types'
import { useActions } from '@/lib/useActions'

export function NewPage({ account }: { account: string | null }) {
  const [id, setId] = useState('')
  const [contractor, setContractor] = useState('')
  const [amount, setAmount] = useState('1')
  const [deadline, setDeadline] = useState('')
  const [repairs, setRepairs] = useState('1')
  const [sow, setSow] = useState<DocRef[]>([{ document_id: 'sow1', repo: '', commit: '', path: '' }])
  const [chk, setChk] = useState<DocRef[]>([{ document_id: 'check1', repo: '', commit: '', path: '' }])
  const [crit, setCrit] = useState<Record<CriterionId, string>>(DEFAULT_CRITERIA)
  const act = useActions(account)

  const submit = async () => {
    if (!validAmount(amount)) { act.setError('Amount must be a whole number of wei between 1 and 10^24.'); return }
    if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(deadline)) { act.setError('Deadline must look like 2026-12-31T00:00:00Z (UTC).'); return }
    const ok = await act.writeContract({ label: 'Create engagement', functionName: 'create_engagement', args: [id.trim(), contractor.trim(), BigInt(amount), JSON.stringify(sow), JSON.stringify(chk), JSON.stringify(crit), deadline, BigInt(repairs)] })
    if (ok) navigate(`/engagement/${encodeURIComponent(id.trim())}`)
  }

  if (!deployed()) return <Notice kind="warn">The contract is not deployed yet.</Notice>
  return (
    <div>
      <Card title="New engagement">
        <p style={{ marginTop: 0, fontSize: 14, color: 'var(--muted)' }}>Everything here is locked on-chain before any funds move. The contractor cannot change the scope, checklist, criteria or deadline afterwards.</p>
        {!account && <Notice kind="info">Connect the client wallet first.</Notice>}
        <Field label="Engagement id" hint="Letters, digits, '.', '-', '_' (max 64). Must be unused."><input className="input" value={id} onChange={(e) => setId(e.target.value)} /></Field>
        <Field label="Contractor wallet address"><input className="input mono" placeholder="0x…" value={contractor} onChange={(e) => setContractor(e.target.value)} /></Field>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
          <Field label="Amount (wei of GEN)"><input className="input" inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value)} /></Field>
          <Field label="Deadline (UTC, ISO)" hint="Must be in the future."><input className="input mono" placeholder="2026-12-31T00:00:00Z" value={deadline} onChange={(e) => setDeadline(e.target.value)} /></Field>
          <Field label="Repair rounds (0 to 3)"><input className="input" inputMode="numeric" value={repairs} onChange={(e) => setRepairs(e.target.value.replace(/\D/g, '').slice(0, 1))} /></Field>
        </div>
        <Field label="Statement of work files" hint="Public GitHub files pinned to a commit. The contract builds the raw URL itself."><ManifestEditor docs={sow} onChange={setSow} max={3} prefix="sow" /></Field>
        <Field label="Acceptance checklist files"><ManifestEditor docs={chk} onChange={setChk} max={3} prefix="check" /></Field>
        {CRITERION_IDS.map((c) => (
          <Field key={c} label={CRITERION_LABEL[c]}><textarea className="input" rows={2} value={crit[c]} onChange={(e) => setCrit({ ...crit, [c]: e.target.value })} /></Field>
        ))}
        {act.error && <Notice kind="error">{act.error}</Notice>}
        <Pending action={act.busy} />
        <button className="btn btn-primary" disabled={!!act.busy || !account || !id.trim()} onClick={() => void submit()}>Create engagement</button>
      </Card>
      <Card title="Transaction log"><TxLog log={act.log} /></Card>
    </div>
  )
}
