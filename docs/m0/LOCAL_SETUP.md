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
composer format
composer analyse
npm run lint
npm run typecheck
npm run build
php artisan test
```

M0 contains only an Inertia baseline page and architecture smoke test. Domain features must wait for M1+ approval.
