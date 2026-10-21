# Frontend

React + Vite + `genlayer-js` 1.1.x. No backend, no `.env`.

- **Config:** `src/config/chains.ts` holds the StudioNet constants and the single plain `CONTRACT_ADDRESS` constant (empty until deployed).
- **Client:** reads use `createClient({ chain: studionet })`. Writes use `createClient({ chain: studionet, account, provider: window.ethereum })` where `account` is the plain connected address; `ensureChain()` runs before every write; `value` is always passed.
- **Receipts:** `waitForTransactionReceipt` with `{ retries: 120, interval: 4000 }`. A timeout throws `TimeoutError` carrying the hash and an explorer link. On Studio, genlayer-js 1.1.x returns a simplified receipt (`status_name`, and the execution result under `consensus_data.leader_receipt[0].execution_result`), so `interpretReceipt` reads every known shape. An explicit execution error or an UNDETERMINED/timeout status is shown as a failure; if the SDK reports no execution result, the action is not called a failure and the app re-reads on-chain state, which is the source of truth. Verdicts and payouts are labelled provisional until finalized.
- **Rate limits:** no auto-refresh and no list polling; reads happen on load and on a Refresh button; receipts are polled only for the user's own pending transaction. HTTP 429 shows a plain retry message.
- **Routes:** `/` list and open-by-id, `/new`, `/engagement/:id` (documents, criteria, adjudication, history, role-aware actions), `/guide` (guided test scenarios), `/docs`, styled 404 and an error boundary.
- **Guide:** pick a scenario, see its description and expected outcome, follow steps labelled by wallet; a step turns done only when the contract state shows its result. The run id is saved in localStorage so a run can be resumed; Refresh, New run, Clear and a copyable transaction log are provided.
- **Check:** `python scripts/check_frontend_vs_schema.py contracts/service_pact.py src` verifies every call matches the real ABI and every method is reachable.
