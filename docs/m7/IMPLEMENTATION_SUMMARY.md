# M7 Implementation Summary

M7 implements the approved Administrator-only Case Report and User Action Logs scope.

## Implemented

- Dedicated report query over current Resolutions whose exact `Status` is `Approved`, exact `Verdict` is `For Filing` or `Dismissed`, and current decision proves approval of the current revision.
- Legacy Case Report filters for date range, verdict, one or more Case Types, Police Station, Sex, and Age Group.
- Totals for Total Cases, Cases Filed, Cases Dismissed, and Top Case Type, plus Crime, Verdict, Sex, Age Group, and top Police Station distributions.
- Exact approved Age Group labels: `0-17`, `18-30`, `31-45`, `46-60`, and `61+`.
- Responsive Administrator report UI with accessible visual bars and tabular equivalents.
- A4 landscape `LexVerdict - Case Report` PDF and row-level CSV export using approved report fields, no-store responses, CSV formula protection, and export audit events.
- Administrator-only User Action Logs with allowlisted search, field filter, sort, pagination, detail view, and no-store responses.
- Recursive credential, PIN, token, session, contact, birth-date, and address redaction before audit persistence and again when presenting existing audit events.
- Targeted PostgreSQL report-filter and audit-query indexes without introducing a report view or materialized aggregate.

## Not Implemented

- Process Server service-attempt mutation.
- Deployment/cutover work or any M8+ feature.

## Verification

- `composer validate --no-check-publish`
- `composer format -- --test`
- `composer analyse -- --no-progress`
- `npm run lint`
- `npm run typecheck`
- `npm run build`
- PostgreSQL migration fresh, four-migration rollback, and reapply checks
- `php artisan test`
- Automated A4 landscape Case Report PDF structure, required-text, and visible-page-bound verification
