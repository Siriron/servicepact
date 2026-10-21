import { useCallback, useEffect, useMemo, useState } from 'react'
import { Card, Chip, Field, Notice, Pending, TxLog } from '@/components/Bits'
import { FIXTURE_COMMIT, FIXTURE_REPO } from '@/config/chains'
import { deployed, friendly, getEngagement, isNotFound } from '@/lib/chain'
import { navigate } from '@/lib/router'
import { nowEpoch, same, short } from '@/lib/format'
import { CRITERION_IDS, DEFAULT_CRITERIA } from '@/lib/types'
import type { DocRef, Engagement } from '@/lib/types'
import { useActions } from '@/lib/useActions'

type Who = 'client' | 'contractor' | 'anyone'
interface Step { key: string; who: Who; label: string; done: (e: Engagement | null) => boolean }
interface Scenario { id: string; title: string; description: string; expected: string; repairs: number; deadlineMinutes: number | null; work: 'own' | 'unbound' | 'missing' | 'none'; steps: Step[] }

const S = {
  create: { key: 'create', who: 'client', label: 'Create the engagement (locks scope, checklist, deadline)', done: (e) => !!e },
  fund: { key: 'fund', who: 'client', label: 'Fund the escrow', done: (e) => !!e && e.state !== 'DRAFT' },
  open: { key: 'open', who: 'client', label: 'Open for delivery', done: (e) => !!e && !['DRAFT', 'FUNDED'].includes(e.state) },
  submit: { key: 'submit', who: 'contractor', label: 'Submit the delivery', done: (e) => !!e && e.revision >= 1 },
  adjudicate: { key: 'adjudicate', who: 'anyone', label: 'Adjudicate (validators judge the documents)', done: (e) => !!e && e.revision >= 1 && !!e.adjudication.outcome },
  release: { key: 'release', who: 'contractor', label: 'Release the payment', done: (e) => !!e && e.state === 'RELEASED' },
  reclaim: { key: 'reclaim', who: 'client', label: 'Reclaim the funds', done: (e) => !!e && e.state === 'RECLAIMED' },
  wait: { key: 'wait', who: 'anyone', label: 'Wait until the deadline has passed (about 3 minutes)', done: (e) => !!e && nowEpoch() > e.deadline_epoch },
} satisfies Record<string, Step>

const SCENARIOS: Scenario[] = [
  { id: 'paid', title: 'Delivered and paid', description: 'A complete happy path. You deliver a file from your own public GitHub repo that contains both markers, validators judge it, and the contractor is paid.', expected: 'Outcome DELIVERED, then state RELEASED with the exact escrow sent to the contractor.', repairs: 1, deadlineMinutes: null, work: 'own', steps: [S.create, S.fund, S.open, S.submit, S.adjudicate, S.release] },
  { id: 'unbound', title: 'Missing markers stall, repair budget runs out', description: 'The delivery file lacks the engagement and contractor markers, so code (not the model) marks both binding criteria UNRESOLVED. With zero repair rounds the client can reclaim immediately.', expected: 'Outcome STALLED with engagement_identity and contractor_binding UNRESOLVED, then RECLAIMED.', repairs: 0, deadlineMinutes: null, work: 'unbound', steps: [S.create, S.fund, S.open, S.submit, S.adjudicate, S.reclaim] },
  { id: 'missing', title: 'Unreachable document stalls', description: 'The delivery points at a file that does not exist at the pinned commit. A fetch failure is never treated as evidence.', expected: 'Outcome STALLED with every validator-judged criterion UNRESOLVED, then RECLAIMED.', repairs: 0, deadlineMinutes: null, work: 'missing', steps: [S.create, S.fund, S.open, S.submit, S.adjudicate, S.reclaim] },
  { id: 'nodelivery', title: 'Contractor never delivers', description: 'The engagement is opened, nothing is delivered, and the deadline passes. The client has a bounded exit.', expected: 'State RECLAIMED after the deadline; reclaiming before the deadline reverts.', repairs: 1, deadlineMinutes: 3, work: 'none', steps: [S.create, S.fund, S.open, S.wait, S.reclaim] },
  { id: 'late', title: 'Late delivery is rejected by code', description: 'The first delivery arrives after the deadline. The timeline criterion is computed from stored times, so the verdict is REJECTED whatever the model says.', expected: 'Outcome REJECTED with timeline_compliance VIOLATED, then RECLAIMED.', repairs: 0, deadlineMinutes: 3, work: 'unbound', steps: [S.create, S.fund, S.open, S.wait, S.submit, S.adjudicate, S.reclaim] },
  { id: 'cancel', title: 'Funded but never opened', description: 'The client funds and changes their mind before opening the engagement.', expected: 'State RECLAIMED immediately.', repairs: 1, deadlineMinutes: null, work: 'none', steps: [S.create, S.fund, S.reclaim] },
]

