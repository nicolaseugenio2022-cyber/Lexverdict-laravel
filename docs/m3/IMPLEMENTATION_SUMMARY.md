# M3 Implementation Summary

M3 implements the approved case UI and scoped access slice only.

Implemented:

- Typed Inertia/React case creation and revision form with dynamic parties.
- Server-side validation for case dates, hearing-date order, offenses, adult parties, approved party roles, and approved sex/suffix values.
- Administrator case creation for a selected active Prosecutor.
- Secretary case creation that continues to derive ownership from the current Prosecutor-Secretary assignment.
- Server-paginated case list with search, status filter, and allowlisted sorting.
- Case detail view with parties, offenses, current revision, one-time created PIN display after creation, and timeline entries.
- Revision/edit flow with optimistic conflict detection using `revision_number`.
- Scoped case access:
  - Administrator can list, view, create, and revise cases.
  - Prosecutor can list and view only assigned cases.
  - Secretary can list, view, create, and revise only cases under the current assigned Prosecutor.
  - Process Server has no case-management access in M3 because service-scoped subpoena visibility belongs to later subpoena/service milestones.
- Role-aware navigation for case management.
- M3 feature tests for Administrator creation, Secretary assignment-derived creation, scoped list/detail access, revision conflict handling, unpaired Secretary denial, and Process Server denial.

Not implemented in M3:

- Subpoena approval/denial workflow.
- Denial comments.
- Resolution workflow.
- Process Server service records or service queue.
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
