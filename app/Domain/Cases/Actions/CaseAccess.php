<?php

namespace App\Domain\Cases\Actions;

use App\Domain\Cases\Enums\SubpoenaStatus;
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

    public function canAccessReviewQueue(User $user): bool
    {
        return $user->is_active && $user->hasRole(StaffRole::Prosecutor);
    }

    public function canViewReview(User $user, LegalCase $case): bool
    {
        return $this->canAccessReviewQueue($user)
            && $case->assigned_prosecutor_id === $user->id
            && $case->created_by_user_id !== $user->id;
    }

    public function canReview(User $user, LegalCase $case): bool
    {
        return $this->canViewReview($user, $case)
            && $this->subpoenaStatusValue($case->subpoena_status) === SubpoenaStatus::Pending->value;
    }

    public function assignedProsecutorIdForSecretary(User $secretary): ?string
    {
        return ProsecutorSecretaryAssignment::query()
            ->where('secretary_user_id', $secretary->id)
            ->value('prosecutor_user_id');
    }

    private function subpoenaStatusValue(mixed $status): string
    {
        return $status instanceof SubpoenaStatus ? $status->value : (string) $status;
    }
}
