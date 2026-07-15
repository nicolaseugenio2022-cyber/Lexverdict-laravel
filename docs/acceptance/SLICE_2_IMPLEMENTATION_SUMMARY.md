# Post-M8 Acceptance Remediation - Slice 2

## Scope

- Restored Administrator-only `Manage Crimes` catalog management from the validated legacy behavior.
- Preserved the existing Offense domain model, canonical Crime Name and Law Reference values, Case-Offense references, and audited domain action.
- Corrected shared staff layout density, active navigation, content width, and wide-table overflow behavior.
- Left the Case offense checkbox workflow and all other remediation slices unchanged.

## Implementation

- Added Administrator-only offense policy, Form Requests, routes, controller, paginated search, and React/Inertia catalog UI.
- Rejects blank and case-insensitive duplicate Crime Names.
- Supports create, edit, deactivate, and restore; exposes no physical-delete route.
- Records distinct `offense.created`, `offense.updated`, `offense.deactivated`, and `offense.restored` audit events.
- Preserves `case_offenses` rows when a referenced Crime is deactivated.
- Added `Manage Crimes` only to Administrator navigation.
- Added visible and semantic active navigation, compact shared chrome, wider operational content, and keyboard-focusable labeled table scroll regions.

## Verification

- Laravel Pint: passed.
- Larastan/PHPStan: passed.
- ESLint, TypeScript, and Vite production build: passed.
- PostgreSQL PHPUnit: 75 tests, 932 assertions passed.
- Playwright: three cross-role, public-regression, and accessibility scenarios passed.
- Required specialist reviews and exact-commit GitHub Actions: pending.
