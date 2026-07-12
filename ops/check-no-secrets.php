<?php

declare(strict_types=1);

$tracked = shell_exec('git ls-files -z');
if (! is_string($tracked)) {
    fwrite(STDERR, "Unable to enumerate tracked files.\n");
    exit(1);
}

$patterns = [
    '/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/',
    '/\bAKIA[0-9A-Z]{16}\b/',
    '/\b(?:ghp|github_pat)_[A-Za-z0-9_]{20,}\b/',
];
$excluded = ['ops/check-no-secrets.php'];

foreach (array_filter(explode("\0", $tracked)) as $file) {
    if (in_array($file, $excluded, true) || ! is_file($file) || filesize($file) > 2_000_000) {
        continue;
    }
    $contents = file_get_contents($file);
    if (! is_string($contents) || str_contains($contents, "\0")) {
        continue;
    }
    foreach ($patterns as $pattern) {
        if (preg_match($pattern, $contents) === 1) {
            fwrite(STDERR, "Potential secret detected in {$file}.\n");
            exit(1);
        }
    }
}

$nullDevice = PHP_OS_FAMILY === 'Windows' ? 'NUL' : '/dev/null';
foreach (['.env', '.env.testing', '.env.production'] as $secretFile) {
    exec('git ls-files --error-unmatch '.escapeshellarg($secretFile).' 2>'.$nullDevice, $output, $status);
    if ($status === 0) {
        fwrite(STDERR, "Secret environment file is tracked: {$secretFile}.\n");
        exit(1);
    }
}

fwrite(STDOUT, "Tracked-file secret scan passed.\n");
