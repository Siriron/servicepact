<div align="center">

<br/>

<img src="https://img.shields.io/badge/GenLayer-Intelligent%20Contract-6c47ff?style=for-the-badge&logoColor=white" alt="GenLayer"/>
<img src="https://img.shields.io/badge/Python-3.12-3776AB?style=for-the-badge&logo=python&logoColor=white" alt="Python"/>
<img src="https://img.shields.io/badge/Network-StudioNet-00c2a8?style=for-the-badge" alt="Network"/>
<img src="https://img.shields.io/badge/Tests-100%20Direct%20Mode-22c55e?style=for-the-badge" alt="Tests"/>
<img src="https://img.shields.io/badge/License-MIT-f59e0b?style=for-the-badge" alt="License"/>
<img src="https://img.shields.io/badge/Status-deployed%20on%20StudioNet-22c55e?style=for-the-badge" alt="Status"/>
<img src="https://github.com/Siriron/servicepact/actions/workflows/ci.yml/badge.svg" alt="CI"/>

<br/><br/>

<h1>ServicePact</h1>

<p><strong>Trustless freelance work-delivery settlement — powered by GenLayer AI-validator consensus</strong></p>

<p>
A client escrows funds on-chain. A contractor delivers. GenLayer validators independently<br/>
fetch every commit-pinned document, adjudicate six frozen criteria, and settle the payment<br/>
— without any trusted third party, arbitrator, or human override.
</p>

<br/>

<a href="#overview"><strong>Overview</strong></a> ·
<a href="#flow"><strong>Flow</strong></a> ·
<a href="#contract-architecture"><strong>Architecture</strong></a> ·
<a href="#security"><strong>Security</strong></a> ·
<a href="#quick-start"><strong>Quick Start</strong></a> ·
<a href="#testing"><strong>Testing</strong></a> ·
<a href="#deployment"><strong>Deployment</strong></a> ·
<a href="#docs"><strong>Docs</strong></a>

<br/><br/>

</div>

---

## Overview

Freelance payment disputes happen when a client and contractor disagree on whether delivery meets the agreed scope, quality, and timeline. Today those disputes are resolved by platforms, escrow services, or courts: trusted third parties that add cost, delay, and counterparty risk.

**ServicePact** replaces the third party with GenLayer's decentralised AI-validator consensus. The statement of work, the acceptance checklist, the six criteria and the deadline are frozen on-chain before a single wei is escrowed. When the contractor submits a delivery, validators independently fetch every commit-pinned document, judge it against the frozen criteria, and the contract derives the settlement from criterion statuses. The model names facts, not payment amounts. Settlement logic is code.

Who benefits from a false verdict: the contractor from a false `DELIVERED`, the client from a false `REJECTED`. That is why the judgment runs under validator consensus.

<br/>

<div align="center">

| Property | Value |
|---|---|
| Contract language | Python (GenVM Intelligent Contract, stable v0.2 API) |
| Runner hash | `1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6` |
| Consensus model | GenLayer Optimistic Democracy |
| Equivalence strategy | Exact agreement on every validator-judged criterion status |
| Criteria count | 6 (frozen at creation): 3 computed by code, 3 judged by validators |
| Repair budget | Configurable (0 to 3 revisions), 7-day repair window |
| Direct-mode tests | 100 |
| Network | StudioNet (gasless, temporary) |
| Concept | Escrowed freelance delivery settlement against locked documents |
| Evidence source | Commit-pinned text files on `raw.githubusercontent.com`, fetched by validators |

</div>

**Evidence sources** (one row per source):

| Host | URL pattern | Fetch method | Deciding field |
|---|---|---|---|
| raw.githubusercontent.com | `/<owner>/<repo>/<40-hex commit>/<path>`, derived by the contract from (repo, commit, path); no caller URL is ever accepted | `web.get` | text of each SOW, checklist and work-product file |

A commit-pinned path cannot change after it is committed to, so content cannot be swapped between commitment and judgment.

<br/>

---

## Status

<div align="center">

