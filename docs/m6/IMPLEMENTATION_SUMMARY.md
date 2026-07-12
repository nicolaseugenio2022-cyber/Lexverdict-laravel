# M6 Implementation Summary

M6 implements the project-owner-approved legacy Public Lookup and official Subpoena PDF only.

## Implemented

- Exact docket number plus six-digit PIN lookup using the existing PIN hash and a generic legacy failure message.
- IP throttling, timing-balanced unknown-docket checks, no-store responses, and append-only success/failure audit events without PIN disclosure.
- The exact approved legacy public labels and projection: `Docket Number`, `Case Type`, `Prosecutor`, `1st Hearing`, `2nd Hearing`, `Status`, `Date Filed`, and conditional `Court Location`.
- Legacy outcome mapping: approved `For Filing` and `Dismissed` Resolutions show the final outcome; every other state displays `Pending`.
- Project-owner-approved legacy Subpoena template, wording, legal-size layout, municipality grouping, date formatting, signature/return sections, PIN footer behavior, and official DOJ/BP images.
- Queued Dompdf generation from an encrypted immutable request-time legal snapshot, private local storage, atomic promotion, overlap protection, terminal failure handling, immutable version metadata, SHA-256 checksum, and byte count.
- Administrator and scoped Secretary authorization matching the legacy document links, checksum verification before inline viewing, private/no-store response headers, and request/generation/view audit events.
- PostgreSQL constraints and triggers protecting document identity, ready-state coherence, immutable generated metadata, deletion, truncation, and populated rollback.
- Case detail generation control, processing state, version history, and private PDF viewing.
- PostgreSQL-backed lookup, abuse, authorization, encryption, PDF, checksum, versioning, immutability, and rollback tests.

## Not Implemented

- Reports, report exports, or audit administration UI.
- Process Server service-attempt mutation.
- Any M7+ feature.

## Verification

- `composer validate --no-check-publish`
- `composer format -- --test`
- `composer analyse -- --no-progress`
- `npm run lint`
- `npm run typecheck`
- `npm run build`
- PostgreSQL migration fresh, three-migration rollback, and reapply checks
- `php artisan test`
- Automated legal-size, two-page structural visual-baseline comparison against the approved legacy WeasyPrint PDF, including approved image placement, legal-section anchors, return section, and PIN footer separation
