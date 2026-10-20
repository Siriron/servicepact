export type EngState = 'DRAFT' | 'FUNDED' | 'OPEN' | 'SUBMITTED' | 'DELIVERED' | 'REJECTED' | 'STALLED' | 'RELEASED' | 'RECLAIMED'

export interface DocRef { document_id: string; repo: string; commit: string; path: string }
export type CriterionId = 'engagement_identity' | 'contractor_binding' | 'scope_completeness' | 'quality_standard' | 'timeline_compliance' | 'acceptance_checklist'
export type CriterionStatus = 'SATISFIED' | 'VIOLATED' | 'UNRESOLVED'

export interface CriterionResult { criterion_id: CriterionId; status: CriterionStatus; witness_document_ids: string[]; observed_fact: string }
export interface Adjudication { revision?: number; criteria?: CriterionResult[]; outcome?: string; reasoning?: string }

export interface Engagement {
  engagement_id: string
  client: string
  contractor: string
  amount: number
  sow: DocRef[]
  checklist: DocRef[]
  criteria: Record<CriterionId, string>
  deadline_iso: string
  deadline_epoch: number
  max_repairs: number
  state: EngState
  revision: number
  first_submitted_at: number
  stalled_at: number
  resubmit_window_seconds: number
  adjudication: Adjudication
  client_receipt: number
  contractor_receipt: number
  markers: { engagement: string; contractor: string }
}

export interface Packet { engagement_id: string; revision: number; contractor: string; work: DocRef[]; submitted_at: number; state: string; result: Adjudication }

export const CRITERION_IDS: CriterionId[] = ['engagement_identity', 'contractor_binding', 'scope_completeness', 'quality_standard', 'timeline_compliance', 'acceptance_checklist']
export const CRITERION_LABEL: Record<CriterionId, string> = {
  engagement_identity: 'Engagement identity (code)',
  contractor_binding: 'Contractor binding (code)',
  scope_completeness: 'Scope completeness (validators)',
  quality_standard: 'Quality standard (validators)',
  timeline_compliance: 'Timeline compliance (code)',
  acceptance_checklist: 'Acceptance checklist (validators)',
}
export const DEFAULT_CRITERIA: Record<CriterionId, string> = {
  engagement_identity: 'The work product states the engagement it belongs to.',
  contractor_binding: 'The work product names the contractor wallet that delivered it.',
  scope_completeness: 'The work product covers every deliverable listed in the statement of work.',
  quality_standard: 'The work product meets the quality bar stated in the statement of work.',
  timeline_compliance: 'The first delivery is submitted before the locked deadline.',
  acceptance_checklist: 'The work product satisfies every item of the acceptance checklist.',
}