![Tested](https://img.shields.io/badge/contract%20logic%20in%20direct%20mode-tested-brightgreen?style=flat-square)
![Deployed](https://img.shields.io/badge/StudioNet%20deployment-finalized-brightgreen?style=flat-square)
![Live](https://img.shields.io/badge/live%20adjudication%20consensus-observed-brightgreen?style=flat-square)
![Payout](https://img.shields.io/badge/release__payment-finalized%20live-brightgreen?style=flat-square)
![Reclaim](https://img.shields.io/badge/reclaim%20after%20repair%20exhaustion-finalized%20live-brightgreen?style=flat-square)
![Untested](https://img.shields.io/badge/deadline%20and%20window%20exits-untested%20live-yellow?style=flat-square)

</div>

The contract is deployed to StudioNet at [`0xDFC205f0AB2D2377A898D84A5360A2Baa661F885`](https://explorer-studio.genlayer.com/address/0xDFC205f0AB2D2377A898D84A5360A2Baa661F885); the explorer shows the constructor transaction finalized with GenVM result SUCCESS. Transaction links for the observed runs are in [`docs/deployment.md`](docs/deployment.md#observed-live-runs-studionet-oct-21-2026). On Oct 21 2026 the in-app guide drove live runs on it: three adjudications reached validator consensus (explorer: GenVM SUCCESS, consensus Accepted). 100 tests pass with `pytest tests -q -p no:cacheprovider`, `genvm-lint check` passes, and the frontend type-checks and builds. The tests execute the real contract with the web and the model mocked; they do not prove real LLM behaviour, real network behaviour, real multi-node consensus timing, or the deadline and repair-window exits on a live network. StudioNet is a temporary test network: deployed addresses may not survive resets, so the repository tests are the proof of behaviour, not an address.

<br/>

---

## Flow

<br/>

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          ServicePact Lifecycle                              │
└─────────────────────────────────────────────────────────────────────────────┘

  CLIENT                           CHAIN                         CONTRACTOR
    │                                │                                │
    │──── create_engagement() ──────▶│  Lock SOW + criteria + amount  │
    │                                │  State: DRAFT                  │
    │──── fund_engagement()  ───────▶│  Escrow exact amount           │
    │                                │  State: FUNDED                 │
    │──── open_engagement()  ───────▶│  State: OPEN                   │
    │                                │                                │
    │                                │◀─── submit_delivery() ─────────│
    │                                │  Lock work-product (pinned)    │
    │                                │  State: SUBMITTED              │
    │                                │                                │
    │                            adjudicate_engagement()              │
    │                         (callable by anyone)                    │
    │                                │                                │
    │                    ┌───────────┴────────────┐                   │
    │                    │  AI-Validator Consensus │                   │
    │                    │  ┌─────────────────┐   │                   │
    │                    │  │ Leader fetches  │   │                   │
    │                    │  │ all documents   │   │                   │
    │                    │  │ calls LLM       │   │                   │
    │                    │  └────────┬────────┘   │                   │
    │                    │           │             │                   │
    │                    │  ┌────────▼────────┐   │                   │
    │                    │  │ Validators each │   │                   │
    │                    │  │ re-fetch + re-  │   │                   │
    │                    │  │ run LLM         │   │                   │
    │                    │  │ compare statuses│   │                   │
    │                    │  └────────┬────────┘   │                   │
    │                    └───────────┼────────────┘                   │
    │                                │                                │
    │          ┌─────────────────────┼──────────────────┐            │
    │          │                     │                  │            │
    │      DELIVERED              REJECTED           STALLED         │
    │          │                     │                  │            │
    │          │               CLIENT reclaims    CONTRACTOR         │
    │          │               full escrow        resubmits          │
    │          │                     │            (if budget left)   │
    │          │               RECLAIMED               │             │
    │          │                                   ────┘             │
    │          │                                (loops back to       │
    │          │                                 SUBMITTED)          │
    │          │                                                      │
    │          │◀──────── release_payment() ─────────────────────────│
    │          │          Contractor receives                         │
    │          │          exact escrowed amount                       │
    │          │          State: RELEASED                             │
```

<br/>

---

## Contract Architecture

### State machine

<br/>

<div align="center">

```
DRAFT ──fund──▶ FUNDED ──open──▶ OPEN ──submit──▶ SUBMITTED
                                                       │
                                             adjudicate_engagement()
                                                       │
                              ┌────────────────────────┼────────────────────────┐
                              ▼                        ▼                        ▼
                          DELIVERED               REJECTED                  STALLED
                              │                        │                        │
                    release_payment()          reclaim_funds()          resubmit or
                              │                        │                reclaim (exhausted)
                              ▼                        ▼
                          RELEASED               RECLAIMED
```

</div>

<br/>

Other exits: a `FUNDED` engagement can be reclaimed by the client at any time; an `OPEN` engagement with no delivery can be reclaimed once the deadline has passed; a `STALLED` engagement can be reclaimed once the repair budget is used **or** the 7-day repair window ends.

### Storage records

Two on-chain records make up the full engagement:

**`Engagement`**: created by `create_engagement`. The policy fields (`sow_json`, `checklist_json`, `criteria_json`, `deadline_iso`, `deadline_epoch`, `max_repairs`, `amount`, `client`, `contractor`) are permanently frozen. Only `state`, `revision`, `first_submitted_at`, `stalled_at`, `adjudication_json` and the receipts change.

**`Packet`**: created by `submit_delivery` or `resubmit_delivery`, keyed `<engagement_id>#<revision>`. Each revision is a new record; once a packet reaches a terminal state it is never overwritten. A paged index (`engagement_order`) backs the list view, so reads stay bounded.

### Six frozen acceptance criteria

<br/>

<div align="center">

| Criterion ID | What it checks | Decided by |
|---|---|---|
| `engagement_identity` | Work product contains `engagement:<id>` | code |
| `contractor_binding` | Work product contains `contractor:<address>` | code |
| `scope_completeness` | Work product covers every deliverable in the SOW | validators |
| `quality_standard` | Evidence meets the frozen quality requirement | validators |
| `timeline_compliance` | First submission time is within the locked deadline | code |
| `acceptance_checklist` | Work product satisfies every item of the client's checklist | validators |

</div>

<br/>

All six must be `SATISFIED` for a `DELIVERED` verdict. Any single `VIOLATED` criterion yields `REJECTED`. Any `UNRESOLVED` criterion (unavailable document, missing marker, ambiguous evidence, malformed model reply) yields `STALLED`. A late first delivery is `VIOLATED` by code, whatever the model says. Every verdict value is traced to a branch that can produce it (`docs/contracts.md`).

### Equivalence strategy

A hand-written validator re-runs the whole evaluation (fetch plus model call) and requires every one of the five leader-produced statuses (two marker checks plus three judged criteria) to equal its own. There is no tolerance band: the statuses are discrete choices and a difference changes the payout. `observed_fact`, witness ids and reasoning are stored for audit but never affect consensus or payment. The leader returns only stable decision fields.

### Nondet block structure

```python
# Deterministic body: copy everything the nondet block needs into plain values
requirements = dict(json.loads(eng.criteria_json))
sow_docs     = list(json.loads(eng.sow_json))
work_docs    = list(json.loads(packet.work_json))

def leader_fn():
    return _evaluate(eid, contractor_key, requirements, sow_docs, checklist_docs, work_docs)

def validator_fn(leaders_res) -> bool:
    if not isinstance(leaders_res, gl.vm.Return):
        return False
    mine = leader_fn()                      # re-fetch, re-run
    # compare every judged status exactly
    ...

result = gl.vm.run_nondet_unsafe(leader_fn, validator_fn)   # positional
# Storage writes happen below this line; timeline is derived from stored times
```

<br/>

---

## Security

### Threat model

<br/>

<div align="center">

| Threat | Mitigation |
|---|---|
| Client rewrites criteria after funding | SOW, checklist, criteria, deadline and repair budget are frozen at `create_engagement`, before `fund_engagement` |
| Contractor self-declares DELIVERED | Outcome derived from criterion statuses in code; model prose never feeds the rule |
| Contractor controls the evidence of acceptance | There is no contractor-supplied acceptance log: the checklist is client-locked before funding |
| Model injects extra JSON keys (`payout`, `outcome`) | The reply must contain exactly `{criteria, reasoning}` with exactly one entry per judged criterion; anything else becomes `UNRESOLVED` |
| Prompt injection via document content | Documents are sanitised and wrapped as labelled untrusted DATA; the charter says to ignore instructions inside them |
| Document substitution between commit and adjudication | Evidence is a commit-pinned file; the URL is derived from (repo, 40-hex commit, path), never accepted from a caller |
| Replaying another engagement's deliverable | The work product must contain the engagement and contractor markers, checked in code |
| Late delivery argued as on time | `timeline_compliance` is computed from stored submission time against the locked deadline |
| Single validator manipulation | Multiple validators each re-fetch and re-run; exact agreement on every judged status |
| Contractor resubmits indefinitely | `max_repairs` and a 7-day window are frozen; past either, the client can reclaim |
| Double payment / double reclaim | State is written before any transfer; terminal states reject further fund-moving calls |
| Funds locked forever | Every state holding funds has a bounded exit (see below) |
| Integer overflow / precision error | Money is `u256`; no `float()`; `emit_transfer(value=...)` |

</div>

<br/>

### Fund path audit

Every path that moves escrowed funds is bounded and tested with the exact amount and recipient:

```
FUNDED                 reclaim_funds()    exact amount to client       state = RECLAIMED
OPEN (no delivery)     reclaim_funds()    after the deadline           state = RECLAIMED
DELIVERED              release_payment()  exact amount to contractor   state = RELEASED
REJECTED               reclaim_funds()    exact amount to client       state = RECLAIMED
STALLED (exhausted or window expired)  reclaim_funds()  exact amount to client  state = RECLAIMED
SUBMITTED              adjudicate_engagement()  callable by anyone, no party can block it
```

No fund path can be reached twice. No fund path accepts a caller-supplied amount. Transfers use `emit_transfer`, which is finalization-only for external recipients, so payouts land after the appeal window.

<br/>

---

## Quick Start

### Prerequisites

- Python 3.12
- Node 20 (for the frontend)

```bash
# Clone
git clone https://github.com/Siriron/servicepact
cd servicepact

# Contract tests (no chain, no Docker, no LLM key)
pip install "genlayer-test==0.29.2" genvm-linter
genvm-lint download --version v0.2.16
genvm-lint check contracts/service_pact.py
pytest tests -q -p no:cacheprovider

# Frontend
npm install
npm run dev
```

Expected output of the tests:

```
100 passed in Xs
```

The tests pin GenVM v0.2.16 (`sdk_version` in every deploy). Unpinned, `genlayer-test` resolves GitHub's latest GenVM release, which can be a release candidate whose bundle is not published.

<br/>

---

## Testing

### Test suite: 100 direct-mode tests that execute the real contract

<br/>

<div align="center">

| Group | What it proves |
|---|---|
| `create_engagement` validation | Duplicate ids, bad amount, bad deadline, missing criteria, bad address, same client and contractor, and every manifest shape that is not an identifier-derived commit-pinned document |
| Fund and open | Exact value required; only the client may fund and open; no double funding |
| `submit_delivery` | Only the contractor, only once, only when OPEN; a work document cannot shadow a client document id |
| Every verdict value | `DELIVERED`, `REJECTED` (each judged criterion), `STALLED` (each judged criterion); VIOLATED beats UNRESOLVED |
| Code-computed criteria | Late first delivery is rejected even if the model is happy; missing engagement or contractor marker stalls; another engagement's deliverable does not bind |
| Evidence handling | HTTP 403/404/500 and unavailable client documents become a failure marker, never evidence; documents reach the model wrapped as untrusted data |
| Malformed model output | Non-JSON, wrong shape, bad status, unknown witness, duplicate criterion, empty reasoning: all stall, nothing pays out |
| Validator agreement | Agrees on a match; rejects a difference in any single judged criterion; rejects different binding evidence, unreachable evidence, an errored leader, a malformed leader result |
| Funds | Exact amount and recipient for release and reclaim; no double payout; access control by sender |
| Bounded exits | Funded and never opened; opened and never delivered; budget exhaustion; repair-window expiry |
| Multi-step flows | Four-revision repair flow ending in payment; first submission time kept across repairs |
| Replay and rollback | `snapshot`/`revert`; independent engagements; storage-pickling check |
| Time helper | Calendar oracle cases including 2100 not being a leap year; malformed input returns 0 |

</div>

<br/>

Planted bugs (the `status_code` mistake, a validator that skips agreement, a missing timeline check, a century leap-year bug, a wrong payout recipient, a removed STALLED exit) each fail the suite. The tests mock the web and the model; they do not prove real LLM behaviour, real network behaviour or real multi-node timing.

### Running specific groups

```bash
# All tests
pytest tests -q -p no:cacheprovider

# One test
pytest tests -v -k "test_delivered_when_everything_is_satisfied" -p no:cacheprovider

# Fund-path and exit tests only
pytest tests -v -k "release or reclaim or exit or stalled" -p no:cacheprovider
```

<br/>

---

## Deployment

The contract is deployed to StudioNet at [`0xDFC205f0AB2D2377A898D84A5360A2Baa661F885`](https://explorer-studio.genlayer.com/address/0xDFC205f0AB2D2377A898D84A5360A2Baa661F885) and `CONTRACT_ADDRESS` in `src/config/chains.ts` points to it. To redeploy, follow the steps below and update that constant.

### 1. Lint the contract

```bash
pip install genvm-linter
genvm-lint check contracts/service_pact.py
```

### 2. Deploy to StudioNet (gasless)

Deploy `contracts/service_pact.py` from studio.genlayer.com (Run and Debug), or with the GenLayer CLI:

```bash
npm install -g genlayer
genlayer network set studionet      # Chain ID 61999, RPC https://studio.genlayer.com/api
genlayer deploy --contract contracts/service_pact.py
genlayer schema <address>
```

### 3. Create your first engagement

Manifests are JSON arrays of `{document_id, repo, commit, path}`. The commit must be a full 40-character SHA.

```bash
genlayer write <address> create_engagement --args '[
  "eng-001",
  "0xContractorAddress",
  1000000,
  "[{\"document_id\":\"sow1\",\"repo\":\"owner/spec\",\"commit\":\"<40-hex>\",\"path\":\"sow.md\"}]",
  "[{\"document_id\":\"check1\",\"repo\":\"owner/spec\",\"commit\":\"<40-hex>\",\"path\":\"checklist.md\"}]",
  "{\"engagement_identity\":\"...\",\"contractor_binding\":\"...\",\"scope_completeness\":\"...\",\"quality_standard\":\"...\",\"timeline_compliance\":\"...\",\"acceptance_checklist\":\"...\"}",
  "2030-01-01T00:00:00Z",
  2
]'
```

The in-app **Test guide** (`/guide`) runs six scenarios end to end with pre-filled forms and a copyable transaction log, and is the easier route.

### 4. Debug a failed transaction

```bash
genlayer receipt <txHash> --stdout --stderr
genlayer schema <address>
genlayer call <address> get_engagement --args '["eng-001"]'
```

### 5. Deploy the frontend

`npm run build`, then deploy `dist` to Vercel (`vercel.json` already rewrites to `index.html`).

<br/>

---

## Project structure

```
contracts/service_pact.py            The GenVM contract
tests/test_direct.py                 Direct-mode tests that execute the real contract
pytest.ini                           Makes unused test mocks fail the suite
evidence/fixtures/                   Public documents used by the in-app test guide
scripts/check_frontend_vs_schema.py  Checks frontend calls against the real ABI
.github/workflows/ci.yml             Lint + tests + build on every push
src/                                 React + Vite app (includes /guide and /docs routes)
docs/                                architecture.md, deployment.md, contracts.md, frontend.md
LICENSE                              MIT
```

<br/>

---

## Docs

<br/>

<div align="center">

| Document | Description |
|---|---|
| [`docs/architecture.md`](docs/architecture.md) | Boundary, evidence sources, criteria, validator rule, state machine |
| [`docs/contracts.md`](docs/contracts.md) | Method table, bounded exits, verdict reachability, deliberate gaps |
| [`docs/deployment.md`](docs/deployment.md) | Deployment steps and exactly what the tests do and do not prove |
| [`docs/frontend.md`](docs/frontend.md) | Client setup, receipt handling, routes and the test guide |

</div>

<br/>

---

## Playbook compliance

<br/>

<div align="center">

| Rule | Status |
|---|---|
| Pinned runner hash on line 1 (`1jb45…`, stable v0.2 API) | ✅ |
| `@allow_storage` + `@dataclass` for all structs | ✅ |
| `TreeMap` for key-value storage; no `DynArray` construction | ✅ |
| Views and writes return `json.dumps()` strings; zero `float()` | ✅ |
| `run_nondet_unsafe(leader_fn, validator_fn)` positional; both nested; no `self.` inside | ✅ |
| `leader_fn` returns a parsed dict; `validator_fn` checks `isinstance(…, gl.vm.Return)` first | ✅ |
| Nondet block touches no storage; inputs copied to plain values first | ✅ |
| Module-level constants only; no type-annotated class-body constants | ✅ |
| `emit_transfer(value=)` for value moves; never `.send()` | ✅ |
| No `status_code`; HTTP response uses `.status` | ✅ |
| Timestamps parsed from the ISO string with integer arithmetic | ✅ |
| Evidence fetched contract-side from identifier-derived URLs; untrusted input sanitised and wrapped | ✅ |
| Every verdict value traced to a branch that can produce it | ✅ |
| All locked fields frozen before funding | ✅ |
| Bounded exit on every fund path | ✅ |
| `genvm-lint check` passes | ✅ |
| 100 direct tests with the SDK pinned to v0.2.16; planted bugs fail them | ✅ |
| Live StudioNet deployment | ✅ deployed (constructor finalized) |
| Live adjudication consensus | ✅ observed (STALLED, repair, DELIVERED; marker replay guard) |
| Live `release_payment` | ✅ finalized, returned `released: 1`, state RELEASED (recipient balance not checked) |
| Live `reclaim_funds` after repair-budget exhaustion | ✅ STALLED (revision 2 of 2) then RECLAIMED, 1 returned to the client |
| Live deadline and repair-window exits | ⏳ not yet observed (tests only) |

</div>

<br/>

---

## License

MIT — see [`LICENSE`](LICENSE)

<br/>

<div align="center">

<sub>Built with GenLayer · AI-validator consensus · trustless settlement</sub>

</div>
