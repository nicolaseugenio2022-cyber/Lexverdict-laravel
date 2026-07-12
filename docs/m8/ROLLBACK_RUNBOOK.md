# Rollback Runbook

## Application-Only Rollback

1. Enable maintenance mode and stop new traffic.
2. Keep queue workers running until active jobs finish, then stop them through Supervisor.
3. Switch the web release symlink to the previously verified commit/artifact.
4. Restore the previous cached configuration and run `php artisan optimize:clear` followed by the previous release cache commands.
5. Restart PHP/web processes, workers, and scheduler; run liveness/readiness and role smoke tests.

## Database Rollback

- Prefer forward repair because legal history migrations deliberately refuse destructive rollback when populated.
- Roll back migrations only when the release migration is proven reversible and the affected tables are empty.
- If data/schema restoration is required, use the pre-release encrypted backup in an isolated database first, reconcile counts, obtain incident-owner approval, then execute the production restore window.
- Never use `migrate:fresh`, ad hoc deletes, or destructive Git commands in staging/production.

## Evidence

M8 reran migration fresh, rolled back the latest four empty migrations, reapplied them, and passed the full suite. Populated-history refusal tests remain active for Subpoena, Resolution, document, and audit history.
