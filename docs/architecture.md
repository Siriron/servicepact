# Architecture

**Boundary.** Client locks documents and escrows funds, then the contractor submits commit-pinned files, then validators fetch the documents (web request), then each validator runs a model call and compares criterion statuses exactly, then the contract updates the engagement state, then the contractor or client pulls the payout.

- **Frontend owns:** wallet connection, forms, read views, the test guide, transaction states.
- **Contract owns:** locked documents and criteria, escrow, the three code-computed criteria, the validator comparison rule, the outcome rule, every payout and every exit.
- **External sources own:** the document text on `raw.githubusercontent.com`. Validators re-fetch it themselves.

## Evidence sources

| Host | URL pattern | Fetch method | Deciding field |
|---|---|---|---|
| raw.githubusercontent.com | `https://raw.githubusercontent.com/<owner>/<repo>/<40-hex commit>/<path>`, derived from (repo, commit, path); no caller URL is accepted | `gl.nondet.web.get` | the text of each SOW, checklist and work-product file |

The host is not in the Gym Sources catalog. In live StudioNet runs (Oct 21 2026) validators fetched these files and the model's audit notes quoted their contents, so the host is reachable from StudioNet validators.

## Criteria and outcome rule

| Criterion | Decided by |
|---|---|
| engagement_identity | code: work text contains `engagement:<id>` (missing is UNRESOLVED) |
| contractor_binding | code: work text contains `contractor:<address>` (missing is UNRESOLVED) |
| timeline_compliance | code: first submission time against the locked deadline (late is VIOLATED) |
| scope_completeness, quality_standard, acceptance_checklist | validators, exact agreement on each status |

Any VIOLATED gives REJECTED; otherwise any UNRESOLVED gives STALLED; otherwise DELIVERED. Model prose (`observed_fact`, `reasoning`) is audit metadata and never feeds the rule.

## Validator rule

Each validator re-runs the whole evaluation (fetch plus model call) and requires every one of the five leader-produced statuses to equal its own. There is no tolerance band: the statuses are discrete choices and the consequence of a difference (DELIVERED vs STALLED vs REJECTED) is a payout. The leader returns only stable decision fields. A fetch failure or a malformed model reply produces an all-UNRESOLVED result instead of an error, so adjudication always completes.

## State machine

DRAFT, FUNDED, OPEN, SUBMITTED, then DELIVERED (to RELEASED), REJECTED (to RECLAIMED) or STALLED (back to SUBMITTED by resubmission, or to RECLAIMED). FUNDED and OPEN (after the deadline, with no delivery) can also go to RECLAIMED. Every state with escrowed funds has an exit, see `contracts.md`.
