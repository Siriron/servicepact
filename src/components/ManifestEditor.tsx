import type { DocRef } from '@/lib/types'

export function ManifestEditor({ docs, onChange, max, prefix }: { docs: DocRef[]; onChange: (d: DocRef[]) => void; max: number; prefix: string }) {
  const set = (i: number, k: keyof DocRef, v: string) => onChange(docs.map((d, j) => (j === i ? { ...d, [k]: v } : d)))
  return (
    <div>
      {docs.map((d, i) => (
        <div key={i} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 6, marginBottom: 8 }}>
          <input className="input" aria-label="document id" placeholder="document id" value={d.document_id} onChange={(e) => set(i, 'document_id', e.target.value)} />
          <input className="input" aria-label="repo" placeholder="owner/repo" value={d.repo} onChange={(e) => set(i, 'repo', e.target.value)} />
          <input className="input mono" aria-label="commit" placeholder="40-hex commit SHA" value={d.commit} onChange={(e) => set(i, 'commit', e.target.value)} />
          <input className="input" aria-label="path" placeholder="path/in/repo.md" value={d.path} onChange={(e) => set(i, 'path', e.target.value)} />
          {docs.length > 1 && <button type="button" className="btn btn-ghost" onClick={() => onChange(docs.filter((_, j) => j !== i))}>Remove</button>}
        </div>
      ))}
      {docs.length < max && <button type="button" className="btn btn-ghost" onClick={() => onChange([...docs, { document_id: `${prefix}${docs.length + 1}`, repo: '', commit: '', path: '' }])}>Add document</button>}
    </div>
  )
}
