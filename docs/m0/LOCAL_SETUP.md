# Local Setup

## Requirements

- PHP 8.2 or newer with `pdo_pgsql`
- Composer
- Node.js 22 or compatible current LTS
- PostgreSQL 16 or compatible local PostgreSQL

## Install

```powershell
cd C:\Projects\Lexverdict-laravel
Remove-Item Env:COMPOSER -ErrorAction SilentlyContinue
composer install
npm install
copy .env.example .env
php artisan key:generate
copy .env.testing.example .env.testing
php artisan key:generate --env=testing
```

If `composer format` or `composer analyse` says the command is not defined, check for a stale Windows `COMPOSER` environment variable. Composer treats that variable as an alternate `composer.json` path. New terminals should use the user-level value `composer.json`; old terminals may need the process value refreshed first:

```powershell
$env:COMPOSER = "composer.json"
```

## PostgreSQL Test Database

Create a local database matching `.env.testing`:

```powershell
createdb -U postgres lexverdict_test
```

If your local PostgreSQL password is not `postgres`, update `.env.testing` locally before running tests. Do not commit secrets.

## Verification Commands

```powershell
Remove-Item Env:COMPOSER -ErrorAction SilentlyContinue
composer format -- --test
composer analyse
npm run lint
npm run typecheck
npm run build
php artisan test
```

## M8 Browser Verification

Browser tests destroy and reseed only `lexverdict_test`. Never run these commands against staging or production.

```powershell
npx playwright install chromium
php artisan migrate:fresh --env=testing --force
php artisan db:seed --class=Database\Seeders\M8E2ESeeder --env=testing --force
npm run build
npm run test:e2e
```

Use `php artisan lexverdict:release-check` with the intended staging/production environment before deployment. Use `php artisan lexverdict:health-check` for dependency and queue monitoring.

M0-M8 implementation is complete; no M9 is defined.
