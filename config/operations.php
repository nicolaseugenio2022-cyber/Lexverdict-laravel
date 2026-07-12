<?php

return [
    'document_disk' => env('DOCUMENT_DISK', 'local'),
    'queue_backlog_threshold' => (int) env('MONITOR_QUEUE_BACKLOG_THRESHOLD', 100),
    'queue_age_threshold_seconds' => (int) env('MONITOR_QUEUE_AGE_THRESHOLD_SECONDS', 300),
    'failed_jobs_threshold' => (int) env('MONITOR_FAILED_JOBS_THRESHOLD', 0),
    'trusted_proxies' => array_values(array_filter(array_map('trim', explode(',', (string) env('TRUSTED_PROXIES', ''))))),
];
