# Deployment

## Status of this repository

The contract is deployed to StudioNet at `0xDFC205f0AB2D2377A898D84A5360A2Baa661F885` (https://explorer-studio.genlayer.com/address/0xDFC205f0AB2D2377A898D84A5360A2Baa661F885). The explorer shows the constructor transaction FINALIZED with GenVM result SUCCESS. Live runs on Oct 21 2026 (driven from the in-app guide, read from the explorer and the engagement page) showed: validators fetched commit-pinned files from raw.githubusercontent.com and reached consensus on three adjudications (GenVM SUCCESS, consensus Accepted); a thin one-line delivery was judged STALLED, a repair resubmission with real content was judged DELIVERED with all six criteria SATISFIED; a delivery stamped for a different engagement id was STALLED by the code-level marker check (replay guard). `release_payment` before DELIVERED reverted as designed. `release_payment` on the DELIVERED engagement was then FINALIZED with GenVM SUCCESS, returned `{"released": 1}` and moved the engagement to RELEASED; the explorer lists one related transaction for it (the recipient's balance change was not checked). **Not yet observed live:** `reclaim_funds`, the repair-exhaustion exit and the deadline and window exits.

## Steps

1. (Done for the current deployment.) Deploy `contracts/service_pact.py` to StudioNet (studio.genlayer.com, Run and Debug; it has an `__init__` with no arguments).
2. (Done.) Put the address in `CONTRACT_ADDRESS` in `src/config/chains.ts`. `FIXTURE_REPO`, `FIXTURE_COMMIT` and `REPO_URL` are already set; the fixture commit contains `evidence/fixtures/`.
3. `npm install && npm run build`; deploy `dist` to Vercel (`vercel.json` already rewrites to `index.html`).
4. (Done.) One adjudication against real commit-pinned files reached consensus. Still to do: observe a payout and a reclaim end to end.

## What the tests prove

```bash
pip install "genlayer-test==0.29.2" genvm-linter
genvm-lint download --version v0.2.16
genvm-lint check contracts/service_pact.py
pytest tests -q -p no:cacheprovider
```

100 direct-mode tests execute the real contract under the GenVM SDK **v0.2.16** (pinned in every `direct_deploy`; unpinned, `genlayer-test` resolves a v0.3 release candidate whose bundle is not published). They cover every write method, every verdict value, every field the validator compares changed in isolation, HTTP 403/404/500 and unreachable hosts, malformed model output, every fund path with exact amount and recipient, every bounded exit, a four-revision repair flow, replay and rollback, access control by sender, and a storage-pickling check.

They do **not** prove: real LLM behaviour, real network behaviour, real multi-node consensus timing, or how StudioNet surfaces errors. Planted bugs (the `status_code` mistake, a validator that skips agreement, a missing timeline check, a century leap-year bug, a wrong payout recipient, a removed STALLED exit) each fail the suite.

StudioNet is a temporary test network: deployed addresses may not survive resets. The tests, not an address, are the proof of behaviour.
