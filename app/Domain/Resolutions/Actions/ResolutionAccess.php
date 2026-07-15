<?php

namespace App\Domain\Resolutions\Actions;

use App\Domain\Cases\Actions\CaseAccess;
use App\Domain\Cases\Enums\SubpoenaStatus;
use App\Domain\Identity\Enums\StaffRole;
use App\Domain\Resolutions\Enums\ResolutionStatus;
use App\Models\LegalCase;
use App\Models\Resolution;
use App\Models\User;

class ResolutionAccess
{
    public function __construct(private readonly CaseAccess $cases) {}

    public function canSubmit(User $user, LegalCase $case): bool
    {
        if (! $user->is_active || $this->subpoenaStatus($case->subpoena_status) !== SubpoenaStatus::Approved->value) {
            return false;
        }

        if ($user->hasRole(StaffRole::Superuser)) {
            return true;
        }

        if (! $user->hasRole(StaffRole::Secretary)) {
            return false;
        }

        return $this->cases->assignedProsecutorIdForSecretary($user) === $case->assigned_prosecutor_id;
    }

    public function canView(User $user, Resolution $resolution): bool
    {
        return $resolution->relationLoaded('case') && $resolution->case
            ? $this->cases->canView($user, $resolution->case)
            : $this->cases->canView($user, $resolution->case()->firstOrFail());
    }

    public function canRevise(User $user, Resolution $resolution): bool
    {
        $status = $this->resolutionStatus($resolution->status);
        $case = $resolution->relationLoaded('case') && $resolution->case
            ? $resolution->case
            : $resolution->case()->firstOrFail();

        return in_array($status, [ResolutionStatus::Pending->value, ResolutionStatus::Denied->value], true)
            && $this->canSubmit($user, $case);
    }

    public function canAccessReviewQueue(User $user): bool
    {
        return $user->is_active && $user->hasRole(StaffRole::Superuser);
    }

    public function canReview(User $user, Resolution $resolution): bool
    {
        return $this->canAccessReviewQueue($user)
            && $this->resolutionStatus($resolution->status) === ResolutionStatus::Pending->value;
    }

    private function subpoenaStatus(mixed $status): string
    {
        return $status instanceof SubpoenaStatus ? $status->value : (string) $status;
    }

    private function resolutionStatus(mixed $status): string
    {
        return $status instanceof ResolutionStatus ? $status->value : (string) $status;
    }
}
