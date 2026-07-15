# Post-M8 Acceptance Remediation - Slice 3

## Scope

- Restored the legacy Secretary-only `Verifying Cases` workspace.
- Preserved the approved one-to-one Prosecutor-Secretary assignment as the visibility boundary.
- Kept Subpoena Status, Resolution Status, and Resolution Verdict separate with their exact approved values.
- Left later acceptance-remediation areas and production release gates unchanged.

## Implementation

- Added a Secretary-only route, authorization gate, navigation capability, request validation, and assignment-scoped query service.
- Added accessible `Subpoenas` and `Resolutions` tabs with search, exact status filters, allowlisted sorting, pagination, empty states, denial feedback, and workflow guidance labels.
- Exposes only actions already authorized by the existing Case, Resolution, and document access services.
- Gives Secretary no Subpoena or Resolution approval/denial authority and preserves direct server-side mutation denial.
- Documented the representative localhost demo docket for every required verification state.

## Verification

- Composer validation, Laravel Pint, Larastan/PHPStan, ESLint, TypeScript, and Vite production build passed.
- Composer/npm dependency audits and the tracked-file secret scan passed.
- Full PostgreSQL regression coverage passed with 78 tests and 1,231 assertions.
- All three Playwright cross-role, public-regression, and mobile accessibility scenarios passed.
- Maxwell security review and Huygens final code review passed after all findings were resolved.
- Exact-commit GitHub Actions is pending closeout.
