# LexVerdict Laravel

Modern Laravel rebuild of the LexVerdict prosecutor office case-management system.

## Current Milestone

M8 - Hardening, migration, and release readiness.

This repository contains the completed M0-M8 implementation. M8 adds release configuration checks, security/accessibility/cross-role verification, operational monitoring, queue workers, backup/restore and rollback evidence, and release/UAT/training runbooks without changing approved domain behavior.

No M9 exists. Deferred features remain out of scope until separately approved.

## Authoritative Documentation

Read these before implementation:

- `C:\Obsidian\Nicolas Second Brain\Projects\Active\LexVerdict\Overview.md`
- `C:\Obsidian\Nicolas Second Brain\Projects\Active\LexVerdict\Architecture.md`
- `C:\Obsidian\Nicolas Second Brain\Projects\Active\LexVerdict\Database.md`
- `C:\Obsidian\Nicolas Second Brain\Projects\Active\LexVerdict\Implementation Plan.md`
- `C:\Obsidian\Nicolas Second Brain\Projects\Active\LexVerdict\AI Context.md`
- `C:\Obsidian\Nicolas Second Brain\Projects\Active\LexVerdict\Domain Preservation Rule.md`

The read-only legacy reference is:

- `C:\Projects\LexVerdict`

## M0 Files

- `docs/m0/DOMAIN_CATALOG.md`
- `docs/m0/ADR-0001-inertia-monolith.md`
- `docs/m0/ADR-0002-laravel-owned-auth.md`
- `docs/m0/ADR-0003-postgresql-uuid-history.md`
- `docs/m0/ADR-0004-prosecutor-secretary-assignment.md`
- `docs/m0/ADR-0005-private-document-storage.md`
- `docs/m1/IMPLEMENTATION_SUMMARY.md`
- `docs/m2/IMPLEMENTATION_SUMMARY.md`
- `docs/m3/IMPLEMENTATION_SUMMARY.md`
- `docs/m4/IMPLEMENTATION_SUMMARY.md`
- `docs/m5/IMPLEMENTATION_SUMMARY.md`
- `docs/m6/IMPLEMENTATION_SUMMARY.md`
- `docs/m7/IMPLEMENTATION_SUMMARY.md`
- `docs/m8/IMPLEMENTATION_SUMMARY.md`
- `docs/m8/OPERATIONS_RUNBOOK.md`
- `docs/m8/RELEASE_CHECKLIST.md`
- `docs/m0/LOCAL_SETUP.md`

## Domain Preservation

Do not invent business rules, statuses, workflows, terminology, roles, permissions, document names, or validation behavior.

If a business rule conflicts with the legacy reference or approved documentation, stop and ask the project owner before implementing the affected feature.

## Verification

```powershell
cd C:\Projects\Lexverdict-laravel
Remove-Item Env:COMPOSER -ErrorAction SilentlyContinue
composer install
npm install
composer format -- --test
npm run lint
npm run typecheck
npm run build
composer analyse
php artisan test
composer audit
npm audit --audit-level=high
```

Release verification also includes PostgreSQL backup/restore rehearsal and the Playwright suite. See `docs/m8/OPERATIONS_RUNBOOK.md` and `docs/m8/UAT_PLAN.md`.

See `docs/m0/LOCAL_SETUP.md` for PostgreSQL test database setup.
