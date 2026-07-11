<?php

namespace App\Domain\Resolutions\Enums;

enum ResolutionVerdict: string
{
    case ForFiling = 'For Filing';
    case Dismissed = 'Dismissed';
    case Pending = 'Pending';

    /** @return list<string> */
    public static function values(): array
    {
        return array_map(fn (self $verdict): string => $verdict->value, self::cases());
    }

    /** @return list<string> */
    public static function submittableValues(): array
    {
        return [self::ForFiling->value, self::Dismissed->value];
    }
}
