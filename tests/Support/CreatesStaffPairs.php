<?php

namespace Tests\Support;

use App\Domain\Identity\Enums\StaffRole;
use App\Models\ProsecutorSecretaryAssignment;
use App\Models\StaffProfile;
use App\Models\User;
use Illuminate\Support\Facades\Hash;

trait CreatesStaffPairs
{
    private function staff(StaffRole $role, string $username, bool $active = true): User
    {
        $user = User::factory()->create([
            'username' => $username,
            'role' => $role->value,
            'is_active' => $active,
            'password' => Hash::make('password'),
        ]);

        StaffProfile::create([
            'user_id' => $user->id,
            'first_name' => ucfirst($username),
            'last_name' => 'User',
        ]);

        return $user;
    }

    /**
     * @return array{0: User, 1: User, 2: User}
     */
    private function pairedStaff(string $suffix): array
    {
        $admin = $this->staff(StaffRole::Superuser, 'admin_'.$suffix);
        $prosecutor = $this->staff(StaffRole::Prosecutor, 'prosecutor_'.$suffix);
        $secretary = $this->staff(StaffRole::Secretary, 'secretary_'.$suffix);

        ProsecutorSecretaryAssignment::create([
            'prosecutor_user_id' => $prosecutor->id,
            'secretary_user_id' => $secretary->id,
            'assigned_by' => $admin->id,
            'assigned_at' => now(),
        ]);

        return [$admin, $prosecutor, $secretary];
    }
}
