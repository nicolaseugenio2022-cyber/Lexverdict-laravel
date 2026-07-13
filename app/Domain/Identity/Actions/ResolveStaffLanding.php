<?php

namespace App\Domain\Identity\Actions;

use App\Domain\Cases\Queries\SubpoenaReviewQuery;
use App\Domain\Identity\Enums\StaffRole;
use App\Models\User;

class ResolveStaffLanding
{
    public function __construct(private readonly SubpoenaReviewQuery $reviews) {}

    public function routeName(User $user): string
    {
        return match ($user->role()) {
            StaffRole::Superuser => 'dashboard',
            StaffRole::Secretary => 'cases.index',
            StaffRole::ProcessServer => 'process-server.cases.index',
            StaffRole::Prosecutor => $this->reviews->hasPendingFor($user)
                ? 'subpoena-reviews.index'
                : 'cases.index',
        };
    }

    public function path(User $user): string
    {
        return route($this->routeName($user), absolute: false);
    }
}
