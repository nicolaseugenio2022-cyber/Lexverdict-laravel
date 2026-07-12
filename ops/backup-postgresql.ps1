param(
    [Parameter(Mandatory = $true)]
    [string]$OutputDirectory,
    [string]$EnvironmentFile = '.env'
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

$resolvedOutput = [IO.Path]::GetFullPath($OutputDirectory)
New-Item -ItemType Directory -Force -Path $resolvedOutput | Out-Null
$timestamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$backup = Join-Path $resolvedOutput "lexverdict-$timestamp.dump"
$env:PGPASSWORD = $environment.DB_PASSWORD

try {
    & pg_dump --host=$($environment.DB_HOST) --port=$($environment.DB_PORT) --username=$($environment.DB_USERNAME) --format=custom --no-owner --no-privileges --file=$backup $environment.DB_DATABASE
    if ($LASTEXITCODE -ne 0) { throw 'pg_dump failed.' }
    if (-not (Test-Path -LiteralPath $backup) -or (Get-Item -LiteralPath $backup).Length -eq 0) { throw 'pg_dump produced no backup data.' }
    $hash = (Get-FileHash -Algorithm SHA256 -LiteralPath $backup).Hash.ToLowerInvariant()
    Set-Content -LiteralPath "$backup.sha256" -Value "$hash  $([IO.Path]::GetFileName($backup))" -Encoding ascii
    Write-Output $backup
} finally {
    Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue
}
