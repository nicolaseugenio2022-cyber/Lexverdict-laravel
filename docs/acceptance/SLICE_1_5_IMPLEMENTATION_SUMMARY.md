# Post-M8 Acceptance Remediation - Slice 1.5

## Scope

This slice removes non-operational role dashboards and restores role-specific post-login landing pages. It changes no domain rule, review eligibility rule, public route, or unrelated authorization policy.

## Role Landing Behavior

- Administrator lands on Dashboard and is the only role with Dashboard navigation or route access.
- Secretary lands on Cases.
- Prosecutor lands on Subpoena Review when the existing assigned, non-self-created, `Pending` review query has work; otherwise the Prosecutor lands on Cases.
- Process Server lands on the dedicated read-only Cases list.
- Authenticated users who revisit the guest-only login page are redirected through the same role landing resolver.

## Implementation

- Centralized role landing resolution in `ResolveStaffLanding`.
- Reused `SubpoenaReviewQuery` for both queue display and pending-work detection.
- Added an Administrator-only `view-dashboard` gate to the retained Dashboard route and navigation.
- Preserved the public root and docket lookup routes.
- Added a pending Subpoena to the browser-only fixture so the Prosecutor pending-work branch is exercised end to end.

## Verification

- Security, code-quality, and acceptance reviews completed with no remaining findings.
- Composer validation, Pint, PHPStan, ESLint, TypeScript, and Vite build passed.
- Composer/npm dependency audits and tracked-secret scan passed.
- PostgreSQL migration rollback/reapply, queue worker, backup/restore, release configuration, and M6/M7 PDF checks passed.
- PostgreSQL-backed PHPUnit: 69 tests, 861 assertions passed.
- Playwright cross-role/public/accessibility: 3 tests passed.
