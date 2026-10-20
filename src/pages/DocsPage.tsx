import { Card } from '@/components/Bits'
import { CONTRACT_ADDRESS, REPO_URL } from '@/config/chains'

const H = ({ children }: { children: string }) => <h3 style={{ margin: '14px 0 4px', fontSize: 15 }}>{children}</h3>
const P = ({ children }: { children: React.ReactNode }) => <p style={{ margin: '0 0 8px', fontSize: 14, color: 'var(--ink-2)' }}>{children}</p>

export function DocsPage() {
  return (
    <div>
      <Card title="Overview">
        <P>ServicePact settles a freelance delivery. The client locks a statement of work, an acceptance checklist, six criteria and a deadline, then escrows the payment. The contractor delivers files pinned to a git commit. GenLayer validators fetch every file themselves and judge the delivery. The payout is decided by a fixed rule over criterion statuses.</P>
        <P>Who benefits from a false verdict: the contractor from a false DELIVERED, the client from a false REJECTED. That is why the judgment runs under validator consensus.</P>
      </Card>
      <Card title="How it works">
        <H>Lifecycle</H>
        <P>DRAFT, then FUNDED (exact amount escrowed), then OPEN. The contractor submits a delivery (SUBMITTED). Anyone adjudicates. The outcome is DELIVERED (contractor releases payment), REJECTED (client reclaims) or STALLED (the contractor may repair within the budget and window, otherwise the client reclaims).</P>
        <H>Evidence</H>
        <P>Host raw.githubusercontent.com, URL https://raw.githubusercontent.com/owner/repo/COMMIT/path, fetched with a plain web request. The contract builds the URL from (repo, 40-hex commit, path); callers never supply a URL. A commit-pinned file cannot change after it is committed to.</P>
        <H>Criteria</H>
        <P>Computed in code: engagement_identity and contractor_binding (the work product must contain the two marker strings shown on each engagement) and timeline_compliance (first submission time against the locked deadline). Judged by validators with exact agreement: scope_completeness, quality_standard, acceptance_checklist. Any VIOLATED gives REJECTED; otherwise any UNRESOLVED gives STALLED; otherwise DELIVERED.</P>
        <H>Funds</H>
        <P>Pull-based. Funded engagements can be reclaimed before opening. An opened engagement with no delivery can be reclaimed after the deadline. REJECTED can be reclaimed. STALLED can be reclaimed once the repair budget is used or the 7-day repair window ends. A DELIVERED escrow is claimed by the contractor. Payouts are queued until finalization.</P>
      </Card>
      <Card title="Limits you should know">
        <P>Only text files in public GitHub repositories can be evidence. There is no appeal on REJECTED beyond protocol-level appeals. A DELIVERED escrow stays claimable indefinitely. StudioNet is temporary: deployed addresses may not survive resets; the repository tests are the proof of behaviour.</P>
      </Card>
      <Card title="Contract reference">
        <P>Writes: create_engagement, fund_engagement (payable), open_engagement, submit_delivery, resubmit_delivery, adjudicate_engagement, release_payment, reclaim_funds. Views: get_engagement, get_packet, get_engagement_count, get_engagement_ids.</P>
        <P>Contract: {CONTRACT_ADDRESS ? <code className="mono">{CONTRACT_ADDRESS}</code> : 'not deployed yet'}{REPO_URL ? <> · <a className="link" href={REPO_URL} target="_blank" rel="noreferrer">source</a></> : null}</P>
      </Card>
      <Card title="FAQ">
        <H>Why does adjudication take minutes?</H><P>Each validator fetches the documents and runs its own model call, then they must agree exactly on every judged criterion.</P>
        <H>Why must the work contain markers?</H><P>They bind a delivery to one engagement and one contractor wallet so a file made for another engagement cannot be replayed.</P>
        <H>Can the model change the payout?</H><P>No. Prose is audit metadata. Only criterion statuses feed the fixed outcome rule.</P>
      </Card>
    </div>
  )
}
