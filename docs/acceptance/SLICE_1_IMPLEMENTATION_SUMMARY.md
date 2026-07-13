# Post-M8 Acceptance Remediation - Slice 1

## Scope

This slice records and implements the approved Case/Subpoena model and restores the validated legacy Process Server case-list workflow. No other parity gap or production behavior is changed.

## Domain Decisions Preserved

- A Case is the primary domain record.
- A Subpoena is the versioned reviewable document and approval workflow associated with its Case; it is not a separate case entity.
- Subpoena Status, Resolution Status, and Resolution Verdict remain separate concepts with their exact approved values.

## Process Server Behavior

- Added dedicated `GET /process-server/cases` navigation and authorization.
- Restored a searchable, sortable, server-paginated, read-only case list.
- The list contains Docket Number, Crime/Case, Complainant, Respondent, Police Station, Date, Assigned Prosecutor, Resolution Verdict, Court, and Verdict Date.
- PIN values and case-detail or mutation controls are not exposed.
- Non-final Resolution data is projected as `Pending`; concealed Court and Verdict Date values do not affect search or sorting.
- Case, Subpoena, Resolution, document, user, offense, report, and audit mutations remain denied at the server boundary.

## Demo And Test Coverage

- The local demo fixture confirms the Process Server can view all six representative Cases.
- Feature coverage verifies navigation data, search, all ten sort fields, pagination, concealed PIN/internal Resolution values, and mutation denial.
- The cross-role Playwright expectation now verifies positive Process Server case-list access and absence of detail controls.

## Verification

- Composer validation, Pint, PHPStan, ESLint, TypeScript, and Vite build passed.
- Composer/npm dependency audits and tracked-secret scan passed.
- PostgreSQL migration rollback/reapply, queue worker, backup/restore, release configuration, and M6/M7 PDF checks passed.
- PostgreSQL-backed PHPUnit: 68 tests, 844 assertions passed.
- Playwright cross-role/public/accessibility: 3 tests passed.
