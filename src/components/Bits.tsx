import { useState } from 'react'
import type { ReactNode } from 'react'
import { txUrl } from '@/lib/format'
import type { LogEntry } from '@/lib/useActions'

const TONE: Record<string, string> = {
  DRAFT: 'var(--surface-muted)', FUNDED: 'var(--info-bg)', OPEN: 'var(--info-bg)', SUBMITTED: 'var(--warning-bg)',
  DELIVERED: 'var(--success-bg)', RELEASED: 'var(--success-bg)', REJECTED: 'var(--danger-bg)', RECLAIMED: 'var(--danger-bg)', STALLED: 'var(--stalled-bg)',
  SATISFIED: 'var(--success-bg)', VIOLATED: 'var(--danger-bg)', UNRESOLVED: 'var(--stalled-bg)',
}
export function Chip({ v }: { v: string }) {
  return <span className="mono" style={{ background: TONE[v] ?? 'var(--surface-muted)', padding: '2px 8px', borderRadius: 999, fontSize: 12, fontWeight: 600 }}>{v}</span>
}

export function Card({ title, children, right }: { title?: string; children: ReactNode; right?: ReactNode }) {
  return (
    <section className="glass card" style={{ marginBottom: 16 }}>
      {(title || right) && <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <h2 style={{ margin: 0, fontSize: 18 }}>{title}</h2>{right}</div>}
      {children}
    </section>
  )
}

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return <div style={{ marginBottom: 12 }}><label className="field">{label}</label>{children}{hint && <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--subtle)' }}>{hint}</p>}</div>
}

export function Notice({ kind, children }: { kind: 'error' | 'info' | 'warn'; children: ReactNode }) {
  const bg = kind === 'error' ? 'var(--danger-bg)' : kind === 'warn' ? 'var(--warning-bg)' : 'var(--info-bg)'
  return <div role={kind === 'error' ? 'alert' : 'status'} style={{ background: bg, borderRadius: 12, padding: '10px 14px', fontSize: 14, marginBottom: 12 }}>{children}</div>
}

export function Spinner({ label }: { label: string }) {
  return <p role="status" style={{ color: 'var(--muted)', fontSize: 14 }}>{label}…</p>
}

export function Pending({ action }: { action: string | null }) {
  if (!action) return null
  return <Notice kind="info">{action}: waiting for validators. This can take several minutes. Keep this tab open.</Notice>
}

export function TxLog({ log }: { log: LogEntry[] }) {
  const [copied, setCopied] = useState(false)
  if (log.length === 0) return <p style={{ fontSize: 13, color: 'var(--subtle)' }}>No transactions yet.</p>
  const text = log.map((l) => `${l.at} | ${l.action} | ${l.status} | ${l.execution} | ${l.hash || '-'} | ${l.note}`).join('\n')
  return (
    <div>
      <button className="btn btn-ghost" onClick={() => { navigator.clipboard?.writeText(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500) }).catch(() => {}) }}>{copied ? 'Copied' : 'Copy log'}</button>
      <ul style={{ listStyle: 'none', padding: 0, margin: '10px 0 0', fontSize: 13 }}>
        {log.map((l, i) => (
          <li key={i} style={{ padding: '6px 0', borderTop: '1px solid var(--border)' }}>
            <strong>{l.action}</strong> · {l.status} · {l.execution}
            {l.hash && <> · <a className="link mono" href={txUrl(l.hash)} target="_blank" rel="noreferrer">{l.hash.slice(0, 10)}…</a></>}
            <div style={{ color: 'var(--muted)' }}>{l.note}</div>
          </li>
        ))}
      </ul>
    </div>
  )
}
