# ADR-0004: Mandatory One-to-One Prosecutor-Secretary Assignment

## Status

Accepted project-owner decision.

## Decision

Every active Prosecutor has exactly one assigned Secretary, and every active Secretary is assigned to exactly one Prosecutor. Administrator manages assignments and changes transactionally.

## Rationale

The project owner confirmed this as the actual office rule, and it governs Secretary and Prosecutor access.

## Domain Preservation Impact

This supplements the legacy reference as an explicit project-owner rule. M0 does not implement assignment features; M1 must enforce this invariant in schema, policies, actions, tests, and audit history.
