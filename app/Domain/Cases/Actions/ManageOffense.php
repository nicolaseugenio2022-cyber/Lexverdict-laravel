<?php

namespace App\Domain\Cases\Actions;

use App\Domain\Cases\Exceptions\CaseDataInvariantException;
use App\Models\Offense;
use App\Models\User;
use App\Support\AuditRecorder;
use Illuminate\Support\Facades\DB;

class ManageOffense
{
    public function __construct(private readonly AuditRecorder $audit) {}

    public function create(string $name, ?string $lawReference, User $actor): Offense
    {
        return DB::transaction(function () use ($name, $lawReference, $actor): Offense {
            $normalizedName = $this->normalizeName($name);

            if ($normalizedName === '') {
                throw new CaseDataInvariantException('Crime Name is required.');
            }

            if (Offense::query()->where('normalized_name', $normalizedName)->exists()) {
                throw new CaseDataInvariantException('Crime Name already exists.');
            }

            $offense = Offense::create([
                'name' => trim($name),
                'normalized_name' => $normalizedName,
                'law_reference' => $lawReference ? trim($lawReference) : null,
                'is_active' => true,
            ]);

            $this->audit->record('offense.created', $actor, Offense::class, $offense->id, [
                'name' => $offense->name,
                'law_reference' => $offense->law_reference,
            ]);

            return $offense;
        });
    }

    public function update(Offense $offense, string $name, ?string $lawReference, bool $isActive, User $actor): Offense
    {
        return DB::transaction(function () use ($offense, $name, $lawReference, $isActive, $actor): Offense {
            $offense = Offense::query()->lockForUpdate()->findOrFail($offense->id);
            $normalizedName = $this->normalizeName($name);

            if ($normalizedName === '') {
                throw new CaseDataInvariantException('Crime Name is required.');
            }

            $duplicateExists = Offense::query()
                ->where('normalized_name', $normalizedName)
                ->whereKeyNot($offense->id)
                ->exists();

            if ($duplicateExists) {
                throw new CaseDataInvariantException('Crime Name already exists.');
            }

            $offense->update([
                'name' => trim($name),
                'normalized_name' => $normalizedName,
                'law_reference' => $lawReference ? trim($lawReference) : null,
                'is_active' => $isActive,
            ]);

            $this->audit->record('offense.updated', $actor, Offense::class, $offense->id, [
                'name' => $offense->name,
                'law_reference' => $offense->law_reference,
                'is_active' => $offense->is_active,
            ]);

            return $offense;
        });
    }

    private function normalizeName(string $name): string
    {
        return mb_strtolower(trim(preg_replace('/\s+/', ' ', $name) ?? $name));
    }
}
