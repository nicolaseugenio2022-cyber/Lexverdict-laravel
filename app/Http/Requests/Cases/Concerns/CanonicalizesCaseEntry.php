<?php

namespace App\Http\Requests\Cases\Concerns;

use App\Support\PhilippineAddressCatalog;
use Illuminate\Validation\Validator;

trait CanonicalizesCaseEntry
{
    protected function prepareForValidation(): void
    {
        $parties = $this->input('parties');

        if (! is_array($parties)) {
            return;
        }

        $addresses = app(PhilippineAddressCatalog::class);

        foreach ($parties as $index => $party) {
            if (! is_array($party)) {
                continue;
            }

            $canonical = $this->canonicalAddress($party, $addresses);

            if ($canonical !== null) {
                $parties[$index] = array_merge($party, $canonical);
            }
        }

        $this->merge(['parties' => $parties]);
    }

    /** @return list<callable(Validator): void> */
    public function after(): array
    {
        return [function (Validator $validator): void {
            $parties = $this->input('parties');

            if (! is_array($parties)) {
                return;
            }

            $addresses = app(PhilippineAddressCatalog::class);

            foreach ($parties as $index => $party) {
                if (is_array($party)) {
                    if ($this->canonicalAddress($party, $addresses) !== null
                        || $this->acceptsUnchangedLegacyAddress($party)) {
                        continue;
                    }
                }

                $validator->errors()->add(
                    "parties.{$index}.barangay_code",
                    'Select a valid Region, Province, Municipality/City, and Barangay combination.',
                );
            }
        }];
    }

    /**
     * @return array<string, list<string>>
     */
    protected function canonicalAddressRules(): array
    {
        return [
            'parties.*.region_code' => ['nullable', 'string', 'regex:/^\d{10}$/'],
            'parties.*.province_code' => ['nullable', 'string', 'regex:/^\d{10}$/'],
            'parties.*.municipality_code' => ['nullable', 'string', 'regex:/^\d{10}$/'],
            'parties.*.barangay_code' => ['nullable', 'string', 'regex:/^\d{10}$/'],
        ];
    }

    /** @param array<string, mixed> $party */
    protected function acceptsUnchangedLegacyAddress(array $party): bool
    {
        return false;
    }

    /**
     * @param  array<string, mixed>  $party
     * @return array{region: string, province: string, municipality: string, barangay: string}|null
     */
    private function canonicalAddress(array $party, PhilippineAddressCatalog $addresses): ?array
    {
        foreach (['region_code', 'province_code', 'municipality_code', 'barangay_code'] as $field) {
            if (isset($party[$field]) && ! is_string($party[$field])) {
                return null;
            }
        }

        return $addresses->canonicalAddress(
            (string) ($party['region_code'] ?? ''),
            ($party['province_code'] ?? '') === '' ? null : (string) $party['province_code'],
            (string) ($party['municipality_code'] ?? ''),
            (string) ($party['barangay_code'] ?? ''),
        );
    }
}
