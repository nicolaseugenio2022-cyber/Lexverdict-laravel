<?php

namespace App\Domain\Audit;

class AuditRedactor
{
    private const REDACTED = '[REDACTED]';

    public function redact(mixed $value, ?string $key = null): mixed
    {
        if ($key !== null && preg_match('/password|pin|secret|token|credential|session|authorization|cookie|date_of_birth|birth_date|address|street|barangay|municipality|province|region|contact_number/i', $key)) {
            return self::REDACTED;
        }

        if (! is_array($value)) {
            return $value;
        }

        $redacted = [];
        foreach ($value as $nestedKey => $nestedValue) {
            $redacted[$nestedKey] = $this->redact($nestedValue, (string) $nestedKey);
        }

        return $redacted;
    }
}
