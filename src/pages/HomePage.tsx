import { useCallback, useEffect, useState } from 'react'
import { Card, Chip, Notice, Spinner } from '@/components/Bits'
import { deployed, friendly, getEngagement, getIds } from '@/lib/chain'
import { navigate } from '@/lib/router'
import type { Engagement } from '@/lib/types'

const PAGE = 10

export function HomePage() {
  const [rows, setRows] = useState<Engagement[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [open, setOpen] = useState('')

  const load = useCallback(async (offset: number) => {
    setLoading(true); setErr(null)
    try {
      const page = await getIds(offset, PAGE)
      const items = await Promise.all(page.ids.map((i) => getEngagement(i)))
      setTotal(page.total)
      setRows((r) => (offset === 0 ? items : [...r, ...items]))
    } catch (e) { setErr(friendly(e)) } finally { setLoading(false) }
  }, [])
  useEffect(() => { if (deployed()) void load(0) }, [load])

  return (
    <div>
      <Card title="Escrowed delivery, judged against locked documents">
        <p style={{ margin: 0, fontSize: 15, color: 'var(--ink-2)' }}>
          A client locks the scope, checklist and deadline, then escrows the payment. The contractor delivers commit-pinned files. GenLayer validators fetch the documents themselves and judge them; the payout follows a fixed rule, never model prose.
        </p>
        <div style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
          <button className="btn btn-primary" onClick={() => navigate('/new')}>New engagement</button>
          <button className="btn btn-ghost" onClick={() => navigate('/guide')}>Run the test guide</button>
          <button className="btn btn-ghost" onClick={() => navigate('/docs')}>How it works</button>
        </div>
      </Card>
      {!deployed() && <Notice kind="warn">The contract is not deployed yet, so no engagements can be listed. See Docs for the deployment steps.</Notice>}
      {deployed() && (
        <Card title={`Engagements (${total})`} right={<button className="btn btn-ghost" disabled={loading} onClick={() => void load(0)}>Refresh</button>}>
          <form onSubmit={(e) => { e.preventDefault(); if (open.trim()) navigate(`/engagement/${encodeURIComponent(open.trim())}`) }} style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            <input className="input" aria-label="Open engagement by id" placeholder="Open by engagement id" value={open} onChange={(e) => setOpen(e.target.value)} />
            <button className="btn btn-ghost" type="submit">Open</button>
          </form>
          {err && <Notice kind="error">{err}</Notice>}
          {loading && rows.length === 0 && <Spinner label="Loading engagements" />}
          {!loading && !err && rows.length === 0 && <p style={{ color: 'var(--muted)', fontSize: 14 }}>No engagements yet. Create the first one.</p>}
          <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
            {rows.map((r) => (
              <li key={r.engagement_id} style={{ borderTop: '1px solid var(--border)', padding: '8px 0', display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                <a className="link" href={`/engagement/${encodeURIComponent(r.engagement_id)}`} onClick={(e) => { e.preventDefault(); navigate(`/engagement/${encodeURIComponent(r.engagement_id)}`) }}>{r.engagement_id}</a>
                <span style={{ fontSize: 13, color: 'var(--muted)' }}>{r.amount} <Chip v={r.state} /></span>
              </li>
            ))}
          </ul>
          {rows.length < total && <button className="btn btn-ghost" style={{ marginTop: 10 }} disabled={loading} onClick={() => void load(rows.length)}>Load more</button>}
        </Card>
      )}
    </div>
  )
}
