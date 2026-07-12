# Operations Runbook

## Deploy

1. Provision PHP 8.3+, Node 22 build tooling, PostgreSQL, HTTPS, an encrypted private document volume, Supervisor, and systemd.
2. Populate secrets from `deploy/env/production.env.example` in the platform secret manager. Never deploy the example placeholders.
3. Install with `composer install --no-dev --prefer-dist --optimize-autoloader` and `npm ci && npm run build` in the release artifact.
4. Run `php artisan lexverdict:release-check`. Do not continue on any failure.
5. Put the app in maintenance mode, run `php artisan migrate --force`, then `php artisan config:cache`, `php artisan route:cache`, and `php artisan view:cache`.
6. Point the web server at `public/`, ensure the private document disk is writable only by the app/worker account, and switch traffic atomically.
7. Install `deploy/supervisor/lexverdict-worker.conf`; run `supervisorctl reread`, `update`, and `start lexverdict-worker:*`.
8. Install/enable the scheduler service/timer under `deploy/systemd`; confirm `systemctl list-timers` shows it.
9. Run `/up`, `/health/ready`, `php artisan lexverdict:health-check`, login smoke tests, and one authorized document-generation test.
10. Exit maintenance mode only after checks pass.

## Monitor

- `/up`: process liveness.
- `/health/ready`: database/cache/private-storage readiness with a minimal response.
- `lexverdict:health-check`: dependency readiness plus queued, oldest, and failed-job thresholds; scheduled every five minutes.
- Route stderr and critical logs to the approved monitoring destination. Alert on non-200 readiness, critical health logs, worker restarts, failed jobs, backup failures, and disk capacity.
- Review `queue:failed`; retry only after root-cause correction.

## Backup And Restore

- Use `ops/backup-postgresql.ps1` before every release and at the owner-approved RPO schedule. Store dump and SHA-256 sidecar on an encrypted, access-controlled destination separate from the application host.
- Run `ops/verify-postgresql-restore.ps1` against an isolated non-production database on the owner-approved restore-test schedule.
- Restore tests reconcile critical legal/history table counts and refuse to replace an existing verification database.
- Document backup ID, checksum, operator, start/end, row counts, and cleanup in the release record.

## Queue Maintenance

- Worker queue order is `documents,default`; document jobs have three attempts and a 120-second timeout.
- `stopwaitsecs` is 130 seconds so deployments do not terminate an active legal-document render early.
- Restart workers after each release with `php artisan queue:restart` and verify Supervisor returns every process to RUNNING.
