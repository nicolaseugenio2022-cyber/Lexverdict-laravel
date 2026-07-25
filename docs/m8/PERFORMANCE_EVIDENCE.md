# Performance Evidence

## Profile

- Date: 2026-07-12
- Environment: local PHP/PostgreSQL 18, synthetic test records, production build
- Volume: 250 approved current Resolutions linked to 250 Cases and one shared Case Type
- Case Report result: 250 eligible Cases
- Eloquent query count: 4
- Measured report query/aggregation time: 96.47 ms in the final full-suite run
- Automated ceiling: 4 queries and 2,000 ms
- PostgreSQL plan check: `resolutions_status_verdict_verdict_date_index` exists with the required `(status, verdict, verdict_date)` columns, and the representative report predicate uses an index-backed plan with sequential scans disabled. The assertion does not depend on PostgreSQL choosing one exact eligible index.

The synthetic volume exceeds the owner-identified legacy mock Resolution count. Production volume remains an operational input; rerun the same M8 profile at staging volume before go-live when that volume is known.
