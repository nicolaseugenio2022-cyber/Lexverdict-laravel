<?php

namespace App\Domain\Resolutions\Enums;

enum ResolutionStatus: string
{
    case Pending = 'Pending';
    case Approved = 'Approved';
    case Denied = 'Denied';

    /** @return list<string> */
    public static function values(): array
    {
        return array_map(fn (self $status): string => $status->value, self::cases());
    }
}
