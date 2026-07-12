# Security Review

## Reviewed

- Authentication throttling, active-session boundary, role/assignment authorization, self-review prohibition, and Administrator-only Resolution/report/audit access.
- Docket/PIN enumeration resistance and redacted telemetry.
- Private document generation/storage/checksum/view authorization and queue retry behavior.
- Audit append-only enforcement and persistence/presentation redaction.
- Report filter allowlists, output escaping, PDF isolation, and CSV formula protection.
- PostgreSQL constraints, mass assignment, CSRF, session handling, headers, production debug/secrets, dependencies, backups, and operational endpoints.

## Resolved In M8

- Added `nosniff`, frame denial, same-origin referrer policy, restricted browser permissions, and production HSTS/CSP.
- Added a release check that rejects debug mode, HTTP URLs, missing keys, non-PostgreSQL/non-SSL database configuration, synchronous queues, transient cache, insecure sessions, public document disks, and invalid monitoring thresholds.
- Added a minimal no-store readiness response that exposes no dependency names or errors.
- Dedicated legal-document queue now has three attempts, a 120-second timeout, failure-on-timeout, and worker shutdown grace longer than the job timeout.
- Automated Composer/npm audits and browser authorization checks are release gates.

## Owner Release Decisions Still Required

- Whether MFA is required for Administrators and reviewers.
- Approved password/reset-delivery policy.
- Legal retention, breach-response ownership, data residency, and backup RPO/RTO.
- Final production domain, hosting/network topology, trusted proxy ranges, monitoring destination, and encrypted backup destination.

No new authentication workflow or retention behavior was invented because those decisions require owner approval.
