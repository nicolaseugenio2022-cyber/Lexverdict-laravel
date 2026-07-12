# Release Checklist

## Technical Gates

- [x] Composer validation, Pint, PHPStan/Larastan
- [x] Frontend/E2E TypeScript, ESLint, production build
- [x] PostgreSQL-backed unit/feature/integration suite
- [x] Cross-role/public Playwright tests
- [x] axe accessibility audit
- [x] M6/M7 PDF verification
- [x] Dependency and secret scans
- [x] Query profile and index-plan evidence
- [x] Migration rollback/reapply
- [x] Backup, isolated restore, reconciliation, cleanup
- [x] Worker, scheduler, readiness, monitoring, deployment, and rollback artifacts

## Owner/Environment Gates

- [ ] Approve MFA and password/reset policy.
- [ ] Approve retention, breach response, data residency, backup RPO/RTO, and restore-test schedule.
- [ ] Supply production domain, hosting/network topology, proxy ranges, monitoring destination, encrypted backup destination, and secrets.
- [ ] Complete staging UAT and accessibility assistive-technology pass.
- [ ] Approve the legal Subpoena visual sample and report outputs in staging.
- [ ] Record signed stakeholder acceptance and go-live/rollback authority.

No production release may proceed while an Owner/Environment gate is unchecked.
