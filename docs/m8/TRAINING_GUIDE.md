# Training Guide

## Shared

- Use only your assigned account; never share passwords or lookup PINs.
- Sign out when leaving the workstation. Report unexpected access, wrong assignments, or incorrect legal data immediately.
- Exact legal values are intentional: Subpoena `Pending`, `Approved`, `Denied`; Resolution Verdict `For Filing`, `Dismissed`, `Pending`; Resolution Status `Pending`, `Approved`, `Denied`.

## Administrator

- Maintain active staff and mandatory one-to-one Prosecutor-Secretary assignments.
- Administrator has global visibility but cannot approve/deny a Subpoena solely from that role.
- Submit/revise eligible Resolutions and approve/deny pending Resolutions. A denial requires a comment.
- Use Case Report and User Action Logs; exports contain legal data and must remain in approved storage.

## Secretary

- Create and revise Cases only for the currently assigned Prosecutor.
- Enter at least one Case Type, Complainant, and Respondent and preserve the displayed docket/PIN securely.
- Submit/revise Resolutions only after the Subpoena is `Approved`; use exact Verdict `For Filing` or `Dismissed` and provide Court only for `For Filing`.

## Prosecutor

- Review only assigned pending Subpoenas. The creator cannot review their own submission.
- Approval is `Pending` to `Approved`; denial is `Pending` to `Denied` and requires a comment.
- Reload when warned that a newer revision exists.

## Process Server

- Use only the approved read-only operational scope. No Case, Subpoena, Resolution, report, audit, or user mutation is permitted.

## Public Case Lookup

- Enter the exact Docket Number and six-digit PIN. Invalid combinations return one generic failure.
- The result shows only the client-approved legacy projection.

## Support

- Record the time, username/role, page, correlation ID if shown, and non-sensitive error description.
- Never include passwords, PINs, session values, or unapproved personal data in support messages.
