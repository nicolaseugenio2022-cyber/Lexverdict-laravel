# Performance Evidence

## Profile

- Date: 2026-07-12
- Environment: local PHP/PostgreSQL 18, synthetic test records, production build
- Volume: 250 approved current Resolutions linked to 250 Cases and one shared Case Type
- Case Report result: 250 eligible Cases
- Eloquent query count: 4
- Measured report query/aggregation time: 96.47 ms in the final full-suite run
- Automated ceiling: 4 queries and 2,000 ms
- PostgreSQL plan check: `resolutions_status_verdict_verdict_date_index` is selected with sequential scans disabled to prove index eligibility.

The synthetic volume exceeds the owner-identified legacy mock Resolution count. Production volume remains an operational input; rerun the same M8 profile at staging volume before go-live when that volume is known.
