<?php

namespace App\Domain\Cases\Actions;

use App\Models\LegalCase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class IssueCasePin
{
    /**
     * @return array{pin: string, hash: string}
     */
    public function generate(): array
    {
        $pin = str_pad((string) random_int(0, 999999), 6, '0', STR_PAD_LEFT);

        return [
            'pin' => $pin,
            'hash' => Hash::make($pin),
        ];
    }

    public function reset(LegalCase $case): string
    {
        $issued = $this->generate();

        $case->update([
            'pin_hash' => $issued['hash'],
            'pin_document_secret' => $issued['pin'],
            'pin_reset_at' => now(),
            'pin_issued_at' => now(),
        ]);

        return $issued['pin'];
    }

    public function placeholderHash(): string
    {
        return Hash::make(Str::random(40));
    }
}
