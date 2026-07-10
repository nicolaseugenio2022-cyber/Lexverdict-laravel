<?php

namespace App\Domain\Cases\Actions;

use App\Domain\Identity\Enums\StaffRole;
use App\Models\LegalCase;
use App\Models\ProsecutorSecretaryAssignment;
use App\Models\User;

class CaseAccess
{
    public function canCreate(User $user): bool
    {
        if (! $user->is_active) {
            return false;
        }

        if ($user->hasRole(StaffRole::Superuser)) {
            return true;
        }

        if (! $user->hasRole(StaffRole::Secretary)) {
            return false;
        }

        return ProsecutorSecretaryAssignment::query()
            ->where('secretary_user_id', $user->id)
            ->exists();
    }

    public function canView(User $user, LegalCase $case): bool
    {
        if ($user->hasRole(StaffRole::Superuser)) {
            return true;
        }

        if ($user->hasRole(StaffRole::Prosecutor)) {
            return $case->assigned_prosecutor_id === $user->id;
        }

        if ($user->hasRole(StaffRole::Secretary)) {
            return $this->assignedProsecutorIdForSecretary($user) === $case->assigned_prosecutor_id;
        }

        return false;
    }

    public function canRevise(User $user, LegalCase $case): bool
    {
        if ($user->hasRole(StaffRole::Superuser)) {
            return true;
        }

        if (! $user->hasRole(StaffRole::Secretary)) {
            return false;
        }

        return $this->assignedProsecutorIdForSecretary($user) === $case->assigned_prosecutor_id;
    }

    public function assignedProsecutorIdForSecretary(User $secretary): ?string
    {
        return ProsecutorSecretaryAssignment::query()
            ->where('secretary_user_id', $secretary->id)
            ->value('prosecutor_user_id');
    }
}
