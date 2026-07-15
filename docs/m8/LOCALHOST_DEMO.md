# Localhost Demonstration

## Status

✅ M8 PASSED — Technical Implementation Complete

⏳ Production Release Pending — Owner/Environment Approval

The unchecked gates in `RELEASE_CHECKLIST.md` remain mandatory before any future staging or production deployment. They are intentionally deferred for localhost demonstration and testing.

## Install

```powershell
cd C:\Projects\Lexverdict-laravel
Remove-Item Env:COMPOSER -ErrorAction SilentlyContinue
composer install
npm install
copy .env.example .env
php artisan key:generate
```

## Prepare PostgreSQL

Create an empty local database. The examples use `lexverdict_local`:

```powershell
createdb -U postgres lexverdict_local
```

Copy `.env.example` to `.env`, generate the application key, and configure these non-secret values in `.env`:

```dotenv
APP_ENV=local
APP_URL=http://127.0.0.1:8000
DB_CONNECTION=pgsql
DB_HOST=127.0.0.1
DB_PORT=5432
DB_DATABASE=lexverdict_local
DB_USERNAME=postgres
SESSION_DRIVER=database
CACHE_STORE=database
QUEUE_CONNECTION=database
```

Set `DB_PASSWORD` locally for the installed PostgreSQL account. Do not commit it.

## Migrate And Seed

The demo seeder refuses to run outside `APP_ENV=local` and requires an empty domain database.

```powershell
cd C:\Projects\Lexverdict-laravel
php artisan migrate:fresh --force
php artisan db:seed --class=LocalDemoSeeder --force
```

`migrate:fresh` destroys the selected database. Confirm that `.env` points to the disposable localhost database before running it.

## Run Locally

Run these in separate terminals:

```powershell
npm run dev
```

```powershell
php artisan serve --host=127.0.0.1 --port=8000
```

```powershell
php artisan queue:work database --queue=documents,default --timeout=120
```

Open `http://127.0.0.1:8000/login`. Public Case Lookup is available at `http://127.0.0.1:8000/docket`.

## Demo Accounts

All accounts use password `LocalDemo!2026`.

| Role | Username | Post-login landing |
| --- | --- | --- |
| Administrator | `demo_admin` | Dashboard |
| Prosecutor | `demo_prosecutor` | Subpoena Review when assigned pending work exists; otherwise Cases |
| Secretary | `demo_secretary` | Cases |
| Process Server | `demo_process_server` | Read-only Cases |

The demo Prosecutor and Secretary are assigned to each other according to the mandatory one-to-one rule.

## Demo Data

The fixture creates six Cases with representative workflow states:

- `Pending`, `Approved`, and `Denied` Subpoenas, including a denial comment.
- `Approved`, `Pending`, and `Denied` Resolutions, including a denial comment.
- Approved `For Filing` and `Dismissed` outcomes for Case Report data.
- Domain-generated audit history for assignment, offense, Case, Subpoena, and Resolution actions.
- All six representative Cases are visible to the Process Server through the read-only `Cases` navigation, including Resolution Verdict, Court, and Verdict Date where applicable. PIN values and all mutation controls remain concealed.

The Secretary can inspect these records through `Verifying Cases`:

| Docket Number | Secretary verification scenario |
| --- | --- |
| `III-09-INV-26G-0001` | Approved Subpoena, approved `For Filing` Resolution, and PDF-ready Subpoena |
| `III-09-INV-26G-0002` | Approved Subpoena and approved `Dismissed` Resolution |
| `III-09-INV-26G-0003` | `Pending` Subpoena waiting for Prosecutor review |
| `III-09-INV-26G-0004` | `Denied` Subpoena requiring Secretary revision |
| `III-09-INV-26G-0005` | Approved Subpoena with `Pending` Resolution waiting for Administrator review |
| `III-09-INV-26G-0006` | Approved Subpoena with `Denied` Resolution requiring Secretary revision |

## Public Case Lookup

- Docket Number: `III-09-INV-26G-0001`
- PIN: `246810`
- Expected Status: `For Filing`
- Expected Court Location: `RTC Cabanatuan`

These credentials and records are synthetic and must never be used in staging or production.
