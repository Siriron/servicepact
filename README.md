<div align="center">

<img src="./public/favicon.svg" width="88" alt="ServicePact logo" />

# ServicePact

### Escrowed freelance delivery settlement judged by GenLayer validators against locked, commit-pinned documents.

<br />

![Status](https://img.shields.io/badge/status-building-yellow?style=flat-square)
![Network](https://img.shields.io/badge/network-StudioNet-blue?style=flat-square)
![License](https://img.shields.io/badge/license-MIT-lightgrey?style=flat-square)
![Stack](https://img.shields.io/badge/stack-React%20%2B%20Vite%20%2B%20GenVM-0e7c66?style=flat-square)

<br />

**[Documentation](./docs/architecture.md)** &nbsp;·&nbsp; **[Smart Contract](./contracts/service_pact.py)**

</div>

<br />

---

## What this is

A client locks the scope, an acceptance checklist, six criteria and a deadline, then escrows the payment. The contractor delivers files pinned to a git commit. GenLayer validators fetch every file themselves and judge the delivery, and the payout follows a fixed rule over criterion statuses, never model prose. If nobody delivers, or the evidence cannot settle the claim, every escrowed amount has a bounded way out.

<br />

<div align="center">

| | |
|---|---|
| **Concept** | Escrowed freelance delivery settlement against locked documents |
| **Consensus need** | The contractor benefits from a false DELIVERED, the client from a false REJECTED |
| **Evidence source** | Commit-pinned text files on raw.githubusercontent.com, fetched by validators |
| **Network** | StudioNet (temporary test network; see Status) |

</div>

<br />

---

## How it works

**Boundary.** Client locks documents and escrows funds, then the contractor submits commit-pinned files, then validators fetch them (web request), then each validator runs a model call and compares criterion statuses exactly, then the contract updates state, then the contractor or client pulls the payout.

- **Frontend owns:** wallet connection, forms, read views, the in-app test guide, transaction states.
- **Contract owns:** locked documents and criteria, escrow, three code-computed criteria, the validator comparison rule, the outcome rule, every payout and exit.
- **External sources own:** the document text; validators re-fetch and compare it.

**Evidence sources:**

| Host | URL pattern | Fetch method | Deciding field |
|---|---|---|---|
| raw.githubusercontent.com | `/<owner>/<repo>/<40-hex commit>/<path>`, derived from (repo, commit, path), never a caller URL | `web.get` | text of each SOW, checklist and work-product file |

1. Client calls `create_engagement`, then `fund_engagement` and `open_engagement`.
2. Contractor calls `submit_delivery` with commit-pinned files that contain `engagement:<id>` and `contractor:<address>`.
3. Anyone calls `adjudicate_engagement`; validators agree exactly on the three judged criteria.
4. DELIVERED: contractor calls `release_payment`. REJECTED: client calls `reclaim_funds`. STALLED: contractor repairs within the budget and 7-day window, then the client can reclaim.

<br />

<details>
<summary><b>The three-way verdict</b></summary>
<br />

Any VIOLATED criterion gives REJECTED; otherwise any UNRESOLVED gives STALLED (fetch failure, ambiguity, missing marker, malformed model reply); otherwise DELIVERED. A late first delivery is VIOLATED by code, not by the model. STALLED exists so missing evidence never punishes either side by default.

</details>

<br />

---

## Deployed contracts

<div align="center">

| Network | Address | Explorer |
|---|---|---|
| StudioNet | not deployed yet | n/a |

StudioNet is a temporary test network: deployed addresses may not survive resets. The repository tests below are the proof of behavior, not the address.

</div>

<br />

---

## Quick start

```bash
npm install
npm run dev
```

Run the contract tests (they execute the real contract under the GenVM SDK in direct mode):

```bash
pip install "genlayer-test==0.29.2" genvm-linter
genvm-lint download --version v0.2.16
genvm-lint check contracts/service_pact.py
pytest tests -q -p no:cacheprovider
```

The tests pin GenVM v0.2.16 (`sdk_version` in every deploy). Unpinned, `genlayer-test` resolves GitHub's latest GenVM release, which can be a release candidate whose bundle is not published.

Full deployment instructions: [`docs/deployment.md`](./docs/deployment.md)

<br />

---

## Project structure

```
contracts/service_pact.py          The GenVM contract
tests/test_direct.py               Direct-mode tests that execute the real contract
pytest.ini                         Makes unused test mocks fail the suite
evidence/fixtures/                 Public documents used by the in-app test guide
scripts/check_frontend_vs_schema.py  Checks frontend calls against the real ABI
src/                               React + Vite app (includes /guide and /docs routes)
docs/                              architecture.md, deployment.md, contracts.md, frontend.md
LICENSE                            MIT
```

<br />

---

## Status

<div align="center">

![Tested](https://img.shields.io/badge/contract%20logic%20in%20direct%20mode-tested-brightgreen?style=flat-square)
![Untested](https://img.shields.io/badge/live%20StudioNet%20consensus-untested-yellow?style=flat-square)

</div>

100 tests pass with `pytest tests -q -p no:cacheprovider`, `genvm-lint check` passes, and the frontend type-checks and builds. The tests execute the real contract with the web and the model mocked; they do not prove real LLM behaviour, real network behaviour or real multi-node consensus timing. The contract has not been deployed, so nothing has been confirmed on a live StudioNet, including whether validators can fetch raw.githubusercontent.com.

<br />

---

<div align="center">

Built on [GenLayer](https://genlayer.com)

</div>
