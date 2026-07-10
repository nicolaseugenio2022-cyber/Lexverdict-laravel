<?php

namespace App\Domain\Identity\Actions;

use App\Domain\Identity\Enums\StaffRole;
use App\Domain\Identity\Exceptions\IdentityInvariantException;
use App\Models\ProsecutorProfile;
use App\Models\StaffProfile;
use App\Models\User;
use App\Support\AuditRecorder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class ManageStaffUser
{
    public function __construct(
        private readonly ManageAssignment $assignments,
        private readonly AuditRecorder $audit,
    ) {}

    /**
     * @param  array<string, mixed>  $data
     */
    public function create(array $data, User $actor): User
    {
        return DB::transaction(function () use ($data, $actor): User {
            $user = User::create([
                'username' => $data['username'],
                'password' => Hash::make($data['password']),
                'role' => $data['role'],
                'is_active' => (bool) ($data['is_active'] ?? true),
            ]);

            $this->persistProfiles($user, $data);
            $this->assignments->assertMandatoryPairsComplete();
            $this->audit->record('staff.created', $actor, User::class, $user->id, [
                'username' => $user->username,
                'role' => $user->role,
                'is_active' => $user->is_active,
            ]);

            return $user;
        });
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public function update(User $user, array $data, User $actor): User
    {
        return DB::transaction(function () use ($user, $data, $actor): User {
            $user = User::query()->lockForUpdate()->findOrFail($user->id);
            $originalRole = $user->role;

            $user->fill([
                'username' => $data['username'],
                'role' => $data['role'],
            ]);

            if (! empty($data['password'])) {
                $user->password = Hash::make($data['password']);
            }

            if ($originalRole !== $user->role && $this->hasCurrentAssignment($user)) {
                throw new IdentityInvariantException('Role changes cannot break a current Prosecutor-Secretary assignment.');
            }

            $user->save();
            $this->persistProfiles($user, $data);
            $this->assignments->assertMandatoryPairsComplete();

            $this->audit->record('staff.updated', $actor, User::class, $user->id, [
                'username' => $user->username,
                'role' => $user->role,
            ]);

            return $user;
        });
    }

    public function deactivate(User $user, User $actor): User
    {
        return DB::transaction(function () use ($user, $actor): User {
            $user = User::query()->lockForUpdate()->findOrFail($user->id);

            if ($user->isAdministrator() && User::query()->where('role', StaffRole::Superuser->value)->where('is_active', true)->count() <= 1) {
                throw new IdentityInvariantException('At least one active Super User is required.');
            }

            if ($this->hasCurrentAssignment($user)) {
                throw new IdentityInvariantException('Deactivate or reassign the current Prosecutor-Secretary pair transactionally first.');
            }

            $user->forceFill([
                'is_active' => false,
                'deactivated_at' => now(),
                'deactivated_by' => $actor->id,
            ])->save();

            $this->assignments->assertMandatoryPairsComplete();
            $this->audit->record('staff.deactivated', $actor, User::class, $user->id, [
                'username' => $user->username,
                'role' => $user->role,
            ]);

            return $user;
        });
    }

    public function restore(User $user, User $actor): User
    {
        return DB::transaction(function () use ($user, $actor): User {
            $user = User::query()->lockForUpdate()->findOrFail($user->id);
            $user->forceFill([
                'is_active' => true,
                'deactivated_at' => null,
                'deactivated_by' => null,
            ])->save();

            $this->assignments->assertMandatoryPairsComplete();
            $this->audit->record('staff.restored', $actor, User::class, $user->id, [
                'username' => $user->username,
                'role' => $user->role,
            ]);

            return $user;
        });
    }

    /**
     * @param  array<string, mixed>  $data
     */
    private function persistProfiles(User $user, array $data): void
    {
        StaffProfile::query()->updateOrCreate(
            ['user_id' => $user->id],
            [
                'first_name' => $data['first_name'],
                'middle_name' => $data['middle_name'] ?? null,
                'last_name' => $data['last_name'],
                'suffix' => $data['suffix'] ?? null,
                'sex' => $data['sex'] ?? null,
                'birth_date' => $data['birth_date'] ?? null,
                'contact_number' => $data['contact_number'] ?? null,
                'address' => $data['address'] ?? null,
            ],
        );

        if ($user->hasRole(StaffRole::Prosecutor)) {
            ProsecutorProfile::query()->updateOrCreate(
                ['user_id' => $user->id],
                [
                    'license_number' => $data['license_number'] ?? null,
                    'office_number' => $data['office_number'] ?? null,
                ],
            );
        } else {
            ProsecutorProfile::query()->where('user_id', $user->id)->delete();
        }
    }

    private function hasCurrentAssignment(User $user): bool
    {
        return $user->prosecutorAssignment()->exists() || $user->secretaryAssignment()->exists();
    }
}
