<?php

namespace Tests\Feature\M1;

use App\Domain\Cases\Enums\SubpoenaStatus;
use App\Domain\Identity\Enums\StaffRole;
use App\Models\LegalCase;
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

        $landings = [
            [$admin, '/dashboard'],
            [$prosecutor, '/cases'],
            [$secretary, '/cases'],
            [$processServer, '/process-server/cases'],
        ];

        foreach ($landings as [$user, $landing]) {
            $this->post('/login', [
                'username' => $user->username,
                'password' => 'password',
            ])->assertRedirect($landing);

            $this->assertAuthenticatedAs($user);
            $this->get('/login')->assertRedirect($landing);
            $this->post('/logout')->assertRedirect('/login');
        }
    }

    public function test_prosecutor_lands_on_subpoena_review_when_assigned_pending_work_exists(): void
    {
        $admin = $this->staff(StaffRole::Superuser, 'pending_admin');
        $prosecutor = $this->staff(StaffRole::Prosecutor, 'pending_prosecutor');
        $secretary = $this->staff(StaffRole::Secretary, 'pending_secretary');
        $this->pair($prosecutor, $secretary, $admin);

        LegalCase::factory()->create([
            'assigned_prosecutor_id' => $prosecutor->id,
            'created_by_user_id' => $secretary->id,
            'subpoena_status' => SubpoenaStatus::Pending->value,
        ]);

        $this->post('/login', [
            'username' => $prosecutor->username,
            'password' => 'password',
        ])->assertRedirect('/subpoena-reviews');

        $this->get('/login')->assertRedirect('/subpoena-reviews');
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

    public function test_non_admin_roles_cannot_open_dashboard_or_user_administration(): void
    {
        $admin = $this->staff(StaffRole::Superuser, 'admin');
        $prosecutor = $this->staff(StaffRole::Prosecutor, 'prosecutor');
        $secretary = $this->staff(StaffRole::Secretary, 'secretary');
        $processServer = $this->staff(StaffRole::ProcessServer, 'process_server');
        $this->pair($prosecutor, $secretary, $admin);

        foreach ([$prosecutor, $secretary, $processServer] as $user) {
            $this->actingAs($user)
                ->get('/dashboard')
                ->assertForbidden();

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
            ->assertInertia(fn (Assert $page) => $page
                ->component('Dashboard')
                ->where('auth.can.view_dashboard', true));

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
