<?php

namespace App\Policies;

use App\Domain\Identity\Enums\StaffRole;
use App\Models\Offense;
use App\Models\User;

class OffensePolicy
{
    public function viewAny(User $user): bool
    {
        return $user->hasRole(StaffRole::Superuser);
    }

    public function create(User $user): bool
    {
        return $this->viewAny($user);
    }

    public function update(User $user, Offense $offense): bool
    {
        return $this->viewAny($user);
    }
}
