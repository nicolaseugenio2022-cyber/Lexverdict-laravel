# LexVerdict Laravel

Modern Laravel rebuild of the LexVerdict prosecutor office case-management system.

## Current Milestone

M4 - Subpoena review.

This repository contains the M0 technical baseline, M1 identity/authentication foundation, M2 case data foundation, M3 case UI and scoped access, and M4 Subpoena review workflow. M4 permits only the assigned Prosecutor to review a non-self-created pending Subpoena, supports only `Pending` to `Approved` or `Denied`, requires denial comments, and preserves immutable per-revision decision history.

Resolution workflow, Process Server service records, public lookup, document generation, reports, and M5+ legal workflow features are not implemented.

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
```

See `docs/m0/LOCAL_SETUP.md` for PostgreSQL test database setup.