const KEY = 'servicepact.guide.run'
interface Run { scenario: string; runId: string; contractor: string; amount: string }
const newId = () => Math.random().toString(36).slice(2, 8)
const load = (): Run => { try { const r = JSON.parse(localStorage.getItem(KEY) ?? 'null') as Run | null; if (r?.scenario) return r } catch { /* ignore */ } return { scenario: 'paid', runId: newId(), contractor: '', amount: '1' } }
const isoIn = (min: number) => new Date(Date.now() + min * 60000).toISOString().replace(/\.\d{3}Z$/, 'Z')

export function GuidePage({ account }: { account: string | null }) {
  const [run, setRun] = useState<Run>(load)
  const [eng, setEng] = useState<Engagement | null>(null)
  const [readErr, setReadErr] = useState<string | null>(null)
  const [tick, setTick] = useState(0)
  const [own, setOwn] = useState({ repo: '', commit: '', path: '' })
  const act = useActions(account)
  const sc = SCENARIOS.find((s) => s.id === run.scenario) ?? SCENARIOS[0]
  const eid = `g-${sc.id}-${run.runId}`
  const fixturesReady = FIXTURE_REPO !== '' && FIXTURE_COMMIT !== ''

  useEffect(() => { try { localStorage.setItem(KEY, JSON.stringify(run)) } catch { /* storage unavailable */ } }, [run])
  const refresh = useCallback(async () => {
    setReadErr(null)
    try { setEng(await getEngagement(eid)) } catch (e) { setEng(null); if (!isNotFound(e)) setReadErr(friendly(e)) }   // not created yet is the normal state of a fresh run
    setTick((t) => t + 1)
  }, [eid])
  useEffect(() => { if (deployed()) void refresh() }, [refresh])

  const doc = (id: string, path: string): DocRef => ({ document_id: id, repo: FIXTURE_REPO, commit: FIXTURE_COMMIT, path })
  const workDocs = useMemo<DocRef[]>(() => {
    if (sc.work === 'own') return [{ document_id: 'work1', ...own }]
    if (sc.work === 'unbound') return [doc('work1', 'evidence/fixtures/work-unbound.md')]
    if (sc.work === 'missing') return [doc('work1', 'evidence/fixtures/does-not-exist.md')]
    return []
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sc.work, own])

  const ctr = run.contractor.trim()
  const workText = [
    '# Delivery', '',
    `engagement:${eid}`,
    `contractor:${ctr ? ctr.toLowerCase() : '<enter the contractor address above>'}`, '',
    'This delivery contains the three items listed in the statement of work: the login page, the API client module and the README.', '',
    '## 1. Login page (login.html)', '',
    '<form id="login" action="/session" method="post">',
    '  <label for="email">Email</label>',
    '  <input id="email" name="email" type="email" required>',
    '  <label for="password">Password</label>',
    '  <input id="password" name="password" type="password" required minlength="8">',
    '  <button type="submit">Sign in</button>',
    '</form>', '',
    '## 2. API client module (api.js)', '',
    'const BASE = "/api";', '',
    'export async function request(path, options) {',
    '  const init = options || {};',
    '  const response = await fetch(BASE + path, {',
    '    method: init.method || "GET",',
    '    headers: { "Content-Type": "application/json" },',
    '    body: init.body ? JSON.stringify(init.body) : undefined,',
    '  });',
    '  if (!response.ok) {',
    '    throw new Error("Request to " + path + " failed with status " + response.status);',
    '  }',
    '  return response.json();',
    '}', '',
    '## 3. README (README.md)', '',
    'Install: run npm install.',
    'Run: run npm start and open http://localhost:3000/login.html.',
    'Test: run npm test.',
    'Sign in with the account created by npm run seed.',
    'The API client is imported with: import { request } from "./api.js".',
    '',
  ].join('\n')

  const call = async (step: Step) => {
    let ok = false
    if (step.key === 'create') {
      const dl = sc.deadlineMinutes ? isoIn(sc.deadlineMinutes) : '2030-01-01T00:00:00Z'
      ok = await act.writeContract({ label: 'Create', functionName: 'create_engagement', args: [eid, ctr, BigInt(run.amount), JSON.stringify([doc('sow1', 'evidence/fixtures/sow.md')]), JSON.stringify([doc('check1', 'evidence/fixtures/checklist.md')]), JSON.stringify(DEFAULT_CRITERIA), dl, BigInt(sc.repairs)] })
    } else if (step.key === 'fund') ok = await act.writeContract({ label: 'Fund', functionName: 'fund_engagement', args: [eid], value: BigInt(run.amount) })
    else if (step.key === 'open') ok = await act.writeContract({ label: 'Open', functionName: 'open_engagement', args: [eid] })
    else if (step.key === 'submit') ok = await act.writeContract({ label: 'Submit', functionName: 'submit_delivery', args: [eid, JSON.stringify(workDocs)] })
    else if (step.key === 'adjudicate') ok = await act.writeContract({ label: 'Adjudicate', functionName: 'adjudicate_engagement', args: [eid] })
    else if (step.key === 'release') ok = await act.writeContract({ label: 'Release', functionName: 'release_payment', args: [eid] })
    else if (step.key === 'reclaim') ok = await act.writeContract({ label: 'Reclaim', functionName: 'reclaim_funds', args: [eid] })
    if (ok) await refresh()
  }

  const first = sc.steps.findIndex((s) => !s.done(eng))
  const walletOk = (who: Who) => who === 'anyone' || !eng || (who === 'client' ? same(account, eng.client) : same(account, eng.contractor))
  const ownReady = sc.work !== 'own' || (own.repo.includes('/') && own.commit.length === 40 && own.path.length > 0)
  const canCreate = /^0x[0-9a-fA-F]{40}$/.test(ctr) && /^\d+$/.test(run.amount) && run.amount !== '0'

  if (!deployed()) return <Notice kind="warn">The contract is not deployed yet, so the guide cannot run.</Notice>
  return (
    <div data-tick={tick}>
      <Card title="Test guide" right={<><button className="btn btn-ghost" onClick={() => void refresh()}>Refresh</button> <button className="btn btn-ghost" onClick={() => { setRun({ ...run, runId: newId() }); setEng(null); act.clear() }}>New run</button> <button className="btn btn-ghost" onClick={() => { try { localStorage.removeItem(KEY) } catch { /* ignore */ } setRun({ scenario: 'paid', runId: newId(), contractor: '', amount: '1' }); setEng(null); act.clear() }}>Clear</button></>}>
        <p style={{ marginTop: 0, fontSize: 14, color: 'var(--muted)' }}>Use two wallets: a client wallet and a contractor wallet. Each step turns done only when the contract's on-chain state shows its result. Validator steps can take several minutes.</p>
        {!fixturesReady && <Notice kind="warn">Fixture repository is not configured yet (FIXTURE_REPO / FIXTURE_COMMIT in src/config/chains.ts).</Notice>}
        <Field label="Scenario">
          <select className="input" value={run.scenario} onChange={(e) => { setRun({ ...run, scenario: e.target.value }); setEng(null) }}>
            {SCENARIOS.map((s) => <option key={s.id} value={s.id}>{s.title}</option>)}
          </select>
        </Field>
        <p style={{ fontSize: 14, margin: '0 0 6px' }}>{sc.description}</p>
        <p style={{ fontSize: 14, margin: '0 0 12px' }}><strong>Expected:</strong> {sc.expected}</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
          <Field label="Run id (resume a run by pasting its id)"><input className="input mono" value={run.runId} onChange={(e) => { setRun({ ...run, runId: e.target.value.replace(/[^A-Za-z0-9]/g, '').slice(0, 24) }); setEng(null) }} /></Field>
          <Field label="Contractor wallet address"><input className="input mono" placeholder="0x… (second wallet)" value={run.contractor} onChange={(e) => setRun({ ...run, contractor: e.target.value })} /></Field>
          <Field label="Escrow (wei of GEN)" hint="Studio is gasless; funding needs a balance covering this amount."><input className="input" inputMode="numeric" value={run.amount} onChange={(e) => setRun({ ...run, amount: e.target.value.replace(/\D/g, '') })} /></Field>
        </div>
        <p className="mono" style={{ fontSize: 12, color: 'var(--subtle)' }}>engagement id: {eid}{eng ? <> · <a className="link" href={`/engagement/${eid}`} onClick={(e) => { e.preventDefault(); navigate(`/engagement/${eid}`) }}>open</a></> : ''}</p>
      </Card>

      {sc.work === 'own' && (
        <Card title="Your delivery file">
          <p style={{ fontSize: 13, marginTop: 0 }}>Create a public GitHub repo, commit a file with exactly this text, and paste the repo, the full commit SHA and the file path below. (The text depends on the engagement id and the contractor address above.) The validators judge the file's contents against the statement of work, so a one-line claim of delivery is not enough: the file must contain the actual work.</p>
          <pre className="code">{workText}</pre>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 8 }}>
            <input className="input" aria-label="repo" placeholder="owner/repo" value={own.repo} onChange={(e) => setOwn({ ...own, repo: e.target.value })} />
            <input className="input mono" aria-label="commit" placeholder="40-hex commit SHA" value={own.commit} onChange={(e) => setOwn({ ...own, commit: e.target.value.trim() })} />
            <input className="input" aria-label="path" placeholder="delivery.md" value={own.path} onChange={(e) => setOwn({ ...own, path: e.target.value })} />
          </div>
        </Card>
      )}

      <Card title="Steps">
        {readErr && <Notice kind="error">{readErr}</Notice>}
        {act.error && <Notice kind="error">{act.error}</Notice>}
        <Pending action={act.busy} />
        <ol style={{ paddingLeft: 20, margin: 0 }}>
          {sc.steps.map((s, i) => {
            const done = s.done(eng)
            const active = i === first
            const gated = s.key === 'create' ? !canCreate || !fixturesReady : (s.key === 'submit' && !ownReady)
            return (
              <li key={s.key} style={{ margin: '10px 0', opacity: done || active ? 1 : 0.55 }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 14 }}>{s.label}</span>
                  <Chip v={s.who === 'client' ? 'CLIENT WALLET' : s.who === 'contractor' ? 'CONTRACTOR WALLET' : 'ANY WALLET'} />
                  {done && <Chip v="SATISFIED" />}
                </div>
                {active && !done && s.key !== 'wait' && (
                  <div style={{ marginTop: 6 }}>
                    {!walletOk(s.who) && <p style={{ fontSize: 12, color: 'var(--danger)', margin: '0 0 4px' }}>Switch to the {s.who} wallet ({eng ? short(s.who === 'client' ? eng.client : eng.contractor) : ''}).</p>}
                    <button className="btn btn-primary" disabled={!!act.busy || !account || gated || (s.key === 'release' && eng?.state !== 'DELIVERED')} onClick={() => void call(s)}>{s.label.split(' (')[0]}</button>
                    {s.key === 'release' && eng && eng.state !== 'DELIVERED' && <span style={{ fontSize: 12, color: 'var(--muted)', marginLeft: 8 }}>Release is only possible when the outcome is DELIVERED (current state: {eng.state}).</span>}
                    {gated && <span style={{ fontSize: 12, color: 'var(--muted)', marginLeft: 8 }}>{s.key === 'create' ? 'Enter a valid contractor address first.' : 'Fill in your delivery file details first.'}</span>}
                  </div>
                )}
                {active && !done && s.key === 'wait' && <p style={{ fontSize: 12, color: 'var(--muted)', margin: '4px 0 0' }}>Deadline {eng?.deadline_iso}. Press Refresh once it has passed.</p>}
              </li>
            )
          })}
        </ol>
        {eng && eng.adjudication.criteria && (
          <div style={{ marginTop: 12, fontSize: 13 }}>
            <strong>Result: {eng.adjudication.outcome}</strong>
            <ul style={{ margin: '4px 0 0', paddingLeft: 18 }}>
              {CRITERION_IDS.map((c) => { const r = eng.adjudication.criteria?.find((x) => x.criterion_id === c); return r ? <li key={c}>{c}: <Chip v={r.status} /></li> : null })}
            </ul>
          </div>
        )}
        {eng && eng.state === 'STALLED' && sc.work === 'own' && (
          <div style={{ marginTop: 12 }}>
            {eng.revision <= eng.max_repairs
              ? <>
                  <Notice kind="info">The validators could not settle the claim (STALLED), so the contractor can repair within the budget ({eng.revision} of {eng.max_repairs + 1} revisions used). Commit a fuller delivery file, paste its repo, full commit SHA and path in "Your delivery file" above, then resubmit from the contractor wallet.</Notice>
                  <button className="btn btn-primary" disabled={!!act.busy || !account || !ownReady || !same(account, eng.contractor)} onClick={() => void act.writeContract({ label: 'Resubmit', functionName: 'resubmit_delivery', args: [eid, JSON.stringify(workDocs)] }).then((ok) => { if (ok) void refresh() })}>Resubmit delivery</button>
                  {!same(account, eng.contractor) && <span style={{ fontSize: 12, color: 'var(--muted)', marginLeft: 8 }}>Switch to the contractor wallet ({short(eng.contractor)}).</span>}
                </>
              : <Notice kind="warn">The repair budget is used up. The client can now reclaim the funds from the engagement page.</Notice>}
          </div>
        )}
        {eng && <p style={{ fontSize: 13 }}>Current on-chain state: <Chip v={eng.state} /></p>}
      </Card>
      <Card title="Transaction log"><TxLog log={act.log} /></Card>
    </div>
  )
}
