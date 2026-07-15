<?php

namespace App\Http\Controllers;

use App\Domain\Cases\Actions\CaseAccess;
use App\Support\PhilippineAddressCatalog;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class CaseEntryAddressController extends Controller
{
    public function __invoke(
        Request $request,
        CaseAccess $access,
        PhilippineAddressCatalog $addresses,
    ): JsonResponse {
        abort_unless($access->canCreate($request->user()), 403);

        $validated = $request->validate([
            'level' => ['required', Rule::in(['provinces', 'municipalities', 'barangays'])],
            'region_code' => ['nullable', 'string', 'regex:/^\d{10}$/'],
            'province_code' => ['nullable', 'string', 'regex:/^\d{10}$/'],
            'municipality_code' => ['nullable', 'string', 'regex:/^\d{10}$/'],
        ]);

        $level = (string) $validated['level'];
        $regionCode = (string) ($validated['region_code'] ?? '');
        $provinceCode = (string) ($validated['province_code'] ?? '');
        $municipalityCode = (string) ($validated['municipality_code'] ?? '');

        $options = match ($level) {
            'provinces' => $this->provinces($addresses, $regionCode),
            'municipalities' => $this->municipalities($addresses, $regionCode, $provinceCode),
            'barangays' => $this->barangays($addresses, $municipalityCode),
            default => throw ValidationException::withMessages(['level' => 'Select a valid address level.']),
        };

        return response()->json(['options' => $options]);
    }

    /** @return list<array{code: string, name: string}> */
    private function provinces(PhilippineAddressCatalog $addresses, string $regionCode): array
    {
        if (! $addresses->isRegion($regionCode)) {
            throw ValidationException::withMessages(['region_code' => 'Select a valid Region.']);
        }

        return $addresses->provinces($regionCode);
    }

    /** @return list<array{code: string, name: string}> */
    private function municipalities(
        PhilippineAddressCatalog $addresses,
        string $regionCode,
        string $provinceCode,
    ): array {
        if (! $addresses->isValidProvince($regionCode, $provinceCode ?: null)) {
            throw ValidationException::withMessages(['province_code' => 'Select a Province within the selected Region.']);
        }

        return $addresses->municipalities($regionCode, $provinceCode ?: null);
    }

    /** @return list<array{code: string, name: string, label: string}> */
    private function barangays(PhilippineAddressCatalog $addresses, string $municipalityCode): array
    {
        $options = $addresses->barangays($municipalityCode);

        if ($options === []) {
            throw ValidationException::withMessages(['municipality_code' => 'Select a valid Municipality/City.']);
        }

        return $options;
    }
}
