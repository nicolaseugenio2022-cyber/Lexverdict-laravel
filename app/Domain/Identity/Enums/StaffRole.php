<?php

namespace App\Domain\Identity\Enums;

enum StaffRole: string
{
    case Superuser = 'superuser';
    case Prosecutor = 'Prosecutor';
    case Secretary = 'Secretary';
    case ProcessServer = 'PS';

    /**
     * @return list<string>
     */
    public static function values(): array
    {
        return array_map(fn (self $role): string => $role->value, self::cases());
    }

    public function label(): string
    {
        return match ($this) {
            self::Superuser => 'Super User',
            self::ProcessServer => 'Process Server',
            default => $this->value,
        };
    }
}
