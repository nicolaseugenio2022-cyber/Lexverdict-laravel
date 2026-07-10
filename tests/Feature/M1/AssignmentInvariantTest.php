<?php

namespace Tests\Feature\M1;

use App\Domain\Identity\Actions\ManageAssignment;
use App\Domain\Identity\Actions\ManageStaffUser;
use App\Domain\Identity\Enums\StaffRole;
use App\Domain\Identity\Exceptions\IdentityInvariantException;
use App\Models\AuditEvent;
use App\Models\ProsecutorSecretaryAssignment;
use App\Models\StaffProfile;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class AssignmentInvariantTest extends TestCase
{
    use RefreshDatabase;

    public function test_assignment_requires_one_active_prosecutor_and_one_active_secretary(): void
    {
        $admin = $this->staff(StaffRole::Superuser, 'admin');
        $prosecutor = $this->staff(StaffRole::Prosecutor, 'prosecutor');
        $processServer = $this->staff(StaffRole::ProcessServer, 'process_server');

        $this->expectException(IdentityInvariantException::class);

        app(ManageAssignment::class)->assign($prosecutor, $processServer, $admin, 'invalid role');
    }

    public function test_assignment_rejects_duplicate_secretary_pairing(): void
    {
        [$admin, , $firstSecretary] = $this->paired('one');
        $secondProsecutor = $this->staff(StaffRole::Prosecutor, 'second_prosecutor');

        $this->expectException(IdentityInvariantException::class);

        app(ManageAssignment::class)->assign($secondProsecutor, $firstSecretary, $admin, 'duplicate');
    }

    public function test_swap_assignments_keeps_every_active_prosecutor_and_secretary_paired(): void
    {
        [$admin, $firstProsecutor, $firstSecretary] = $this->paired('one');
        [, $secondProsecutor, $secondSecretary] = $this->paired('two', $admin);

        app(ManageAssignment::class)->swap($firstProsecutor, $secondProsecutor, $admin, 'swap');

        $this->assertDatabaseHas('prosecutor_secretary_assignments', [
            'prosecutor_user_id' => $firstProsecutor->id,
            'secretary_user_id' => $secondSecretary->id,
        ]);
        $this->assertDatabaseHas('prosecutor_secretary_assignments', [
            'prosecutor_user_id' => $secondProsecutor->id,
            'secretary_user_id' => $firstSecretary->id,
        ]);
        $this->assertDatabaseHas('audit_events', ['event_type' => 'assignment.swapped']);
    }

    public function test_paired_staff_cannot_be_deactivated_independently(): void
    {
        [$admin, , $secretary] = $this->paired('one');

        $this->expectException(IdentityInvariantException::class);

        app(ManageStaffUser::class)->deactivate($secretary, $admin);
    }

    public function test_unpaired_process_server_can_be_deactivated_with_audit_event(): void
    {
        $admin = $this->staff(StaffRole::Superuser, 'admin');
        $processServer = $this->staff(StaffRole::ProcessServer, 'process_server');

        app(ManageStaffUser::class)->deactivate($processServer, $admin);

        $this->assertFalse($processServer->refresh()->is_active);
        $this->assertDatabaseHas('audit_events', [
            'event_type' => 'staff.deactivated',
            'subject_id' => $processServer->id,
        ]);
    }

    public function test_restoring_unpaired_prosecutor_is_rejected(): void
    {
        $admin = $this->staff(StaffRole::Superuser, 'admin');
        $prosecutor = $this->staff(StaffRole::Prosecutor, 'inactive_prosecutor', false);

        $this->expectException(IdentityInvariantException::class);

        app(ManageStaffUser::class)->restore($prosecutor, $admin);
    }

    public function test_admin_user_creation_records_audit_event(): void
    {
        $admin = $this->staff(StaffRole::Superuser, 'admin');

        $user = app(ManageStaffUser::class)->create([
            'username' => 'new_process_server',
            'password' => 'password',
            'role' => StaffRole::ProcessServer->value,
            'is_active' => true,
            'first_name' => 'Process',
            'last_name' => 'Server',
        ], $admin);

        $this->assertDatabaseHas('users', ['id' => $user->id, 'username' => 'new_process_server']);
        $this->assertTrue(AuditEvent::query()->where('event_type', 'staff.created')->where('subject_id', $user->id)->exists());
    }

    /**
     * @return array{0: User, 1: User, 2: User}
     */
    private function paired(string $suffix, ?User $admin = null): array
    {
        $admin ??= $this->staff(StaffRole::Superuser, 'admin_'.$suffix);
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
}
