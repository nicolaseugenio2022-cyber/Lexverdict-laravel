<?php

namespace Tests\Feature\M1;

use App\Domain\Identity\Enums\StaffRole;
use App\Models\ProsecutorSecretaryAssignment;
use App\Models\StaffProfile;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class AuthAndRoleBoundaryTest extends TestCase
{
    use RefreshDatabase;

    public function test_all_four_staff_roles_authenticate(): void
    {
        $admin = $this->staff(StaffRole::Superuser, 'admin');
        $prosecutor = $this->staff(StaffRole::Prosecutor, 'prosecutor');
        $secretary = $this->staff(StaffRole::Secretary, 'secretary');
        $processServer = $this->staff(StaffRole::ProcessServer, 'process_server');

        $this->pair($prosecutor, $secretary, $admin);

        foreach ([$admin, $prosecutor, $secretary, $processServer] as $user) {
            $this->post('/login', [
                'username' => $user->username,
                'password' => 'password',
            ])->assertRedirect('/dashboard');

            $this->assertAuthenticatedAs($user);
            $this->post('/logout')->assertRedirect('/login');
        }
    }

    public function test_inactive_staff_cannot_authenticate(): void
    {
        $inactive = $this->staff(StaffRole::ProcessServer, 'inactive', false);

        $this->post('/login', [
            'username' => $inactive->username,
            'password' => 'password',
        ])->assertSessionHasErrors('username');

        $this->assertGuest();
    }

    public function test_non_admin_roles_cannot_open_user_administration(): void
    {
        $admin = $this->staff(StaffRole::Superuser, 'admin');
        $prosecutor = $this->staff(StaffRole::Prosecutor, 'prosecutor');
        $secretary = $this->staff(StaffRole::Secretary, 'secretary');
        $processServer = $this->staff(StaffRole::ProcessServer, 'process_server');
        $this->pair($prosecutor, $secretary, $admin);

        foreach ([$prosecutor, $secretary, $processServer] as $user) {
            $this->actingAs($user)
                ->get('/admin/users')
                ->assertForbidden();
        }
    }

    public function test_admin_can_open_dashboard_and_user_administration(): void
    {
        $admin = $this->staff(StaffRole::Superuser, 'admin');

        $this->withoutVite();

        $this->actingAs($admin)
            ->get('/dashboard')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page->component('Dashboard'));

        $this->actingAs($admin)
            ->get('/admin/users')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page->component('Admin/Users/Index'));
    }

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

    private function pair(User $prosecutor, User $secretary, User $admin): void
    {
        ProsecutorSecretaryAssignment::create([
            'prosecutor_user_id' => $prosecutor->id,
            'secretary_user_id' => $secretary->id,
            'assigned_by' => $admin->id,
            'assigned_at' => now(),
        ]);
    }
}
