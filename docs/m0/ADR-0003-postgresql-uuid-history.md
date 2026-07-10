# ADR-0003: PostgreSQL, UUIDs, and Append-Only History

## Status

Accepted for M0 baseline.

## Decision

PostgreSQL is the target database. Domain records will use internal UUID primary keys where appropriate, while legal business identifiers such as docket numbers remain preserved business keys. Audit and decision history will be append-only.

## Rationale

PostgreSQL supports transactional constraints, row locking for docket allocation, indexes for reports, and reliable audit/history design.

## Domain Preservation Impact

Internal identifiers and normalized tables may improve implementation only when they map one-to-one to approved legacy meaning. Docket number, PIN behavior, statuses, verdicts, denial comments, and workflow decisions must remain traceable to the domain catalog.
