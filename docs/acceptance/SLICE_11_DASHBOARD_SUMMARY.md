# Acceptance Slice 11 - Operational Landing Experiences

## Status

Passed local implementation and verification. Git commit, push, and exact-commit CI verification are intentionally left to the project owner.

## Authority Preserved

- Slice 1.5 remains authoritative.
- Only Administrator can access and navigate to `/dashboard`.
- Secretary and Process Server continue landing on Cases.
- Prosecutor continues landing on Subpoena Review when assigned pending work exists, otherwise Cases.
- No route, redirect, policy, role, permission, workflow, status, schema, report calculation, or audit behavior changed.

## Implementation

- Replaced Administrator account-summary cards with supported operational metrics.
- Added pending-work summaries using exact existing Subpoena, Resolution Status, and Resolution Verdict values.
- Placed five prioritized case-workflow events from the existing immutable Audit Trail beside compact office and pending-work summaries so useful activity is visible in the initial desktop viewport. Generic and authentication events fill only unused preview capacity.
- Replaced generic dashboard activity wording with stored Case docket, Police Station, and actor context when the existing audit subject supports it; incomplete events retain the established fallback presentation.
- Made each dashboard activity row a single keyboard-accessible link to its existing Audit detail, emphasized the stored docket, and added shared calendar timestamps while preserving exact timestamps in Audit detail.
- Preserved the exact primary metric set and order while strengthening numeric hierarchy and reducing dashboard whitespace.
- Presented linked Pending Work rows as full-row actions without adding links to queues that do not already have an authorized destination.
- Applied reusable compact secondary and danger-outline controls to Administrator-visible inline table actions; shared Case actions retain their prior presentation for Prosecutor and Secretary roles.
- Added the approved transparent Department of Justice seal to the authenticated header without changing its height, text, spacing, navigation, or institutional color system.
- Removed redundant dashboard Quick Actions while preserving the same destinations in the existing Administrator sidebar navigation.
- Added a reusable operational-summary component to the existing Prosecutor, Secretary, and Process Server landing pages.
- Preserved Prosecutor and Secretary assignment scope through the existing Case list visibility query.
- Exposed only approved final Resolution outcomes to the Process Server summary; no delivery metric was invented because no delivery lifecycle exists in the current model.

## Supported Metrics

Administrator: Total Cases, Pending Subpoenas, Cases Ready for Filing, Pending Resolutions, Active Users, Active Prosecutors, Active Secretaries, and Active Crimes.

Prosecutor: Assigned Cases, Pending Subpoena Reviews, and Pending Resolutions for assigned Cases.

Secretary: Cases assigned to the paired Prosecutor, Pending Subpoenas, and Pending Resolutions in that scope.

Process Server: Visible Cases and approved final `For Filing` and `Dismissed` outcomes.

## Review And Verification

- One Code Reviewer pass completed; misleading unsupported filtering, contextual link names, and browser coverage findings were resolved.
- Laravel Pint: passed.
- Larastan/PHPStan: passed with no errors.
- ESLint: passed with zero warnings.
- TypeScript: passed.
- Vite production build: passed.
- PostgreSQL PHPUnit: 96 tests, 2,109 assertions passed.
- Playwright: all 5 cross-role scenarios passed.
- Changed operational surfaces passed automated axe accessibility and mobile page-overflow checks.

## Git Delivery

No commit or push was performed. Repository delivery and GitHub Actions verification remain with the project owner.
