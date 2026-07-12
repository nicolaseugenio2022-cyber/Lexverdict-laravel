param(
    [Parameter(Mandatory = $true)]
    [string]$BackupFile,
    [string]$EnvironmentFile = '.env',
    [string]$VerificationDatabase = 'lexverdict_restore_verify'
)

$ErrorActionPreference = 'Stop'

function Read-DotEnv([string]$Path) {
    $values = @{}
    foreach ($line in Get-Content -LiteralPath $Path) {
        if ($line -match '^\s*#' -or $line -notmatch '=') { continue }
        $name, $value = $line -split '=', 2
        $values[$name.Trim()] = $value.Trim().Trim('"').Trim("'")
    }
    return $values
}

$environment = Read-DotEnv (Resolve-Path -LiteralPath $EnvironmentFile)
$required = 'DB_HOST', 'DB_PORT', 'DB_DATABASE', 'DB_USERNAME', 'DB_PASSWORD'
foreach ($name in $required) {
    if (-not $environment.ContainsKey($name)) { throw "Missing $name in the selected environment file." }
}
$backup = (Resolve-Path -LiteralPath $BackupFile).Path
if ($VerificationDatabase -notmatch '^[a-zA-Z][a-zA-Z0-9_]*$') { throw 'Verification database name is invalid.' }
$checksumFile = "$backup.sha256"
if (Test-Path -LiteralPath $checksumFile) {
    $expected = ((Get-Content -LiteralPath $checksumFile -Raw) -split '\s+')[0].ToLowerInvariant()
    $actual = (Get-FileHash -Algorithm SHA256 -LiteralPath $backup).Hash.ToLowerInvariant()
    if ($expected -ne $actual) { throw 'Backup checksum verification failed.' }
}
$env:PGPASSWORD = $environment.DB_PASSWORD
$created = $false

try {
    $exists = & psql --host=$($environment.DB_HOST) --port=$($environment.DB_PORT) --username=$($environment.DB_USERNAME) --dbname=postgres --tuples-only --no-align --command="SELECT 1 FROM pg_database WHERE datname = '$VerificationDatabase'"
    if ($exists -match '1') { throw "Verification database '$VerificationDatabase' already exists; refusing to replace it." }

    & createdb --host=$($environment.DB_HOST) --port=$($environment.DB_PORT) --username=$($environment.DB_USERNAME) $VerificationDatabase
    if ($LASTEXITCODE -ne 0) { throw 'Could not create the verification database.' }
    $created = $true

    & pg_restore --host=$($environment.DB_HOST) --port=$($environment.DB_PORT) --username=$($environment.DB_USERNAME) --dbname=$VerificationDatabase --no-owner --no-privileges $backup
    if ($LASTEXITCODE -ne 0) { throw 'pg_restore failed.' }

    $tables = 'users', 'cases', 'subpoena_revisions', 'subpoena_decisions', 'resolutions', 'resolution_revisions', 'resolution_decisions', 'generated_documents', 'audit_events'
    foreach ($table in $tables) {
        $source = & psql --host=$($environment.DB_HOST) --port=$($environment.DB_PORT) --username=$($environment.DB_USERNAME) --dbname=$($environment.DB_DATABASE) --tuples-only --no-align --command="SELECT count(*) FROM $table"
        $restored = & psql --host=$($environment.DB_HOST) --port=$($environment.DB_PORT) --username=$($environment.DB_USERNAME) --dbname=$VerificationDatabase --tuples-only --no-align --command="SELECT count(*) FROM $table"
        if ($source.Trim() -ne $restored.Trim()) { throw "Row-count mismatch for $table." }
    }

    Write-Output 'PostgreSQL backup restore verification passed.'
} finally {
    if ($created) {
        & dropdb --host=$($environment.DB_HOST) --port=$($environment.DB_PORT) --username=$($environment.DB_USERNAME) $VerificationDatabase
    }
    Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue
}
