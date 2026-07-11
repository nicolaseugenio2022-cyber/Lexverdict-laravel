# M4 Implementation Summary

M4 implements the approved Subpoena review workflow only.

## Implemented

- Owner-approved review authority documented across the shared vault and domain catalog.
- Assigned-Prosecutor-only review queue with server-side search, sorting, and pagination.
- Creator self-review prohibition enforced in both HTTP authorization and the transactional domain action.
- Exact review transitions only: `Pending` to `Approved` and `Pending` to `Denied`.
- Required nonblank denial comment with exact `Subpoena` comment type.
- Immutable per-revision Subpoena decision history with reviewer and decision time, enforced by application guards and a PostgreSQL append-only trigger.
- PostgreSQL constraints for approved decision values, denial comments, one decision per revision, and a composite foreign key to the reviewed revision.
- Revision comparison with readable historical crime/party snapshots, approve/deny controls, decision history, and denial feedback UI.
- Expected-revision conflict checks prevent a stale review page from deciding an unseen revision.
- Reviewer role/activity and Secretary revision scope are revalidated under transaction locks.
- Revision/resubmission returns the current Subpoena status to `Pending` while retaining prior decisions and comments.
- Administrator global case visibility remains available without Subpoena approve/deny authority.
- M4 authorization and workflow feature tests for all approved and denied paths.

## Not Implemented

- Resolution workflow or Resolution decisions.
- Process Server service workflow or service-attempt records.
- Public lookup, generated PDFs, reporting, or audit administration UI.
- Any status other than the approved Subpoena values `Pending`, `Approved`, and `Denied`.

## Verification

- `composer validate --no-check-publish`
- `composer format -- --test`
- `composer analyse -- --no-progress`
- `npm run lint`
- `npm run typecheck`
- `npm run build`
- PostgreSQL migration fresh, rollback, and reapply checks
- `php artisan test`
