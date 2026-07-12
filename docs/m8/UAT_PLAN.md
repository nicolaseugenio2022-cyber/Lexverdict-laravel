# User Acceptance Test Plan

Use synthetic staging records only. Record tester, role, date, result, evidence, and issue link for each scenario.

## Administrator

- Sign in/out; manage users and one-to-one assignments.
- Create/revise a Case, review no Subpoena solely as Administrator, submit/revise a Resolution, approve/deny pending Resolutions.
- Generate Case Report filters, verify totals, export PDF/CSV, search User Action Logs, and confirm redaction.

## Secretary

- See only the assigned Prosecutor's Cases; create/revise a Case with exact party/Case Type validation.
- See denial comments; submit/revise eligible Resolutions; receive no review, report, audit, user, or assignment controls.

## Prosecutor

- See assigned Cases and pending Subpoena review queue.
- Approve/deny only assigned non-self-created pending Subpoenas; confirm denial comment and stale-revision behavior.
- Receive no Resolution review, report, audit, user, or assignment controls.

## Process Server

- Confirm the current approved read-only scope exposes no mutation controls or unauthorized Case records.

## Public

- Verify exact docket/PIN success projection for `For Filing` and `Dismissed` and generic failure for invalid credentials.
- Confirm no extra public fields and no browser caching.

## Accessibility And Operations

- Complete every critical action by keyboard, verify visible focus, zoom to 200%, and perform a screen-reader pass.
- Verify Subpoena PDF against the approved legal sample and Case Report PDF legibility.
- Witness queue processing, readiness monitoring, backup/restore evidence, and rollback rehearsal.

Final acceptance requires signed approval from the project owner and designated representatives for each staff role.
