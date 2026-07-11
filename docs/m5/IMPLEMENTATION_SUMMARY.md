# M5 Implementation Summary

M5 implements the legacy-authoritative Resolution workflow only.

## Implemented

- Separate exact Resolution `Verdict` values: `For Filing`, `Dismissed`, `Pending`.
- Separate exact Resolution `Status` values: `Pending`, `Approved`, `Denied`.
- One current Resolution identity per approved Subpoena/case with immutable revision and decision history.
- Administrator and current-assignment-scoped Secretary submission/revision authority.
- Administrator-only pending Resolution approval/denial authority, preserving legacy Administrator self-review behavior.
- Submission excludes the stored `Pending` verdict; `For Filing` requires Court and `Dismissed` clears Court.
- Pending or denied Resolution revision returns `Status` to `Pending`; approved Resolutions are not editable.
- Exact review transitions: `Pending` to `Approved` and `Pending` to `Denied`.
- Required denial comments with exact `Type = Resolution`.
- Server-owned verdict dates use the Philippine office calendar (`Asia/Manila`): submission/revision date and final approval date.
- Stale-revision conflict checks and transaction-time role/assignment revalidation.
- PostgreSQL constraints, explicit current revision/decision pointers, deferred aggregate-head integrity checks, append-only Resolution/audit triggers, and populated-history rollback protection.
- Request correlation IDs and immutable audit events for every Resolution workflow transition.
- Resolution entry/revision UI, Administrator review queue and revision comparison, denial feedback, case detail, and timeline integration.
- Reusable report-eligibility scope requiring approved `For Filing` or `Dismissed` current Resolutions.
- Synthetic Resolution factory states and complete M5 workflow/authorization/integrity tests.

## Not Implemented

- Public docket/PIN lookup.
- Subpoena PDF generation or private document storage.
- Process Server service-attempt workflow.
- Reports or audit administration UI.
- Any M6+ feature.

## Verification

- `composer validate --no-check-publish`
- `composer format -- --test`
- `composer analyse -- --no-progress`
- `npm run lint`
- `npm run typecheck`
- `npm run build`
- PostgreSQL migration fresh, two-migration M5 rollback/reapply, and populated-history refusal checks
- `php artisan test`
