<?php

namespace Database\Seeders;

use App\Domain\Identity\Enums\StaffRole;
use App\Models\StaffProfile;
use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        $admin = User::factory()->create([
            'username' => 'admin',
            'role' => StaffRole::Superuser->value,
            'password' => Hash::make('password'),
        ]);

        StaffProfile::create([
            'user_id' => $admin->id,
            'first_name' => 'System',
            'last_name' => 'Administrator',
        ]);
    }
}
