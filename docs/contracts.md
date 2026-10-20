# Contract reference: `contracts/service_pact.py`

Stable GenVM v0.2 API, runner `py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6`, StudioNet.

| Method | Kind | Who | Effect |
|---|---|---|---|
| `create_engagement(engagement_id, contractor, amount, sow_manifest, checklist_manifest, criteria, deadline_utc, max_repairs)` | write | client | Locks documents, six criteria, deadline (must be in the future), repair budget (0 to 3). State DRAFT. |
| `fund_engagement(engagement_id)` | payable write | client | Value must equal `amount`. DRAFT to FUNDED. |
| `open_engagement(engagement_id)` | write | client | FUNDED to OPEN. |
| `submit_delivery(engagement_id, work_manifest)` | write | contractor | First delivery, OPEN to SUBMITTED. Records the submission time. |
| `resubmit_delivery(engagement_id, work_manifest)` | write | contractor | STALLED to SUBMITTED, within the repair budget and the 7-day window. |
| `adjudicate_engagement(engagement_id)` | write (nondet) | anyone | Validators fetch and judge. SUBMITTED to DELIVERED, REJECTED or STALLED. |
| `release_payment(engagement_id)` | write | contractor | DELIVERED to RELEASED; transfers the escrow to the contractor. |
| `reclaim_funds(engagement_id)` | write | client | Bounded exits below; transfers the escrow to the client. |
| `get_engagement(id)`, `get_packet(id, revision)`, `get_engagement_ids(offset, limit)` | view | any | JSON strings. |

A manifest is a JSON array of `{document_id, repo, commit, path}` (SOW and checklist 1 to 3 files each, work product 1 to 4). Repo is `owner/name`, commit is a full 40-hex SHA, path has no `.` or `..` segment.

## Bounded exits

| State | Exit |
|---|---|
| FUNDED | client `reclaim_funds` at any time |
| OPEN, no delivery | client `reclaim_funds` after the deadline |
| SUBMITTED | anyone `adjudicate_engagement` |
| DELIVERED | contractor `release_payment` |
| REJECTED | client `reclaim_funds` |
| STALLED | contractor repairs within the window and budget; afterwards client `reclaim_funds` |

State is written before any transfer. Transfers use `emit_transfer`, which in GenVM is finalization-only for external recipients, so payouts land after the appeal window.

## Verdict reachability

DELIVERED: all six criteria SATISFIED. REJECTED: a validator-judged criterion VIOLATED, or the first delivery was late. STALLED: any UNRESOLVED and nothing VIOLATED (fetch failure, ambiguity, missing marker, malformed model reply). Each is reached by a named test.

## Deliberate gaps

No appeal on REJECTED beyond protocol appeals; a DELIVERED escrow stays claimable indefinitely; `observed_fact` and witness ids are not compared across validators; only public GitHub text files can be evidence; guards use `assert` (live-verified style), not `UserError`.
