# M1 Implementation Summary

## Scope

M1 implements the identity and authorization foundation only.

Implemented:

- Username-based staff authentication.
- Exact approved staff role values: `superuser`, `Prosecutor`, `Secretary`, `PS`.
- Active/deactivated account state.
- Staff profiles and Prosecutor profiles.
- Current mandatory one-to-one Prosecutor-Secretary assignments.
- Immutable assignment history rows.
- Append-only audit events for authentication, staff changes, and assignment changes.
- Administrator-only staff user management.
- Administrator-only assignment and assignment-swap management.
- Shared authenticated layout and role-aware navigation.
- M1 feature tests for authentication, role boundaries, assignment uniqueness, swap behavior, deactivation/restore restrictions, and audit events.

Not implemented:

- M2 case/subpoena data foundation.
- Docket number allocation.
- PIN behavior.
- Subpoena review.
- Resolution workflow.
- Process Server service records.
- Public lookup.
- Documents, reports, and legal workflow screens.

## Verification Status

Static and frontend checks pass. A diagnostic SQLite run of the M1 tests passes.

The configured project test suite still requires PostgreSQL at `127.0.0.1:5432` with database `lexverdict_test`, username `postgres`, and password `postgres`. This local environment currently has no running PostgreSQL service and Docker Desktop is not running, so the required PostgreSQL-backed `php artisan test` command is blocked until that service is available.

## PostgreSQL Requirement

Start a PostgreSQL service matching `.env.testing.example`, or start Docker Desktop and run a PostgreSQL 16 container:

```powershell
docker run --name lexverdict-postgres -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=lexverdict_test -p 5432:5432 -d postgres:16
```

Then run:

```powershell
$env:COMPOSER = "composer.json"
php artisan test
```
