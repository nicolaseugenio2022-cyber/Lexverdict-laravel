# M2 Implementation Summary

M2 implements the approved case data foundation only.

Implemented:

- PostgreSQL schema for offenses, cases, docket counters, case offenses, persons, case party snapshots, and subpoena revisions.
- Exact preserved values used by M2:
  - Subpoena `Status`: `Pending`, `Approved`, `Denied`
  - Involved-party `Role`: `Complainant`, `Respondent`
- Offense catalog management with case-insensitive uniqueness and audit events.
- Atomic docket allocation using the legacy prefix shape `III-09-INV-{YY}{MonthCode}` and serial ranges for multiple offenses.
- Secure six-digit PIN issuance/reset with hashed storage and one-time plain PIN return.
- Secretary case creation that derives `assigned_prosecutor_id` from the current Prosecutor-Secretary assignment and ignores submitted Prosecutor IDs.
- Initial subpoena revision snapshot and `case.created` audit event.
- M2 feature tests for assignment-derived ownership, invalid creator rejection, offense/party validation, hearing-date order, adult party validation, docket allocation, offense uniqueness, PIN reset, revision, and audit.

Not implemented in M2:

- Case creation UI.
- Case list/detail/search.
- Subpoena review workflow.
- Resolution workflow.
- Public lookup.
- PDF/document generation.
- Reports.

Verification:

```powershell
composer validate --no-check-publish
composer format -- --test
composer analyse -- --no-progress
npm run lint
npm run typecheck
npm run build
php artisan test
```

All checks passed locally against PostgreSQL.
