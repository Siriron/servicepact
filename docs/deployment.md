# Deployment

## Status of this repository

The contract is **not deployed**. `CONTRACT_ADDRESS` in `src/config/chains.ts` is empty and the app says so. Nothing in this repository has been run on a live network.

## Steps

1. Deploy `contracts/service_pact.py` to StudioNet (studio.genlayer.com, Run and Debug; it has an `__init__` with no arguments).
2. Put the address in `CONTRACT_ADDRESS` in `src/config/chains.ts`. `FIXTURE_REPO`, `FIXTURE_COMMIT` and `REPO_URL` are already set; the fixture commit contains `evidence/fixtures/`.
3. `npm install && npm run build`; deploy `dist` to Vercel (`vercel.json` already rewrites to `index.html`).
4. In Run and Debug, send one adjudication against real commit-pinned files and confirm the leader and validators agree and the stderr is empty.

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
