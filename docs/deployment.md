# Deployment

## Status of this repository

The contract is deployed to StudioNet at `0xDFC205f0AB2D2377A898D84A5360A2Baa661F885` (https://explorer-studio.genlayer.com/address/0xDFC205f0AB2D2377A898D84A5360A2Baa661F885). The explorer shows the constructor transaction FINALIZED with GenVM result SUCCESS. Live runs on Oct 21 2026 (driven from the in-app guide, read from the explorer and the engagement page) showed: validators fetched commit-pinned files from raw.githubusercontent.com and reached consensus on three adjudications (GenVM SUCCESS, consensus Accepted); a thin one-line delivery was judged STALLED, a repair resubmission with real content was judged DELIVERED with all six criteria SATISFIED; a delivery stamped for a different engagement id was STALLED by the code-level marker check (replay guard). `release_payment` before DELIVERED reverted as designed. `release_payment` on the DELIVERED engagement was then FINALIZED with GenVM SUCCESS, returned `{"released": 1}` and moved the engagement to RELEASED; the explorer lists one related transaction for it (the recipient's balance change was not checked). **Not yet observed live:** `reclaim_funds`, the repair-exhaustion exit and the deadline and window exits.

## Steps

1. (Done for the current deployment.) Deploy `contracts/service_pact.py` to StudioNet (studio.genlayer.com, Run and Debug; it has an `__init__` with no arguments).
2. (Done.) Put the address in `CONTRACT_ADDRESS` in `src/config/chains.ts`. `FIXTURE_REPO`, `FIXTURE_COMMIT` and `REPO_URL` are already set; the fixture commit contains `evidence/fixtures/`.
3. `npm install && npm run build`; deploy `dist` to Vercel (`vercel.json` already rewrites to `index.html`).
4. (Done.) One adjudication against real commit-pinned files reached consensus. Still to do: observe a payout and a reclaim end to end.

## Observed live runs (StudioNet, Oct 21 2026)

Driven from the in-app guide; results read from the explorer and the engagement page. All transactions below are GenVM SUCCESS with consensus Accepted unless stated. The DELIVERED adjudication of `g-paid-cua89u` (revision 2, all six criteria SATISFIED) and its repair resubmission are listed on the [contract's explorer page](https://explorer-studio.genlayer.com/address/0xDFC205f0AB2D2377A898D84A5360A2Baa661F885).

| Engagement | Call | Transaction | Result |
|---|---|---|---|
| `g-paid-cua89u` | `create_engagement` | [`0x866bca02…`](https://explorer-studio.genlayer.com/tx/0x866bca02ec4fb3d4b468c1271d3cd0c7a7ff5f3744739d12b6c800aa79afb4ee) | returned state DRAFT |
| `g-paid-cua89u` | `fund_engagement` | [`0x34718868…`](https://explorer-studio.genlayer.com/tx/0x3471886834acaed610fac14a932f30e9b47510ded4f886c411d505bcfb2c8759) | SUCCESS |
| `g-paid-cua89u` | `open_engagement` | [`0x6c432ec3…`](https://explorer-studio.genlayer.com/tx/0x6c432ec32ec0b310668d70bfdb1752f3770c8f27697e9aa99c41cab77a84baef) | SUCCESS |
| `g-paid-cua89u` | `submit_delivery` (thin one-line delivery) | [`0x55d41f98…`](https://explorer-studio.genlayer.com/tx/0x55d41f9805f2233ce9d1a8fcbd3a200f82ca8115e8b4de8836101ff8f0b47f2c) | SUCCESS |
| `g-paid-cua89u` | `adjudicate_engagement` | [`0x6921bd05…`](https://explorer-studio.genlayer.com/tx/0x6921bd05cb825f4217b3e5efc02d86d7c3708cdf282c8f6f0003c77ef127065e) | outcome STALLED (scope, quality, checklist UNRESOLVED) |
| `g-paid-cua89u` | `release_payment` before DELIVERED | [`0x2ba6d278…`](https://explorer-studio.genlayer.com/tx/0x2ba6d278b7a68d4f5b9a551edb9dc06d0a9e92e03c71cf70c7bbd81ff04556e0) | ERROR, reverted as designed |
| `g-paid-cua89u` | `release_payment` after DELIVERED | [`0x3637901f…`](https://explorer-studio.genlayer.com/tx/0x3637901f0f38002f555b5f142ef2f42f9478c01e83e2cda4085a91cf45f57650) | FINALIZED, SUCCESS, returned released 1, state RELEASED |
| `g-paid-feukdu` | `create_engagement` | [`0xe143a039…`](https://explorer-studio.genlayer.com/tx/0xe143a039b89bff5332a92b4e06c629a1d6d13bfbbcd9ef93102aba1bc1b3e6b3) | SUCCESS |
| `g-paid-feukdu` | `submit_delivery` | [`0xb8f03916…`](https://explorer-studio.genlayer.com/tx/0xb8f03916a47b61a88af73248ab98338ca11aa27aefc2ea60142b0c9e374c6476) | SUCCESS |
| `g-paid-feukdu` | `adjudicate_engagement` (another engagement's file) | [`0x716502ed…`](https://explorer-studio.genlayer.com/tx/0x716502ed8ba0e20e617c48612c685a2246e752b33adaf400f3714e9a4317c66c) | STALLED: engagement_identity UNRESOLVED (replay guard) |
| `g-paid-feukdu` | `resubmit_delivery` | [`0xe61c093b…`](https://explorer-studio.genlayer.com/tx/0xe61c093b88bd2fba081f48de3e6a39f05f1d555a863d7bcc063a20258bded435) | SUCCESS |

Not observed live: `reclaim_funds`, the repair-exhaustion exit and the deadline and window exits (covered by the direct-mode tests only).

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
